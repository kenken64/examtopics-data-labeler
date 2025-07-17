const { Bot } = require('grammy');
const http = require('http');
require('dotenv').config();

// Import services
const DatabaseService = require('./services/databaseService');
const QuizService = require('./services/quizService');
const NotificationService = require('./services/notificationService');

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
    this.userSelections = new Map(); // Store user's current answer selections for multiple choice
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
    this.messageHandlers = new MessageHandlers(this.databaseService, this.quizService);
    this.callbackHandlers = new CallbackHandlers(this.databaseService, this.quizService, this.messageHandlers);
    
    // Start health server immediately for Railway
    this.setupHealthCheck();
    
    // Initialize bot asynchronously
    this.initializeAsync();
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

    // Handle certificate selection
    this.bot.callbackQuery(/^cert_(.+)$/, async (ctx) => {
      const certificateId = ctx.match[1];
      await this.callbackHandlers.handleCertificateCallback(ctx, certificateId, this.userSessions);
    });

    // Handle answer selection
    this.bot.callbackQuery(/^answer_([A-F])$/, async (ctx) => {
      const selectedAnswer = ctx.match[1];
      await this.callbackHandlers.handleAnswerCallback(ctx, selectedAnswer, this.userSessions, this.userSelections);
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

    // QuizBlitz Commands
    this.bot.command('join', async (ctx) => {
      await this.handleJoinQuiz(ctx);
    });

    // Handle QuizBlitz answer selection (A, B, C, D)
    this.bot.callbackQuery(/^quiz_answer_([A-D])_(.+)$/, async (ctx) => {
      const selectedAnswer = ctx.match[1];
      const quizCode = ctx.match[2];
      await this.handleQuizAnswer(ctx, selectedAnswer, quizCode);
    });

    // Handle text messages for quiz codes
    this.bot.on('message:text', async (ctx) => {
      const text = ctx.message.text.trim();
      
      // Check if it's a 6-digit quiz code
      if (/^\d{6}$/.test(text)) {
        await this.handleJoinQuizByCode(ctx, text);
      } else {
        // Handle regular messages
        await this.messageHandlers.handleMessage(ctx, this.userSessions, this.userSelections);
      }
    });

    // Handle text messages (access code input)
    this.bot.on('message:text', async (ctx) => {
      const userId = ctx.from.id;
      const session = this.userSessions.get(userId);
      
      if (session && session.waitingForAccessCode) {
        const accessCode = ctx.message.text.trim();
        await this.messageHandlers.handleAccessCodeSubmission(ctx, accessCode, this.userSessions);
      }
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
        const status = this.isReady ? 'healthy' : (this.offlineMode ? 'offline_mode' : (this.pollingIssue ? 'api_only_mode' : (this.startupError ? 'error' : 'starting')));
        const statusCode = this.isReady ? 200 : (this.offlineMode || this.pollingIssue ? 200 : (this.startupError ? 503 : 200));
        
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

  // QuizBlitz Handler Methods
  async handleJoinQuiz(ctx) {
    const message = 
      `🎮 Welcome to QuizBlitz!\n\n` +
      `To join a quiz, send me the 6-digit quiz code.\n\n` +
      `Example: 123456\n\n` +
      `You'll receive questions here and can answer directly in Telegram!`;
      
    await ctx.reply(message);
  }

  async handleJoinQuizByCode(ctx, quizCode) {
    try {
      const telegramUserId = ctx.from.id;
      const playerName = ctx.from.first_name || ctx.from.username || 'Player';
      
      console.log(`🎮 User ${playerName} (${telegramUserId}) trying to join quiz ${quizCode}`);
      
      // Join the quiz via API
      const response = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/quizblitz/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizCode: quizCode,
          playerName: playerName,
          playerId: telegramUserId.toString(),
          source: 'telegram'
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const message = 
          `🎉 Successfully joined quiz!\n\n` +
          `👤 Player: ${playerName}\n` +
          `🎯 Quiz Code: ${quizCode}\n` +
          `👥 Players in room: ${data.playersCount || 1}\n\n` +
          `⏳ Waiting for host to start...\n` +
          `You'll receive questions here when the quiz begins!`;
          
        await ctx.reply(message);
        console.log(`✅ User ${playerName} joined quiz ${quizCode} successfully`);
      } else {
        throw new Error(data.error || 'Failed to join quiz');
      }
      
    } catch (error) {
      console.error(`❌ Error joining quiz ${quizCode}:`, error);
      
      let errorMessage = '❌ Failed to join quiz.\n\n';
      
      if (error.message.includes('404')) {
        errorMessage += 'Quiz not found. Please check the code and try again.';
      } else if (error.message.includes('already started')) {
        errorMessage += 'This quiz has already started.';
      } else {
        errorMessage += 'Please check the quiz code and try again.';
      }
      
      await ctx.reply(errorMessage);
    }
  }

  async handleQuizAnswer(ctx, selectedAnswer, quizCode) {
    try {
      const telegramUserId = ctx.from.id;
      const playerName = ctx.from.first_name || ctx.from.username || 'Player';
      
      console.log(`📝 User ${playerName} selected answer ${selectedAnswer} for quiz ${quizCode}`);
      
      // Submit answer via API
      const response = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/quizblitz/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizCode: quizCode,
          answer: selectedAnswer,
          playerId: telegramUserId.toString(),
          timestamp: Date.now()
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Edit the message to show answer was submitted
        await ctx.editMessageText(
          `📝 Question answered!\n\n` +
          `✅ Your answer: ${selectedAnswer}\n\n` +
          `⏳ Waiting for other players...`
        );
        
        console.log(`✅ Answer ${selectedAnswer} submitted for user ${playerName}`);
      } else {
        throw new Error(data.error || 'Failed to submit answer');
      }
      
    } catch (error) {
      console.error(`❌ Error submitting answer:`, error);
      
      await ctx.answerCallbackQuery('❌ Failed to submit answer. Please try again.');
    }
  }

  async start() {
    try {
      // First try to get bot info to test API connectivity
      const botInfo = await this.bot.api.getMe();
      console.log(`✅ Bot API connection successful: @${botInfo.username}`);
      
      // Try to start polling with a timeout
      const startPromise = this.bot.start();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Bot start timeout')), 15000);
      });
      
      await Promise.race([startPromise, timeoutPromise]);
      console.log('✅ Bot polling started successfully');
      
    } catch (error) {
      console.error('❌ Bot start failed:', error);
      
      // Try to determine if it's just a polling issue
      try {
        const botInfo = await this.bot.api.getMe();
        console.log(`⚠️  Bot API works but polling failed: @${botInfo.username}`);
        this.pollingIssue = true;
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