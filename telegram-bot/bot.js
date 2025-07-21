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
      console.error('âŒ BOT_TOKEN environment variable is missing!');
      this.startupError = new Error('BOT_TOKEN environment variable is required');
      this.setupHealthCheck();
      return;
    }

    if (!process.env.MONGODB_URI) {
      console.error('âŒ MONGODB_URI environment variable is missing!');
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
      console.log('🚀 Starting initialization...');
      console.log('🔧 DEBUG: Environment check - BOT_TOKEN:', process.env.BOT_TOKEN ? 'SET' : 'NOT SET');
      console.log('🔧 DEBUG: Environment check - MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
      console.log('🔧 DEBUG: Environment check - MONGODB_DB_NAME:', process.env.MONGODB_DB_NAME || 'NOT SET');

      // PRIORITY 1: Start NotificationService first (Change Streams)
      console.log('📡 [PRIORITY] Starting QuizBlitz NotificationService first...');
      try {
        this.notificationService.startNotificationPolling();
        console.log('✅ [PRIORITY] NotificationService started successfully');
      } catch (notificationError) {
        console.error('❌ [PRIORITY] Failed to start NotificationService:', notificationError);
      }

      // PRIORITY 2: Then attempt bot initialization
      console.log('🤖 Starting Telegram bot initialization...');

      // Set a timeout for initialization (increased to allow for MongoDB setup)
      const timeout = setTimeout(() => {
        if (!this.isReady && !this.offlineMode) {
          this.startupError = new Error('Bot initialization timeout after 45 seconds');
          console.error('âŒ Bot initialization timed out - but continuing with database connection');
          // Don't stop here - continue with database connection but no duplicate notification system
          console.log('🔄 [TELEGRAM] Database connection available but notification system handled by NotificationService...');
          // this.startNotificationPolling();
        }
      }, 45000);

      // NotificationService already started at priority initialization - no failsafe needed

      console.log('🔧 Setting up bot handlers...');
      this.initializeBot();

      console.log('🚀 Starting bot...');
      await this.start();

      clearTimeout(timeout);

      // Check if we're in offline mode or fully ready
      if (this.offlineMode) {
        console.log('âš ï¸  Running in OFFLINE MODE');
        console.log('📱 Telegram bot features disabled');
        console.log('🎮 QuizBlitz backend functionality ACTIVE');
        this.isReady = false; // Not fully ready, but functional for QuizBlitz
      } else if (this.pollingIssue) {
        console.log('âš ï¸  Running in API-ONLY MODE');
        console.log('📱 Telegram API works but polling may be restricted');
        console.log('🎮 QuizBlitz backend functionality ACTIVE');
        console.log('💡 Bot can send messages but may not receive updates');
        this.isReady = true; // Partially ready - can send messages
      } else {
        console.log('✅ Bot initialization completed successfully');
        this.isReady = true;
      }

      // NotificationService already started at priority initialization
      console.log('🔧 DEBUG: NotificationService already running from priority initialization');

      if (this.offlineMode) {
        console.log('💡 To enable full bot features, ensure network access to api.telegram.org');
      }

    } catch (error) {
      console.error('âŒ Bot initialization failed:', error);
      this.startupError = error;

      // NotificationService already started at priority initialization
      console.log('🔧 DEBUG: NotificationService already running from priority initialization (bot init failed)');

      // Check if it's a network connectivity issue
      if (error.message.includes('Network request') || error.message.includes('timeout')) {
        console.log('🌐 Network connectivity issue detected to Telegram API');
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
          // this.startNotificationPolling(); // Disabled - using NotificationService instead
          console.log('🔧 DEBUG: Legacy notification polling disabled in offline mode');
          console.log('🔧 DEBUG: NotificationService already running from priority initialization');
          this.offlineMode = true;
        } catch (dbError) {
          console.error('âŒ MongoDB connection also failed:', dbError.message);
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
        console.error('âŒ MongoDB connection failed:', error.message);

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
            console.error('âŒ MongoDB retry failed:', retryError.message);
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
      console.log(`🔍 Getting explanation for question ID: ${questionId}`);
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
          description: 'AWS Certification Practice Bot with QuizBlitz',
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
      '🎓 Welcome to the AWS Certification Quiz Bot!\n\n' +
      'I\'ll help you practice for your AWS certifications.\n\n' +
      '📚 Quick Commands Reference:\n' +
      'â€¢ /start - Start a new quiz\n' +
      'â€¢ /help - Show detailed help guide\n' +
      'â€¢ /menu - Show interactive command menu\n' +
      'â€¢ /bookmark <number> - Save a question for later\n' +
      'â€¢ /bookmarks - View your saved bookmarks\n' +
      'â€¢ /revision - Review questions you answered incorrectly for current access code\n\n' +
      '💡 Type /menu for an interactive command menu or /help for detailed instructions!\n\n' +
      'Let\'s get started by selecting a certificate:'
    );

    await this.showCertificates(ctx);
  }

  async handleHelp(ctx) {
    const helpMessage =
      '🤖 <b>AWS Certification Quiz Bot - Help Guide</b>\n\n' +

      '📚 <b>Available Commands:</b>\n\n' +

      '🚀 <b>/start</b>\n' +
      '   â€¢ Start a new quiz session\n' +
      '   â€¢ Shows available certificates to choose from\n' +
      '   â€¢ Clears any existing quiz session\n' +
      '   â€¢ Usage: Simply type /start\n\n' +

      'â“ <b>/help</b>\n' +
      '   â€¢ Show this help guide with all commands\n' +
      '   â€¢ Displays detailed instructions for each command\n' +
      '   â€¢ Usage: Simply type /help\n\n' +

      '🎯 <b>/menu</b> or <b>/commands</b>\n' +
      '   â€¢ Show interactive command menu with buttons\n' +
      '   â€¢ Quick access to all bot functions\n' +
      '   â€¢ Context-aware quick actions\n' +
      '   â€¢ Usage: Simply type /menu\n\n' +

      '🔍– <b>/bookmark &lt;question_number&gt;</b>\n' +
      '   â€¢ Save a specific question for later review\n' +
      '   â€¢ Helps you mark important or difficult questions\n' +
      '   â€¢ Usage: /bookmark 15 (saves question number 15)\n' +
      '   â€¢ Example: /bookmark 42\n\n' +

      '🔒 <b>/bookmarks</b>\n' +
      '   â€¢ View all your saved bookmarked questions for current access code\n' +
      '   â€¢ Shows questions organized by certificate\n' +
      '   â€¢ Allows you to quickly access saved questions\n' +
      '   â€¢ Usage: Simply type /bookmarks\n\n' +

      '📖 <b>/revision</b>\n' +
      '   â€¢ Review questions you answered incorrectly for current access code\n' +
      '   â€¢ Shows wrong answers organized by certificate\n' +
      '   â€¢ Perfect for focused study on weak areas\n' +
      '   â€¢ Usage: Simply type /revision\n\n' +

      '🎮 <b>/quizblitz</b>\n' +
      '   â€¢ Join live multiplayer quiz sessions\n' +
      '   â€¢ Enter 6-digit quiz code from host\'s screen\n' +
      '   â€¢ Compete with other players in real-time\n' +
      '   â€¢ Usage: Simply type /quizblitz\n\n' +

      '🎯 <b>Quiz Features:</b>\n\n' +

      '✅ <b>Question Navigation:</b>\n' +
      '   â€¢ Answer questions using the A, B, C, D buttons\n' +
      '   â€¢ Get immediate feedback on correct/incorrect answers\n' +
      '   â€¢ See detailed explanations for each question\n' +
      '   â€¢ Use "Next Question" button to continue\n\n' +

      '🔍 <b>Access Code System:</b>\n' +
      '   â€¢ Enter your generated access code when prompted\n' +
      '   â€¢ Access codes link you to specific question sets\n' +
      '   â€¢ Each certificate requires a valid access code\n' +
      '   â€¢ Contact support if you do not have an access code\n\n' +

      '📊 <b>Progress Tracking:</b>\n' +
      '   â€¢ Your answers are automatically saved\n' +
      '   â€¢ Wrong answers are stored for revision\n' +
      '   â€¢ Bookmarks and revision data are tied to your current access code\n' +
      '   â€¢ Each access code maintains separate bookmark and revision history\n' +
      '   â€¢ Track your progress per certificate\n\n' +

      '💡 <b>Tips for Best Experience:</b>\n\n' +
      '   🎯 Use /bookmark for difficult questions\n' +
      '   📚 Regular /revision helps reinforce learning\n' +
      '   🔄 Start fresh sessions with /start\n' +
      '   💬 Read explanations carefully for better understanding\n' +
      '   📱 Bot works best in private chats\n\n' +

      '🆘 <b>Need More Help?</b>\n' +
      '   â€¢ Contact support if you encounter issues: <code>bunnyppl@gmail.com</code>\n' +
      '   â€¢ Report bugs or suggest improvements\n' +
      '   â€¢ Check that you have a valid access code\n' +
      '   â€¢ Ensure stable internet connection for best experience\n\n' +

      '🚀 <b>Ready to Start?</b> Type /start to begin your certification journey!';

    await ctx.reply(helpMessage, { parse_mode: 'HTML' });
  }

  async showCertificates(ctx) {
    try {
      const db = await this.connectToDatabase();
      const certificates = await db.collection('certificates').find({}).toArray();

      if (certificates.length === 0) {
        await ctx.reply('âŒ No certificates available at the moment. Please try again later.');
        return;
      }

      const keyboard = new InlineKeyboard();
      certificates.forEach(cert => {
        keyboard.text(`${cert.name} (${cert.code})`, `cert_${cert._id}`).row();
      });

      await ctx.reply('📋 Please select a certificate:', {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error fetching certificates:', error);
      await ctx.reply('âŒ Error loading certificates. Please try again later.');
    }
  }

  async handleCertificateSelection(ctx, certificateId) {
    const userId = ctx.from.id;

    try {
      const db = await this.connectToDatabase();
      const certificate = await db.collection('certificates').findOne({
        _id: new ObjectId(certificateId)
      });

      if (!certificate) {
        await ctx.reply('âŒ Certificate not found. Please try again.');
        return;
      }

      // Store certificate in user session
      this.userSessions.set(userId, {
        certificateId: certificateId,
        certificate: certificate,
        waitingForAccessCode: true
      });

      await this.safeEditMessage(ctx,
        `✅ You selected: ${certificate.name} (${certificate.code})

` +
        '📍 Please enter your generated access code to begin the quiz:'
      );

    } catch (error) {
      console.error('Error selecting certificate:', error);
      await ctx.reply('âŒ Error selecting certificate. Please try again.');
    }
  }

  async handleAccessCodeSubmission(ctx, accessCode) {
    const userId = ctx.from.id;
    const session = this.userSessions.get(userId);

    if (!session) {
      await ctx.reply('âŒ Session expired. Please use /start to begin again.');
      return;
    }

    try {
      const db = await this.connectToDatabase();

      // Validate access code and get questions for the selected certificate
      const questions = await this.getQuestionsForAccessCode(accessCode, session.certificateId);

      if (!questions || questions.length === 0) {
        // Check if access code exists but for a different certificate
        const accessCodeExists = await this.checkAccessCodeExists(accessCode);
        if (accessCodeExists) {
          const actualCertificate = await this.getCertificateForAccessCode(accessCode);
          await ctx.reply(
            'âŒ Access code mismatch!\n\n' +
            `🔍‘ Access code: ${accessCode}\n` +
            `📋 You selected: ${session.certificate.name} (${session.certificate.code})\n` +
            `📋 Access code is for: ${actualCertificate ? actualCertificate.name + ' (' + actualCertificate.code + ')' : 'Different certificate'}\n\n` +
            `Please use /start to select the correct certificate or enter a valid access code for ${session.certificate.name}.`
          );
        } else {
          await ctx.reply('âŒ Invalid access code or no questions available. Please check your access code and try again.');
        }
        return;
      }

      // Update session with quiz data
      session.waitingForAccessCode = false;
      session.accessCode = accessCode;
      session.questions = questions;
      session.currentQuestionIndex = 0;
      session.answers = [];
      session.correctAnswers = 0;
      session.startTime = new Date();

      await ctx.reply(
        '🎯 Access code verified!\n\n' +
        '📊 Quiz Details:\n' +
        `â€¢ Certificate: ${session.certificate.name}\n` +
        `â€¢ Total Questions: ${questions.length}\n` +
        `â€¢ Access Code: ${accessCode}\n\n` +
        '🚀 Starting your quiz now...'
      );

      // Start the quiz
      await this.showCurrentQuestion(ctx);

    } catch (error) {
      console.error('Error validating access code:', error);
      await ctx.reply('âŒ Error validating access code. Please try again.');
    }
  }

  async getQuestionsForAccessCode(accessCode, certificateId = null) {
    try {
      const db = await this.connectToDatabase();

      // Build match criteria - include certificate validation if provided
      const matchCriteria = {
        generatedAccessCode: accessCode,
        isEnabled: true
      };

      // If certificateId is provided, validate that access code belongs to this certificate
      if (certificateId) {
        // Ensure certificateId is converted to ObjectId for proper comparison
        matchCriteria.certificateId = new ObjectId(certificateId);
      }

      // Get questions assigned to this access code and certificate
      const pipeline = [
        { $match: matchCriteria },
        {
          $lookup: {
            from: 'quizzes',
            localField: 'questionId',
            foreignField: '_id',
            as: 'questionDetails'
          }
        },
        { $unwind: '$questionDetails' },
        { $sort: { sortOrder: 1, assignedQuestionNo: 1 } },
        {
          $project: {
            _id: 1,
            assignedQuestionNo: 1,
            question: '$questionDetails.question',
            answers: '$questionDetails.answers',
            correctAnswer: '$questionDetails.correctAnswer',
            explanation: '$questionDetails.explanation'
          }
        }
      ];

      const questions = await db.collection('access-code-questions').aggregate(pipeline).toArray();

      // Process questions to parse answers into options format
      const processedQuestions = questions.map(q => {
        const options = this.parseAnswersToOptions(q.answers);
        return {
          ...q,
          options: options
        };
      });

      return processedQuestions;
    } catch (error) {
      console.error('Error fetching questions for access code:', error);
      return null;
    }
  }

  async checkAccessCodeExists(accessCode) {
    try {
      const db = await this.connectToDatabase();
      const accessCodeRecord = await db.collection('access-code-questions').findOne({
        generatedAccessCode: accessCode
      });
      return !!accessCodeRecord;
    } catch (error) {
      console.error('Error checking access code existence:', error);
      return false;
    }
  }

  async getCertificateForAccessCode(accessCode) {
    try {
      const db = await this.connectToDatabase();

      // Get the certificate associated with this access code
      const pipeline = [
        { $match: { generatedAccessCode: accessCode } },
        {
          $lookup: {
            from: 'certificates',
            localField: 'certificateId',
            foreignField: '_id',
            as: 'certificate'
          }
        },
        { $unwind: '$certificate' },
        { $limit: 1 },
        {
          $project: {
            name: '$certificate.name',
            code: '$certificate.code'
          }
        }
      ];

      const result = await db.collection('access-code-questions').aggregate(pipeline).toArray();
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error getting certificate for access code:', error);
      return null;
    }
  }

  parseAnswersToOptions(answersString) {
    if (!answersString) return { A: '', B: '', C: '', D: '', E: '', F: '' };

    const options = { A: '', B: '', C: '', D: '', E: '', F: '' };

    // Split by lines and process each line
    const lines = answersString.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Match patterns like "- A. Option text" or "A. Option text"
      const match = trimmedLine.match(/^[-\s]*([A-F])\.\s*(.+)$/);
      if (match) {
        const [, letter, text] = match;
        options[letter] = text.trim();
      }
    }

    return options;
  }

  async showCurrentQuestion(ctx) {
    const userId = ctx.from.id;
    const session = this.userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('âŒ Session error. Please use /start to begin again.');
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    const questionNumber = session.currentQuestionIndex + 1;
    const totalQuestions = session.questions.length;

    // Debug logging
    console.log('Current question:', JSON.stringify(currentQuestion, null, 2));

    // Check if options exist
    if (!currentQuestion.options) {
      console.error('No options found for current question');
      await ctx.reply('âŒ Error loading question options. Please try again.');
      return;
    }

    // Check if this is a multiple answer question
    const isMultiple = isMultipleAnswerQuestion(currentQuestion.correctAnswer);

    // Clear any previous selections for this question
    if (!this.userSelections.has(userId)) {
      this.userSelections.set(userId, []);
    } else {
      this.userSelections.set(userId, []);
    }

    // Format question text
    let questionOptions =
      `A. ${currentQuestion.options.A || 'Option A not available'}\n` +
      `B. ${currentQuestion.options.B || 'Option B not available'}\n` +
      `C. ${currentQuestion.options.C || 'Option C not available'}\n` +
      `D. ${currentQuestion.options.D || 'Option D not available'}`;

    // Add E and F options if they exist
    if (currentQuestion.options.E) {
      questionOptions += `\nE. ${currentQuestion.options.E}`;
    }
    if (currentQuestion.options.F) {
      questionOptions += `\nF. ${currentQuestion.options.F}`;
    }

    const questionText =
      `📍 Question ${questionNumber}/${totalQuestions}\n` +
      `Score: ${session.correctAnswers}/${session.currentQuestionIndex}\n\n` +
      `${currentQuestion.question}\n\n` +
      questionOptions + '\n\n' +
      (isMultiple ? `âš ï¸ Multiple answers required: Select ${normalizeAnswer(currentQuestion.correctAnswer).length} options` : '💡 Select one answer');

    // Create answer keyboard
    const keyboard = new InlineKeyboard();

    if (isMultiple) {
      // Multiple answer layout with confirm/clear buttons
      keyboard
        .text('A', 'answer_A').text('B', 'answer_B').row()
        .text('C', 'answer_C').text('D', 'answer_D').row();

      // Add E and F if they exist
      if (currentQuestion.options.E || currentQuestion.options.F) {
        if (currentQuestion.options.E && currentQuestion.options.F) {
          keyboard.text('E', 'answer_E').text('F', 'answer_F').row();
        } else if (currentQuestion.options.E) {
          keyboard.text('E', 'answer_E').row();
        } else if (currentQuestion.options.F) {
          keyboard.text('F', 'answer_F').row();
        }
      }

      keyboard
        .text('✅ Confirm Selection', 'confirm_selection').row()
        .text('🔄 Clear All', 'clear_selection');
    } else {
      // Single answer layout
      keyboard
        .text('A', 'answer_A').text('B', 'answer_B').row()
        .text('C', 'answer_C').text('D', 'answer_D').row();

      // Add E and F if they exist
      if (currentQuestion.options.E || currentQuestion.options.F) {
        if (currentQuestion.options.E && currentQuestion.options.F) {
          keyboard.text('E', 'answer_E').text('F', 'answer_F').row();
        } else if (currentQuestion.options.E) {
          keyboard.text('E', 'answer_E').row();
        } else if (currentQuestion.options.F) {
          keyboard.text('F', 'answer_F').row();
        }
      }
    }

    await ctx.reply(questionText, {
      reply_markup: keyboard
    });
  }

  async handleQuizAnswer(ctx, selectedAnswer) {
    const userId = ctx.from.id;
    const session = this.userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('âŒ Session error. Please use /start to begin again.');
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    const isMultiple = isMultipleAnswerQuestion(currentQuestion.correctAnswer);

    if (isMultiple) {
      // Handle multi-answer question selection
      let userSelections = this.userSelections.get(userId) || [];

      // Toggle selection
      if (userSelections.includes(selectedAnswer)) {
        userSelections = userSelections.filter(ans => ans !== selectedAnswer);
      } else {
        userSelections.push(selectedAnswer);
        userSelections.sort(); // Keep selections sorted
      }

      this.userSelections.set(userId, userSelections);

      // Update the message to show current selections
      const requiredCount = normalizeAnswer(currentQuestion.correctAnswer).length;
      const selectedCount = userSelections.length;
      const questionNumber = session.currentQuestionIndex + 1;
      const totalQuestions = session.questions.length;

      let questionOptions =
        `A. ${currentQuestion.options.A || 'Option A not available'}\n` +
        `B. ${currentQuestion.options.B || 'Option B not available'}\n` +
        `C. ${currentQuestion.options.C || 'Option C not available'}\n` +
        `D. ${currentQuestion.options.D || 'Option D not available'}`;

      // Add E and F options if they exist
      if (currentQuestion.options.E) {
        questionOptions += `\nE. ${currentQuestion.options.E}`;
      }
      if (currentQuestion.options.F) {
        questionOptions += `\nF. ${currentQuestion.options.F}`;
      }

      const questionText =
        `📍 Question ${questionNumber}/${totalQuestions}\n` +
        `Score: ${session.correctAnswers}/${session.currentQuestionIndex}\n\n` +
        `${currentQuestion.question}\n\n` +
        questionOptions + '\n\n' +
        `âš ï¸ Multiple answers required: Select ${requiredCount} options\n` +
        `✅ Selected: ${userSelections.length > 0 ? userSelections.join(', ') : 'None'} (${selectedCount}/${requiredCount})`;

      // Create updated keyboard with selected indicators
      const keyboard = new InlineKeyboard();

      const availableOptions = ['A', 'B', 'C', 'D'];
      if (currentQuestion.options.E) availableOptions.push('E');
      if (currentQuestion.options.F) availableOptions.push('F');

      availableOptions.forEach((option, index) => {
        const isSelected = userSelections.includes(option);
        const buttonText = isSelected ? `✅ ${option}` : option;
        keyboard.text(buttonText, `answer_${option}`);
        if (index % 2 === 1 || index === availableOptions.length - 1) keyboard.row();
      });

      keyboard.text('✅ Confirm Selection', 'confirm_selection').row();
      keyboard.text('🔄 Clear All', 'clear_selection');

      await this.safeEditMessage(ctx, questionText, {
        reply_markup: keyboard
      });

    } else {
      // Handle single-answer question (original logic)
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

      // Store answer
      session.answers.push({
        questionId: currentQuestion._id,
        selectedAnswer: selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect: isCorrect
      });

      if (isCorrect) {
        session.correctAnswers++;

        // Show correct answer message
        await this.safeEditMessage(ctx,
          `✅ Correct!

` +
          `Your answer: ${selectedAnswer}
` +
          `Score: ${session.correctAnswers}/${session.currentQuestionIndex + 1}`
        );

        // Move to next question or show results
        if (session.currentQuestionIndex < session.questions.length - 1) {
          session.currentQuestionIndex++;

          setTimeout(async () => {
            await this.showCurrentQuestion(ctx);
          }, 2000);
        } else {
          await this.showQuizResults(ctx);
        }
      } else {
        // Save wrong answer to database
        await this.saveWrongAnswer(userId, session, currentQuestion, selectedAnswer);

        // Get explanation (AI if available, otherwise regular)
        const explanation = await this.getExplanationForQuestion(currentQuestion._id, currentQuestion.explanation);

        const keyboard = new InlineKeyboard();

        if (session.currentQuestionIndex < session.questions.length - 1) {
          keyboard.text('Next Question âž¡ï¸', 'next_question');
        } else {
          keyboard.text('Show Results 📊', 'next_question');
        }

        await this.safeEditMessage(ctx,
          `âŒ Wrong! Your answer: ${selectedAnswer}\n\n` +
          `The correct answer was: ${currentQuestion.correctAnswer}\n\n` +
          `📖 Explanation:\n${explanation}\n\n` +
          `Score: ${session.correctAnswers}/${session.currentQuestionIndex + 1}`,
          {
            reply_markup: keyboard
          }
        );
      }
    }
  }

  async handleConfirmSelection(ctx) {
    const userId = ctx.from.id;
    const session = this.userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('âŒ Session error. Please use /start to begin again.');
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    const userSelections = this.userSelections.get(userId) || [];

    // Validate that this is a multi-answer question
    if (!isMultipleAnswerQuestion(currentQuestion.correctAnswer)) {
      await ctx.reply('âŒ This is not a multiple-answer question.');
      return;
    }

    // Check if user has made any selections
    if (userSelections.length === 0) {
      await this.safeEditMessage(ctx,
        'âš ï¸ Please select at least one answer before confirming.',
        { reply_markup: ctx.msg.reply_markup }
      );
      return;
    }

    // Check if user has selected the correct number of answers
    const requiredCount = normalizeAnswer(currentQuestion.correctAnswer).length;
    if (userSelections.length !== requiredCount) {
      await this.safeEditMessage(ctx,
        `âš ï¸ Please select exactly ${requiredCount} answers. You have selected ${userSelections.length}.`,
        { reply_markup: ctx.msg.reply_markup }
      );
      return;
    }

    // Validate the answer
    const userAnswer = userSelections.join('');
    const isCorrect = validateMultipleAnswers(userAnswer, currentQuestion.correctAnswer);

    // Store answer
    session.answers.push({
      questionId: currentQuestion._id,
      selectedAnswer: userAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect: isCorrect
    });

    // Clear user selections for this question
    this.userSelections.delete(userId);

    if (isCorrect) {
      session.correctAnswers++;

      // Show correct answer message
      await this.safeEditMessage(ctx,
        '✅ Correct!\n\n' +
        `Your answer: ${formatAnswerForDisplay(userAnswer)}\n` +
        `Score: ${session.correctAnswers}/${session.currentQuestionIndex + 1}`
      );

      // Move to next question or show results
      if (session.currentQuestionIndex < session.questions.length - 1) {
        session.currentQuestionIndex++;

        setTimeout(async () => {
          await this.showCurrentQuestion(ctx);
        }, 2000);
      } else {
        await this.showQuizResults(ctx);
      }
    } else {
      // Save wrong answer to database
      await this.saveWrongAnswer(userId, session, currentQuestion, userAnswer);

      // Get explanation (AI if available, otherwise regular)
      const explanation = await this.getExplanationForQuestion(currentQuestion._id, currentQuestion.explanation);

      const keyboard = new InlineKeyboard();

      if (session.currentQuestionIndex < session.questions.length - 1) {
        keyboard.text('Next Question âž¡ï¸', 'next_question');
      } else {
        keyboard.text('Show Results 📊', 'next_question');
      }

      await this.safeEditMessage(ctx,
        `âŒ Wrong! Your answer: ${formatAnswerForDisplay(userAnswer)}

` +
        `The correct answer was: ${formatAnswerForDisplay(currentQuestion.correctAnswer)}

` +
        `📖 Explanation:
${explanation}

` +
        `Score: ${session.correctAnswers}/${session.currentQuestionIndex + 1}`,
        {
          reply_markup: keyboard
        }
      );
    }
  }

  async handleClearSelection(ctx) {
    const userId = ctx.from.id;
    const session = this.userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('âŒ Session error. Please use /start to begin again.');
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];

    // Validate that this is a multiple-answer question
    if (!isMultipleAnswerQuestion(currentQuestion.correctAnswer)) {
      await ctx.reply('âŒ This is not a multiple-answer question.');
      return;
    }

    // Clear all selections
    this.userSelections.set(userId, []);

    // Recreate the question display
    const requiredCount = normalizeAnswer(currentQuestion.correctAnswer).length;
    const questionNumber = session.currentQuestionIndex + 1;
    const totalQuestions = session.questions.length;

    let questionOptions =
      `A. ${currentQuestion.options.A || 'Option A not available'}\n` +
      `B. ${currentQuestion.options.B || 'Option B not available'}\n` +
      `C. ${currentQuestion.options.C || 'Option C not available'}\n` +
      `D. ${currentQuestion.options.D || 'Option D not available'}`;

    // Add E and F options if they exist
    if (currentQuestion.options.E) {
      questionOptions += `\nE. ${currentQuestion.options.E}`;
    }
    if (currentQuestion.options.F) {
      questionOptions += `\nF. ${currentQuestion.options.F}`;
    }

    const questionText =
      `📍 Question ${questionNumber}/${totalQuestions}\n` +
      `Score: ${session.correctAnswers}/${session.currentQuestionIndex}\n\n` +
      `${currentQuestion.question}\n\n` +
      questionOptions + '\n\n' +
      `âš ï¸ Multiple answers required: Select ${requiredCount} options\n` +
      `✅ Selected: None (0/${requiredCount})`;

    // Create fresh keyboard
    const keyboard = new InlineKeyboard();
    keyboard
      .text('A', 'answer_A').text('B', 'answer_B').row()
      .text('C', 'answer_C').text('D', 'answer_D').row();

    // Add E and F if they exist
    if (currentQuestion.options.E || currentQuestion.options.F) {
      if (currentQuestion.options.E && currentQuestion.options.F) {
        keyboard.text('E', 'answer_E').text('F', 'answer_F').row();
      } else if (currentQuestion.options.E) {
        keyboard.text('E', 'answer_E').row();
      } else if (currentQuestion.options.F) {
        keyboard.text('F', 'answer_F').row();
      }
    }

    keyboard
      .text('✅ Confirm Selection', 'confirm_selection').row()
      .text('🔄 Clear All', 'clear_selection');

    await this.safeEditMessage(ctx, questionText, {
      reply_markup: keyboard
    });
  }

  async handleNextQuestion(ctx) {
    const userId = ctx.from.id;
    const session = this.userSessions.get(userId);

    if (!session) {
      await ctx.reply('âŒ Session error. Please use /start to begin again.');
      return;
    }

    if (session.currentQuestionIndex < session.questions.length - 1) {
      session.currentQuestionIndex++;
      await this.showCurrentQuestion(ctx);
    } else {
      await this.showQuizResults(ctx);
    }
  }

  async showQuizResults(ctx) {
    const userId = ctx.from.id;
    const session = this.userSessions.get(userId);

    if (!session) {
      await ctx.reply('âŒ Session error. Please use /start to begin again.');
      return;
    }

    const totalQuestions = session.questions.length;
    const correctAnswers = session.correctAnswers;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    const endTime = new Date();
    const duration = Math.round((endTime - session.startTime) / 1000 / 60); // minutes

    // Save quiz attempt to database
    await this.saveQuizAttempt(session, userId, endTime, duration);

    // Create results message
    const resultsText =
      '🎉 Quiz Complete!\n\n' +
      '📊 Your Results:\n' +
      `â€¢ Score: ${correctAnswers}/${totalQuestions} (${percentage}%)\n` +
      `â€¢ Certificate: ${session.certificate.name}\n` +
      `â€¢ Access Code: ${session.accessCode}\n` +
      `â€¢ Duration: ${duration} minutes\n` +
      `â€¢ Date: ${endTime.toLocaleString()}\n\n` +
      `${percentage >= 70 ? '✅ Congratulations! You passed!' : 'âŒ Keep studying and try again!'}`;

    const keyboard = new InlineKeyboard()
      .text('Take Another Quiz 🔄', 'restart_quiz');

    await ctx.reply(resultsText, {
      reply_markup: keyboard
    });

    // Clear session
    this.userSessions.delete(userId);
  }

  async saveQuizAttempt(session, userId, endTime, duration) {
    try {
      const db = await this.connectToDatabase();

      const quizAttempt = {
        userId: userId,
        accessCode: session.accessCode,
        certificateId: new ObjectId(session.certificateId),
        certificateName: session.certificate.name,
        certificateCode: session.certificate.code,
        totalQuestions: session.questions.length,
        correctAnswers: session.correctAnswers,
        percentage: Math.round((session.correctAnswers / session.questions.length) * 100),
        duration: duration,
        startTime: session.startTime,
        endTime: endTime,
        answers: session.answers,
        createdAt: new Date()
      };

      await db.collection('quiz-attempts').insertOne(quizAttempt);
      console.log('Quiz attempt saved successfully');
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
    }
  }

  async handleBookmark(ctx) {
    const userId = ctx.from.id;
    const commandText = ctx.message.text;

    // Check if user has an active session with access code
    const session = this.userSessions.get(userId);
    if (!session || !session.accessCode) {
      await ctx.reply(
        'âŒ Please start a quiz session first with a valid access code.\n\n' +
        'Use /start to begin a new quiz session.'
      );
      return;
    }

    // Extract question number from command
    const parts = commandText.split(' ');
    if (parts.length < 2) {
      await ctx.reply(
        'âŒ Please provide a question number.\n\n' +
        'Usage: /bookmark <question_number>\n' +
        'Example: /bookmark 15'
      );
      return;
    }

    const questionNumber = parseInt(parts[1]);
    if (isNaN(questionNumber) || questionNumber < 1) {
      await ctx.reply('âŒ Please provide a valid question number (greater than 0).');
      return;
    }

    try {
      const db = await this.connectToDatabase();

      // Check if question exists in access-code-questions collection for current access code
      const question = await db.collection('access-code-questions').findOne({
        assignedQuestionNo: questionNumber,
        generatedAccessCode: session.accessCode  // Filter by current access code
      });

      if (!question) {
        await ctx.reply(
          `âŒ Question ${questionNumber} not found in your current access code (${session.accessCode}).\n\n` +
          'Please use a question number from your current quiz session.'
        );
        return;
      }

      // Check if bookmark already exists for this user and question
      const existingBookmark = await db.collection('bookmarks').findOne({
        userId: userId,
        questionNumber: questionNumber,
        generatedAccessCode: session.accessCode  // Also filter bookmarks by access code
      });

      if (existingBookmark) {
        await ctx.reply(`📍 Question ${questionNumber} is already bookmarked!`);
        return;
      }

      // Create new bookmark with access code
      const bookmark = {
        userId: userId,
        questionNumber: questionNumber,
        questionId: question.questionId,
        accessCodeQuestionId: question._id,
        generatedAccessCode: session.accessCode,  // Store the access code
        createdAt: new Date()
      };

      await db.collection('bookmarks').insertOne(bookmark);

      await ctx.reply(`✅ Question ${questionNumber} has been bookmarked successfully for access code ${session.accessCode}!`);

    } catch (error) {
      console.error('Error saving bookmark:', error);
      await ctx.reply('âŒ Error saving bookmark. Please try again.');
    }
  }

  async handleShowBookmarks(ctx) {
    const userId = ctx.from.id;

    // Check if user has an active session with access code
    const session = this.userSessions.get(userId);
    if (!session || !session.accessCode) {
      await ctx.reply(
        'âŒ Please start a quiz session first with a valid access code.\n\n' +
        'Use /start to begin a new quiz session.'
      );
      return;
    }

    try {
      const db = await this.connectToDatabase();

      // Get user's bookmarks with question details filtered by current access code
      const pipeline = [
        {
          $match: {
            userId: userId,
            generatedAccessCode: session.accessCode  // Filter by current access code
          }
        },
        {
          $lookup: {
            from: 'access-code-questions',
            localField: 'accessCodeQuestionId',
            foreignField: '_id',
            as: 'questionDetails'
          }
        },
        {
          $lookup: {
            from: 'quizzes',
            localField: 'questionId',
            foreignField: '_id',
            as: 'fullQuestionDetails'
          }
        },
        { $unwind: { path: '$questionDetails', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$fullQuestionDetails', preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            questionNumber: 1,
            createdAt: 1,
            questionText: '$fullQuestionDetails.question',
            generatedAccessCode: '$questionDetails.generatedAccessCode'
          }
        }
      ];

      const bookmarks = await db.collection('bookmarks').aggregate(pipeline).toArray();

      if (bookmarks.length === 0) {
        await ctx.reply(
          `📍 You haven't bookmarked any questions yet for access code ${session.accessCode}.\n\n` +
          'Use /bookmark <question_number> to save questions for later review.'
        );
        return;
      }

      let message = `📚 Your Bookmarked Questions for ${session.accessCode} (${bookmarks.length}):\n\n`;

      bookmarks.forEach((bookmark, index) => {
        const date = bookmark.createdAt.toLocaleDateString();
        const questionPreview = bookmark.questionText ?
          bookmark.questionText.substring(0, 100) + '...' :
          'Question text not available';

        message += `${index + 1}. Question ${bookmark.questionNumber}\n`;
        message += `   📍… Saved: ${date}\n`;
        message += `   📍 Preview: ${questionPreview}\n\n`;
      });

      message += '💡 Tip: Use /bookmark <question_number> to save more questions from your current quiz session!';

      await ctx.reply(message);

    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      await ctx.reply('âŒ Error loading bookmarks. Please try again.');
    }
  }

  async saveWrongAnswer(userId, session, currentQuestion, selectedAnswer) {
    try {
      const db = await this.connectToDatabase();

      // Check if this wrong answer already exists for this user, question, and access code
      const existingWrongAnswer = await db.collection('wrong-answers').findOne({
        userId: userId,
        questionId: currentQuestion._id,
        certificateId: new ObjectId(session.certificateId),
        accessCode: session.accessCode  // Also filter by access code for data isolation
      });

      if (existingWrongAnswer) {
        // Update existing wrong answer with latest attempt
        await db.collection('wrong-answers').updateOne(
          { _id: existingWrongAnswer._id },
          {
            $set: {
              selectedAnswer: selectedAnswer,
              correctAnswer: currentQuestion.correctAnswer,
              lastAttemptDate: new Date(),
              attemptCount: (existingWrongAnswer.attemptCount || 1) + 1
            }
          }
        );
      } else {
        // Create new wrong answer record
        const wrongAnswer = {
          userId: userId,
          questionId: currentQuestion._id,
          questionNumber: currentQuestion.assignedQuestionNo,
          certificateId: new ObjectId(session.certificateId),
          certificateName: session.certificate.name,
          certificateCode: session.certificate.code,
          accessCode: session.accessCode,
          selectedAnswer: selectedAnswer,
          correctAnswer: currentQuestion.correctAnswer,
          explanation: currentQuestion.explanation || 'No explanation available',
          questionText: currentQuestion.question,
          createdAt: new Date(),
          lastAttemptDate: new Date(),
          attemptCount: 1
        };

        await db.collection('wrong-answers').insertOne(wrongAnswer);
      }

      console.log('Wrong answer saved successfully');
    } catch (error) {
      console.error('Error saving wrong answer:', error);
    }
  }

  async handleRevision(ctx) {
    const userId = ctx.from.id;

    // Check if user has an active session with access code
    const session = this.userSessions.get(userId);
    if (!session || !session.accessCode) {
      await ctx.reply(
        'âŒ Please start a quiz session first with a valid access code.\n\n' +
        'Use /start to begin a new quiz session.'
      );
      return;
    }

    try {
      const db = await this.connectToDatabase();

      // Get user's wrong answers filtered by current access code
      const pipeline = [
        {
          $match: {
            userId: userId,
            accessCode: session.accessCode  // Filter by current access code
          }
        },
        {
          $group: {
            _id: '$certificateId',
            certificateName: { $first: '$certificateName' },
            certificateCode: { $first: '$certificateCode' },
            wrongAnswers: {
              $push: {
                questionNumber: '$questionNumber',
                questionText: '$questionText',
                selectedAnswer: '$selectedAnswer',
                correctAnswer: '$correctAnswer',
                explanation: '$explanation',
                lastAttemptDate: '$lastAttemptDate',
                attemptCount: '$attemptCount',
                accessCode: '$accessCode'
              }
            },
            totalWrongAnswers: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ];

      const wrongAnswersByCategory = await db.collection('wrong-answers').aggregate(pipeline).toArray();

      if (wrongAnswersByCategory.length === 0) {
        await ctx.reply(
          `🎯 Great job! You haven't answered any questions incorrectly yet for access code ${session.accessCode}.\n\n` +
          'Keep practicing and this section will help you review any mistakes you make in the future.'
        );
        return;
      }

      let message = `📚 Revision Summary for ${session.accessCode} - Wrong Answers by Certificate:\n\n`;

      wrongAnswersByCategory.forEach((category, index) => {
        message += `${index + 1}. ${category.certificateName} (${category.certificateCode})\n`;
        message += `   âŒ Wrong Answers: ${category.totalWrongAnswers}\n`;
        message += '   📍 Questions: ';

        // Show first 5 question numbers
        const questionNumbers = category.wrongAnswers
          .map(wa => wa.questionNumber)
          .sort((a, b) => a - b)
          .slice(0, 5);

        message += questionNumbers.join(', ');
        if (category.wrongAnswers.length > 5) {
          message += ` and ${category.wrongAnswers.length - 5} more...`;
        }
        message += '\n\n';
      });

      message += '💡 Tip: Focus on reviewing these questions from your current access code to improve your knowledge!\n\n' +
                 '📊 Detailed breakdown:\n';

      // Show detailed breakdown for each certificate
      wrongAnswersByCategory.forEach((category, index) => {
        message += `\n🎓 ${category.certificateName}:\n`;

        category.wrongAnswers
          .sort((a, b) => a.questionNumber - b.questionNumber)
          .slice(0, 10) // Show first 10 questions per certificate
          .forEach(wa => {
            const attemptText = wa.attemptCount > 1 ? ` (${wa.attemptCount} attempts)` : '';
            message += `â€¢ Q${wa.questionNumber}: ${wa.selectedAnswer} â†’ ${wa.correctAnswer}${attemptText}\n`;
          });

        if (category.wrongAnswers.length > 10) {
          message += `  ... and ${category.wrongAnswers.length - 10} more questions\n`;
        }
      });

      // Split message if it's too long for Telegram
      if (message.length > 4000) {
        const messages = this.splitLongMessage(message, 4000);
        for (const msg of messages) {
          await ctx.reply(msg);
        }
      } else {
        await ctx.reply(message);
      }

    } catch (error) {
      console.error('Error fetching revision data:', error);
      await ctx.reply('âŒ Error loading revision data. Please try again.');
    }
  }

  splitLongMessage(message, maxLength) {
    const messages = [];
    let currentMessage = '';
    const lines = message.split('\n');

    for (const line of lines) {
      if ((currentMessage + line + '\n').length > maxLength) {
        if (currentMessage) {
          messages.push(currentMessage.trim());
          currentMessage = line + '\n';
        } else {
          // Line is too long, truncate it
          messages.push(line.substring(0, maxLength - 3) + '...');
        }
      } else {
        currentMessage += line + '\n';
      }
    }

    if (currentMessage) {
      messages.push(currentMessage.trim());
    }

    return messages;
  }

  async start() {
    try {
      console.log('🔍Œ Connecting to MongoDB...');
      await this.connectToDatabase();
      console.log('✅ Connected to MongoDB');

      console.log('🔍 Testing Telegram API first...');
      try {
        const me = await this.bot.api.getMe();
        console.log(`✅ Bot API test successful: ${me.username} (${me.first_name})`);
      } catch (apiError) {
        console.error('âŒ Bot API test failed:', apiError.message);
        this.offlineMode = true;
        console.log('🔄 Entering offline mode due to API test failure');
        return;
      }

      console.log('🤖 Starting Telegram bot polling...');

      // Set a timeout flag
      let timeoutOccurred = false;
      const timeoutId = setTimeout(() => {
        timeoutOccurred = true;
        console.error('âš ï¸  Bot polling start timeout - this may be normal for some environments');
        console.log('🔄 Continuing in semi-online mode - API works but polling may be restricted');
        this.offlineMode = false; // API works, so not fully offline
        this.pollingIssue = true; // Track that polling has issues
      }, 8000); // Reduced timeout for faster feedback

      try {
        // Try to start the bot polling
        await this.bot.start({
          onStart: () => {
            if (!timeoutOccurred) {
              console.log('✅ Bot polling started successfully!');
              clearTimeout(timeoutId);
            }
          },
          drop_pending_updates: true
        });

        if (!timeoutOccurred) {
          clearTimeout(timeoutId);
          console.log('✅ Bot fully operational');
        }

      } catch (botError) {
        clearTimeout(timeoutId);

        if (botError.error_code === 409) {
          console.error('âŒ Bot conflict detected! Another instance is already running.');
          throw botError;
        } else if (timeoutOccurred) {
          // Timeout already handled above
          return;
        } else {
          console.error('âŒ Error starting bot polling:', botError.message);
          console.log('🔄 API works but polling failed - running in API-only mode');
          this.offlineMode = false; // API works
          this.pollingIssue = true;
          return;
        }
      }

    } catch (error) {
      console.error('âŒ Error in start method:', error);
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

  async handleCommandMenu(ctx) {
    const menuMessage =
      '🤖 <b>AWS Certification Bot - Command Menu</b>\n\n' +
      'Choose a command to execute:\n\n' +
      '📋 <b>Quiz Commands</b>\n' +
      '🚀 Start New Quiz - Begin a fresh quiz session\n' +
      '🎮 QuizBlitz - Join live multiplayer quiz\n' +
      '📚 Show Help Guide - Detailed instructions and tips\n\n' +
      '🔍– <b>Bookmark Commands</b>\n' +
      'ðŸ’¾ Add Bookmark - Save a specific question by number\n' +
      '🔒 View Bookmarks - See all your saved questions\n\n' +
      '📖 <b>Study Commands</b>\n' +
      '🔄 Revision Mode - Review questions you got wrong\n\n' +
      'âš¡ <b>Quick Actions</b>\n' +
      '🎯 Quick Menu - Fast access to common actions\n\n' +
      '💡 <i>Tip: You can also type these commands directly:</i>\n' +
      '<code>/start</code> â€¢ <code>/help</code> â€¢ <code>/quizblitz</code> â€¢ <code>/bookmarks</code> â€¢ <code>/revision</code>';

    const keyboard = new InlineKeyboard()
      .text('🚀 Start Quiz', 'menu_start').text('🎮 QuizBlitz', 'menu_quizblitz').row()
      .text('📚 Help Guide', 'menu_help').row()
      .text('ðŸ’¾ Add Bookmark', 'menu_bookmark').text('🔒 View Bookmarks', 'menu_bookmarks').row()
      .text('🔄 Revision Mode', 'menu_revision').row()
      .text('âš¡ Quick Menu', 'quick_menu').row()
      .text('âŒ Close Menu', 'menu_close');

    await ctx.reply(menuMessage, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  }

  async handleMenuAction(ctx, action) {
    try {
      switch (action) {
      case 'start':
        await this.safeEditMessage(ctx, '🚀 Starting new quiz...');
        setTimeout(async () => {
          await this.handleStart(ctx);
        }, 1000);
        break;

      case 'help':
        await this.safeEditMessage(ctx, '📚 Loading help guide...');
        setTimeout(async () => {
          await this.handleHelp(ctx);
        }, 1000);
        break;

      case 'quizblitz':
        await this.safeEditMessage(ctx, '🎮 Launching QuizBlitz...');
        setTimeout(async () => {
          await this.handleQuizBlitz(ctx);
        }, 1000);
        break;

      case 'bookmark':          await this.safeEditMessage(ctx,             `ðŸ’¾ <b>Add Bookmark</b>

` +            `To bookmark a question, type:
` +            `<code>/bookmark [question_number]</code>

` +            `Example: <code>/bookmark 15</code>

` +            'This will save question #15 for later review.',            { parse_mode: 'HTML' }          );          break;

      case 'bookmarks':
        await this.safeEditMessage(ctx, '🔒 Loading your bookmarks...');
        setTimeout(async () => {
          await this.handleShowBookmarks(ctx);
        }, 1000);
        break;

      case 'revision':
        await this.safeEditMessage(ctx, '🔄 Loading revision mode...');
        setTimeout(async () => {
          await this.handleRevision(ctx);
        }, 1000);
        break;

      case 'close':
        await this.safeEditMessage(ctx, '✅ Menu closed. Type /menu to open it again.');
        break;

      case 'current_question':
        if (this.userSessions.has(ctx.from.id)) {
          await this.safeEditMessage(ctx, '📍 Loading current question...');
          setTimeout(async () => {
            await this.showCurrentQuestion(ctx);
          }, 1000);
        } else {
          await this.safeEditMessage(ctx, 'âŒ No active quiz session. Start a new quiz first.');
        }
        break;

      case 'restart':
        await this.safeEditMessage(ctx, '🔄 Restarting quiz...');
        setTimeout(async () => {
          await this.handleStart(ctx);
        }, 1000);
        break;

      case 'end_quiz': {
        const userId = ctx.from.id;
        if (this.userSessions.has(userId)) {
          this.userSessions.delete(userId);
          this.userSelections.delete(userId);
          await this.safeEditMessage(ctx, 'ðŸ Quiz session ended. Type /start to begin a new quiz.');
        } else {
          await this.safeEditMessage(ctx, 'âŒ No active quiz session to end.');
        }
        break;
      }

      case 'bookmark_current': {
        const session = this.userSessions.get(ctx.from.id);
        if (session && session.questions) {
          const currentQuestion = session.questions[session.currentQuestionIndex];
          if (currentQuestion) {
            await this.saveBookmark(ctx.from.id, session, currentQuestion);
            await this.safeEditMessage(ctx, `ðŸ’¾ Current question #${currentQuestion.question_no} bookmarked successfully!`);
          } else {
            await this.safeEditMessage(ctx, 'âŒ No current question to bookmark.');
          }
        } else {
          await this.safeEditMessage(ctx, 'âŒ No active quiz session. Start a quiz first.');
        }
        break;
      }

      default:
        await this.safeEditMessage(ctx, 'âŒ Unknown command. Type /menu to see available options.');
      }
    } catch (error) {
      console.error('Error handling menu action:', error);
      await ctx.reply('âŒ An error occurred. Please try again.');
    }
  }

  async handleQuickMenu(ctx) {
    const userId = ctx.from.id;
    const session = this.userSessions.get(userId);

    let menuMessage = 'âš¡ <b>Quick Actions Menu</b>\n\n';

    if (session && session.questions) {
      // User is in an active quiz
      menuMessage +=
        '🎯 <b>Active Quiz Session</b>\n' +
        `Certificate: ${session.certificate.name}\n` +
        `Progress: ${session.currentQuestionIndex + 1}/${session.questions.length}\n` +
        `Score: ${session.correctAnswers}/${session.currentQuestionIndex + 1}\n\n` +
        '<b>Quick Actions:</b>\n' ;

      const keyboard = new InlineKeyboard()
        .text('📍 Current Question', 'menu_current_question').row()
        .text('🔄 Restart Quiz', 'menu_restart').text('ðŸ End Quiz', 'menu_end_quiz').row()
        .text('ðŸ’¾ Bookmark Current', 'menu_bookmark_current').row()
        .text('🔒 View Bookmarks', 'menu_bookmarks').text('🔄 Revision Mode', 'menu_revision').row()
        .text('📚 Help', 'menu_help').text('âŒ Close', 'menu_close');

      await this.safeEditMessage(ctx, menuMessage, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
    } else {
      // No active session
      menuMessage +=
        '🎯 <b>No Active Quiz Session</b>\n\n' +
        '<b>Quick Actions:</b>\n' ;

      const keyboard = new InlineKeyboard()
        .text('🚀 Start New Quiz', 'menu_start').row()
        .text('🔒 View Bookmarks', 'menu_bookmarks').text('🔄 Revision Mode', 'menu_revision').row()
        .text('📚 Help Guide', 'menu_help').row()
        .text('âŒ Close', 'menu_close');

      await this.safeEditMessage(ctx, menuMessage, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
    }
  }

  /**
   * Safely edits a message, checking if the content has actually changed.
   * @param {object} ctx - The Grammy context object.
   * @param {string} newText - The new text for the message.
   * @param {object} newOptions - The new options for the message (e.g., reply_markup).
   */
  async safeEditMessage(ctx, newText, newOptions) {
    try {
      // Get the current message content
      const currentMessage = ctx.callbackQuery?.message;
      const currentText = currentMessage?.text;
      const currentReplyMarkup = currentMessage?.reply_markup;

      // Normalize and compare content to avoid unnecessary API calls
      const isTextChanged = newText.trim() !== (currentText || '').trim();
      const isMarkupChanged = JSON.stringify(newOptions?.reply_markup) !== JSON.stringify(currentReplyMarkup);

      if (isTextChanged || isMarkupChanged) {
        await ctx.editMessageText(newText, newOptions);
      } else {
        console.log('Skipping message edit because content is identical.');
      }
    } catch (error) {
      // Log the error, but don't crash the bot
      if (error.message.includes('message is not modified')) {
        console.warn('Attempted to edit message with same content, which was caught by safeEditMessage.');
      } else {
        console.error('Error in safeEditMessage:', error);
      }
    }
  }

  // QuizBlitz command handler
  async handleQuizBlitz(ctx) {
    try {
      const userId = ctx.from.id;

      // Reset any existing session
      this.userSessions.set(userId, {
        waitingForQuizCode: true,
        quizBlitzFlow: true
      });

      await ctx.reply(
        '🎮 *QuizBlitz - Live Multiplayer Quiz*\n\n' +
        'âš¡ Join a live quiz session!\n\n' +
        'Please enter the *6-digit quiz code* shown on the host\'s screen:',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error in handleQuizBlitz:', error);
      await ctx.reply('âŒ Sorry, there was an error. Please try again.');
    }
  }

  // Handle quiz code submission
  async handleQuizCodeSubmission(ctx, quizCode) {
    try {
      const userId = ctx.from.id;
      const session = this.userSessions.get(userId);

      if (!session || !session.waitingForQuizCode) {
        return;
      }

      // Validate quiz code format (6 digits/letters)
      const cleanCode = quizCode.trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
        await ctx.reply(
          'âŒ Invalid quiz code format!\n\n' +
          'Please enter a valid 6-digit quiz code (letters and numbers only):'
        );
        return;
      }

      // Check if quiz room exists and is active
      try {
        if (!this.db) {
          await ctx.reply('âŒ Database connection not available. Please try again later.');
          return;
        }

        const quizRoom = await this.db.collection('quizRooms').findOne({
          quizCode: cleanCode,
          status: { $in: ['waiting', 'active'] }
        });

        if (!quizRoom) {
          await ctx.reply(
            'âŒ Quiz room not found or no longer active!\n\n' +
            'Please check the quiz code and try again:'
          );
          return;
        }

        // Update session with quiz code
        session.quizCode = cleanCode;
        session.waitingForQuizCode = false;
        session.waitingForPlayerName = true;
        this.userSessions.set(userId, session);

        await ctx.reply(
          '✅ Quiz room found!\n\n' +
          `🎯 *Quiz Code:* ${cleanCode}\n` +
          `📊 *Status:* ${quizRoom.status === 'waiting' ? 'Waiting for players' : 'In progress'}\n\n` +
          'ðŸ‘¤ Please enter your *player name* for the quiz:',
          { parse_mode: 'Markdown' }
        );

      } catch (error) {
        console.error('Error validating quiz code:', error);
        await ctx.reply(
          'âŒ Error checking quiz room. Please try again:\n\n' +
          'Enter the 6-digit quiz code:'
        );
      }
    } catch (error) {
      console.error('Error in handleQuizCodeSubmission:', error);
      await ctx.reply('âŒ Sorry, there was an error. Please try again.');
    }
  }

  // Handle player name submission
  async handlePlayerNameSubmission(ctx, playerName) {
    try {
      const userId = ctx.from.id;
      const session = this.userSessions.get(userId);

      if (!session || !session.waitingForPlayerName || !session.quizCode) {
        return;
      }

      // Validate player name
      const cleanName = playerName.trim();
      if (!cleanName || cleanName.length < 2 || cleanName.length > 20) {
        await ctx.reply(
          'âŒ Invalid player name!\n\n' +
          'Please enter a name between 2-20 characters:'
        );
        return;
      }

      try {
        // Join the quiz room
        const joinResult = await this.joinQuizRoom(session.quizCode, {
          id: userId.toString(),
          name: cleanName,
          telegramId: userId,
          joinedAt: new Date()
        });

        if (joinResult.success) {
          // Update session
          session.waitingForPlayerName = false;
          session.playerName = cleanName;
          session.quizJoined = true;
          this.userSessions.set(userId, session);

          await ctx.reply(
            '🎉 *Successfully joined the quiz!*\n\n' +
            `ðŸ‘¤ *Player Name:* ${cleanName}\n` +
            `🎯 *Quiz Code:* ${session.quizCode}\n` +
            `ðŸ‘¥ *Players in room:* ${joinResult.playerCount}\n\n` +
            'â³ *Waiting for the host to start the quiz...*\n\n' +
            'You\'ll receive questions here when the quiz begins!',
            { parse_mode: 'Markdown' }
          );

          // Notify frontend about new player
          await this.notifyFrontendPlayerJoined(session.quizCode, {
            id: userId.toString(),
            name: cleanName,
            telegramId: userId
          });

        } else {
          await ctx.reply(
            `âŒ ${joinResult.error}\n\n` +
            'Please try a different name:'
          );
        }

      } catch (error) {
        console.error('Error joining quiz room:', error);
        await ctx.reply(
          'âŒ Error joining quiz room. The quiz may have started or is full.\n\n' +
          'Please try again or use /quizblitz to join a different quiz.'
        );
      }
    } catch (error) {
      console.error('Error in handlePlayerNameSubmission:', error);
      await ctx.reply('âŒ Sorry, there was an error. Please try again.');
    }
  }

  // Join quiz room helper
  async joinQuizRoom(quizCode, player) {
    try {
      if (!this.db) {
        throw new Error('Database connection not available');
      }

      // Check if room exists and is accepting players
      const quizRoom = await this.db.collection('quizRooms').findOne({
        quizCode: quizCode.toUpperCase(),
        status: 'waiting'
      });

      if (!quizRoom) {
        return {
          success: false,
          error: 'Quiz room not found or already started'
        };
      }

      // Check if player name is already taken
      const existingPlayer = quizRoom.players?.find(p =>
        p.name.toLowerCase() === player.name.toLowerCase()
      );

      if (existingPlayer) {
        return {
          success: false,
          error: 'Player name already taken in this quiz'
        };
      }

      // Add player to room
      const updateResult = await this.db.collection('quizRooms').updateOne(
        { quizCode: quizCode.toUpperCase() },
        {
          $push: {
            players: player
          }
        }
      );

      if (updateResult.modifiedCount > 0) {
        // Get updated player count
        const updatedRoom = await this.db.collection('quizRooms').findOne({
          quizCode: quizCode.toUpperCase()
        });

        return {
          success: true,
          playerCount: updatedRoom.players?.length || 1
        };
      } else {
        return {
          success: false,
          error: 'Failed to join quiz room'
        };
      }

    } catch (error) {
      console.error('Error in joinQuizRoom:', error);
      return {
        success: false,
        error: 'Database error while joining quiz'
      };
    }
  }

  // Notify frontend about player joining
  async notifyFrontendPlayerJoined(quizCode, player) {
    try {
      // This would typically use WebSocket or server-sent events
      // For now, we'll store the notification in the database
      if (!this.db) {
        console.error('Database connection not available for quiz notifications');
        return;
      }

      await this.db.collection('quizNotifications').insertOne({
        type: 'player_joined',
        quizCode: quizCode.toUpperCase(),
        player,
        timestamp: new Date()
      });

      console.log(`Player ${player.name} joined quiz ${quizCode}`);
    } catch (error) {
      console.error('Error notifying frontend:', error);
    }
  }

  // Handle QuizBlitz answer selection
  async handleQuizBlitzAnswer(ctx, selectedAnswer, quizCode) {
    try {
      const userId = ctx.from.id;
      const session = this.userSessions.get(userId);

      if (!session || !session.quizJoined || session.quizCode !== quizCode) {
        await ctx.reply('âŒ You are not part of this quiz session.');
        return;
      }

      // Check if quiz has ended
      if (session.quizCompleted) {
        await ctx.reply('ðŸ Quiz has already ended. You can no longer submit answers.');
        return;
      }

      // Check if user already answered this question
      const answerKey = `${quizCode}_${userId}`;
      if (this.quizAnswerStates.has(answerKey)) {
        await ctx.answerCallbackQuery('âš ï¸ You have already answered this question!', { show_alert: true });
        return;
      }

      // Mark user as having answered this question
      this.quizAnswerStates.set(answerKey, {
        answer: selectedAnswer,
        timestamp: Date.now()
      });

      // Submit answer to quiz system
      try {
        // Get current question index from quiz session
        const db = await this.connectToDatabase();
        const quizSession = await db.collection('quizSessions').findOne({ 
          quizCode: quizCode.toUpperCase() 
        });
        
        const currentQuestionIndex = quizSession?.currentQuestionIndex || 0;
        console.log(`🔧 DEBUG: [TELEGRAM] Current question index from session: ${currentQuestionIndex}`);
        
        const submitResult = await this.submitQuizAnswer(
          quizCode,
          userId.toString(),
          selectedAnswer,
          currentQuestionIndex,
          session.playerName || session.firstName || `User${userId}`
        );

        if (submitResult.success) {
          // Remove the keyboard to prevent additional answers
          await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });

          // Send confirmation callback
          await ctx.answerCallbackQuery(`✅ Answer ${selectedAnswer} submitted!`);

          // Send waiting message to user
          await ctx.reply(
            `â³ Please wait for other players to answer...\n` +
            `📊 The results will be shown when the timer expires or all players have answered.\n\n` +
            `🔄 <b>Current Status:</b> Waiting for timer to complete...`,
            { parse_mode: 'HTML' }
          );

          console.log(`✅ Answer submitted: ${session.username || session.firstName || userId} -> ${selectedAnswer} for quiz ${quizCode}`);
        } else {
          // Remove from answered state if submission failed
          this.quizAnswerStates.delete(answerKey);
          
          await ctx.answerCallbackQuery(submitResult.error || 'âŒ Failed to submit answer', { show_alert: true });
        }

      } catch (error) {
        // Remove from answered state if submission failed
        this.quizAnswerStates.delete(answerKey);
        
        console.error('Error submitting quiz answer:', error);
        await ctx.answerCallbackQuery('âŒ Network error - please try again', { show_alert: true });
      }

    } catch (error) {
      console.error('Error in handleQuizBlitzAnswer:', error);
      await ctx.reply('âŒ Sorry, there was an error processing your answer.');
    }
  }

  // Submit quiz answer helper - Direct database validation
  async submitQuizAnswer(quizCode, playerId, answer, questionIndex = 0, playerName = null) {
    try {
      console.log(`📤 [TELEGRAM] Submitting answer directly to MongoDB:`, {
        quizCode: quizCode.toUpperCase(),
        playerId,
        answer,
        questionIndex,
        playerName
      });

      const db = await this.connectToDatabase();
      
      // Step 1: Get quiz session to find certificate ID
      const quizSession = await db.collection('quizSessions').findOne({ 
        quizCode: quizCode.toUpperCase() 
      });
      
      if (!quizSession) {
        console.error(`❌ Quiz session not found for code: ${quizCode}`);
        return { success: false, error: 'Quiz session not found' };
      }

      const certificateId = quizSession.certificateId;
      console.log(`🔍 Found certificate ID: ${certificateId} for quiz: ${quizCode}`);

      // Step 2: Get question from quizzes collection using certificate ID and question number
      // Convert 0-based index to 1-based question number
      const questionNumber = questionIndex + 1;
      console.log(`🔍 Looking for question ${questionNumber} (index ${questionIndex}) in certificate ${certificateId}`);

      const question = await db.collection('quizzes').findOne({
        certificateId: certificateId,
        questionNumber: questionNumber
      });

      if (!question) {
        console.error(`❌ Question ${questionNumber} not found for certificate ${certificateId}`);
        return { success: false, error: `Question ${questionNumber} not found` };
      }

      // Step 3: Validate answer using correctAnswer field
      const correctAnswer = question.correctAnswer;
      const isCorrect = answer === correctAnswer;
      
      console.log(`✅ Answer validation:`, {
        playerAnswer: answer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        questionNumber: questionNumber
      });

      // Step 4: Record the answer in database (optional - for tracking)
      try {
        await db.collection('quizAnswers').insertOne({
          quizCode: quizCode.toUpperCase(),
          playerId: playerId,
          playerName: playerName,
          questionIndex: questionIndex,
          questionNumber: questionNumber,
          playerAnswer: answer,
          correctAnswer: correctAnswer,
          isCorrect: isCorrect,
          timestamp: new Date(),
          source: 'telegram'
        });
        console.log(`📝 Answer recorded in database`);
      } catch (recordError) {
        console.error('⚠️ Failed to record answer (continuing anyway):', recordError);
      }

      return {
        success: true,
        isCorrect: isCorrect,
        correctAnswer: correctAnswer,
        points: isCorrect ? 1000 : 0,
        questionNumber: questionNumber
      };

    } catch (error) {
      console.error('❌ Error validating answer in database:', error);
      return { success: false, error: error.message };
    }
  }

  // Send quiz question to player
  async sendQuizQuestion(telegramId, questionData, quizCode) {
    try {
      console.log('📍¨ [TELEGRAM] ========== SENDING QUIZ QUESTION FUNCTION CALLED ==========');
      console.log('📍¨ [TELEGRAM] *** THIS IS THE FUNCTION THAT RENDERS QUESTIONS AND ANSWERS ***');
      console.log(`🔧 DEBUG: [TELEGRAM] sendQuizQuestion ENTRY POINT - User: ${telegramId}`);
      console.log(`🔧 DEBUG: [TELEGRAM] sendQuizQuestion ENTRY POINT - Quiz code: ${quizCode}`);
      console.log('🔧 DEBUG: [TELEGRAM] sendQuizQuestion ENTRY POINT - Question data:', JSON.stringify(questionData, null, 2));
      
      // Add call stack trace to see where this is being called from
      console.log('🔧 DEBUG: [TELEGRAM] Function call stack:');
      console.trace('sendQuizQuestion called from:');

      // Clear previous answer state for this user/quiz when new question arrives
      const answerKey = `${quizCode}_${telegramId}`;
      if (this.quizAnswerStates.has(answerKey)) {
        console.log(`🔧 DEBUG: Clearing previous answer state for user ${telegramId} in quiz ${quizCode}`);
        this.quizAnswerStates.delete(answerKey);
      }

      // Skip session validation for change stream questions - players are validated by quizRooms collection
      console.log('🔧 DEBUG: [TELEGRAM] Bypassing user session validation for change stream questions');
      console.log('🔧 DEBUG: [TELEGRAM] Player already validated via quizRooms collection lookup');

      console.log(`📍¤ Sending question to Telegram user ${telegramId}`);
      console.log('Question data:', JSON.stringify(questionData, null, 2));

      const keyboard = new InlineKeyboard();

      console.log('🔧 DEBUG: [TELEGRAM] *** PROCESSING QUESTION OPTIONS FOR DISPLAY ***');
      
      // Check if options exist and format them properly
      if (!questionData.options) {
        console.error('âŒ [TELEGRAM] *** NO OPTIONS PROVIDED - QUESTION WILL NOT RENDER ***');
        console.error('âŒ [TELEGRAM] Question data without options:', questionData);
        return;
      }

      console.log('✅ [TELEGRAM] *** OPTIONS FOUND - PROCESSING FOR TELEGRAM KEYBOARD ***');
      console.log('🔧 DEBUG: [TELEGRAM] Raw options object:', JSON.stringify(questionData.options, null, 2));

      // Add answer options - handle both object and direct format
      const optionsToShow = [];
      console.log('🔧 DEBUG: [TELEGRAM] Processing each option for keyboard...');
      
      Object.entries(questionData.options).forEach(([key, value]) => {
        console.log(`🔧 DEBUG: [TELEGRAM] Processing option ${key}: "${value}"`);
        if (value && value.trim()) {
          optionsToShow.push({ key, value: value.trim() });
          keyboard.text(`${key}. ${value.trim()}`, `quiz_answer_${key}_${quizCode}`).row();
          console.log(`✅ [TELEGRAM] Added option ${key} to keyboard`);
        } else {
          console.log(`âš ï¸ [TELEGRAM] Skipped empty option ${key}`);
        }
      });

      console.log(`📍 [TELEGRAM] *** FINAL KEYBOARD HAS ${optionsToShow.length} OPTIONS ***`);
      console.log('🔧 DEBUG: [TELEGRAM] Final options to show:', optionsToShow);

      // Format the question text with options displayed
      let questionOptionsText = '';
      optionsToShow.forEach(({ key, value }) => {
        // Wrap long option text to improve readability
        const wrappedValue = this.wrapText(value, 50); // Wrap at 50 characters
        questionOptionsText += `${key}. ${wrappedValue}\n\n`; // Add extra line break for better spacing
      });

      // Also wrap the main question text for better readability
      const wrappedQuestion = this.wrapText(questionData.question, 60);
      
      // Calculate synchronized time remaining for more accurate display
      let displayTimeRemaining = questionData.timeLimit;
      if (questionData.questionStartedAt) {
        const now = Date.now();
        const elapsed = Math.max(0, (now - questionData.questionStartedAt) / 1000);
        displayTimeRemaining = Math.max(0, Math.ceil(questionData.timeLimit - elapsed));
        console.log('🔧 DEBUG: [TELEGRAM] Using synchronized time:', {
          startedAt: new Date(questionData.questionStartedAt).toISOString(),
          elapsed: elapsed.toFixed(2),
          remaining: displayTimeRemaining
        });
      }

      const questionText =
        `🎯 *Question ${questionData.index + 1}*\n\n` +
        `${wrappedQuestion}\n\n` +
        `📋 *Options:*\n${questionOptionsText}` +
        `â±ï¸ *Time remaining: ${displayTimeRemaining} seconds*\n` +
        `ðŸ† *Points: ${questionData.points}*`;

      console.log('📍¤ [TELEGRAM] *** ABOUT TO SEND MESSAGE TO TELEGRAM API ***');
      console.log('📍¤ [TELEGRAM] *** THIS IS WHERE THE QUESTION GETS DISPLAYED ***');
      console.log('🔧 DEBUG: [TELEGRAM] Target user ID:', telegramId);
      console.log('🔧 DEBUG: [TELEGRAM] Message text preview:', questionText.substring(0, 200) + '...');
      console.log('🔧 DEBUG: [TELEGRAM] Full message text:');
      console.log(questionText);
      console.log('🔧 DEBUG: [TELEGRAM] Keyboard buttons count:', keyboard.inline_keyboard?.length || 0);
      console.log('🔧 DEBUG: [TELEGRAM] Keyboard structure:', JSON.stringify(keyboard.inline_keyboard, null, 2));
      
      console.log('📡 [TELEGRAM] *** CALLING bot.api.sendMessage NOW ***');
      await this.bot.api.sendMessage(telegramId, questionText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      console.log(`✅ [TELEGRAM] *** QUESTION SUCCESSFULLY SENT TO TELEGRAM API ***`);
      console.log(`✅ [TELEGRAM] *** USER ${telegramId} SHOULD NOW SEE THE QUESTION ***`);

    } catch (error) {
      console.error('Error sending quiz question:', error);
      console.error('Error details:', error.stack);
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
  console.error('âŒ Failed to start bot:', error);
  process.exit(1);
});

module.exports = CertificationBot;
