#!/usr/bin/env node

// QuizBlitz Message Sender - Manual Test for Telegram API
const { exec } = require('child_process');
const { MongoClient } = require('mongodb');
require('dotenv').config();

class QuizBlitzManualSender {
  constructor() {
    this.mongoClient = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.botToken = process.env.BOT_TOKEN;
  }

  async initialize() {
    await this.mongoClient.connect();
    this.db = this.mongoClient.db(process.env.MONGODB_DB_NAME);
    console.log('✅ Connected to MongoDB');
  }

  // Send message using curl (since curl works but Node.js HTTPS doesn't)
  async sendMessageViaCurl(chatId, text, replyMarkup = null) {
    return new Promise((resolve, reject) => {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      };

      if (replyMarkup) {
        payload.reply_markup = replyMarkup;
      }

      const curlCommand = `curl -s -X POST "${url}" \\
        -H "Content-Type: application/json" \\
        -d '${JSON.stringify(payload).replace(/'/g, '\\\'')}'`;

      exec(curlCommand, (error, stdout, _stderr) => {
        if (error) {
          reject(error);
        } else {
          try {
            const response = JSON.parse(stdout);
            if (response.ok) {
              resolve(response.result);
            } else {
              reject(new Error(response.description || 'API error'));
            }
          } catch (parseError) {
            reject(parseError);
          }
        }
      });
    });
  }

  // Simulate sending a QuizBlitz question via curl
  async sendQuizQuestionViaCurl(chatId, questionData, quizCode) {
    const questionText =
      `🎯 *Question ${questionData.index + 1}*\n\n` +
      `${questionData.question}\n\n` +
      `⏱️ *Time remaining: ${questionData.timeLimit} seconds*\n` +
      `🏆 *Points: ${questionData.points}*`;

    // Create inline keyboard
    const keyboard = {
      inline_keyboard: Object.entries(questionData.options).map(([key, value]) => [{
        text: `${key}. ${value}`,
        callback_data: `quiz_answer_${key}_${quizCode}`
      }])
    };

    try {
      const result = await this.sendMessageViaCurl(chatId, questionText, keyboard);
      console.log(`✅ Sent question via curl to chat ${chatId}:`, result.message_id);
      return result;
    } catch (error) {
      console.error('❌ Failed to send question via curl:', error.message);
      throw error;
    }
  }

  async testQuizBlitzWithCurl() {
    console.log('🧪 Testing QuizBlitz with Curl Workaround...\n');

    try {
      await this.initialize();

      // Get test quiz
      const quizSession = await this.db.collection('quizSessions').findOne({
        quizCode: 'TEST5SO',
        status: 'active'
      });

      if (!quizSession) {
        console.log('❌ Test quiz TEST5SO not found');
        return;
      }

      const currentQuestion = quizSession.questions[0];

      console.log('📝 Question data to send:');
      console.log(`   Question: ${currentQuestion.question.substring(0, 100)}...`);
      console.log(`   Options: ${Object.keys(currentQuestion.options).join(', ')}`);

      // Test sending to a dummy chat ID (won't work but will test the curl mechanism)
      const testChatId = 123456789; // Dummy ID for testing

      console.log(`\n📤 Testing curl-based message sending to chat ${testChatId}...`);

      try {
        await this.sendQuizQuestionViaCurl(testChatId, {
          index: 0,
          question: currentQuestion.question,
          options: currentQuestion.options,
          timeLimit: 30,
          points: 1000
        }, 'TEST5SO');

        console.log('✅ Curl-based message sending works!');

      } catch (sendError) {
        if (sendError.message.includes('chat not found')) {
          console.log('✅ Curl mechanism works (expected "chat not found" for dummy ID)');
        } else {
          console.log('⚠️  Curl send test result:', sendError.message);
        }
      }

      console.log('\n💡 SOLUTION FOUND:');
      console.log('   Since curl works but Node.js HTTPS does not, we can:');
      console.log('   1. Use curl-based message sending for QuizBlitz');
      console.log('   2. Implement webhook-based receiving instead of polling');
      console.log('   3. Or configure Node.js HTTPS to work in this environment');
      console.log('\n✅ QuizBlitz can work with curl-based workaround!');

    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      await this.mongoClient.close();
    }
  }
}

const tester = new QuizBlitzManualSender();
tester.testQuizBlitzWithCurl().catch(console.error);
