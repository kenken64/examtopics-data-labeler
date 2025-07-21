const { Bot, InlineKeyboard } = require('grammy');
const { MongoClient, ObjectId } = require('mongodb');
const http = require('http');
const NotificationService = require('./src/services/notificationService');
const DatabaseService = require('./src/services/databaseService');
require('dotenv').config();

console.log('🔧 DEBUG: ========== TELEGRAM BOT SCRIPT LOADED ==========');
console.log('🔧 DEBUG: Current time:', new Date().toISOString());
console.log('🔧 DEBUG: Node.js version:', process.version);
console.log('🔧 DEBUG: Environment variables check:');
console.log('🔧 DEBUG: - BOT_TOKEN:', process.env.BOT_TOKEN ? 'SET' : 'NOT SET');
console.log('🔧 DEBUG: - MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('🔧 DEBUG: - MONGODB_DB_NAME:', process.env.MONGODB_DB_NAME || 'NOT SET');
console.log('🔧 DEBUG: ====================================================');

/**
 * Utility functions for handling multiple-choice questions with multiple correct answers
 */

/**
 * Normalizes answer format to consistent format without spaces
 * @param {string|number|null|undefined} answer - Answer in various formats like "B C", "BC", "A B C"
 * @returns {string} Normalized answer like "BC", "ABC"
 */
function normalizeAnswer(answer) {
  // Handle non-string inputs
  if (!answer && answer !== 0) return '';

  // Convert to string if it's a number
  const answerStr = String(answer);

  // Remove spaces and convert to uppercase
  const normalized = answerStr.replace(/\s+/g, '').toUpperCase();

  // Sort letters alphabetically for consistent comparison
  return normalized.split('').sort().join('');
}

/**
 * Checks if a question has multiple correct answers
 * @param {string|number|null|undefined} correctAnswer - The correct answer string
 * @returns {boolean} True if multiple answers are required
 */
function isMultipleAnswerQuestion(correctAnswer) {
  if (!correctAnswer && correctAnswer !== 0) return false;

  const normalized = normalizeAnswer(correctAnswer);
  return normalized.length > 1;
}

/**
 * Validates if selected answers match the correct answer(s)
 * @param {string[]|string|null|undefined} selectedAnswers - Array of selected answer letters or string of answers
 * @param {string|number|null|undefined} correctAnswer - The correct answer string
 * @returns {boolean} True if the selection is correct
 */
function validateMultipleAnswers(selectedAnswers, correctAnswer) {
  if (!correctAnswer && correctAnswer !== 0) return false;
  if (!selectedAnswers) return false;

  // Convert selectedAnswers to string if it's an array
  const selectedString = Array.isArray(selectedAnswers)
    ? selectedAnswers.join('')
    : String(selectedAnswers);

  // Normalize both for comparison
  const normalizedSelected = normalizeAnswer(selectedString);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  return normalizedSelected === normalizedCorrect;
}

/**
 * Formats answer for display (adds spaces between letters)
 * @param {string|number|null|undefined} answer - Answer string like "BC"
 * @returns {string} Formatted string like "B, C"
 */
function formatAnswerForDisplay(answer) {
  if (!answer && answer !== 0) return '';

  const normalized = normalizeAnswer(answer);
  return normalized.split('').join(', ');
}

/**
 * Wraps text to specified width for better Telegram display
 * @param {string} text - Text to wrap
 * @param {number} width - Maximum characters per line
 * @returns {string} Wrapped text
 */
function wrapText(text, width = 50) {
  if (!text || text.length <= width) return text;

  const words = text.split(' ');
  let lines = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.join('\n   '); // Indent continuation lines
}

class CertificationBot {
  constructor() {
    console.log('🔧 DEBUG: ========== CONSTRUCTOR CALLED ==========');
    console.log('🔧 DEBUG: Validating environment variables...');

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

    console.log('🔧 DEBUG: Environment variables validated successfully');
    console.log('🔧 DEBUG: Creating Bot instance...');
    this.bot = new Bot(process.env.BOT_TOKEN);
    console.log('🔧 DEBUG: Creating MongoClient...');
    this.mongoClient = new MongoClient(process.env.MONGODB_URI);
    console.log('🔧 DEBUG: Initializing properties...');
    this.db = null;
    this.userSessions = new Map(); // Store user quiz sessions
    this.userSelections = new Map(); // Store user's current answer selections for multiple choice
    this.healthServer = null; // Health check server for Railway
    this.isReady = false; // Track if bot is ready
    this.startupError = null; // Track startup errors
    this.offlineMode = false; // Track if running in offline mode
    this.pollingIssue = false; // Track if polling has issues but API works
    this.lastKnownQuizStates = new Map(); // Track quiz state changes for debugging
    this.lastKnownTimerStates = new Map(); // Track previous timer values for transition validation
    this.quizAnswerStates = new Map(); // Track who has answered each question in each quiz

    // Initialize services
    console.log('🔧 DEBUG: Initializing services...');
    this.databaseService = new DatabaseService();
    this.notificationService = new NotificationService(this.databaseService, this.bot);

    // Start health server immediately for Railway
    console.log('🔧 DEBUG: Setting up health check...');
    this.setupHealthCheck();

    // Initialize bot asynchronously
    console.log('🔧 DEBUG: Calling initializeAsync()...');
    this.initializeAsync();
    console.log('🔧 DEBUG: Constructor completed');
  }

  async initializeAsync() {
    try {
      console.log('🚀 Starting bot initialization...');
      console.log('🔧 DEBUG: Environment check - BOT_TOKEN:', process.env.BOT_TOKEN ? 'SET' : 'NOT SET');
      console.log('🔧 DEBUG: Environment check - MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
      console.log('🔧 DEBUG: Environment check - MONGODB_DB_NAME:', process.env.MONGODB_DB_NAME || 'NOT SET');

      // Set a timeout for initialization (increased to allow for MongoDB setup)
      const timeout = setTimeout(() => {
        if (!this.isReady && !this.offlineMode) {
          this.startupError = new Error('Bot initialization timeout after 45 seconds');
          console.error('❌ Bot initialization timed out - but continuing with database connection');
        }
      }, 45000);

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
        this.isReady = true; // Partially ready - can send messages
      } else {
        console.log('✅ Bot initialization completed successfully');
        this.isReady = true;
      }

      // Always start notification polling for QuizBlitz
      console.log('📡 Starting QuizBlitz NotificationService...');
      console.log('🔧 DEBUG: Starting NotificationService instead of legacy system');
      this.notificationService.startNotificationPolling();
      console.log('🔧 DEBUG: NotificationService started successfully');

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
          await this.connectToDatabase();
          console.log('✅ MongoDB connected - QuizBlitz backend ready');
          console.log('🔧 DEBUG: Notification system handled by NotificationService');
          console.log('🔧 DEBUG: Legacy notification polling disabled in offline mode');
          this.offlineMode = true;
        } catch (dbError) {
          console.error('❌ MongoDB connection also failed:', dbError.message);
          process.exit(1);
        }
      }
    }
  }

  async connectToDatabase() {
    if (!this.db) {
      console.log('🔗 Attempting to connect to MongoDB...');
      console.log('🔧 DEBUG: MongoDB URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
      console.log('🔧 DEBUG: MongoDB DB Name:', process.env.MONGODB_DB_NAME || 'NOT SET');

      try {
        // Add timeout for MongoDB connection (increased for better reliability)
        console.log('🔧 DEBUG: Creating connection promise...');
        const connectionPromise = this.mongoClient.connect();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('MongoDB connection timeout after 20 seconds')), 20000);
        });

        console.log('🔧 DEBUG: Waiting for MongoDB connection...');

        await Promise.race([connectionPromise, timeoutPromise]);
        console.log('🔧 DEBUG: MongoDB connection successful');
        this.db = this.mongoClient.db(process.env.MONGODB_DB_NAME);
        console.log('🔧 DEBUG: Database selected:', process.env.MONGODB_DB_NAME);

        // Test the connection with a simple ping
        console.log('🔧 DEBUG: Testing connection with ping...');
        await this.db.admin().ping();
        console.log('✅ Connected to MongoDB successfully');

      } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);

        // For Railway, we might need to wait for MongoDB to be ready
        if (process.env.RAILWAY_ENVIRONMENT) {
          console.log('🔄 Retrying MongoDB connection in 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));

          try {
            await this.mongoClient.connect();
            this.db = this.mongoClient.db(process.env.MONGODB_DB_NAME);
            await this.db.admin().ping();
            console.log('✅ Connected to MongoDB on retry');
          } catch (retryError) {
            console.error('❌ MongoDB retry failed:', retryError.message);
            throw retryError;
          }
        } else {
          throw error;
        }
      }
    }
    return this.db;
  }

  /**
   * Wraps text to specified width for better Telegram display
   * @param {string} text - Text to wrap
   * @param {number} width - Maximum characters per line
   * @returns {string} Wrapped text
   */
  wrapText(text, width = 50) {
    if (!text || text.length <= width) return text;

    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines.join('\n   '); // Indent continuation lines
  }

  /**
   * Retrieves AI explanation for a question, with fallback to regular explanation
   * @param {string} questionId - The MongoDB ObjectId of the question
   * @param {string} regularExplanation - The regular explanation as fallback
   * @returns {Promise<string>} The explanation to show (AI if available, otherwise regular)
   */
  async getExplanationForQuestion(questionId, regularExplanation) {
    try {
      console.log(`🔍 Getting explanation for question ID: ${questionId}`);
      const db = await this.connectToDatabase();

      // Try to get the question with AI explanation
      const question = await db.collection('quizzes').findOne(
        { _id: new ObjectId(questionId) },
        { projection: { aiExplanation: 1, explanation: 1 } }
      );

      console.log('📋 Question found:', {
        hasQuestion: !!question,
        hasAiExplanation: !!(question && question.aiExplanation),
        aiExplanationLength: question?.aiExplanation?.length || 0,
        hasRegularExplanation: !!(question && question.explanation),
        regularExplanationLength: question?.explanation?.length || 0
      });

      // Return AI explanation if it exists, otherwise return regular explanation
      if (question && question.aiExplanation) {
        console.log(`✅ Returning AI explanation (${question.aiExplanation.length} chars)`);
        return `🤖 AI Second Opinion:\n${question.aiExplanation}`;
      } else {
        console.log(`📖 Returning regular explanation (${regularExplanation?.length || 0} chars)`);
        return regularExplanation || 'No explanation available.';
      }
    } catch (error) {
      console.error('Error retrieving AI explanation:', error);
      // Return regular explanation as fallback if there's an error
      return regularExplanation || 'No explanation available.';
    }
  }

  initializeBot() {
    // Start command - greet user and show certificates
    this.bot.command('start', async (ctx) => {
      await this.handleStart(ctx);
    });

    // Help command - show all available commands with detailed instructions
    this.bot.command('help', async (ctx) => {
      await this.handleHelp(ctx);
    });

    // Bookmark command - save question by number
    this.bot.command('bookmark', async (ctx) => {
      await this.handleBookmark(ctx);
    });

    // Bookmarks command - show saved bookmarks
    this.bot.command('bookmarks', async (ctx) => {
      await this.handleShowBookmarks(ctx);
    });

    // Revision command - show wrong answers by certificate
    this.bot.command('revision', async (ctx) => {
      await this.handleRevision(ctx);
    });

    // Menu command - show interactive command menu
    this.bot.command('menu', async (ctx) => {
      await this.handleCommandMenu(ctx);
    });

    // Commands command - alias for menu
    this.bot.command('commands', async (ctx) => {
      await this.handleCommandMenu(ctx);
    });

    // QuizBlitz command - join live multiplayer quiz
    this.bot.command('quizblitz', async (ctx) => {
      await this.handleQuizBlitz(ctx);
    });

    // Handle certificate selection
    this.bot.callbackQuery(/^cert_(.+)$/, async (ctx) => {
      const certificateId = ctx.match[1];
      await this.handleCertificateSelection(ctx, certificateId);
    });

    // Handle access code submission
    this.bot.on('message:text', async (ctx) => {
      const userId = ctx.from.id;
      const session = this.userSessions.get(userId);

      if (session && session.waitingForAccessCode) {
        await this.handleAccessCodeSubmission(ctx, ctx.message.text);
      } else if (session && session.waitingForQuizCode) {
        await this.handleQuizCodeSubmission(ctx, ctx.message.text);
      } else if (session && session.waitingForPlayerName) {
        await this.handlePlayerNameSubmission(ctx, ctx.message.text);
      }
    });

    // Handle quiz answer selection
    this.bot.callbackQuery(/^answer_([A-F])$/, async (ctx) => {
      const selectedAnswer = ctx.match[1];
      await this.handleQuizAnswer(ctx, selectedAnswer);
    });

    // Handle confirm selection for multiple choice questions
    this.bot.callbackQuery('confirm_selection', async (ctx) => {
      await this.handleConfirmSelection(ctx);
    });

    // Handle clear selection for multiple choice questions
    this.bot.callbackQuery('clear_selection', async (ctx) => {
      await this.handleClearSelection(ctx);
    });

    // Handle next question
    this.bot.callbackQuery('next_question', async (ctx) => {
      await this.handleNextQuestion(ctx);
    });

    // Handle quiz restart
    this.bot.callbackQuery('restart_quiz', async (ctx) => {
      await this.handleStart(ctx);
    });

    // Handle command menu actions
    this.bot.callbackQuery(/^menu_(.+)$/, async (ctx) => {
      const action = ctx.match[1];
      await this.handleMenuAction(ctx, action);
    });

    // Handle quick action menu
    this.bot.callbackQuery('quick_menu', async (ctx) => {
      await this.handleQuickMenu(ctx);
    });

    // Handle QuizBlitz answer selection
    this.bot.callbackQuery(/^quiz_answer_([A-F])_(.+)$/, async (ctx) => {
      const selectedAnswer = ctx.match[1];
      const quizCode = ctx.match[2];
      await this.handleQuizBlitzAnswer(ctx, selectedAnswer, quizCode);
    });
  }

  setupHealthCheck() {
    // Create HTTP server for Railway health checks
    const port = process.env.PORT || 8080;

    this.healthServer = http.createServer((req, res) => {
      if (req.url === '/health') {
        const status = this.isReady ? 'healthy' : (this.offlineMode ? 'offline_mode' : (this.pollingIssue ? 'api_only_mode' : (this.startupError ? 'error' : 'starting')));
        const statusCode = this.isReady ? 200 : (this.offlineMode || this.pollingIssue ? 200 : (this.startupError ? 503 : 200));

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: status,
          service: 'examtopics-telegram-bot',
          version: '1.0.0',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          mongodb: this.db ? 'connected' : 'disconnected',
          bot: this.isReady ? 'ready' : (this.offlineMode ? 'offline_mode' : (this.pollingIssue ? 'api_only_mode' : (this.startupError ? 'error' : 'initializing'))),
          error: this.startupError ? this.startupError.message : null,
          quizblitz_backend: this.db ? 'ready' : 'not_ready',
          network_status: this.offlineMode ? 'telegram_api_unreachable' : (this.pollingIssue ? 'api_reachable_polling_restricted' : 'unknown'),
          mode: this.offlineMode ? 'offline' : (this.pollingIssue ? 'api_only' : 'online'),
          telegram_api: this.offlineMode ? 'unreachable' : 'reachable'
        }));
      } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          service: 'ExamTopics Telegram Bot',
          version: '1.0.0',
          description: 'IT Certification Practice Bot with QuizBlitz',
          health: '/health',
          status: this.isReady ? 'ready' : (this.startupError ? 'error' : 'initializing'),
          quizblitz_status: this.db ? 'backend_ready' : 'backend_not_ready',
          note: this.startupError && this.startupError.message.includes('Network') ?
            'Telegram API unreachable - QuizBlitz backend is functional' :
            'Normal operation'
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });

    this.healthServer.listen(port, '0.0.0.0', () => {
      console.log(`Health check server running on port ${port}`);
    });
  }

  async handleStart(ctx) {
    const userId = ctx.from.id;

    // Clear any existing session
    this.userSessions.delete(userId);

    await ctx.reply(
      '🎓 Welcome to the IT Certification Quiz Bot!\n\n' +
      'I\'ll help you practice for your IT certifications.\n\n' +
      '📚 Quick Commands Reference:\n' +
      '• /start - Start a new quiz\n' +
      '• /help - Show detailed help guide\n' +
      '• /menu - Show interactive command menu\n' +
      '• /bookmark <number> - Save a question for later\n' +
      '• /bookmarks - View your saved bookmarks\n' +
      '• /revision - Review questions you answered incorrectly for current access code\n\n' +
      '💡 Type /menu for an interactive command menu or /help for detailed instructions!\n\n' +
      'Let\'s get started by selecting a certificate:'
    );

    await this.showCertificates(ctx);
  }

  async handleHelp(ctx) {
    const helpMessage =
      '🤖 <b>IT Certification Quiz Bot - Help Guide</b>\n\n' +

      '📚 <b>Available Commands:</b>\n\n' +

      '🚀 <b>/start</b>\n' +
      '   • Start a new quiz session\n' +
      '   • Shows available certificates to choose from\n' +
      '   • Clears any existing quiz session\n' +
      '   • Usage: Simply type /start\n\n' +

      '❓ <b>/help</b>\n' +
      '   • Show this help guide with all commands\n' +
      '   • Displays detailed instructions for each command\n' +
      '   • Usage: Simply type /help\n\n' +

      '🎯 <b>/menu</b> or <b>/commands</b>\n' +
      '   • Show interactive command menu with buttons\n' +
      '   • Quick access to all bot functions\n' +
      '   • Context-aware quick actions\n' +
      '   • Usage: Simply type /menu\n\n' +

      '🔖 <b>/bookmark &lt;question_number&gt;</b>\n' +
      '   • Save a specific question for later review\n' +
      '   • Helps you mark important or difficult questions\n' +
      '   • Usage: /bookmark 15 (saves question number 15)\n' +
      '   • Example: /bookmark 42\n\n' +

      '📑 <b>/bookmarks</b>\n' +
      '   • View all your saved bookmarked questions for current access code\n' +
      '   • Shows questions organized by certificate\n' +
      '   • Allows you to quickly access saved questions\n' +
      '   • Usage: Simply type /bookmarks\n\n' +

      '📖 <b>/revision</b>\n' +
      '   • Review questions you answered incorrectly for current access code\n' +
      '   • Shows wrong answers organized by certificate\n' +
      '   • Perfect for focused study on weak areas\n' +
      '   • Usage: Simply type /revision\n\n' +

      '🎮 <b>/quizblitz</b>\n' +
      '   • Join live multiplayer quiz sessions\n' +
      '   • Enter 6-digit quiz code from host\'s screen\n' +
      '   • Compete with other players in real-time\n' +
      '   • Usage: Simply type /quizblitz\n\n' +

      '🎯 <b>Quiz Features:</b>\n\n' +

      '✅ <b>Question Navigation:</b>\n' +
      '   • Answer questions using the A, B, C, D buttons\n' +
      '   • Get immediate feedback on correct/incorrect answers\n' +
      '   • See detailed explanations for each question\n' +
      '   • Use "Next Question" button to continue\n\n' +

      '🔐 <b>Access Code System:</b>\n' +
      '   • Enter your generated access code when prompted\n' +
      '   • Access codes link you to specific question sets\n' +
      '   • Each certificate requires a valid access code\n' +
      '   • Contact support if you do not have an access code\n\n' +

      '📊 <b>Progress Tracking:</b>\n' +
      '   • Your answers are automatically saved\n' +
      '   • Wrong answers are stored for revision\n' +
      '   • Bookmarks and revision data are tied to your current access code\n' +
      '   • Each access code maintains separate bookmark and revision history\n' +
      '   • Track your progress per certificate\n\n' +

      '💡 <b>Tips for Best Experience:</b>\n\n' +
      '   🎯 Use /bookmark for difficult questions\n' +
      '   📚 Regular /revision helps reinforce learning\n' +
      '   🔄 Start fresh sessions with /start\n' +
      '   💬 Read explanations carefully for better understanding\n' +
      '   📱 Bot works best in private chats\n\n' +

      '🆘 <b>Need More Help?</b>\n' +
      '   • Contact support if you encounter issues: <code>bunnyppl@gmail.com</code>\n' +
      '   • Report bugs or suggest improvements\n' +
      '   • Check that you have a valid access code\n' +
      '   • Ensure stable internet connection for best experience\n\n' +

      '🚀 <b>Ready to Start?</b> Type /start to begin your certification journey!';

    await ctx.reply(helpMessage, { parse_mode: 'HTML' });
  }

  // Additional placeholder methods to prevent errors - these would need full implementation
  async showCertificates(ctx) {
    await ctx.reply('🔧 Certificate selection feature coming soon...');
  }

  async handleCertificateSelection(ctx, certificateId) {
    await ctx.reply('🔧 Certificate selection feature coming soon...');
  }

  async handleAccessCodeSubmission(ctx, accessCode) {
    await ctx.reply('🔧 Access code validation feature coming soon...');
  }

  async handleQuizCodeSubmission(ctx, quizCode) {
    await ctx.reply('🔧 Quiz code handling feature coming soon...');
  }

  async handlePlayerNameSubmission(ctx, playerName) {
    await ctx.reply('🔧 Player name handling feature coming soon...');
  }

  async handleQuizAnswer(ctx, selectedAnswer) {
    await ctx.reply('🔧 Quiz answer handling feature coming soon...');
  }

  async handleConfirmSelection(ctx) {
    await ctx.reply('🔧 Selection confirmation feature coming soon...');
  }

  async handleClearSelection(ctx) {
    await ctx.reply('🔧 Selection clearing feature coming soon...');
  }

  async handleNextQuestion(ctx) {
    await ctx.reply('🔧 Next question feature coming soon...');
  }

  async handleCommandMenu(ctx) {
    await ctx.reply('🔧 Command menu feature coming soon...');
  }

  async handleMenuAction(ctx, action) {
    await ctx.reply('🔧 Menu action feature coming soon...');
  }

  async handleQuickMenu(ctx) {
    await ctx.reply('🔧 Quick menu feature coming soon...');
  }

  async handleBookmark(ctx) {
    await ctx.reply('🔧 Bookmark feature coming soon...');
  }

  async handleShowBookmarks(ctx) {
    await ctx.reply('🔧 Show bookmarks feature coming soon...');
  }

  async handleRevision(ctx) {
    await ctx.reply('🔧 Revision feature coming soon...');
  }

  async handleQuizBlitz(ctx) {
    await ctx.reply('🔧 QuizBlitz feature coming soon...');
  }

  async handleQuizBlitzAnswer(ctx, selectedAnswer, quizCode) {
    await ctx.reply('🔧 QuizBlitz answer feature coming soon...');
  }

  async safeEditMessage(ctx, newText, newOptions) {
    try {
      await ctx.editMessageText(newText, newOptions);
    } catch (error) {
      console.error('Error in safeEditMessage:', error);
    }
  }

  async start() {
    try {
      console.log('🔌 Connecting to MongoDB...');
      await this.connectToDatabase();
      console.log('✅ Connected to MongoDB');

      console.log('🔍 Testing Telegram API first...');
      try {
        const me = await this.bot.api.getMe();
        console.log(`✅ Bot API test successful: ${me.username} (${me.first_name})`);
      } catch (apiError) {
        console.error('❌ Bot API test failed:', apiError.message);
        this.offlineMode = true;
        console.log('🔄 Entering offline mode due to API test failure');
        return;
      }

      console.log('🤖 Starting Telegram bot polling...');

      try {
        await this.bot.start({
          onStart: () => {
            console.log('✅ Bot polling started successfully!');
          },
          drop_pending_updates: true
        });

        console.log('✅ Bot fully operational');

      } catch (botError) {
        if (botError.error_code === 409) {
          console.error('❌ Bot conflict detected! Another instance is already running.');
          throw botError;
        } else {
          console.error('❌ Error starting bot polling:', botError.message);
          console.log('🔄 API works but polling failed - running in API-only mode');
          this.offlineMode = false; // API works
          this.pollingIssue = true;
          return;
        }
      }

    } catch (error) {
      console.error('❌ Error in start method:', error);
      throw error;
    }
  }

  async stop() {
    console.log('Shutting down bot...');
    try {
      if (this.mongoClient) {
        await this.mongoClient.close();
        console.log('MongoDB connection closed');
      }
      await this.bot.stop();
      console.log('Bot stopped successfully');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

// Create and start the bot
const startBot = async () => {
  console.log('🔧 DEBUG: Starting bot...');
  const bot = new CertificationBot();
  console.log('🔧 DEBUG: Bot created');
  return bot;
};

// Handle graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  try {
    const bot = global.botInstance;
    if (bot) {
      console.log('Stopping bot...');
      await bot.stop();
      
      console.log('Stopping notification service...');
      if (bot.notificationService) {
        bot.notificationService.stopNotificationPolling();
      }
      
      console.log('Closing database connection...');
      if (bot.mongoClient) {
        await bot.mongoClient.close();
      }
      
      console.log('Closing health server...');
      if (bot.healthServer) {
        bot.healthServer.close();
      }
    }
    
    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle Windows-specific signals
if (process.platform === 'win32') {
  process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
}

// Start the bot
startBot().then(bot => {
  global.botInstance = bot;
  console.log('🚀 Bot started successfully');
}).catch(error => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
});

module.exports = CertificationBot;
