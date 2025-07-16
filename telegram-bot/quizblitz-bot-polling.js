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
  }

  async checkForQuizUpdates() {
    if (!this.isConnected) return;

    try {
      // Check all active quizzes for updates
      for (const [quizCode, quiz] of this.activeQuizzes.entries()) {
        await this.checkQuizSession(quizCode, quiz);
      }
    } catch (error) {
      console.error('❌ Error checking quiz updates:', error);
    }
  }

  async checkQuizSession(quizCode, quiz) {
    try {
      // Get current quiz session state
      const quizSession = await this.db.collection('quizSessions').findOne({
        quizCode: quizCode.toUpperCase(),
        status: 'active'
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

      // Check if we moved to a new question
      if (currentQuestionIndex !== quiz.lastQuestionIndex) {
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
          await this.handleQuestionStarted(quizCode, questionData);
        }
      }

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
    console.log(`🤖 Question ${questionData.questionIndex + 1} started for quiz ${quizCode}`);
    
    const quiz = this.activeQuizzes.get(quizCode);
    if (!quiz) return;

    // Send new question to all participants
    for (const chatId of quiz.chatIds) {
      await this.sendQuestionToUser(chatId, questionData, quizCode);
    }
  }

  async handleTimerUpdate(quizCode, data) {
    const { timeRemaining } = data;
    const quiz = this.activeQuizzes.get(quizCode);
    if (!quiz) return;

    // Send timer updates at specific intervals
    for (const chatId of quiz.chatIds) {
      await this.bot.sendMessage(chatId, `⏰ ${timeRemaining} seconds remaining!`);
    }
  }

  async handleQuizEnded(quizCode, quizSession) {
    console.log(`🤖 Quiz ${quizCode} ended`);
    
    const quiz = this.activeQuizzes.get(quizCode);
    if (!quiz) return;

    // Send final results
    for (const chatId of quiz.chatIds) {
      const finalText = `🏁 Quiz Completed!\n\n` +
                       `📊 Total Questions: ${quizSession.questions?.length || 0}\n` +
                       `Thanks for participating! 🎉`;
      
      await this.bot.sendMessage(chatId, finalText);
    }

    // Clean up
    this.activeQuizzes.delete(quizCode);
  }

  async sendQuestionToUser(chatId, question, quizCode) {
    const { questionIndex, question: questionText, options, timeLimit } = question;
    
    console.log(`🤖 Sending question to user ${chatId}:`, {
      questionIndex,
      questionText: questionText?.substring(0, 50) + '...',
      optionsCount: Object.keys(options || {}).length,
      timeLimit
    });

    // Validate options
    if (!options || Object.keys(options).length === 0) {
      console.error(`❌ No options found for question ${questionIndex} in quiz ${quizCode}`);
      await this.bot.sendMessage(chatId, `❌ Error: Question has no answer options`);
      return;
    }

    // Create option buttons (A, B, C, D, E)
    const optionButtons = Object.entries(options).map(([letter, text]) => ([
      {
        text: `${letter}. ${text}`,
        callback_data: `answer_${quizCode}_${questionIndex}_${letter}`
      }
    ]));

    const questionMessage = `📝 Question ${questionIndex + 1}\n\n` +
                           `${questionText}\n\n` +
                           `⏱️ Time Limit: ${timeLimit} seconds`;

    try {
      await this.bot.sendMessage(chatId, questionMessage, {
        reply_markup: {
          inline_keyboard: optionButtons
        }
      });
      console.log(`✅ Question sent to user ${chatId} with ${optionButtons.length} options`);
    } catch (error) {
      console.error(`❌ Failed to send question to user ${chatId}:`, error);
    }
  }

  setupBotCommands() {
    // Handle /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const welcomeText = `🎮 Welcome to QuizBlitz Bot!\n\n` +
                         `Commands:\n` +
                         `/join <quiz_code> - Join a live quiz\n` +
                         `/leave - Leave current quiz\n` +
                         `/status - Check your quiz status`;
      
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
            lastTimerUpdate: -1
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
        if (quizSession.currentQuestionIndex >= 0 && quizSession.questions[quizSession.currentQuestionIndex]) {
          const currentQuestion = quizSession.questions[quizSession.currentQuestionIndex];
          const questionData = {
            questionIndex: quizSession.currentQuestionIndex,
            question: currentQuestion.question,
            options: currentQuestion.options,
            timeLimit: quizSession.timerDuration
          };
          
          await this.sendQuestionToUser(chatId, questionData, quizCode);
        }

        console.log(`🤖 User ${playerName} joined quiz ${quizCode}`);
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

        // Submit answer to the backend
        try {
          const response = await fetch(`http://localhost:3001/api/quizblitz/submit-answer`, {
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
            await this.bot.answerCallbackQuery(callbackQuery.id, {
              text: `✅ Answer ${answer} submitted!`,
              show_alert: false
            });
            console.log(`✅ Answer submitted: ${session.playerName} -> ${answer}`);
          } else {
            await this.bot.answerCallbackQuery(callbackQuery.id, {
              text: '❌ Failed to submit answer',
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
