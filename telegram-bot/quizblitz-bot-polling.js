// Telegram Bot QuizBlitz Integration with Polling-based Sync
// Alternative to Change Streams for local MongoDB without replica set
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');

class TelegramQuizBotPolling {
  constructor(botToken, mongoUri, dbName) {
    this.bot = new TelegramBot(botToken, { polling: true });
    this.mongoUri = mongoUri;
    this.dbName = dbName;
    this.client = new MongoClient(mongoUri);
    this.db = null;
    this.activeQuizzes = new Map(); // quizCode -> { chatIds: Set, currentQuestion: object, lastQuestionIndex: number }
    this.playerSessions = new Map(); // chatId -> { quizCode, playerId, playerName }
    this.pollingInterval = null;
    this.isConnected = false;

    this.setupEventHandlers();
  }

  async connect() {
    try {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.isConnected = true;
      console.log('🤖 Telegram QuizBot connected to MongoDB');

      this.setupBotCommands();
      this.startPolling();
    } catch (error) {
      console.error('❌ Telegram QuizBot connection failed:', error);
      throw error;
    }
  }

  startPolling() {
    // Poll for quiz state changes every 2 seconds
    this.pollingInterval = setInterval(async () => {
      await this.checkForQuizUpdates();
    }, 2000);

    console.log('🤖 Telegram QuizBot polling started (every 2 seconds)');
    console.log('🔧 DEBUG: [TELEGRAM] Bot validation disabled for testing - will accept any question data');
  }

  async checkForQuizUpdates() {
    if (!this.isConnected) return;

    console.log(`🔧 DEBUG: [TELEGRAM] Polling check - Active quizzes: ${this.activeQuizzes.size}`);
    
    try {
      // Check all active quizzes for updates
      for (const [quizCode, quiz] of this.activeQuizzes.entries()) {
        console.log(`🔧 DEBUG: [TELEGRAM] Checking quiz ${quizCode} with ${quiz.chatIds.size} participants`);
        await this.checkQuizSession(quizCode, quiz);
      }
    } catch (error) {
      console.error('❌ Error checking quiz updates:', error);
    }
  }

  async checkQuizSession(quizCode, quiz) {
    try {
      console.log(`🔧 DEBUG: [TELEGRAM] Checking quiz session for ${quizCode}`);
      
      // Get current quiz session state
      const quizSession = await this.db.collection('quizSessions').findOne({
        quizCode: quizCode.toUpperCase(),
        status: 'active'
      });

      console.log(`🔧 DEBUG: [TELEGRAM] Quiz session query result:`, {
        found: !!quizSession,
        status: quizSession?.status,
        currentQuestionIndex: quizSession?.currentQuestionIndex,
        questionsLength: quizSession?.questions?.length,
        timeRemaining: quizSession?.timeRemaining
      });

      if (!quizSession) {
        // Quiz might have ended
        const finishedSession = await this.db.collection('quizSessions').findOne({
          quizCode: quizCode.toUpperCase(),
          status: 'finished'
        });

        if (finishedSession && quiz.lastQuestionIndex !== -999) {
          quiz.lastQuestionIndex = -999; // Mark as ended
          await this.handleQuizEnded(quizCode, finishedSession);
        }
        return;
      }

      const currentQuestionIndex = quizSession.currentQuestionIndex || 0;
      const timeRemaining = quizSession.timeRemaining || 0;

      // SIMPLIFIED LOGIC: Allow question transitions when question index changes
      // This aligns with the new quiz timer service that properly manages question progression
      if (currentQuestionIndex !== quiz.lastQuestionIndex) {
        console.log(`🔧 DEBUG: Quiz ${quizCode} - Question transition detected: ${quiz.lastQuestionIndex} -> ${currentQuestionIndex}`);
        console.log(`🔧 DEBUG: Current timer: ${timeRemaining}s`);

        // TEMPORARY: Disable strict validation to test question reception
        // Allow any question index change for debugging
        const isValidTransition = true; // Always allow transitions for testing
        
        console.log(`🔧 DEBUG: [TELEGRAM] Validation disabled - allowing all transitions for testing`);

        if (isValidTransition) {
          console.log(`✅ Quiz ${quizCode} - Question transition allowed (${quiz.lastQuestionIndex} -> ${currentQuestionIndex})`);
          quiz.lastQuestionIndex = currentQuestionIndex;

          if (currentQuestionIndex < quizSession.questions.length) {
            const currentQuestion = quizSession.questions[currentQuestionIndex];
            const questionData = {
              questionIndex: currentQuestionIndex,
              question: currentQuestion.question,
              options: currentQuestion.options,
              timeLimit: quizSession.timerDuration
            };

            quiz.currentQuestion = questionData;
            quiz.questionStartTime = Date.now(); // Track when question started
            quiz.playersAnswered = new Set(); // Track who has answered this question
            await this.handleQuestionStarted(quizCode, questionData);
          }
        } else {
          console.log(`⏸️ Quiz ${quizCode} - Question transition blocked: invalid progression (${quiz.lastQuestionIndex} -> ${currentQuestionIndex})`);
        }
      }

      // Store current timer for next poll comparison
      quiz.lastTimeRemaining = timeRemaining;

      // Send timer updates at specific intervals
      if ([10, 5, 3, 2, 1].includes(timeRemaining) && quiz.lastTimerUpdate !== timeRemaining) {
        quiz.lastTimerUpdate = timeRemaining;
        await this.handleTimerUpdate(quizCode, { timeRemaining });
      }

    } catch (error) {
      console.error(`❌ Error checking quiz session ${quizCode}:`, error);
    }
  }

  async handleQuestionStarted(quizCode, questionData) {
    console.log(`🤖 [TELEGRAM] Question ${questionData.questionIndex + 1} started for quiz ${quizCode}`);
    console.log(`🔧 DEBUG: [TELEGRAM] Question data received:`, {
      questionIndex: questionData.questionIndex,
      hasQuestion: !!questionData.question,
      hasOptions: !!questionData.options,
      timeLimit: questionData.timeLimit,
      rawData: questionData
    });

    const quiz = this.activeQuizzes.get(quizCode);
    if (!quiz) {
      console.log(`❌ [TELEGRAM] No active quiz found for ${quizCode}`);
      return;
    }

    console.log(`🔧 DEBUG: [TELEGRAM] Active quiz found with ${quiz.chatIds.size} participants`);

    // Reset answered players for new question
    quiz.playersAnswered = new Set();

    // Send new question to all participants
    console.log(`🔧 DEBUG: [TELEGRAM] Sending question to ${quiz.chatIds.size} users`);
    for (const chatId of quiz.chatIds) {
      console.log(`🔧 DEBUG: [TELEGRAM] Sending question to user ${chatId}`);
      await this.sendQuestionToUser(chatId, questionData, quizCode);
    }
    
    console.log(`✅ [TELEGRAM] Question sent to all participants in quiz ${quizCode}`);
  }

  async handleTimerUpdate(quizCode, data) {
    const { timeRemaining } = data;
    const quiz = this.activeQuizzes.get(quizCode);
    if (!quiz) return;

    // Send timer updates at specific intervals to all participants
    for (const chatId of quiz.chatIds) {
      const hasAnswered = quiz.playersAnswered && quiz.playersAnswered.has(chatId);
      
      if (hasAnswered) {
        // Different message for users who have already answered
        await this.bot.sendMessage(chatId, 
          `⏰ ${timeRemaining} seconds remaining...\n` +
          `✅ <b>You have answered!</b> Waiting for others...`,
          { parse_mode: 'HTML' }
        );
      } else {
        // Urgent message for users who haven't answered yet
        await this.bot.sendMessage(chatId, 
          `🚨 <b>${timeRemaining} seconds remaining!</b>\n` +
          `⚡ Please submit your answer now!`,
          { parse_mode: 'HTML' }
        );
      }
    }
  }

  async handleQuizEnded(quizCode, quizSession) {
    console.log(`🤖 Quiz ${quizCode} ended`);

    const quiz = this.activeQuizzes.get(quizCode);
    if (!quiz) return;

    // Send final results
    for (const chatId of quiz.chatIds) {
      const finalText = '🏁 Quiz Completed!\n\n' +
                       `📊 Total Questions: ${quizSession.questions?.length || 0}\n` +
                       'Thanks for participating! 🎉';

      await this.bot.sendMessage(chatId, finalText);
    }

    // Clean up
    this.activeQuizzes.delete(quizCode);
  }

  async sendQuestionToUser(chatId, question, quizCode) {
    const { questionIndex, question: questionText, options, timeLimit } = question;

    console.log(`🤖 [TELEGRAM] Sending question to user ${chatId}:`, {
      questionIndex,
      questionText: questionText?.substring(0, 50) + '...',
      optionsCount: Object.keys(options || {}).length,
      timeLimit,
      fullOptions: options, // Debug: show full options
      rawQuestion: question // Show full question object for debugging
    });

    // TEMPORARY: Force send a test question if data is missing
    if (!questionText || !options) {
      console.log(`🔧 DEBUG: [TELEGRAM] Missing question data, sending test question to ${chatId}`);
      try {
        await this.bot.sendMessage(chatId, 
          `🧪 TEST QUESTION ${questionIndex + 1}\n\n` +
          `This is a test question to verify Telegram bot connectivity.\n\n` +
          `Raw data received:\n` +
          `- Question: ${questionText || 'MISSING'}\n` +
          `- Options: ${JSON.stringify(options) || 'MISSING'}\n` +
          `- Time limit: ${timeLimit || 'MISSING'}`
        );
        console.log(`✅ [TELEGRAM] Test question sent to user ${chatId}`);
      } catch (error) {
        console.error(`❌ [TELEGRAM] Failed to send test question:`, error);
      }
      return;
    }

    // TEMPORARY: Disable enhanced validation for testing
    console.log(`🔧 DEBUG: [TELEGRAM] Validation disabled, proceeding with question send`);
    
    // Force create options if missing for testing
    let finalOptions = options;
    if (!options || Object.keys(options).length === 0) {
      console.log(`🔧 DEBUG: [TELEGRAM] Creating test options for missing data`);
      finalOptions = {
        'A': 'Test Option A',
        'B': 'Test Option B', 
        'C': 'Test Option C',
        'D': 'Test Option D'
      };
    }
    
    let finalQuestionText = questionText;
    if (!questionText) {
      finalQuestionText = `Test Question ${questionIndex + 1} - Data verification`;
    }

    // Create option buttons using final options
    const optionButtons = Object.entries(finalOptions).map(([letter, text]) => ([
      {
        text: `${letter}. ${text}`,
        callback_data: `answer_${quizCode}_${questionIndex}_${letter}`
      }
    ]));

    const questionMessage = `📝 Question ${questionIndex + 1}\n\n` +
                           `${finalQuestionText}\n\n` +
                           `⏱️ Time Limit: ${timeLimit || 30} seconds\n\n` +
                           `🎯 Select your answer:`;

    try {
      await this.bot.sendMessage(chatId, questionMessage, {
        reply_markup: {
          inline_keyboard: optionButtons
        },
        parse_mode: 'HTML'
      });
      console.log(`✅ Question ${questionIndex + 1} sent to user ${chatId} with ${optionButtons.length} options`);
      console.log(`🔧 DEBUG: Question options sent:`, Object.keys(options).map(k => `${k}: ${options[k]}`));
    } catch (error) {
      console.error(`❌ Failed to send question to user ${chatId}:`, error);
      // Send fallback message without buttons
      try {
        const fallbackMessage = `📝 Question ${questionIndex + 1}\n\n${questionText}\n\n` +
          Object.entries(options).map(([letter, text]) => `${letter}. ${text}`).join('\n') +
          `\n\n⚠️ Please type your answer (A, B, C, D, or E)`;
        await this.bot.sendMessage(chatId, fallbackMessage);
      } catch (fallbackError) {
        console.error(`❌ Fallback message also failed:`, fallbackError);
      }
    }
  }

  setupBotCommands() {
    // Handle /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const welcomeText = '🎮 Welcome to QuizBlitz Bot!\n\n' +
                         'Commands:\n' +
                         '/join <quiz_code> - Join a live quiz\n' +
                         '/leave - Leave current quiz\n' +
                         '/status - Check your quiz status';

      this.bot.sendMessage(chatId, welcomeText);
    });

    // Handle /join command
    this.bot.onText(/\/join (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const quizCode = match[1].toUpperCase();

      try {
        // Check if quiz exists and is active
        const quizSession = await this.db.collection('quizSessions').findOne({
          quizCode: quizCode,
          status: 'active'
        });

        if (!quizSession) {
          await this.bot.sendMessage(chatId, `❌ Quiz ${quizCode} not found or not active.`);
          return;
        }

        // Add user to quiz
        if (!this.activeQuizzes.has(quizCode)) {
          this.activeQuizzes.set(quizCode, {
            chatIds: new Set(),
            currentQuestion: null,
            lastQuestionIndex: -1,
            lastTimerUpdate: -1,
            lastTimeRemaining: -1, // Track previous timer state
            questionStartTime: null, // Track when current question started
            playersAnswered: new Set() // Track who has answered current question
          });
        }

        const quiz = this.activeQuizzes.get(quizCode);
        quiz.chatIds.add(chatId);

        // Store player session
        const playerName = msg.from.first_name || msg.from.username || `Player${chatId}`;
        this.playerSessions.set(chatId, {
          quizCode: quizCode,
          playerId: chatId.toString(),
          playerName: playerName
        });

        await this.bot.sendMessage(chatId, `✅ Successfully joined quiz ${quizCode}!\nWaiting for questions...`);

        // If there's a current question, send it
        console.log(`🔧 DEBUG: User joined - Quiz state:`, {
          currentQuestionIndex: quizSession.currentQuestionIndex,
          questionsLength: quizSession.questions?.length,
          timeRemaining: quizSession.timeRemaining,
          status: quizSession.status
        });

        if (quizSession.currentQuestionIndex >= 0 && quizSession.questions[quizSession.currentQuestionIndex]) {
          const currentQuestion = quizSession.questions[quizSession.currentQuestionIndex];
          const questionData = {
            questionIndex: quizSession.currentQuestionIndex,
            question: currentQuestion.question,
            options: currentQuestion.options,
            timeLimit: quizSession.timerDuration
          };

          console.log(`🔧 DEBUG: Sending current question to new user:`, {
            questionIndex: questionData.questionIndex,
            hasQuestion: !!currentQuestion.question,
            hasOptions: !!currentQuestion.options,
            optionsCount: Object.keys(currentQuestion.options || {}).length
          });

          await this.sendQuestionToUser(chatId, questionData, quizCode);
        } else {
          console.log(`🔧 DEBUG: No current question to send to new user - waiting for quiz to start or next question`);
        }

        console.log(`🤖 [TELEGRAM] User ${playerName} joined quiz ${quizCode}`);
        console.log(`🔧 DEBUG: [TELEGRAM] Active quizzes after join:`, Array.from(this.activeQuizzes.keys()));
        console.log(`🔧 DEBUG: [TELEGRAM] Quiz ${quizCode} now has ${quiz.chatIds.size} participants`);
      } catch (error) {
        console.error('❌ Error joining quiz:', error);
        await this.bot.sendMessage(chatId, '❌ Error joining quiz. Please try again.');
      }
    });

    // Handle /leave command
    this.bot.onText(/\/leave/, async (msg) => {
      const chatId = msg.chat.id;
      const session = this.playerSessions.get(chatId);

      if (!session) {
        await this.bot.sendMessage(chatId, '❌ You are not in any quiz.');
        return;
      }

      const { quizCode } = session;
      const quiz = this.activeQuizzes.get(quizCode);

      if (quiz) {
        quiz.chatIds.delete(chatId);
      }

      this.playerSessions.delete(chatId);
      await this.bot.sendMessage(chatId, `✅ Left quiz ${quizCode}.`);
    });

    // Handle /status command
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      const session = this.playerSessions.get(chatId);

      if (!session) {
        await this.bot.sendMessage(chatId, '❌ You are not in any quiz.');
        return;
      }

      const { quizCode, playerName } = session;
      await this.bot.sendMessage(chatId, `📊 Status:\n👤 Player: ${playerName}\n🎮 Quiz: ${quizCode}`);
    });

    // Handle answer selections
    this.bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      if (data.startsWith('answer_')) {
        const [, quizCode, questionIndex, answer] = data.split('_');
        const session = this.playerSessions.get(chatId);

        if (!session || session.quizCode !== quizCode) {
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: '❌ You are not in this quiz',
            show_alert: true
          });
          return;
        }

        // Check if user already answered this question
        const quiz = this.activeQuizzes.get(quizCode);
        if (quiz && quiz.playersAnswered && quiz.playersAnswered.has(chatId)) {
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: '⚠️ You have already answered this question',
            show_alert: true
          });
          return;
        }

        // Submit answer to the backend
        try {
          const response = await fetch('http://localhost:3001/api/quizblitz/submit-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quizCode: quizCode,
              questionIndex: parseInt(questionIndex),
              answer: answer,
              playerId: session.playerId,
              playerName: session.playerName,
              timestamp: Date.now()
            })
          });

          if (response.ok) {
            // Mark player as answered
            if (quiz && quiz.playersAnswered) {
              quiz.playersAnswered.add(chatId);
            }

            // Show success callback
            await this.bot.answerCallbackQuery(callbackQuery.id, {
              text: `✅ Answer ${answer} submitted!`,
              show_alert: false
            });

            // Send waiting message to user
            await this.bot.sendMessage(chatId, 
              `✅ <b>Answer Submitted: ${answer}</b>\n\n` +
              `⏳ Please wait for other players to answer...\n` +
              `📊 The results will be shown when the timer expires or all players have answered.`,
              { parse_mode: 'HTML' }
            );

            console.log(`✅ Answer submitted: ${session.playerName} -> ${answer}`);
          } else {
            const errorData = await response.json().catch(() => ({}));
            await this.bot.answerCallbackQuery(callbackQuery.id, {
              text: errorData.error || '❌ Failed to submit answer',
              show_alert: true
            });
          }
        } catch (error) {
          console.error('❌ Error submitting answer:', error);
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: '❌ Network error',
            show_alert: true
          });
        }
      }
    });
  }

  setupEventHandlers() {
    process.on('SIGINT', async () => {
      console.log('🤖 Shutting down Telegram QuizBot...');
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }
      if (this.client) {
        await this.client.close();
      }
      process.exit(0);
    });
  }
}

// Initialize and start the bot
if (require.main === module) {
  const bot = new TelegramQuizBotPolling(
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.MONGODB_URI,
    process.env.MONGODB_DB_NAME
  );

  bot.connect().catch(console.error);
}

module.exports = TelegramQuizBotPolling;
