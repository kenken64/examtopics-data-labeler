const { ObjectId } = require('mongodb');
const { InlineKeyboard } = require('grammy');

class NotificationService {
  constructor(databaseService, bot) {
    this.databaseService = databaseService;
    this.bot = bot;
    this.pollingInterval = null;
    this.changeStream = null;
  }

  startNotificationPolling() {
    console.log('📡 Starting QuizBlitz notification system...');
    console.log('🔄 USING: MongoDB Change Streams for real-time monitoring');
    
    // Initialize sessions on startup
    this.initializeSessions();
    
    // Start real-time change stream monitoring
    this.startChangeStreamMonitoring();
    
    // Keep legacy polling as backup every 10 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkForQuizNotifications();
      } catch (error) {
        console.error('Error in backup notification polling:', error);
      }
    }, 10000);
  }

  async startChangeStreamMonitoring() {
    try {
      const db = await this.databaseService.connectToDatabase();
      
      console.log('👀 Setting up Change Stream for quizEvents collection...');
      
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

      this.changeStream = db.collection('quizEvents').watch(pipeline, {
        fullDocument: 'updateLookup'
      });

      console.log('⚡ Change Stream ACTIVE - monitoring quizEvents in real-time');
      console.log('🎯 Watching for: quiz_started, question_started, question_ended, timer_update, quiz_ended');

      this.changeStream.on('change', (change) => {
        if (change.operationType === 'insert' && change.fullDocument) {
          this.handleQuizEventChange(change.fullDocument);
        }
      });

      this.changeStream.on('error', (error) => {
        console.error('❌ Change Stream error:', error);
        this.reconnectChangeStream();
      });

      this.changeStream.on('close', () => {
        console.log('⚠️ Change Stream closed - attempting reconnect...');
        this.reconnectChangeStream();
      });

    } catch (error) {
      console.error('❌ Failed to start Change Stream monitoring:', error);
      console.log('📡 Falling back to polling-only mode');
    }
  }

  async handleQuizEventChange(event) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`⚡ REAL-TIME CHANGE DETECTED - ${timestamp}`);
    console.log(`   🎮 Quiz Code: ${event.quizCode}`);
    console.log(`   📋 Event Type: ${event.type}`);
    console.log(`   📊 Question: ${(event.data?.currentQuestionIndex || 0) + 1}`);
    console.log(`   ⏰ Time: ${event.data?.timeRemaining || 0}s`);

    try {
      // Process question starts immediately
      if (event.type === 'question_started' || event.type === 'quiz_started') {
        console.log(`📤 Processing ${event.type} for quiz ${event.quizCode}`);
        await this.processQuizEventForTelegram(event);
      } else {
        console.log(`⏭️ ${event.type} - no immediate action needed`);
      }
    } catch (error) {
      console.error('❌ Error processing change event:', error);
    }
  }

  async processQuizEventForTelegram(event) {
    try {
      const db = await this.databaseService.connectToDatabase();
      
      // Find Telegram players for this quiz
      const quizRoom = await db.collection('quizRooms').findOne({ 
        quizCode: event.quizCode 
      });
      
      if (quizRoom && quizRoom.players) {
        const telegramPlayers = quizRoom.players.filter(p => 
          p.id && (String(p.id).length >= 7 || p.source === 'telegram')
        );
        
        console.log(`👥 Found ${telegramPlayers.length} Telegram players for quiz ${event.quizCode}`);
        
        if (telegramPlayers.length > 0 && event.data?.question) {
          console.log(`📱 Sending question to Telegram players immediately`);
          
          // Send question to each Telegram player
          for (const player of telegramPlayers) {
            try {
              await this.sendQuestionToPlayer(player, event.data.question, event.quizCode);
              console.log(`   ✅ Sent to ${player.name} (${player.id})`);
            } catch (error) {
              console.error(`   ❌ Failed to send to ${player.name}:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing quiz event for Telegram:', error);
    }
  }

  async reconnectChangeStream() {
    console.log('🔄 Attempting to reconnect Change Stream...');
    
    try {
      if (this.changeStream) {
        await this.changeStream.close();
      }
      
      // Wait 3 seconds before reconnecting
      setTimeout(() => {
        this.startChangeStreamMonitoring();
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error during Change Stream reconnection:', error);
    }
  }

  async initializeSessions() {
    try {
      const db = await this.databaseService.connectToDatabase();
      
      // Find active sessions without lastNotifiedQuestionIndex
      const sessionsToFix = await db.collection('quizSessions').find({
        status: 'active',
        lastNotifiedQuestionIndex: { $exists: false }
      }).toArray();
      
      if (sessionsToFix.length > 0) {
        console.log(`🔧 Initializing ${sessionsToFix.length} active sessions`);
        
        for (const session of sessionsToFix) {
          await db.collection('quizSessions').updateOne(
            { _id: session._id },
            { $set: { lastNotifiedQuestionIndex: -1 } }
          );
          console.log(`✅ Initialized session ${session.quizCode} with lastNotifiedQuestionIndex: -1`);
        }
      } else {
        console.log('✅ All active sessions already initialized');
      }
    } catch (error) {
      console.error('Error initializing sessions:', error);
    }
  }

  stopNotificationPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('📡 Notification polling stopped');
    }
    
    if (this.changeStream) {
      this.changeStream.close();
      this.changeStream = null;
      console.log('⚡ Change Stream closed');
    }
  }

  async checkForQuizNotifications() {
    try {
      // Use the same logic as the original bot.js processQuizNotifications
      await this.processQuizNotifications();
      
      // Also check the legacy notification system
      const notifications = await this.databaseService.getQuizNotifications();
      
      for (const notification of notifications) {
        await this.processNotification(notification);
        await this.databaseService.markNotificationAsProcessed(notification._id);
      }
    } catch (error) {
      console.error('Error checking quiz notifications:', error);
    }
  }

  async processQuizNotifications() {
    try {
      const db = await this.databaseService.connectToDatabase();
      
      // Check for active quiz sessions
      const activeSessions = await db.collection('quizSessions')
        .find({ status: 'active' })
        .toArray();

      for (const session of activeSessions) {
        console.log(`🔍 Processing quiz session: ${session.quizCode}`);
        
        // Check if there are Telegram players for this quiz from the database
        const quizRoom = await db.collection('quizRooms').findOne({ 
          quizCode: session.quizCode 
        });
        
        const telegramPlayers = [];
        if (quizRoom && quizRoom.players) {
          // Find players that joined via Telegram (check for Telegram ID format or source)
          for (const player of quizRoom.players) {
            // Telegram IDs are typically large numbers (7+ digits)
            if (player.id && (String(player.id).length >= 7 || player.source === 'telegram')) {
              telegramPlayers.push({
                id: player.id,
                name: player.name
              });
            }
          }
        }
        
        console.log(`👥 Found ${telegramPlayers.length} Telegram players for quiz ${session.quizCode}`);
        telegramPlayers.forEach(player => {
          console.log(`   - ${player.name} (ID: ${player.id})`);
        });

        if (telegramPlayers.length > 0) {
          // Send current question to Telegram players
          const currentQuestionIndex = session.currentQuestionIndex || 0;
          if (session.questions && session.questions[currentQuestionIndex]) {
            const currentQuestion = session.questions[currentQuestionIndex];
            
            // Check if we need to send this question (based on lastNotifiedQuestionIndex)
            const lastNotifiedIndex = session.lastNotifiedQuestionIndex || -1;
            
            console.log(`📝 Question check: current=${currentQuestionIndex}, lastNotified=${lastNotifiedIndex}`);
            
            if (currentQuestionIndex > lastNotifiedIndex) {
              console.log(`📤 Sending question ${currentQuestionIndex + 1} to ${telegramPlayers.length} Telegram players for quiz ${session.quizCode}`);
              
              for (const player of telegramPlayers) {
                console.log(`📱 Sending question to ${player.name} (${player.id})`);
                await this.sendQuizQuestion(player.id, {
                  index: currentQuestionIndex,
                  question: currentQuestion.question,
                  options: currentQuestion.options,
                  timeLimit: session.timerDuration || 30,
                  points: 1000
                }, session.quizCode);
              }

              console.log(`✅ Updated lastNotifiedQuestionIndex from ${lastNotifiedIndex} to ${currentQuestionIndex} for quiz ${session.quizCode}`);
              
              // Update the last notified question index
              await db.collection('quizSessions').updateOne(
                { _id: session._id },
                { $set: { lastNotifiedQuestionIndex: currentQuestionIndex } }
              );
            } else {
              console.log(`⏭️ Question ${currentQuestionIndex + 1} already sent (last notified: ${lastNotifiedIndex})`);
            }
          } else {
            console.log(`❌ No question found at index ${currentQuestionIndex} for quiz ${session.quizCode}`);
          }
        } else {
          console.log(`👥 No Telegram players found for quiz ${session.quizCode}`);
        }
      }

    } catch (error) {
      console.error('Error processing quiz notifications:', error);
    }
  }

  async sendQuestionToPlayer(player, questionData, quizCode) {
    try {
      const telegramUserId = player.id;
      
      // Use existing sendQuizQuestion method
      await this.sendQuizQuestion(telegramUserId, questionData, quizCode);
    } catch (error) {
      console.error(`Error sending question to player ${player.name} (${player.id}):`, error);
      throw error;
    }
  }

  async sendQuizQuestion(telegramUserId, questionData, quizCode) {
    try {
      const questionNumber = (questionData.index || 0) + 1;
      const totalQuestions = questionData.totalQuestions || '?';
      
      // Format the question for Telegram
      let formattedQuestion = 
        `📝 Question ${questionNumber}/${totalQuestions}\n` +
        `⏱️ Time: ${questionData.timeLimit || 30}s\n` +
        `🎯 Quiz Code: ${quizCode}\n\n` +
        `${questionData.question}\n\n`;

      // Add answer options to message text
      if (questionData.options) {
        Object.entries(questionData.options).forEach(([key, value]) => {
          if (value) {
            formattedQuestion += `${key}. ${value}\n`;
          }
        });
      }

      formattedQuestion += `\n🎯 Tap an answer button below to submit:`;

      // Create inline keyboard with answer buttons
      const keyboard = new InlineKeyboard();
      
      if (questionData.options) {
        Object.entries(questionData.options).forEach(([key, value]) => {
          if (value) {
            keyboard.text(`${key}. ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`, `quiz_answer_${key}_${quizCode}`);
            keyboard.row(); // Each answer on a new row
          }
        });
      }

      await this.sendMessageWithKeyboard(telegramUserId, formattedQuestion, keyboard);
    } catch (error) {
      console.error(`Error sending quiz question to user ${telegramUserId}:`, error);
    }
  }

  async sendMessageWithKeyboard(telegramUserId, message, keyboard) {
    try {
      if (this.bot) {
        await this.bot.api.sendMessage(telegramUserId, message, {
          reply_markup: keyboard
        });
        console.log(`📱 Sent interactive question to user ${telegramUserId}`);
      } else {
        console.log('📱 Bot not available for sending interactive messages');
      }
    } catch (error) {
      console.error(`Error sending message with keyboard to user ${telegramUserId}:`, error);
    }
  }

  async processNotification(notification) {
    try {
      const { type, data } = notification;
      
      switch (type) {
        case 'quiz_joined':
          await this.handleQuizJoined(data);
          break;
        case 'quiz_started':
          await this.handleQuizStarted(data);
          break;
        case 'question_sent':
          await this.handleQuestionSent(data);
          break;
        case 'quiz_completed':
          await this.handleQuizCompleted(data);
          break;
        case 'quiz_results':
          await this.handleQuizResults(data);
          break;
        default:
          console.log('Unknown notification type:', type);
      }
    } catch (error) {
      console.error('Error processing notification:', error);
    }
  }

  async handleQuizJoined(data) {
    const { telegramUserId, playerName, quizCode, playersCount } = data;
    
    const message = 
      `🎉 Successfully joined the quiz!\n\n` +
      `👤 Player Name: ${playerName}\n` +
      `🎯 Quiz Code: ${quizCode}\n` +
      `👥 Players in room: ${playersCount}\n\n` +
      `⏳ Waiting for the host to start the quiz...\n\n` +
      `You'll receive questions here when the quiz begins!`;

    await this.sendMessage(telegramUserId, message);
  }

  async handleQuizStarted(data) {
    const { telegramUserId, quizCode, totalQuestions } = data;
    
    const message = 
      `🚀 Quiz Started!\n\n` +
      `📝 Quiz Code: ${quizCode}\n` +
      `📊 Total Questions: ${totalQuestions}\n\n` +
      `🎯 Get ready for the first question!`;

    await this.sendMessage(telegramUserId, message);
  }

  async handleQuestionSent(data) {
    const { telegramUserId, questionText, answers, questionNumber, totalQuestions, timeLimit } = data;
    
    // Format the question for Telegram
    let formattedQuestion = 
      `📝 Question ${questionNumber}/${totalQuestions}\n` +
      `⏱️ Time: ${timeLimit}s\n\n` +
      `${questionText}\n\n`;

    // Add answer options
    if (answers && Array.isArray(answers)) {
      answers.forEach((answer, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C, D...
        formattedQuestion += `${letter}. ${answer}\n`;
      });
    }

    formattedQuestion += `\n💡 Answer on the host's screen or website!`;

    await this.sendMessage(telegramUserId, formattedQuestion);
  }

  async handleQuizCompleted(data) {
    const { telegramUserId, quizCode, finalScore, totalQuestions } = data;
    
    const percentage = Math.round((finalScore / totalQuestions) * 100);
    
    const message = 
      `🏁 Quiz Completed!\n\n` +
      `📊 Your Final Score: ${finalScore}/${totalQuestions} (${percentage}%)\n` +
      `🎯 Quiz Code: ${quizCode}\n\n` +
      `${this.getPerformanceMessage(percentage)}\n\n` +
      `Thanks for playing! 🎉`;

    await this.sendMessage(telegramUserId, message);
  }

  async handleQuizResults(data) {
    const { telegramUserId, quizCode, rankings, playerStats } = data;
    
    let message = `🏆 Final Results - Quiz ${quizCode}\n\n`;
    
    // Show rankings
    if (rankings && rankings.length > 0) {
      message += `📊 Leaderboard:\n`;
      rankings.forEach((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎖️';
        message += `${medal} ${index + 1}. ${player.name} - ${player.score} points\n`;
      });
    }
    
    // Show player's specific stats if available
    if (playerStats) {
      message += `\n📈 Your Performance:\n`;
      message += `✅ Correct: ${playerStats.correct}\n`;
      message += `❌ Wrong: ${playerStats.wrong}\n`;
      message += `⏱️ Avg Response Time: ${playerStats.avgTime}s\n`;
    }
    
    message += `\n🎉 Thanks for playing QuizBlitz!`;

    await this.sendMessage(telegramUserId, message);
  }

  async sendMessage(telegramUserId, message) {
    try {
      if (this.bot) {
        await this.bot.api.sendMessage(telegramUserId, message);
        console.log(`📱 Sent message to user ${telegramUserId}`);
      } else {
        console.log('📱 Bot not available for sending messages');
      }
    } catch (error) {
      console.error(`Error sending message to user ${telegramUserId}:`, error);
    }
  }

  getPerformanceMessage(percentage) {
    if (percentage >= 90) return 'Excellent performance! 🏆';
    if (percentage >= 80) return 'Great job! 🎯';
    if (percentage >= 70) return 'Good work! 👍';
    if (percentage >= 60) return 'Keep practicing! 📚';
    return 'More study needed! 💪';
  }
}

module.exports = NotificationService;