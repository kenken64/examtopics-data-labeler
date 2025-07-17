// Telegram Bot QuizBlitz Integration with MongoDB Change Streams PubSub
// Provides real-time sync between live quiz frontend and Telegram bot

const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');

// Import our PubSub system (converted to CommonJS)
class TelegramQuizBotSync {
  constructor(botToken, mongoUri, dbName) {
    this.bot = new TelegramBot(botToken, { polling: true });
    this.mongoUri = mongoUri;
    this.dbName = dbName;
    this.client = new MongoClient(mongoUri);
    this.db = null;
    this.changeStream = null;
    this.activeQuizzes = new Map(); // quizCode -> { chatIds: Set, currentQuestion: object }
    this.playerSessions = new Map(); // chatId -> { quizCode, playerId, playerName }

    this.setupEventHandlers();
  }

  async connect() {
    try {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      console.log('🤖 Telegram QuizBot connected to MongoDB');

      this.startListening();
      this.setupBotCommands();
    } catch (error) {
      console.error('❌ Telegram QuizBot connection failed:', error);
      throw error;
    }
  }

  startListening() {
    // Watch for quiz events from the frontend
    const pipeline = [
      {
        $match: {
          'fullDocument.type': {
            $in: ['quiz_started', 'question_started', 'question_ended', 'timer_update', 'quiz_ended']
          }
        }
      }
    ];

    this.changeStream = this.db.collection('quizEvents').watch(pipeline, {
      fullDocument: 'updateLookup'
    });

    this.changeStream.on('change', (change) => {
      if (change.operationType === 'insert' && change.fullDocument) {
        this.handleQuizEvent(change.fullDocument);
      }
    });

    console.log('🤖 Telegram QuizBot listening for quiz events...');
  }

  async handleQuizEvent(event) {
    const { type, quizCode, data } = event;

    switch (type) {
    case 'quiz_started':
      await this.handleQuizStarted(quizCode, data);
      break;
    case 'question_started':
      await this.handleQuestionStarted(quizCode, data);
      break;
    case 'timer_update':
      await this.handleTimerUpdate(quizCode, data);
      break;
    case 'question_ended':
      await this.handleQuestionEnded(quizCode, data);
      break;
    case 'quiz_ended':
      await this.handleQuizEnded(quizCode, data);
      break;
    }
  }

  async handleQuizStarted(quizCode, data) {
    const { question } = data;

    if (!this.activeQuizzes.has(quizCode)) {
      this.activeQuizzes.set(quizCode, {
        chatIds: new Set(),
        currentQuestion: question,
        questionStartTime: Date.now()
      });
    }

    const quiz = this.activeQuizzes.get(quizCode);
    quiz.currentQuestion = question;

    // Notify all participants
    for (const chatId of quiz.chatIds) {
      await this.sendQuestionToUser(chatId, question, quizCode);
    }

    console.log(`🤖 Quiz ${quizCode} started, notified ${quiz.chatIds.size} participants`);
  }

  async handleQuestionStarted(quizCode, data) {
    const { question } = data;

    if (!this.activeQuizzes.has(quizCode)) return;

    const quiz = this.activeQuizzes.get(quizCode);
    quiz.currentQuestion = question;
    quiz.questionStartTime = Date.now();

    // Send new question to all participants
    for (const chatId of quiz.chatIds) {
      await this.sendQuestionToUser(chatId, question, quizCode);
    }

    console.log(`🤖 Question ${question.questionIndex + 1} started for quiz ${quizCode}`);
  }

  async handleTimerUpdate(quizCode, data) {
    const { timeRemaining } = data;

    if (!this.activeQuizzes.has(quizCode)) return;

    const quiz = this.activeQuizzes.get(quizCode);

    // Send timer updates at specific intervals (10, 5, 3, 2, 1 seconds remaining)
    if ([10, 5, 3, 2, 1].includes(timeRemaining)) {
      for (const chatId of quiz.chatIds) {
        await this.bot.sendMessage(chatId, `⏰ ${timeRemaining} seconds remaining!`);
      }
    }
  }

  async handleQuestionEnded(quizCode, data) {
    const { results } = data;

    if (!this.activeQuizzes.has(quizCode)) return;

    const quiz = this.activeQuizzes.get(quizCode);

    // Show correct answer and explanation
    for (const chatId of quiz.chatIds) {
      const resultText = `✅ Correct Answer: ${results.correctAnswer}\n\n` +
                        '📊 Answer Breakdown:\n' +
                        Object.entries(results.answerBreakdown)
                          .map(([option, count]) => `${option}: ${count} votes`)
                          .join('\n') +
                        (results.explanation ? `\n\n💡 ${results.explanation}` : '');

      await this.bot.sendMessage(chatId, resultText);
    }

    console.log(`🤖 Question results sent for quiz ${quizCode}`);
  }

  async handleQuizEnded(quizCode, data) {
    const { finalResults } = data;

    if (!this.activeQuizzes.has(quizCode)) return;

    const quiz = this.activeQuizzes.get(quizCode);

    // Send final results
    for (const chatId of quiz.chatIds) {
      const finalText = '🏁 Quiz Completed!\n\n' +
                       `📊 Total Questions: ${finalResults.totalQuestions}\n` +
                       `⏱️ Quiz Duration: ${this.formatDuration(Date.now() - quiz.questionStartTime)}\n\n` +
                       'Thanks for participating! 🎉';

      await this.bot.sendMessage(chatId, finalText);
    }

    // Clean up
    this.activeQuizzes.delete(quizCode);
    console.log(`🤖 Quiz ${quizCode} ended and cleaned up`);
  }

  async sendQuestionToUser(chatId, question, quizCode) {
    const { questionIndex, question: questionText, options, timeLimit } = question;

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

    await this.bot.sendMessage(chatId, questionMessage, {
      reply_markup: {
        inline_keyboard: optionButtons
      }
    });
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
            questionStartTime: Date.now()
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
        if (quiz.currentQuestion) {
          await this.sendQuestionToUser(chatId, quiz.currentQuestion, quizCode);
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
            await this.bot.answerCallbackQuery(callbackQuery.id, {
              text: `✅ Answer ${answer} submitted!`,
              show_alert: false
            });
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
      if (this.changeStream) {
        await this.changeStream.close();
      }
      if (this.client) {
        await this.client.close();
      }
      process.exit(0);
    });
  }

  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Initialize and start the bot
if (require.main === module) {
  const bot = new TelegramQuizBotSync(
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.MONGODB_URI,
    process.env.MONGODB_DB_NAME
  );

  bot.connect().catch(console.error);
}

module.exports = TelegramQuizBotSync;
