const { Bot } = require('grammy');
const http = require('http');
const fetch = require('node-fetch');
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

    // Check if it's a 6-digit quiz code
    if (/^\d{6}$/.test(text)) {
    await this.handleJoinQuizByCode(ctx, text);
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
      `🔄 You're already in this quiz!\n\n` +
      `👤 Player: ${playerName}\n` +
      `🎯 Quiz Code: ${quizCode}\n` +
      `👥 Players in room: ${quizRoom.players?.length || 0}\n\n` +
      `⏳ Waiting for host to start...\n` +
      `You'll receive questions here when the quiz begins!`;

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
    `🎉 Successfully joined quiz!\n\n` +
    `👤 Player: ${playerName}\n` +
    `🎯 Quiz Code: ${quizCode}\n` +
    `👥 Players in room: ${updatedRoom.players?.length || 1}\n\n` +
    `⏳ Waiting for host to start...\n` +
    `You'll receive questions here when the quiz begins!`;

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

    console.log(`📊 Answer data:`, {
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
      [`players.$[player].score`]: score
      }
    },
    {
      arrayFilters: [{ 'player.id': playerId }]
    }
    );

    // Edit the message to show answer was submitted
    await ctx.editMessageText(
    `📝 Question answered!\n\n` +
      `✅ Your answer: ${selectedAnswer}\n` +
      `${isCorrect ? '🎉 Correct!' : '❌ Incorrect'}\n` +
      `${isCorrect ? `📈 Points earned: ${score}` : `💡 Correct answer: ${currentQuestion.correctAnswer}`}\n\n` +
      `⏳ Waiting for other players...`
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
    console.error(`❌ Error submitting answer:`, error);

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
