const { Bot, InlineKeyboard } = require('grammy');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

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

class CertificationBot {
  constructor() {
    this.bot = new Bot(process.env.BOT_TOKEN);
    this.mongoClient = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.userSessions = new Map(); // Store user quiz sessions
    this.userSelections = new Map(); // Store user's current answer selections for multiple choice
    
    this.initializeBot();
  }

  async connectToDatabase() {
    if (!this.db) {
      await this.mongoClient.connect();
      this.db = this.mongoClient.db('awscert');
    }
    return this.db;
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
      }
    });

    // Handle quiz answer selection
    this.bot.callbackQuery(/^answer_([A-D])$/, async (ctx) => {
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
  }

  async handleStart(ctx) {
    const userId = ctx.from.id;
    
    // Clear any existing session
    this.userSessions.delete(userId);
    
    await ctx.reply(
      `🎓 Welcome to the AWS Certification Quiz Bot!\n\n` +
      `I'll help you practice for your AWS certifications.\n\n` +
      `📚 Quick Commands Reference:\n` +
      `• /start - Start a new quiz\n` +
      `• /help - Show detailed help guide\n` +
      `• /bookmark <number> - Save a question for later\n` +
      `• /bookmarks - View your saved bookmarks\n` +
      `• /revision - Review questions you answered incorrectly\n\n` +
      `💡 Type /help for detailed instructions and tips!\n\n` +
      `Let's get started by selecting a certificate:`
    );

    await this.showCertificates(ctx);
  }

  async handleHelp(ctx) {
    const helpMessage = 
      `🤖 <b>AWS Certification Quiz Bot - Help Guide</b>\n\n` +
      
      `📚 <b>Available Commands:</b>\n\n` +
      
      `🚀 <b>/start</b>\n` +
      `   • Start a new quiz session\n` +
      `   • Shows available certificates to choose from\n` +
      `   • Clears any existing quiz session\n` +
      `   • Usage: Simply type /start\n\n` +
      
      `❓ <b>/help</b>\n` +
      `   • Show this help guide with all commands\n` +
      `   • Displays detailed instructions for each command\n` +
      `   • Usage: Simply type /help\n\n` +
      
      `🔖 <b>/bookmark &lt;question_number&gt;</b>\n` +
      `   • Save a specific question for later review\n` +
      `   • Helps you mark important or difficult questions\n` +
      `   • Usage: /bookmark 15 (saves question number 15)\n` +
      `   • Example: /bookmark 42\n\n` +
      
      `📑 <b>/bookmarks</b>\n` +
      `   • View all your saved bookmarked questions\n` +
      `   • Shows questions organized by certificate\n` +
      `   • Allows you to quickly access saved questions\n` +
      `   • Usage: Simply type /bookmarks\n\n` +
      
      `📖 <b>/revision</b>\n` +
      `   • Review questions you answered incorrectly\n` +
      `   • Shows wrong answers organized by certificate\n` +
      `   • Perfect for focused study on weak areas\n` +
      `   • Usage: Simply type /revision\n\n` +
      
      `🎯 <b>Quiz Features:</b>\n\n` +
      
      `✅ <b>Question Navigation:</b>\n` +
      `   • Answer questions using the A, B, C, D buttons\n` +
      `   • Get immediate feedback on correct/incorrect answers\n` +
      `   • See detailed explanations for each question\n` +
      `   • Use "Next Question" button to continue\n\n` +
      
      `🔐 <b>Access Code System:</b>\n` +
      `   • Enter your generated access code when prompted\n` +
      `   • Access codes link you to specific question sets\n` +
      `   • Each certificate requires a valid access code\n` +
      `   • Contact support if you do not have an access code\n\n` +
      
      `📊 <b>Progress Tracking:</b>\n` +
      `   • Your answers are automatically saved\n` +
      `   • Wrong answers are stored for revision\n` +
      `   • Bookmarks are saved across sessions\n` +
      `   • Track your progress per certificate\n\n` +
      
      `💡 <b>Tips for Best Experience:</b>\n\n` +
      `   🎯 Use /bookmark for difficult questions\n` +
      `   📚 Regular /revision helps reinforce learning\n` +
      `   🔄 Start fresh sessions with /start\n` +
      `   💬 Read explanations carefully for better understanding\n` +
      `   📱 Bot works best in private chats\n\n` +
      
      `🆘 <b>Need More Help?</b>\n` +
      `   • Contact support if you encounter issues: <code>bunnyppl@gmail.com</code>\n` +
      `   • Report bugs or suggest improvements\n` +
      `   • Check that you have a valid access code\n` +
      `   • Ensure stable internet connection for best experience\n\n` +
      
      `🚀 <b>Ready to Start?</b> Type /start to begin your certification journey!`;

    await ctx.reply(helpMessage, { parse_mode: 'HTML' });
  }

  async showCertificates(ctx) {
    try {
      const db = await this.connectToDatabase();
      const certificates = await db.collection('certificates').find({}).toArray();

      if (certificates.length === 0) {
        await ctx.reply('❌ No certificates available at the moment. Please try again later.');
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
      await ctx.reply('❌ Error loading certificates. Please try again later.');
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
        await ctx.reply('❌ Certificate not found. Please try again.');
        return;
      }

      // Store certificate in user session
      this.userSessions.set(userId, {
        certificateId: certificateId,
        certificate: certificate,
        waitingForAccessCode: true
      });

      await ctx.editMessageText(
        `✅ You selected: ${certificate.name} (${certificate.code})\n\n` +
        `📝 Please enter your generated access code to begin the quiz:`
      );

    } catch (error) {
      console.error('Error selecting certificate:', error);
      await ctx.reply('❌ Error selecting certificate. Please try again.');
    }
  }

  async handleAccessCodeSubmission(ctx, accessCode) {
    const userId = ctx.from.id;
    const session = this.userSessions.get(userId);

    if (!session) {
      await ctx.reply('❌ Session expired. Please use /start to begin again.');
      return;
    }

    try {
      const db = await this.connectToDatabase();
      
      // Validate access code and get questions
      const questions = await this.getQuestionsForAccessCode(accessCode);
      
      if (!questions || questions.length === 0) {
        await ctx.reply('❌ Invalid access code or no questions available. Please check your access code and try again.');
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
        `🎯 Access code verified!\n\n` +
        `📊 Quiz Details:\n` +
        `• Certificate: ${session.certificate.name}\n` +
        `• Total Questions: ${questions.length}\n` +
        `• Access Code: ${accessCode}\n\n` +
        `🚀 Starting your quiz now...`
      );

      // Start the quiz
      await this.showCurrentQuestion(ctx);

    } catch (error) {
      console.error('Error validating access code:', error);
      await ctx.reply('❌ Error validating access code. Please try again.');
    }
  }

  async getQuestionsForAccessCode(accessCode) {
    try {
      const db = await this.connectToDatabase();
      
      // Get questions assigned to this access code
      const pipeline = [
        { $match: { generatedAccessCode: accessCode, isEnabled: true } },
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

  parseAnswersToOptions(answersString) {
    if (!answersString) return { A: '', B: '', C: '', D: '' };
    
    const options = { A: '', B: '', C: '', D: '' };
    
    // Split by lines and process each line
    const lines = answersString.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match patterns like "- A. Option text" or "A. Option text"
      const match = trimmedLine.match(/^[-\s]*([A-D])\.\s*(.+)$/);
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
      await ctx.reply('❌ Session error. Please use /start to begin again.');
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
      await ctx.reply('❌ Error loading question options. Please try again.');
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
    const questionText = 
      `📝 Question ${questionNumber}/${totalQuestions}\n` +
      `Score: ${session.correctAnswers}/${session.currentQuestionIndex}\n\n` +
      `${currentQuestion.question}\n\n` +
      `A. ${currentQuestion.options.A || 'Option A not available'}\n` +
      `B. ${currentQuestion.options.B || 'Option B not available'}\n` +
      `C. ${currentQuestion.options.C || 'Option C not available'}\n` +
      `D. ${currentQuestion.options.D || 'Option D not available'}\n\n` +
      (isMultiple ? `⚠️ Multiple answers required: Select ${normalizeAnswer(currentQuestion.correctAnswer).length} options` : '💡 Select one answer');

    // Create answer keyboard
    const keyboard = new InlineKeyboard();
    
    if (isMultiple) {
      // Multiple answer layout with confirm/clear buttons
      keyboard
        .text('A', 'answer_A').text('B', 'answer_B').row()
        .text('C', 'answer_C').text('D', 'answer_D').row()
        .text('✅ Confirm Selection', 'confirm_selection').row()
        .text('🔄 Clear All', 'clear_selection');
    } else {
      // Single answer layout
      keyboard
        .text('A', 'answer_A').text('B', 'answer_B').row()
        .text('C', 'answer_C').text('D', 'answer_D');
    }

    await ctx.reply(questionText, {
      reply_markup: keyboard
    });
  }

  async handleQuizAnswer(ctx, selectedAnswer) {
    const userId = ctx.from.id;
    const session = this.userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('❌ Session error. Please use /start to begin again.');
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
      
      const questionText = 
        `📝 Question ${questionNumber}/${totalQuestions}\n` +
        `Score: ${session.correctAnswers}/${session.currentQuestionIndex}\n\n` +
        `${currentQuestion.question}\n\n` +
        `A. ${currentQuestion.options.A || 'Option A not available'}\n` +
        `B. ${currentQuestion.options.B || 'Option B not available'}\n` +
        `C. ${currentQuestion.options.C || 'Option C not available'}\n` +
        `D. ${currentQuestion.options.D || 'Option D not available'}\n\n` +
        `⚠️ Multiple answers required: Select ${requiredCount} options\n` +
        `✅ Selected: ${userSelections.length > 0 ? userSelections.join(', ') : 'None'} (${selectedCount}/${requiredCount})`;

      // Create updated keyboard with selected indicators
      const keyboard = new InlineKeyboard();
      
      ['A', 'B', 'C', 'D'].forEach((option, index) => {
        const isSelected = userSelections.includes(option);
        const buttonText = isSelected ? `✅ ${option}` : option;
        keyboard.text(buttonText, `answer_${option}`);
        if (index % 2 === 1) keyboard.row();
      });
      
      keyboard.text('✅ Confirm Selection', 'confirm_selection').row();
      keyboard.text('🔄 Clear All', 'clear_selection');

      await ctx.editMessageText(questionText, {
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
        await ctx.editMessageText(
          `✅ Correct!\n\n` +
          `Your answer: ${selectedAnswer}\n` +
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
        
        // Show wrong answer with explanation
        const explanation = currentQuestion.explanation || 'No explanation available.';
        
        const keyboard = new InlineKeyboard();
        
        if (session.currentQuestionIndex < session.questions.length - 1) {
          keyboard.text('Next Question ➡️', 'next_question');
        } else {
          keyboard.text('Show Results 📊', 'next_question');
        }

        await ctx.editMessageText(
          `❌ Wrong! Your answer: ${selectedAnswer}\n\n` +
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
      await ctx.reply('❌ Session error. Please use /start to begin again.');
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    const userSelections = this.userSelections.get(userId) || [];
    
    // Validate that this is a multi-answer question
    if (!isMultipleAnswerQuestion(currentQuestion.correctAnswer)) {
      await ctx.reply('❌ This is not a multiple-answer question.');
      return;
    }

    // Check if user has made any selections
    if (userSelections.length === 0) {
      await ctx.editMessageText(
        '⚠️ Please select at least one answer before confirming.',
        { reply_markup: ctx.msg.reply_markup }
      );
      return;
    }

    // Check if user has selected the correct number of answers
    const requiredCount = normalizeAnswer(currentQuestion.correctAnswer).length;
    if (userSelections.length !== requiredCount) {
      await ctx.editMessageText(
        `⚠️ Please select exactly ${requiredCount} answers. You have selected ${userSelections.length}.`,
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
      await ctx.editMessageText(
        `✅ Correct!\n\n` +
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
      
      // Show wrong answer with explanation
      const explanation = currentQuestion.explanation || 'No explanation available.';
      
      const keyboard = new InlineKeyboard();
      
      if (session.currentQuestionIndex < session.questions.length - 1) {
        keyboard.text('Next Question ➡️', 'next_question');
      } else {
        keyboard.text('Show Results 📊', 'next_question');
      }

      await ctx.editMessageText(
        `❌ Wrong! Your answer: ${formatAnswerForDisplay(userAnswer)}\n\n` +
        `The correct answer was: ${formatAnswerForDisplay(currentQuestion.correctAnswer)}\n\n` +
        `📖 Explanation:\n${explanation}\n\n` +
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
      await ctx.reply('❌ Session error. Please use /start to begin again.');
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    
    // Validate that this is a multi-answer question
    if (!isMultipleAnswerQuestion(currentQuestion.correctAnswer)) {
      await ctx.reply('❌ This is not a multiple-answer question.');
      return;
    }

    // Clear all selections
    this.userSelections.set(userId, []);
    
    // Recreate the question display
    const requiredCount = normalizeAnswer(currentQuestion.correctAnswer).length;
    const questionNumber = session.currentQuestionIndex + 1;
    const totalQuestions = session.questions.length;
    
    const questionText = 
      `📝 Question ${questionNumber}/${totalQuestions}\n` +
      `Score: ${session.correctAnswers}/${session.currentQuestionIndex}\n\n` +
      `${currentQuestion.question}\n\n` +
      `A. ${currentQuestion.options.A || 'Option A not available'}\n` +
      `B. ${currentQuestion.options.B || 'Option B not available'}\n` +
      `C. ${currentQuestion.options.C || 'Option C not available'}\n` +
      `D. ${currentQuestion.options.D || 'Option D not available'}\n\n` +
      `⚠️ Multiple answers required: Select ${requiredCount} options\n` +
      `✅ Selected: None (0/${requiredCount})`;

    // Create fresh keyboard
    const keyboard = new InlineKeyboard();
    keyboard
      .text('A', 'answer_A').text('B', 'answer_B').row()
      .text('C', 'answer_C').text('D', 'answer_D').row()
      .text('✅ Confirm Selection', 'confirm_selection').row()
      .text('🔄 Clear All', 'clear_selection');

    await ctx.editMessageText(questionText, {
      reply_markup: keyboard
    });
  }

  async handleNextQuestion(ctx) {
    const userId = ctx.from.id;
    const session = this.userSessions.get(userId);

    if (!session) {
      await ctx.reply('❌ Session error. Please use /start to begin again.');
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
      await ctx.reply('❌ Session error. Please use /start to begin again.');
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
      `🎉 Quiz Complete!\n\n` +
      `📊 Your Results:\n` +
      `• Score: ${correctAnswers}/${totalQuestions} (${percentage}%)\n` +
      `• Certificate: ${session.certificate.name}\n` +
      `• Access Code: ${session.accessCode}\n` +
      `• Duration: ${duration} minutes\n` +
      `• Date: ${endTime.toLocaleString()}\n\n` +
      `${percentage >= 70 ? '✅ Congratulations! You passed!' : '❌ Keep studying and try again!'}`;

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
    
    // Extract question number from command
    const parts = commandText.split(' ');
    if (parts.length < 2) {
      await ctx.reply(
        `❌ Please provide a question number.\n\n` +
        `Usage: /bookmark <question_number>\n` +
        `Example: /bookmark 15`
      );
      return;
    }

    const questionNumber = parseInt(parts[1]);
    if (isNaN(questionNumber) || questionNumber < 1) {
      await ctx.reply('❌ Please provide a valid question number (greater than 0).');
      return;
    }

    try {
      const db = await this.connectToDatabase();
      
      // Check if question exists in access-code-questions collection
      const question = await db.collection('access-code-questions').findOne({
        assignedQuestionNo: questionNumber
      });

      if (!question) {
        await ctx.reply(`❌ Question ${questionNumber} not found in the system.`);
        return;
      }

      // Check if bookmark already exists for this user and question
      const existingBookmark = await db.collection('bookmarks').findOne({
        userId: userId,
        questionNumber: questionNumber
      });

      if (existingBookmark) {
        await ctx.reply(`📝 Question ${questionNumber} is already bookmarked!`);
        return;
      }

      // Create new bookmark
      const bookmark = {
        userId: userId,
        questionNumber: questionNumber,
        questionId: question.questionId,
        accessCodeQuestionId: question._id,
        createdAt: new Date()
      };

      await db.collection('bookmarks').insertOne(bookmark);
      
      await ctx.reply(`✅ Question ${questionNumber} has been bookmarked successfully!`);
      
    } catch (error) {
      console.error('Error saving bookmark:', error);
      await ctx.reply('❌ Error saving bookmark. Please try again.');
    }
  }

  async handleShowBookmarks(ctx) {
    const userId = ctx.from.id;
    
    try {
      const db = await this.connectToDatabase();
      
      // Get user's bookmarks with question details
      const pipeline = [
        { $match: { userId: userId } },
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
          `📝 You haven't bookmarked any questions yet.\n\n` +
          `Use /bookmark <question_number> to save questions for later review.`
        );
        return;
      }

      let message = `📚 Your Bookmarked Questions (${bookmarks.length}):\n\n`;
      
      bookmarks.forEach((bookmark, index) => {
        const date = bookmark.createdAt.toLocaleDateString();
        const questionPreview = bookmark.questionText ? 
          bookmark.questionText.substring(0, 100) + '...' : 
          'Question text not available';
        const accessCode = bookmark.generatedAccessCode || 'N/A';
        
        message += `${index + 1}. Question ${bookmark.questionNumber}\n`;
        message += `   📅 Saved: ${date}\n`;
        message += `   🔑 Access Code: ${accessCode}\n`;
        message += `   📝 Preview: ${questionPreview}\n\n`;
      });

      message += `💡 Tip: Use /bookmark <question_number> to save more questions!`;
      
      await ctx.reply(message);
      
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      await ctx.reply('❌ Error loading bookmarks. Please try again.');
    }
  }

  async saveWrongAnswer(userId, session, currentQuestion, selectedAnswer) {
    try {
      const db = await this.connectToDatabase();
      
      // Check if this wrong answer already exists for this user and question
      const existingWrongAnswer = await db.collection('wrong-answers').findOne({
        userId: userId,
        questionId: currentQuestion._id,
        certificateId: new ObjectId(session.certificateId)
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
    
    try {
      const db = await this.connectToDatabase();
      
      // Get user's wrong answers grouped by certificate
      const pipeline = [
        { $match: { userId: userId } },
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
          `🎯 Great job! You haven't answered any questions incorrectly yet.\n\n` +
          `Keep practicing and this section will help you review any mistakes you make in the future.`
        );
        return;
      }

      let message = `📚 Revision Summary - Wrong Answers by Certificate:\n\n`;
      
      wrongAnswersByCategory.forEach((category, index) => {
        message += `${index + 1}. ${category.certificateName} (${category.certificateCode})\n`;
        message += `   ❌ Wrong Answers: ${category.totalWrongAnswers}\n`;
        message += `   📝 Questions: `;
        
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

      message += `💡 Tip: Focus on reviewing these questions to improve your knowledge!\n\n`;
      message += `📊 Detailed breakdown:\n`;
      
      // Show detailed breakdown for each certificate
      wrongAnswersByCategory.forEach((category, index) => {
        message += `\n🎓 ${category.certificateName}:\n`;
        
        category.wrongAnswers
          .sort((a, b) => a.questionNumber - b.questionNumber)
          .slice(0, 10) // Show first 10 questions per certificate
          .forEach(wa => {
            const attemptText = wa.attemptCount > 1 ? ` (${wa.attemptCount} attempts)` : '';
            message += `• Q${wa.questionNumber}: ${wa.selectedAnswer} → ${wa.correctAnswer}${attemptText}\n`;
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
      await ctx.reply('❌ Error loading revision data. Please try again.');
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
      await this.connectToDatabase();
      console.log('Connected to MongoDB');
      
      await this.bot.start();
      console.log('Bot started successfully!');
    } catch (error) {
      console.error('Error starting bot:', error);
    }
  }

  async stop() {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
    await this.bot.stop();
  }
}

// Create and start the bot
const bot = new CertificationBot();
bot.start();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Stopping bot...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Stopping bot...');
  await bot.stop();
  process.exit(0);
});

module.exports = CertificationBot;