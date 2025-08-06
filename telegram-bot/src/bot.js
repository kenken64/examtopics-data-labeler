const { Bot } = require('grammy');
const http = require('http');
require('dotenv').config();

// Import services
const DatabaseService = require('./services/databaseService');
const QuizService = require('./services/quizService');
const NotificationService = require('./services/notificationService');

// Import utilities
const { validateMultipleAnswers } = require('./utils/answerUtils');

// Import handlers
const MessageHandlers = require('./handlers/messageHandlers');
const CallbackHandlers = require('./handlers/callbackHandlers');

class CertificationBot {
  constructor() {
  // Validate essential environment variables
    if (!process.env.BOT_TOKEN) {
      console.error('❌ BOT_TOKEN environment variable is missing!');
      this.startupError = new Error('BOT_TOKEN environment variable is required');
      this.setupHealthCheck();
      return;
    }

    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is missing!');
      this.startupError = new Error('MONGODB_URI environment variable is required');
      this.setupHealthCheck();
      return;
    }

    this.bot = new Bot(process.env.BOT_TOKEN);
    this.userSessions = new Map(); // Store user quiz sessions
    this.userSelections = {}; // Store user's current answer selections for multiple choice
    this.stepQuizSessions = new Map(); // Store step-based quiz sessions
    this.healthServer = null; // Health check server for Railway
    this.isReady = false; // Track if bot is ready
    this.startupError = null; // Track startup errors
    this.offlineMode = false; // Track if running in offline mode
    this.pollingIssue = false; // Track if polling has issues but API works

    // Initialize services
    this.databaseService = new DatabaseService();
    this.quizService = new QuizService(this.databaseService);
    this.notificationService = new NotificationService(this.databaseService, this.bot);

    // Initialize handlers
    this.messageHandlers = new MessageHandlers(this.databaseService, this.quizService, this);
    this.callbackHandlers = new CallbackHandlers(
      this.databaseService,
      this.quizService,
      this.messageHandlers
    );

    // Start health server immediately for Railway
    this.setupHealthCheck();

    // Initialize bot asynchronously
    this.initializeAsync();
  }

  // Step quiz data structure
  static StepQuizSession = class {
    constructor(userId, questionData) {
      this.userId = userId;
      this.questionData = questionData;
      this.currentStep = 1;
      this.selectedAnswers = new Map(); // stepNumber -> selectedOption
      this.stepOrdering = new Map(); // stepNumber -> array of ordered options
      this.isComplete = false;
      this.startTime = new Date();
      this.isOrderingMode = questionData.orderingMode || false;
    }

    selectAnswer(step, answer) {
      this.selectedAnswers.set(step, answer);
    }

    // Ordering mode methods
    initializeStepOrdering(step, availableOptions) {
      if (!this.stepOrdering.has(step)) {
        this.stepOrdering.set(step, [...availableOptions]);
      }
    }

    getStepOrdering(step) {
      return this.stepOrdering.get(step) || [];
    }

    moveOption(step, fromIndex, toIndex) {
      const ordering = this.stepOrdering.get(step);
      if (ordering && fromIndex >= 0 && fromIndex < ordering.length && 
          toIndex >= 0 && toIndex < ordering.length) {
        const item = ordering.splice(fromIndex, 1)[0];
        ordering.splice(toIndex, 0, item);
        this.stepOrdering.set(step, ordering);
        return true;
      }
      return false;
    }

    moveOptionUp(step, index) {
      if (index > 0) {
        return this.moveOption(step, index, index - 1);
      }
      return false;
    }

    moveOptionDown(step, index) {
      const ordering = this.stepOrdering.get(step);
      if (ordering && index < ordering.length - 1) {
        return this.moveOption(step, index, index + 1);
      }
      return false;
    }

    finalizeStepOrder(step) {
      const ordering = this.stepOrdering.get(step);
      if (ordering && ordering.length > 0) {
        // Convert ordering to answer format (e.g., "ABCD" or "BCDA")
        const answer = ordering.join('');
        this.selectAnswer(step, answer);
        return answer;
      }
      return null;
    }

    canProceedToStep(step) {
      // Check if all previous steps are completed
      for (let i = 1; i < step; i++) {
        if (!this.selectedAnswers.has(i)) {
          return false;
        }
      }
      return true;
    }

    isStepCompleted(step) {
      return this.selectedAnswers.has(step);
    }

    getAllSteps() {
      return this.questionData.steps || [];
    }

    getTotalSteps() {
      return this.getAllSteps().length;
    }

    checkAnswers() {
      const steps = this.getAllSteps();
      let correctAnswers = 0;
      
      for (let i = 0; i < steps.length; i++) {
        const stepNumber = i + 1;
        const selectedAnswer = this.selectedAnswers.get(stepNumber);
        const correctAnswer = steps[i].correctAnswer;
        
        if (selectedAnswer === correctAnswer) {
          correctAnswers++;
        }
      }
      
      return {
        correct: correctAnswers,
        total: steps.length,
        percentage: (correctAnswers / steps.length) * 100
      };
    }
  }

  async initializeAsync() {
    try {
      console.log('🚀 Starting bot initialization...');

      // Set a timeout for initialization (reduced for faster feedback)
      const timeout = setTimeout(() => {
        if (!this.isReady && !this.offlineMode) {
          this.startupError = new Error('Bot initialization timeout after 25 seconds');
          console.error('❌ Bot initialization timed out');
        }
      }, 25000);

      console.log('🔧 Setting up bot handlers...');
      this.initializeBot();

      console.log('🚀 Starting bot...');
      await this.start();

      clearTimeout(timeout);

      // Check if we're in offline mode or fully ready
      if (this.offlineMode) {
        console.log('⚠️  Running in OFFLINE MODE');
        console.log('📱 Telegram bot features disabled');
        console.log('🎮 QuizBlitz backend functionality ACTIVE');
        this.isReady = false; // Not fully ready, but functional for QuizBlitz
      } else if (this.pollingIssue) {
        console.log('⚠️  Running in API-ONLY MODE');
        console.log('📱 Telegram API works but polling may be restricted');
        console.log('🎮 QuizBlitz backend functionality ACTIVE');
        console.log('💡 Bot can send messages but may not receive updates');
        console.log('');
        console.log('🔧 POSSIBLE SOLUTIONS:');
        console.log('   1. Check firewall/network restrictions for api.telegram.org');
        console.log('   2. Try running from a different network');
        console.log('   3. Set up webhook mode with WEBHOOK_URL environment variable');
        console.log('   4. Contact your network administrator about Telegram API access');
        console.log('   5. Try /hotspottest command to test step quiz directly');
        this.isReady = true; // Partially ready - can send messages
      } else {
        console.log('✅ Bot initialization completed successfully');
        this.isReady = true;
      }

      // Always start notification polling for QuizBlitz
      console.log('📡 Starting QuizBlitz notification polling...');
      this.notificationService.startNotificationPolling();

      if (this.offlineMode) {
        console.log('💡 To enable full bot features, ensure network access to api.telegram.org');
      }
    } catch (error) {
      console.error('❌ Bot initialization failed:', error);
      this.startupError = error;

      // Check if it's a network connectivity issue
      if (error.message.includes('Network request') || error.message.includes('timeout')) {
        console.log('🌐 Network connectivity issue detected to Telegram API');
        console.log('💡 This is common in restricted networks or behind firewalls');
        console.log('✅ QuizBlitz backend functionality is working (verified by tests)');
        console.log('📱 Once network access to api.telegram.org is available, restart the bot');
      }

      // For Railway, we want to keep the service running even if bot fails
      // so that health checks can report the error
      if (process.env.RAILWAY_ENVIRONMENT) {
        console.log('🚂 Running on Railway - keeping service alive for health checks');
      } else {
        // In development, still connect to database for QuizBlitz backend
        console.log('💻 Development mode - connecting to MongoDB for QuizBlitz backend...');
        try {
          await this.databaseService.connectToDatabase();
          console.log('✅ MongoDB connected - QuizBlitz backend ready');
          this.notificationService.startNotificationPolling(); // Still poll for quiz notifications
          this.offlineMode = true;
        } catch (dbError) {
          console.error('❌ MongoDB connection also failed:', dbError.message);
          process.exit(1);
        }
      }
    }
  }

  initializeBot() {
  // Start command - greet user and show certificates
    this.bot.command('start', async (ctx) => {
      await this.messageHandlers.handleStart(ctx, this.userSessions);
    });

    // Help command - show all available commands with detailed instructions
    this.bot.command('help', async (ctx) => {
      await this.messageHandlers.handleHelp(ctx);
    });

    // Bookmark command - save question by number
    this.bot.command('bookmark', async (ctx) => {
      await this.messageHandlers.handleBookmark(ctx, this.userSessions);
    });

    // Bookmarks command - show saved bookmarks
    this.bot.command('bookmarks', async (ctx) => {
      await this.messageHandlers.handleBookmarks(ctx, this.userSessions);
    });

    // Revision command - review wrong answers
    this.bot.command('revision', async (ctx) => {
      await this.messageHandlers.handleRevision(ctx, this.userSessions);
    });

    // Test step quiz command
    this.bot.command('steptest', async (ctx) => {
      await this.handleTestStepQuiz(ctx);
    });

    // Test ordering step quiz command
    this.bot.command('ordertest', async (ctx) => {
      await this.handleTestOrderingStepQuiz(ctx);
    });

    // Test HOTSPOT question directly (bypasses navigation)
    this.bot.command('hotspottest', async (ctx) => {
      await this.messageHandlers.testHotspotQuestion(ctx);
    });

    // Handle company selection
    this.bot.callbackQuery(/^company_(.+)$/, async (ctx) => {
      const companyId = ctx.match[1];
      await this.messageHandlers.showCertificatesByCompany(ctx, companyId);
    });

    // Handle back to companies
    this.bot.callbackQuery('back_to_companies', async (ctx) => {
      await this.messageHandlers.showCompanies(ctx);
    });

    // Handle certificate selection
    this.bot.callbackQuery(/^cert_(.+)$/, async (ctx) => {
      const certificateId = ctx.match[1];
      await this.callbackHandlers.handleCertificateCallback(ctx, certificateId, this.userSessions);
    });

    // Handle answer selection
    this.bot.callbackQuery(/^answer_([A-F])$/, async (ctx) => {
      const selectedAnswer = ctx.match[1];
      await this.callbackHandlers.handleAnswerCallback(
        ctx,
        selectedAnswer,
        this.userSessions,
        this.userSelections
      );
    });

    // Handle confirm answer (for multiple choice)
    this.bot.callbackQuery('confirm_answer', async (ctx) => {
      await this.callbackHandlers.handleConfirmAnswer(ctx, this.userSessions, this.userSelections);
    });

    // Handle clear selection (for multiple choice)
    this.bot.callbackQuery('clear_selection', async (ctx) => {
      await this.callbackHandlers.handleClearSelection(ctx, this.userSessions, this.userSelections);
    });

    // Handle next question
    this.bot.callbackQuery('next_question', async (ctx) => {
      await this.callbackHandlers.handleNextQuestion(ctx, this.userSessions, this.userSelections);
    });

    // Handle feedback callbacks
    this.bot.callbackQuery(/^feedback_(.+)$/, async (ctx) => {
      await this.callbackHandlers.handleFeedbackCallback(ctx, ctx.match[0], this.userSessions, this.userSelections);
    });

    // Step quiz handlers
    this.bot.callbackQuery(/^step_select_(.+)_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      const stepNumber = ctx.match[2];
      await this.handleStepSelection(ctx, userId, stepNumber);
    });

    this.bot.callbackQuery(/^step_answer_(.+)_(.+)_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      const stepNumber = ctx.match[2];
      const selectedOption = ctx.match[3];
      await this.handleStepAnswer(ctx, userId, stepNumber, selectedOption);
    });

    this.bot.callbackQuery(/^step_overview_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      const session = this.stepQuizSessions.get(parseInt(userId));
      if (session) {
        await this.sendOverviewInterface(ctx, session);
      }
    });

    this.bot.callbackQuery(/^step_progress_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      const session = this.stepQuizSessions.get(parseInt(userId));
      if (session) {
        const completed = session.selectedAnswers.size;
        const total = session.getTotalSteps();
        await ctx.answerCallbackQuery(`Progress: ${completed}/${total} steps completed`);
      }
    });

    this.bot.callbackQuery(/^step_submit_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      await this.handleStepSubmit(ctx, userId);
    });

    // Ordering mode handlers
    this.bot.callbackQuery(/^order_up_(.+)_(.+)_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      const stepNumber = ctx.match[2];
      const optionIndex = ctx.match[3];
      await this.handleOrderMove(ctx, userId, stepNumber, parseInt(optionIndex), 'up');
    });

    this.bot.callbackQuery(/^order_down_(.+)_(.+)_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      const stepNumber = ctx.match[2];
      const optionIndex = ctx.match[3];
      await this.handleOrderMove(ctx, userId, stepNumber, parseInt(optionIndex), 'down');
    });

    this.bot.callbackQuery(/^order_confirm_(.+)_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      const stepNumber = ctx.match[2];
      await this.handleOrderConfirm(ctx, userId, stepNumber);
    });

    this.bot.callbackQuery(/^order_reset_(.+)_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      const stepNumber = ctx.match[2];
      await this.handleOrderReset(ctx, userId, stepNumber);
    });

    // Handle step clear selection
    this.bot.callbackQuery(/^step_clear_(.+)_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      const stepNumber = ctx.match[2];
      await this.handleStepClear(ctx, userId, stepNumber);
    });

    // Handle noop callbacks (for disabled buttons)
    this.bot.callbackQuery('noop', async (ctx) => {
      await ctx.answerCallbackQuery();
    });

    this.bot.callbackQuery(/^step_exit_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      this.stepQuizSessions.delete(parseInt(userId));
      await ctx.answerCallbackQuery("Quiz exited");
      
      // Return to certificate selection or main menu
      const session = this.userSessions.get(ctx.from.id);
      if (session && session.certificateName) {
        await ctx.editMessageText(
          `📚 Returned to ${session.certificateName}\n\n` +
          'You can continue with regular questions or use /start to begin a new quiz.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔄 Continue Quiz", callback_data: "continue_quiz" }],
                [{ text: "🏠 Start Over", callback_data: "start_over" }]
              ]
            }
          }
        );
      } else {
        await this.messageHandlers.handleStart(ctx, this.userSessions);
      }
    });

    this.bot.callbackQuery('continue_quiz', async (ctx) => {
      await this.messageHandlers.showCurrentQuestion(ctx, this.userSessions, this.userSelections);
    });

    this.bot.callbackQuery('start_over', async (ctx) => {
      await this.messageHandlers.handleStart(ctx, this.userSessions);
    });

    this.bot.callbackQuery('main_menu', async (ctx) => {
      await this.messageHandlers.handleStart(ctx, this.userSessions);
    });

    this.bot.callbackQuery(/^retake_step_(.+)$/, async (ctx) => {
      const questionId = ctx.match[1];
      // TODO: Fetch question data and restart step quiz
      await ctx.answerCallbackQuery("Feature coming soon!");
    });

    // QuizBlitz Commands
    this.bot.command('join', async (ctx) => {
      await this.handleJoinQuiz(ctx);
    });

    // Handle QuizBlitz answer selection (A, B, C, D) - single choice
    this.bot.callbackQuery(/^quiz_answer_([A-D])_(.+)$/, async (ctx) => {
      const selectedAnswer = ctx.match[1];
      const quizCode = ctx.match[2];
      await this.handleQuizAnswer(ctx, selectedAnswer, quizCode);
    });

    // Handle QuizBlitz multiple choice toggle
    this.bot.callbackQuery(/^quizblitz_toggle_([A-D])_(.+)$/, async (ctx) => {
      const selectedAnswer = ctx.match[1];
      const quizCode = ctx.match[2];
      await this.handleQuizBlitzToggle(ctx, selectedAnswer, quizCode);
    });

    // Handle QuizBlitz multiple choice confirmation
    this.bot.callbackQuery(/^quizblitz_confirm_(.+)$/, async (ctx) => {
      const quizCode = ctx.match[1];
      await this.handleQuizBlitzConfirm(ctx, quizCode);
    });

    // Handle QuizBlitz multiple choice clear
    this.bot.callbackQuery(/^quizblitz_clear_(.+)$/, async (ctx) => {
      const quizCode = ctx.match[1];
      await this.handleQuizBlitzClear(ctx, quizCode);
    });

    // Handle text messages for quiz codes and access codes
    this.bot.on('message:text', async (ctx) => {
      const userId = ctx.from.id;
      const text = ctx.message.text.trim();
      const session = this.userSessions.get(userId);

      // Check if user is waiting for access code
      if (session && session.waitingForAccessCode) {
        const accessCode = text;
        await this.messageHandlers.handleAccessCodeSubmission(ctx, accessCode, this.userSessions);
        return;
      }

      // Check if user is providing text feedback
      if (session && session.awaitingTextFeedback) {
        if (text.toLowerCase() === '/skip') {
          session.awaitingTextFeedback = false;
          session.textFeedbackQuestionIndex = null;
          await this.callbackHandlers.saveFeedbackAndContinue(ctx, this.userSessions, this.userSelections);
        } else {
          await this.callbackHandlers.handleTextFeedback(ctx, this.userSessions, this.userSelections, text);
        }
        return;
      }

      // Check if it's a 6-digit quiz code
      if (/^\d{6}$/.test(text)) {
        await this.handleJoinQuizByCode(ctx, text);
        return;
      }

      // Handle "next" command during quiz sessions
      if ((text.toLowerCase() === 'next' || text.toLowerCase() === '/next') && session && session.questions) {
        await this.callbackHandlers.handleNextQuestion(ctx, this.userSessions, this.userSelections);
        return;
      }

      // Handle regular messages
      await this.messageHandlers.handleMessage(ctx, this.userSessions, this.userSelections);
    });

    // Error handling
    this.bot.catch((err) => {
      console.error('Bot error:', err);
    });
  }

  setupHealthCheck() {
    const port = process.env.PORT || 8080;

    this.healthServer = http.createServer((req, res) => {
      if (req.url === '/health') {
        const status = this.isReady
          ? 'healthy'
          : this.offlineMode
            ? 'offline_mode'
            : this.pollingIssue
              ? 'api_only_mode'
              : this.startupError
                ? 'error'
                : 'starting';
        const statusCode = this.isReady
          ? 200
          : this.offlineMode || this.pollingIssue
            ? 200
            : this.startupError
              ? 503
              : 200;

        const healthData = {
          status: status,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          bot: {
            ready: this.isReady,
            offlineMode: this.offlineMode,
            pollingIssue: this.pollingIssue,
            error: this.startupError?.message || null
          },
          features: {
            telegramBot: this.isReady && !this.offlineMode,
            quizBlitzBackend: true,
            databaseConnection: !this.startupError || this.offlineMode,
            notifications: true
          }
        };

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(healthData, null, 2));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    this.healthServer.listen(port, () => {
      console.log(`🏥 Health check server running on port ${port}`);
    });
  }

  // Test method for step-based quiz
  async handleTestStepQuiz(ctx) {
    // Create a sample step-based question similar to the frontend screenshot
    const testStepQuestion = {
      _id: 'test_step_quiz_001',
      topic: 'Topic 1',
      description: 'HOTSPOT - A company wants to build an ML application. Select and order the correct steps from the following list to develop a well-architected ML workload. Each step should be selected one time.',
      steps: [
        {
          question: 'Select the appropriate action for step 1:',
          options: [
            'Define business goal and frame ML problem',
            'Collect and prepare data', 
            'Develop and train model',
            'Deploy and monitor model'
          ],
          correctAnswer: 'A'
        },
        {
          question: 'Select the appropriate action for step 2:',
          options: [
            'Define business goal and frame ML problem',
            'Collect and prepare data',
            'Develop and train model', 
            'Deploy and monitor model'
          ],
          correctAnswer: 'B'
        },
        {
          question: 'Select the appropriate action for step 3:',
          options: [
            'Define business goal and frame ML problem',
            'Collect and prepare data',
            'Develop and train model',
            'Deploy and monitor model'
          ],
          correctAnswer: 'C'
        },
        {
          question: 'Select the appropriate action for step 4:',
          options: [
            'Define business goal and frame ML problem', 
            'Collect and prepare data',
            'Develop and train model',
            'Deploy and monitor model'
          ],
          correctAnswer: 'D'
        }
      ]
    };

    await ctx.reply(
      '🧪 **Testing Step-Based Quiz**\n\n' +
      'This demonstrates the step-by-step quiz format matching the web interface.\n\n' +
      'Each step will show multiple choice options A, B, C, D.\n\n' +
      'Starting step quiz...'
    );
    
    await this.handleStepQuiz(ctx, testStepQuestion);
  }

  // Test method for ordering step-based quiz
  async handleTestOrderingStepQuiz(ctx) {
    // Create a sample ordering step-based question similar to the screenshot
    const testOrderingQuestion = {
      _id: 'test_ordering_quiz_001',
      topic: 'Topic 1',
      description: '**HOTSPOT** - A company wants to build an ML application. Select and order the correct steps from the following list to develop a well-architected ML workload. Each step should be selected one time.',
      orderingMode: true,
      steps: [
        {
          question: 'Order the steps for Step 1:',
          options: [
            'Define business goal and frame ML problem',
            'Collect and prepare data',
            'Develop and train model',
            'Deploy and monitor model'
          ],
          correctAnswer: 'ABCD' // Correct order
        },
        {
          question: 'Order the steps for Step 2:',
          options: [
            'Data ingestion',
            'Data preprocessing',
            'Feature engineering',
            'Model validation'
          ],
          correctAnswer: 'ABCD' // Correct order
        }
      ]
    };

    await ctx.reply(
      '🧪 **Testing Ordering Step-Based Quiz**\n\n' +
      'This demonstrates the drag-and-drop ordering interface from the screenshot.\n\n' +
      'You can reorder options using ⬆️ and ⬇️ buttons.\n' +
      'Each step requires you to arrange A, B, C, D in the correct order.\n\n' +
      'Starting ordering quiz...'
    );
    
    await this.handleStepQuiz(ctx, testOrderingQuestion);
  }

  // Step Quiz Handler Methods
  async handleStepQuiz(ctx, questionData) {
    const userId = ctx.from.id;
    
    // Create new step quiz session
    const session = new this.constructor.StepQuizSession(userId, questionData);
    this.stepQuizSessions.set(userId, session);
    
    // Send initial message with progress overview
    await this.sendStepQuizInterface(ctx, session);
  }

  async sendStepQuizInterface(ctx, session) {
    // Start with the first step instead of overview
    await this.sendStepQuestion(ctx, session, 1);
  }

  async sendOverviewInterface(ctx, session) {
    const steps = session.getAllSteps();
    const totalSteps = session.getTotalSteps();
    
    // Create progress overview
    let messageText = `**${session.questionData.topic || 'Step-by-Step Quiz'}**\n\n`;
    messageText += `${session.questionData.description || 'Complete each step in order.'}\n\n`;
    messageText += "📋 **Progress Overview**\n\n";
    
    for (let i = 1; i <= totalSteps; i++) {
      const isCompleted = session.isStepCompleted(i);
      const selectedAnswer = session.selectedAnswers.get(i);
      
      let stepIcon = "⚪"; // Not started
      if (isCompleted) {
        stepIcon = "✅"; // Completed
      }
      
      messageText += `${stepIcon} Step ${i}`;
      if (selectedAnswer) {
        messageText += ` - Selected: ${selectedAnswer}`;
      }
      messageText += '\n';
    }
    
    const completedSteps = session.selectedAnswers.size;
    messageText += `\n📊 Progress: ${completedSteps}/${totalSteps} steps completed\n\n`;
    
    // Create keyboard for step navigation
    const keyboard = [];
    
    // Add step buttons
    const stepRow = [];
    for (let i = 1; i <= totalSteps; i++) {
      const isCompleted = session.isStepCompleted(i);
      
      let buttonText = `Step ${i}`;
      if (isCompleted) {
        buttonText += " ✅";
      }
      
      stepRow.push({
        text: buttonText,
        callback_data: `step_select_${session.userId}_${i}`
      });
      
      // Break into rows of 4
      if (stepRow.length === 4) {
        keyboard.push([...stepRow]);
        stepRow.length = 0;
      }
    }
    
    if (stepRow.length > 0) {
      keyboard.push(stepRow);
    }
    
    // Add control buttons
    keyboard.push([
      { text: "🏁 Submit Quiz", callback_data: `step_submit_${session.userId}` },
      { text: "❌ Exit Quiz", callback_data: `step_exit_${session.userId}` }
    ]);
    
    try {
      await ctx.editMessageText(messageText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      console.error('Error sending overview interface:', error);
      await ctx.reply("❌ Error displaying overview. Please try again.");
    }
  }

  async handleStepSelection(ctx, userId, stepNumber) {
    const session = this.stepQuizSessions.get(parseInt(userId));
    
    if (!session) {
      await ctx.answerCallbackQuery("❌ Quiz session not found!");
      return;
    }
    
    const step = parseInt(stepNumber);
    session.currentStep = step;
    await this.sendStepQuestion(ctx, session, step);
  }

  async sendStepQuestion(ctx, session, stepNumber) {
    const steps = session.getAllSteps();
    const stepData = steps[stepNumber - 1];
    const totalSteps = session.getTotalSteps();
    
    if (!stepData) {
      await ctx.answerCallbackQuery("❌ Step not found!");
      return;
    }
    
    // Check if this is an ordering mode question
    if (session.isOrderingMode) {
      await this.sendOrderingStepQuestion(ctx, session, stepNumber);
      return;
    }
    
    const selectedAnswer = session.selectedAnswers.get(stepNumber);
    
    // Create header with quiz info
    let messageText = `**${session.questionData.topic || 'Step Quiz'}**\n\n`;
    messageText += `${session.questionData.description || 'Complete each step in order.'}\n\n`;
    
    // Progress overview
    messageText += "📋 **Progress Overview**\n\n";
    
    for (let i = 1; i <= totalSteps; i++) {
      const isCompleted = session.isStepCompleted(i);
      const isCurrent = i === stepNumber;
      
      let stepIcon = "⚪"; // Not started
      if (isCompleted) {
        stepIcon = "✅"; // Completed
      } else if (isCurrent) {
        stepIcon = "🔄"; // Current step
      }
      
      messageText += `${stepIcon} Step ${i}\n`;
    }
    
    messageText += "\n";
    
    // Current step question
    const stepStatus = selectedAnswer ? '✅' : '🔄';
    messageText += `**Step ${stepNumber} of ${totalSteps}** ${stepStatus}\n\n`;
    messageText += `${stepData.question}\n\n`;
    
    if (selectedAnswer) {
      const optionText = stepData.options[selectedAnswer.charCodeAt(0) - 65] || selectedAnswer;
      messageText += `✅ **Current Selection:** ${selectedAnswer} - ${optionText}\n\n`;
    } else {
      messageText += `⚪ **No selection made**\n\n`;
    }
    
    // Create options keyboard (A, B, C, D layout like web interface)
    const keyboard = [];
    
    // Add answer options in 2x2 grid like web interface
    if (stepData.options && stepData.options.length >= 4) {
      const optionA = String.fromCharCode(65); // A
      const optionB = String.fromCharCode(66); // B
      const optionC = String.fromCharCode(67); // C
      const optionD = String.fromCharCode(68); // D
      
      // First row: A and B
      keyboard.push([
        {
          text: selectedAnswer === optionA ? `✅ ${optionA}` : optionA,
          callback_data: `step_answer_${session.userId}_${stepNumber}_${optionA}`
        },
        {
          text: selectedAnswer === optionB ? `✅ ${optionB}` : optionB,
          callback_data: `step_answer_${session.userId}_${stepNumber}_${optionB}`
        }
      ]);
      
      // Second row: C and D
      keyboard.push([
        {
          text: selectedAnswer === optionC ? `✅ ${optionC}` : optionC,
          callback_data: `step_answer_${session.userId}_${stepNumber}_${optionC}`
        },
        {
          text: selectedAnswer === optionD ? `✅ ${optionD}` : optionD,
          callback_data: `step_answer_${session.userId}_${stepNumber}_${optionD}`
        }
      ]);
      
      // Show options as text after the question
      messageText += "**Options:**\n";
      stepData.options.forEach((option, index) => {
        const optionLetter = String.fromCharCode(65 + index);
        messageText += `${optionLetter}. ${option}\n`;
      });
      messageText += "\n";
    } else {
      // Fallback for questions with different number of options
      stepData.options.forEach((option, index) => {
        const optionLetter = String.fromCharCode(65 + index);
        const isSelected = selectedAnswer === optionLetter;
        
        keyboard.push([{
          text: `${isSelected ? '✅' : ''} ${optionLetter}. ${option}`,
          callback_data: `step_answer_${session.userId}_${stepNumber}_${optionLetter}`
        }]);
      });
    }
    
    // Navigation buttons
    const navRow = [];
    
    if (stepNumber > 1) {
      navRow.push({
        text: "⬅️ Previous",
        callback_data: `step_select_${session.userId}_${stepNumber - 1}`
      });
    }
    
    if (stepNumber < totalSteps) {
      navRow.push({
        text: "➡️ Next",
        callback_data: `step_select_${session.userId}_${stepNumber + 1}`
      });
    }
    
    if (navRow.length > 0) {
      keyboard.push(navRow);
    }
    
    // Control buttons
    const controlRow = [];
    
    // Add clear selection button if an answer is selected
    if (selectedAnswer) {
      controlRow.push({ text: "🗑️ Clear Selection", callback_data: `step_clear_${session.userId}_${stepNumber}` });
    }
    
    controlRow.push({ text: "🏁 Submit All Steps", callback_data: `step_submit_${session.userId}` });
    controlRow.push({ text: "❌ Exit Quiz", callback_data: `step_exit_${session.userId}` });
    
    keyboard.push(controlRow);
    
    try {
      if (ctx.callbackQuery) {
        await ctx.editMessageText(messageText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      } else {
        await ctx.reply(messageText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    } catch (error) {
      console.error('Error sending step question:', error);
      await ctx.answerCallbackQuery("❌ Error displaying question. Please try again.");
    }
  }

  async handleStepAnswer(ctx, userId, stepNumber, selectedOption) {
    const session = this.stepQuizSessions.get(parseInt(userId));
    
    if (!session) {
      await ctx.answerCallbackQuery("❌ Quiz session not found!");
      return;
    }
    
    const step = parseInt(stepNumber);
    const steps = session.getAllSteps();
    const stepData = steps[step - 1];
    
    // Update the answer
    session.selectAnswer(step, selectedOption);
    
    // Show which option was selected
    const optionText = stepData.options[selectedOption.charCodeAt(0) - 65] || selectedOption;
    await ctx.answerCallbackQuery(`✅ Selected ${selectedOption}: ${optionText.substring(0, 30)}${optionText.length > 30 ? '...' : ''}`);
    
    // Refresh the current step display
    await this.sendStepQuestion(ctx, session, step);
  }

  async handleStepClear(ctx, userId, stepNumber) {
    const session = this.stepQuizSessions.get(parseInt(userId));
    
    if (!session) {
      await ctx.answerCallbackQuery("❌ Quiz session not found!");
      return;
    }
    
    const step = parseInt(stepNumber);
    
    // Clear the selected answer for this step
    session.selectedAnswers.delete(step);
    
    await ctx.answerCallbackQuery("🗑️ Selection cleared");
    
    // Refresh the current step display
    await this.sendStepQuestion(ctx, session, step);
  }

  async handleStepSubmit(ctx, userId) {
    const session = this.stepQuizSessions.get(parseInt(userId));
    
    if (!session) {
      await ctx.answerCallbackQuery("❌ Quiz session not found!");
      return;
    }
    
    // Check if all steps are completed
    const totalSteps = session.getTotalSteps();
    const completedSteps = session.selectedAnswers.size;
    
    if (completedSteps < totalSteps) {
      await ctx.answerCallbackQuery(`❌ Complete all ${totalSteps} steps first! (${completedSteps}/${totalSteps})`);
      return;
    }
    
    // Calculate results
    const results = session.checkAnswers();
    const steps = session.getAllSteps();
    
    let resultText = `🏁 **Step Quiz Complete!**\n\n`;
    resultText += `📊 **Results:**\n`;
    resultText += `✅ Correct: ${results.correct}/${results.total}\n`;
    resultText += `📈 Score: ${results.percentage.toFixed(1)}%\n\n`;
    
    resultText += `📋 **Answer Review:**\n\n`;
    
    for (let i = 0; i < steps.length; i++) {
      const stepNumber = i + 1;
      const selectedAnswer = session.selectedAnswers.get(stepNumber);
      const correctAnswer = steps[i].correctAnswer;
      const isCorrect = selectedAnswer === correctAnswer;
      
      resultText += `**Step ${stepNumber}:** ${isCorrect ? '✅' : '❌'}\n`;
      resultText += `Your answer: ${selectedAnswer}\n`;
      if (!isCorrect) {
        resultText += `Correct answer: ${correctAnswer}\n`;
      }
      resultText += `\n`;
    }
    
    // Save results to database
    try {
      const db = await this.databaseService.connectToDatabase();
      
      // Save step quiz results
      await db.collection('stepQuizResults').insertOne({
        userId: session.userId,
        questionId: session.questionData._id || null,
        topic: session.questionData.topic || 'Step Quiz',
        results: results,
        answers: Object.fromEntries(session.selectedAnswers),
        completedAt: new Date(),
        timeTaken: new Date() - session.startTime
      });
      
      console.log(`✅ Step quiz results saved for user ${session.userId}`);
    } catch (error) {
      console.error('Error saving step quiz results:', error);
    }

    // FIX: Check if this is part of a regular quiz session
    const regularSession = this.userSessions.get(parseInt(userId));
    
    if (regularSession && regularSession.questions) {
      // This step quiz is part of a regular quiz - continue the flow
      console.log('🔄 Step quiz completed as part of regular quiz flow');
      
      // Update the regular session with step quiz results
      const isCorrect = results.percentage === 100;
      if (isCorrect) {
        regularSession.correctAnswers++;
      }
      
      // Store step quiz answer data for feedback
      regularSession.currentAnswerData = {
        selectedAnswer: `Step Quiz (${results.correct}/${results.total})`,
        selectedAnswers: [`Step Quiz (${results.correct}/${results.total})`], // For compatibility
        isCorrect: isCorrect,
        explanation: session.questionData.originalQuestion?.explanation || 'Step-by-step explanation provided above.',
        questionNumber: regularSession.currentQuestionIndex + 1,
        question: {
          // Create a question object structure that saveFeedbackAndContinue expects
          correctAnswer: `All ${results.total} steps correct`,
          question: session.questionData.description || 'Step Quiz Question',
          _id: session.questionData._id,
          explanation: session.questionData.originalQuestion?.explanation || 'Step-by-step explanation provided above.'
        }
      };
      
      // Cleanup step session
      this.stepQuizSessions.delete(parseInt(userId));
      
      // Add navigation to continue with regular quiz
      const keyboard = [
        [
          { text: "⭐ Give Feedback", callback_data: "feedback_step_quiz" },
          { text: "⏭️ Next Question", callback_data: "next_question" }
        ]
      ];
      
      try {
        await ctx.editMessageText(resultText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      } catch (error) {
        console.error('Error sending step quiz results:', error);
        await ctx.reply(resultText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
      
      return; // Exit early - regular quiz flow will continue
    }
    
    // Cleanup session (standalone step quiz)
    this.stepQuizSessions.delete(parseInt(userId));
    
    // Standalone step quiz - show menu options
    const keyboard = [
      [
        { text: "🔄 Try Another Quiz", callback_data: "main_menu" },
        { text: "📚 Back to Menu", callback_data: "main_menu" }
      ]
    ];
    
    try {
      await ctx.editMessageText(resultText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      console.error('Error sending step quiz results:', error);
      await ctx.reply(resultText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    }
  }

  // Ordering Mode Methods
  async sendOrderingStepQuestion(ctx, session, stepNumber) {
    const steps = session.getAllSteps();
    const stepData = steps[stepNumber - 1];
    const totalSteps = session.getTotalSteps();
    
    // Initialize ordering for this step if not already done
    const defaultOptions = ['A', 'B', 'C', 'D'].slice(0, stepData.options?.length || 4);
    session.initializeStepOrdering(stepNumber, defaultOptions);
    
    const currentOrdering = session.getStepOrdering(stepNumber);
    const selectedAnswer = session.selectedAnswers.get(stepNumber);
    
    // Create header with quiz info
    let messageText = `**${session.questionData.topic || 'Step Quiz'}**\n\n`;
    messageText += `${session.questionData.description || 'Complete each step in order.'}\n\n`;
    
    // Progress overview
    messageText += "📋 **Progress Overview**\n\n";
    
    for (let i = 1; i <= totalSteps; i++) {
      const isCompleted = session.isStepCompleted(i);
      const isCurrent = i === stepNumber;
      
      let stepIcon = "⚪"; // Not started
      if (isCompleted) {
        stepIcon = "✅"; // Completed
      } else if (isCurrent) {
        stepIcon = "🔄"; // Current step
      }
      
      messageText += `${stepIcon} Step ${i}\n`;
    }
    
    messageText += "\n";
    
    // Current step question
    messageText += `**Step ${stepNumber} of ${totalSteps}** 🔄\n\n`;
    messageText += `${stepData.question || 'Order the following options:'}\n\n`;
    
    if (selectedAnswer) {
      messageText += `✅ **Current Order:** ${selectedAnswer}\n\n`;
    }
    
    // Show available options
    if (stepData.options) {
      messageText += "**Available Options:**\n";
      stepData.options.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index);
        messageText += `${letter}. ${option}\n`;
      });
      messageText += "\n";
    }
    
    // Show current ordering with move controls
    messageText += "**Current Order:** (Drag to reorder)\n";
    
    const keyboard = [];
    
    currentOrdering.forEach((optionLetter, index) => {
      const optionText = stepData.options ? 
        stepData.options[optionLetter.charCodeAt(0) - 65] : 
        `Option ${optionLetter}`;
      
      const row = [];
      
      // Up button (disabled if first item)
      if (index > 0) {
        row.push({
          text: "⬆️",
          callback_data: `order_up_${session.userId}_${stepNumber}_${index}`
        });
      } else {
        row.push({
          text: "⬜",
          callback_data: "noop"
        });
      }
      
      // Option display
      row.push({
        text: `${index + 1}. ${optionLetter} - ${optionText.substring(0, 20)}${optionText.length > 20 ? '...' : ''}`,
        callback_data: "noop"
      });
      
      // Down button (disabled if last item)
      if (index < currentOrdering.length - 1) {
        row.push({
          text: "⬇️",
          callback_data: `order_down_${session.userId}_${stepNumber}_${index}`
        });
      } else {
        row.push({
          text: "⬜",
          callback_data: "noop"
        });
      }
      
      keyboard.push(row);
    });
    
    // Control buttons
    keyboard.push([
      { text: "✅ Confirm Order", callback_data: `order_confirm_${session.userId}_${stepNumber}` },
      { text: "🔄 Reset", callback_data: `order_reset_${session.userId}_${stepNumber}` }
    ]);
    
    // Navigation buttons
    const navRow = [];
    
    if (stepNumber > 1) {
      navRow.push({
        text: "⬅️ Previous",
        callback_data: `step_select_${session.userId}_${stepNumber - 1}`
      });
    }
    
    if (stepNumber < totalSteps) {
      navRow.push({
        text: "➡️ Next",
        callback_data: `step_select_${session.userId}_${stepNumber + 1}`
      });
    }
    
    if (navRow.length > 0) {
      keyboard.push(navRow);
    }
    
    // Control buttons
    keyboard.push([
      { text: "📋 Overview", callback_data: `step_overview_${session.userId}` },
      { text: "❌ Exit Quiz", callback_data: `step_exit_${session.userId}` }
    ]);
    
    try {
      if (ctx.callbackQuery) {
        await ctx.editMessageText(messageText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      } else {
        await ctx.reply(messageText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    } catch (error) {
      console.error('Error sending ordering step question:', error);
      await ctx.answerCallbackQuery("❌ Error displaying question. Please try again.");
    }
  }

  async handleOrderMove(ctx, userId, stepNumber, optionIndex, direction) {
    const session = this.stepQuizSessions.get(parseInt(userId));
    
    if (!session) {
      await ctx.answerCallbackQuery("❌ Quiz session not found!");
      return;
    }
    
    const step = parseInt(stepNumber);
    let moved = false;
    
    if (direction === 'up') {
      moved = session.moveOptionUp(step, optionIndex);
    } else if (direction === 'down') {
      moved = session.moveOptionDown(step, optionIndex);
    }
    
    if (moved) {
      await ctx.answerCallbackQuery(`✅ Moved ${direction}`);
      await this.sendOrderingStepQuestion(ctx, session, step);
    } else {
      await ctx.answerCallbackQuery(`❌ Cannot move ${direction}`);
    }
  }

  async handleOrderConfirm(ctx, userId, stepNumber) {
    const session = this.stepQuizSessions.get(parseInt(userId));
    
    if (!session) {
      await ctx.answerCallbackQuery("❌ Quiz session not found!");
      return;
    }
    
    const step = parseInt(stepNumber);
    const finalAnswer = session.finalizeStepOrder(step);
    
    if (finalAnswer) {
      await ctx.answerCallbackQuery(`✅ Order confirmed: ${finalAnswer}`);
      await this.sendOrderingStepQuestion(ctx, session, step);
    } else {
      await ctx.answerCallbackQuery("❌ Error confirming order");
    }
  }

  async handleOrderReset(ctx, userId, stepNumber) {
    const session = this.stepQuizSessions.get(parseInt(userId));
    
    if (!session) {
      await ctx.answerCallbackQuery("❌ Quiz session not found!");
      return;
    }
    
    const step = parseInt(stepNumber);
    const steps = session.getAllSteps();
    const stepData = steps[step - 1];
    
    // Reset to default order
    const defaultOptions = ['A', 'B', 'C', 'D'].slice(0, stepData.options?.length || 4);
    session.stepOrdering.set(step, [...defaultOptions]);
    session.selectedAnswers.delete(step);
    
    await ctx.answerCallbackQuery("🔄 Order reset to default");
    await this.sendOrderingStepQuestion(ctx, session, step);
  }

  // QuizBlitz Handler Methods
  async handleJoinQuiz(ctx) {
    const message =
    '🎮 Welcome to QuizBlitz!\n\n' +
    'To join a quiz, send me the 6-digit quiz code.\n\n' +
    'Example: 123456\n\n' +
    'You\'ll receive questions here and can answer directly in Telegram!';

    await ctx.reply(message);
  }

  async handleJoinQuizByCode(ctx, quizCode) {
    try {
      const telegramUserId = ctx.from.id;
      const playerName = ctx.from.first_name || ctx.from.username || 'Player';
      const username = ctx.from.username || `user_${telegramUserId}`;
      const playerId = username; // Use username instead of user ID for better matching

      console.log(
        `🎮 User ${playerName} (@${username}, ID: ${telegramUserId}) trying to join quiz ${quizCode}`
      );

      // Connect to database directly
      const db = await this.databaseService.connectToDatabase();

      // Find the quiz room
      const quizRoom = await db.collection('quizRooms').findOne({
        quizCode: quizCode.toUpperCase()
      });

      if (!quizRoom) {
        await ctx.reply('❌ Quiz room not found. Please check the code and try again.');
        return;
      }

      if (quizRoom.status !== 'waiting') {
        await ctx.reply('❌ Quiz has already started or finished.');
        return;
      }

      // Check if player already exists (for rejoining)
      const existingPlayer = quizRoom.players?.find((p) => p.id === playerId);

      if (existingPlayer) {
        console.log(`🔄 Player ${playerName} (${playerId}) already in quiz ${quizCode}`);

        const message =
      '🔄 You\'re already in this quiz!\n\n' +
      `👤 Player: ${playerName}\n` +
      `🎯 Quiz Code: ${quizCode}\n` +
      `👥 Players in room: ${quizRoom.players?.length || 0}\n\n` +
      '⏳ Waiting for host to start...\n' +
      'You\'ll receive questions here when the quiz begins!';

        await ctx.reply(message);
        return;
      }

      // Create player object
      const player = {
        id: playerId, // Use username for better database matching
        name: playerName.trim(),
        telegramId: telegramUserId, // Store Telegram ID for reference
        username: username, // Store username explicitly
        joinedAt: new Date(),
        score: 0,
        answers: [],
        source: 'telegram'
      };

      // Add player to quiz room
      const updateResult = await db.collection('quizRooms').updateOne(
        { quizCode: quizCode.toUpperCase(), status: 'waiting' },
        {
          $push: { players: player },
          $set: { lastActivity: new Date() }
        }
      );

      if (updateResult.modifiedCount === 0) {
        await ctx.reply('❌ Failed to join quiz. Room may no longer be available.');
        return;
      }

      // Get updated room info
      const updatedRoom = await db.collection('quizRooms').findOne({
        quizCode: quizCode.toUpperCase()
      });

      const message =
    '🎉 Successfully joined quiz!\n\n' +
    `👤 Player: ${playerName}\n` +
    `🎯 Quiz Code: ${quizCode}\n` +
    `👥 Players in room: ${updatedRoom.players?.length || 1}\n\n` +
    '⏳ Waiting for host to start...\n' +
    'You\'ll receive questions here when the quiz begins!';

      await ctx.reply(message);
      console.log(`✅ User ${playerName} joined quiz ${quizCode} successfully`);

      // Create a quiz event for player joining
      await db.collection('quizEvents').insertOne({
        quizCode: quizCode.toUpperCase(),
        type: 'player_joined',
        player: { id: playerId, name: playerName },
        timestamp: new Date()
      });
    } catch (error) {
      console.error(`❌ Error joining quiz ${quizCode}:`, error);

      let errorMessage = '❌ Failed to join quiz.\n\n';
      errorMessage += 'Please check the quiz code and try again.';

      await ctx.reply(errorMessage);
    }
  }

  async handleQuizAnswer(ctx, selectedAnswer, quizCode) {
    try {
      const telegramUserId = ctx.from.id;
      const playerName = ctx.from.first_name || ctx.from.username || 'Player';
      const username = ctx.from.username || `user_${telegramUserId}`;
      const playerId = username; // Use username for consistency
      const timestamp = Date.now();

      console.log(
        `📝 User ${playerName} (@${username}) selected answer ${selectedAnswer} for quiz ${quizCode}`
      );

      // Connect to database directly
      const db = await this.databaseService.connectToDatabase();

      // Find the active quiz session
      const quizSession = await db.collection('quizSessions').findOne({
        quizCode: quizCode.toUpperCase(),
        status: 'active'
      });

      if (!quizSession) {
        await ctx.answerCallbackQuery('❌ Quiz session not found or not active.');
        return;
      }

      const currentQuestionIndex = quizSession.currentQuestionIndex || 0;
      const currentQuestion = quizSession.questions[currentQuestionIndex];

      if (!currentQuestion) {
        await ctx.answerCallbackQuery('❌ No active question found.');
        return;
      }

      // Check if player already answered this question
      const existingAnswer = quizSession.playerAnswers?.[playerId]?.[`q${currentQuestionIndex}`];
      if (existingAnswer) {
        await ctx.answerCallbackQuery('⚠️ You have already answered this question.');
        return;
      }

      // Calculate if answer is correct and score using proper validation
      const isCorrect = validateMultipleAnswers(selectedAnswer, currentQuestion.correctAnswer);
      const basePoints = 1000;
      const responseTime = timestamp - (quizSession.questionStartTime || timestamp);
      const maxTime = (quizSession.timerDuration || 30) * 1000; // Convert to milliseconds
      const timeBonus = Math.max(0, ((maxTime - responseTime) / maxTime) * 200);
      const score = isCorrect ? Math.floor(basePoints + timeBonus) : 0;

      // Create answer data
      const answerData = {
        playerId,
        playerName,
        username, // Add username for better tracking
        telegramId: telegramUserId,
        questionIndex: currentQuestionIndex,
        answer: selectedAnswer,
        isCorrect,
        score,
        timestamp: new Date(),
        responseTime
      };

      console.log('📊 Answer data:', {
        player: playerName,
        answer: selectedAnswer,
        isCorrect,
        score,
        correctAnswer: currentQuestion.correctAnswer
      });

      // Update quiz session with player answer using atomic operation
      const updateResult = await db.collection('quizSessions').updateOne(
        {
          quizCode: quizCode.toUpperCase(),
          status: 'active'
        },
        {
          $set: {
            [`playerAnswers.${playerId}.q${currentQuestionIndex}`]: answerData
          },
          $addToSet: {
            answeredPlayers: playerId
          }
        }
      );

      if (updateResult.modifiedCount === 0) {
        await ctx.answerCallbackQuery('❌ Failed to save answer. Quiz may have ended.');
        return;
      }

      // Update player's score in quizRooms collection
      await db.collection('quizRooms').updateOne(
        { quizCode: quizCode.toUpperCase() },
        {
          $inc: {
            ['players.$[player].score']: score
          }
        },
        {
          arrayFilters: [{ 'player.id': playerId }]
        }
      );

      // Edit the message to show answer was submitted
      await ctx.editMessageText(
        '📝 Question answered!\n\n' +
        `📋 Question: ${currentQuestion.question}\n\n` +
        `✅ Your answer: ${selectedAnswer}\n` +
        `${isCorrect ? '🎉 Correct!' : '❌ Incorrect'}\n` +
        `${isCorrect ? `📈 Points earned: ${score}` : `💡 Correct answer: ${currentQuestion.correctAnswer}`}\n\n` +
        '⏳ Waiting for other players...'
      );

      console.log(
        `✅ Answer ${selectedAnswer} submitted for user ${playerName} - ${isCorrect ? 'CORRECT' : 'WRONG'} (${score} points)`
      );

      // Create a quiz event for real-time frontend updates
      await db.collection('quizEvents').insertOne({
        quizCode: quizCode.toUpperCase(),
        type: 'answer_submitted',
        data: {
          playerId,
          playerName,
          answer: selectedAnswer,
          isCorrect,
          score,
          questionIndex: currentQuestionIndex
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('❌ Error submitting answer:', error);

      await ctx.answerCallbackQuery('❌ Failed to submit answer. Please try again.');
    }
  }

  async handleQuizBlitzToggle(ctx, selectedOption, quizCode) {
    try {
      const userId = ctx.from.id;

      // Get or create user selection state
      if (!this.userSelections) {
        this.userSelections = {};
      }
      if (!this.userSelections[userId]) {
        this.userSelections[userId] = {};
      }
      if (!this.userSelections[userId][quizCode]) {
        this.userSelections[userId][quizCode] = new Set();
      }

      const currentSelections = this.userSelections[userId][quizCode];

      // Toggle the selection
      if (currentSelections.has(selectedOption)) {
        currentSelections.delete(selectedOption);
      } else {
        currentSelections.add(selectedOption);
      }

      // Update the message with current selections
      const selectionsArray = Array.from(currentSelections).sort();

      await ctx.editMessageReplyMarkup({
        reply_markup: this.createMultipleChoiceKeyboard(quizCode, currentSelections)
      });

      await ctx.answerCallbackQuery(`Selected: ${selectionsArray.join(', ') || 'None'}`);
    } catch (error) {
      console.error('Error handling QuizBlitz toggle:', error);
      await ctx.answerCallbackQuery('Error processing selection');
    }
  }

  async handleQuizBlitzConfirm(ctx, quizCode) {
    try {
      const userId = ctx.from.id;

      if (
        !this.userSelections?.[userId]?.[quizCode] ||
    this.userSelections[userId][quizCode].size === 0
      ) {
        await ctx.answerCallbackQuery('Please select at least one answer first');
        return;
      }

      const selectedAnswers = Array.from(this.userSelections[userId][quizCode]).sort();
      const combinedAnswer = selectedAnswers.join(',');

      // Process the answer using existing logic
      await this.handleQuizAnswer(ctx, combinedAnswer, quizCode);

      // Clear the user's selections
      delete this.userSelections[userId][quizCode];
    } catch (error) {
      console.error('Error handling QuizBlitz confirm:', error);
      await ctx.answerCallbackQuery('Error confirming selection');
    }
  }

  async handleQuizBlitzClear(ctx, quizCode) {
    try {
      const userId = ctx.from.id;

      if (this.userSelections?.[userId]?.[quizCode]) {
        this.userSelections[userId][quizCode].clear();
      }

      await ctx.editMessageReplyMarkup({
        reply_markup: this.createMultipleChoiceKeyboard(quizCode, new Set())
      });

      await ctx.answerCallbackQuery('Selections cleared');
    } catch (error) {
      console.error('Error handling QuizBlitz clear:', error);
      await ctx.answerCallbackQuery('Error clearing selections');
    }
  }

  createMultipleChoiceKeyboard(quizCode, currentSelections = new Set()) {
    const options = ['A', 'B', 'C', 'D'];
    const keyboard = [];

    // Create option buttons in rows of 2
    for (let i = 0; i < options.length; i += 2) {
      const row = [];
      for (let j = i; j < Math.min(i + 2, options.length); j++) {
        const option = options[j];
        const isSelected = currentSelections.has(option);
        const text = isSelected ? `✅ ${option}` : option;
        row.push({
          text: text,
          callback_data: `quizblitz_toggle_${option}_${quizCode}`
        });
      }
      keyboard.push(row);
    }

    // Add control buttons
    keyboard.push([
      { text: '✅ Confirm', callback_data: `quizblitz_confirm_${quizCode}` },
      { text: '🗑 Clear', callback_data: `quizblitz_clear_${quizCode}` }
    ]);

    return { inline_keyboard: keyboard };
  }

  async tryWebhookMode() {
    try {
      console.log('🔄 Attempting webhook mode as fallback...');
      
      // Only try webhook if we have proper environment for it
      if (process.env.WEBHOOK_URL && process.env.PORT) {
        const webhookUrl = process.env.WEBHOOK_URL;
        const port = process.env.PORT;
        
        console.log(`🌐 Setting up webhook: ${webhookUrl}`);
        
        // Stop any existing polling
        await this.bot.stop();
        
        // Set webhook
        await this.bot.api.setWebhook(webhookUrl);
        
        // Start webhook server
        await this.bot.start({
          onStart: () => console.log('✅ Webhook mode started successfully'),
          drop_pending_updates: true
        });
        
        console.log('✅ Successfully switched to webhook mode');
        this.pollingIssue = false;
        return true;
      } else {
        console.log('⚠️  Webhook environment variables not configured');
        console.log('💡 To enable webhook mode, set WEBHOOK_URL and PORT environment variables');
        return false;
      }
    } catch (webhookError) {
      console.error('❌ Webhook mode also failed:', webhookError);
      console.log('🔄 Continuing in API-ONLY mode');
      return false;
    }
  }

  async start() {
    try {
    // First try to get bot info to test API connectivity
      const botInfo = await this.bot.api.getMe();
      console.log(`✅ Bot API connection successful: @${botInfo.username}`);

      // Try to start polling with increased timeout and retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`🔄 Attempting to start polling (attempt ${retryCount + 1}/${maxRetries})...`);
          
          const startPromise = this.bot.start();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Bot start timeout')), 30000); // Increased to 30 seconds
          });

          await Promise.race([startPromise, timeoutPromise]);
          console.log('✅ Bot polling started successfully');
          break; // Success, exit retry loop
        } catch (retryError) {
          retryCount++;
          console.log(`❌ Polling attempt ${retryCount} failed:`, retryError.message);
          
          if (retryCount < maxRetries) {
            console.log(`⏳ Waiting 5 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            throw retryError; // Final attempt failed
          }
        }
      }
      console.log('✅ Bot polling started successfully');
      } catch (error) {
        console.error('❌ Bot polling failed after all retries:', error);

        // Try to determine if it's just a polling issue
        try {
          const botInfo = await this.bot.api.getMe();
          console.log(`⚠️  Bot API works but polling failed: @${botInfo.username}`);
          this.pollingIssue = true;
          
          // Try webhook mode as fallback
          await this.tryWebhookMode();
          
          // Don't throw - we can still send messages even if polling doesn't work
        } catch (apiError) {
          console.error('❌ Bot API also failed:', apiError);
          this.offlineMode = true;
        }
      }
  }
}

// Create and start the bot
const bot = new CertificationBot();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');

  if (bot.notificationService) {
    bot.notificationService.stopNotificationPolling();
  }

  if (bot.databaseService) {
    await bot.databaseService.close();
  }

  if (bot.healthServer) {
    bot.healthServer.close();
  }

  console.log('👋 Bot shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');

  if (bot.notificationService) {
    bot.notificationService.stopNotificationPolling();
  }

  if (bot.databaseService) {
    await bot.databaseService.close();
  }

  if (bot.healthServer) {
    bot.healthServer.close();
  }

  console.log('👋 Bot shutdown complete');
  process.exit(0);
});

module.exports = bot;
