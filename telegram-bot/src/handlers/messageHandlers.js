const { InlineKeyboard } = require('grammy');
const { ObjectId } = require('mongodb');
const FeedbackService = require('../services/FeedbackService');

class MessageHandlers {
  constructor(databaseService, quizService) {
    this.databaseService = databaseService;
    this.quizService = quizService;
    this.feedbackService = new FeedbackService(databaseService);
  }

  async handleStart(ctx, userSessions) {
    const userId = ctx.from.id;

    // Clear any existing session
    userSessions.delete(userId);

    await ctx.reply(
      '🎓 Welcome to the IT Certification Quiz Bot!\n\n' +
    'I\'ll help you practice for your IT certifications.\n\n' +
    '📚 Quick Commands Reference:\n' +
    '• /start - Start a new quiz\n' +
    '• /help - Show detailed help guide\n' +
    '• /menu - Show interactive command menu\n' +
    '• /bookmark [number] - Save a question for later\n' +
    '• /bookmarks - View your saved bookmarks\n' +
    '• /revision - Review questions you answered incorrectly for current access code\n\n' +
    '💡 Type /menu for an interactive command menu or /help for detailed instructions!\n\n' +
    'Let\'s get started by selecting a company:'
    );

    await this.showCompanies(ctx);
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

  async showCertificates(ctx) {
    try {
      const certificates = await this.databaseService.getCertificates();

      if (certificates.length === 0) {
        await ctx.reply('❌ No certificates available at the moment. Please try again later.');
        return;
      }

      const keyboard = new InlineKeyboard();
      certificates.forEach((cert) => {
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

  async showCompanies(ctx) {
    try {
      const companies = await this.databaseService.getCompanies();

      if (companies.length === 0) {
        await ctx.reply('❌ No companies available. Showing all certificates instead.');
        await this.showCertificates(ctx);
        return;
      }

      const keyboard = new InlineKeyboard();

      // Add individual companies
      companies.forEach((company) => {
        keyboard.text(`🏢 ${company.name} (${company.code})`, `company_${company._id}`).row();
      });

      await ctx.reply('🏢 Please select a company:', {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error fetching companies:', error);
      await ctx.reply('❌ Error loading companies. Showing all certificates instead.');
      await this.showCertificates(ctx);
    }
  }

  async showCertificatesByCompany(ctx, companyId) {
    try {
      const db = await this.databaseService.connectToDatabase();

      // Get company info
      const company = await db.collection('companies').findOne({ _id: new ObjectId(companyId) });
      if (!company) {
        await ctx.reply('❌ Company not found. Please try another company.');
        return;
      }

      const companyName = company.name;

      // Get certificates for this company
      const certificates = await db
        .collection('certificates')
        .find({
          companyId: companyId
        })
        .toArray();

      if (certificates.length === 0) {
        await ctx.reply(
          `❌ No certificates available for ${companyName}. Please try another company.`
        );
        return;
      }

      const keyboard = new InlineKeyboard();

      // Add back button
      keyboard.text('⬅️ Back to Companies', 'back_to_companies').row();

      // Add certificates
      certificates.forEach((cert) => {
        keyboard.text(`${cert.name} (${cert.code})`, `cert_${cert._id}`).row();
      });

      await ctx.reply(`📋 Certificates from ${companyName}:`, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error fetching certificates by company:', error);
      await ctx.reply('❌ Error loading certificates. Please try again later.');
    }
  }

  async handleCertificateSelection(ctx, certificateId, userSessions) {
    const userId = ctx.from.id;

    try {
      const certificate = await this.databaseService.getCertificateById(certificateId);

      if (!certificate) {
        await ctx.reply('❌ Certificate not found. Please try again.');
        return;
      }

      // Store certificate in user session
      userSessions.set(userId, {
        certificateId: certificateId,
        certificateName: certificate.name,
        waitingForAccessCode: true
      });

      await ctx.reply(
        `📋 Selected: ${certificate.name} (${certificate.code})\n\n` +
      '🔑 Please enter your access code for this certificate:',
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error('Error handling certificate selection:', error);
      await ctx.reply('❌ Error processing certificate selection. Please try again.');
    }
  }

  async handleAccessCodeSubmission(ctx, accessCode, userSessions) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session) {
      await ctx.reply('❌ Session expired. Please use /start to begin again.');
      return;
    }

    try {
      const questions = await this.quizService.getQuestionsForAccessCode(
        accessCode,
        session.certificateId
      );

      if (!questions || questions.length === 0) {
        const accessCodeExists = await this.quizService.checkAccessCodeExists(accessCode);

        if (accessCodeExists) {
          await ctx.reply(
            `❌ Access code "${accessCode}" exists but contains no questions for the selected certificate.\n\n` +
        'Please check:\n' +
        '• That you selected the correct certificate\n' +
        '• That the access code matches your certificate\n' +
        '• Contact support if the issue persists\n\n' +
        'Use /start to try again with a different certificate.'
          );
        } else {
          await ctx.reply(
            `❌ Invalid access code: "${accessCode}"\n\n` +
        'Please check your access code and try again, or use /start to select a different certificate.'
          );
        }
        return;
      }

      // Get certificate info for display
      const certificate = await this.quizService.getCertificateForAccessCode(accessCode);
      const certificateDisplay = certificate
        ? `${certificate.name} (${certificate.code})`
        : 'Unknown Certificate';

      // Update session with quiz data
      session.questions = questions;
      session.currentQuestionIndex = 0;
      session.correctAnswers = 0;
      session.wrongAnswers = [];
      session.accessCode = accessCode;
      session.waitingForAccessCode = false;

      await ctx.reply(
        '✅ Access code accepted!\n\n' +
      `📚 Certificate: ${certificateDisplay}\n` +
      `📊 Questions available: ${questions.length}\n\n` +
      '🚀 Starting your quiz now...'
      );

      await this.showCurrentQuestion(ctx, userSessions);
    } catch (error) {
      console.error('Error processing access code:', error);
      await ctx.reply('❌ Error processing access code. Please try again.');
    }
  }

  async showCurrentQuestion(ctx, userSessions, userSelections = {}) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

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

    // Clear any previous selections for this question
    if (!userSelections[userId]) {
      userSelections[userId] = [];
    } else {
      userSelections[userId] = [];
    }

    const currentUserSelections = userSelections[userId] || [];
    const questionText = this.quizService.formatQuestionText(
      currentQuestion,
      questionNumber,
      totalQuestions,
      session.correctAnswers,
      session.currentQuestionIndex,
      currentUserSelections
    );

    const keyboard = this.quizService.createQuestionKeyboard(
      currentQuestion,
      currentUserSelections
    );

    await ctx.reply(questionText, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  }

  async handleBookmark(ctx, userSessions) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('❌ No active quiz session. Please start a quiz first with /start.');
      return;
    }

    const messageText = ctx.message.text;
    const parts = messageText.split(' ');

    if (parts.length < 2) {
      await ctx.reply('❌ Please specify a question number. Example: /bookmark 5');
      return;
    }

    const questionNumber = parseInt(parts[1]);

    if (isNaN(questionNumber) || questionNumber < 1 || questionNumber > session.questions.length) {
      await ctx.reply(
        `❌ Invalid question number. Please enter a number between 1 and ${session.questions.length}.`
      );
      return;
    }

    try {
      const questionToBookmark = session.questions[questionNumber - 1];
      await this.databaseService.saveBookmark(
        userId,
        questionToBookmark._id,
        questionNumber,
        session.accessCode
      );

      await ctx.reply(`🔖 Question ${questionNumber} has been bookmarked successfully!`);
    } catch (error) {
      console.error('Error saving bookmark:', error);
      await ctx.reply('❌ Error saving bookmark. Please try again.');
    }
  }

  async handleBookmarks(ctx, userSessions) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session || !session.accessCode) {
      await ctx.reply('❌ No active quiz session. Please start a quiz first with /start.');
      return;
    }

    try {
      const bookmarks = await this.databaseService.getUserBookmarks(userId);
      const currentBookmarks = bookmarks.filter((b) => b.accessCode === session.accessCode);

      if (currentBookmarks.length === 0) {
        await ctx.reply(
          '📑 No bookmarks found for current access code. Use /bookmark [number] to save questions.'
        );
        return;
      }

      let message = `📑 <b>Your Bookmarks (${currentBookmarks.length})</b>\n\n`;

      currentBookmarks.forEach((bookmark) => {
        message += `🔖 Question ${bookmark.questionNumber}\n`;
      });

      message += '\n💡 Use /bookmark [number] to add more bookmarks!';

      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      await ctx.reply('❌ Error fetching bookmarks. Please try again.');
    }
  }

  async handleRevision(ctx, userSessions) {
    try {
      const userId = ctx.from.id;
      const session = userSessions.get(userId);

      // Get wrong answers from both session and database
      let sessionWrongAnswers = [];
      let accessCode = null;

      if (session) {
        sessionWrongAnswers = session.wrongAnswers || [];
        accessCode = session.accessCode;
      }

      // If no session, ask user for access code
      if (!accessCode) {
        await ctx.reply(
          '📖 <b>Revision - Wrong Answers</b>\n\n' +
          'To view your wrong answers, please start a quiz session first using /start.\n\n' +
          'This will load your previous wrong answers for that access code.'
        );
        return;
      }

      // Get wrong answers from database for this access code
      const databaseWrongAnswers = await this.feedbackService.getUserWrongAnswers(userId.toString(), accessCode);

      // Combine session and database wrong answers (avoid duplicates)
      const allWrongAnswers = new Map();

      // Add session wrong answers
      sessionWrongAnswers.forEach(wa => {
        const key = `${wa.questionId}_${wa.questionNumber}`;
        allWrongAnswers.set(key, {
          questionNumber: wa.questionNumber,
          userAnswer: wa.userAnswer,
          correctAnswer: wa.correctAnswer,
          source: 'session'
        });
      });

      // Add database wrong answers (these will override session if same question)
      databaseWrongAnswers.forEach(wa => {
        const key = `${wa.questionId}_${wa.questionNumber}`;
        allWrongAnswers.set(key, {
          questionNumber: wa.questionNumber,
          userAnswer: Array.isArray(wa.userAnswer) ? wa.userAnswer.join('') : wa.userAnswer,
          correctAnswer: wa.correctAnswer,
          attemptCount: wa.attemptCount || 1,
          lastAttemptAt: wa.lastAttemptAt,
          questionText: wa.questionText,
          source: 'database'
        });
      });

      const wrongAnswersArray = Array.from(allWrongAnswers.values());

      if (wrongAnswersArray.length === 0) {
        await ctx.reply(
          '🎉 <b>Excellent!</b> No wrong answers to review.\n\n' +
          `Access Code: <code>${accessCode}</code>\n\n` +
          'You haven\'t answered any questions incorrectly for this access code. Keep up the great work! 🏆\n\n' +
          '💡 <i>Wrong answers are automatically tracked across all your quiz sessions for each access code.</i>'
        );
        return;
      }

      // Sort by question number
      wrongAnswersArray.sort((a, b) => a.questionNumber - b.questionNumber);

      let message = `📖 <b>Wrong Answers Review</b>\n`;
      message += `📚 Access Code: <code>${accessCode}</code>\n`;
      message += `❌ Total Wrong: ${wrongAnswersArray.length} question${wrongAnswersArray.length > 1 ? 's' : ''}\n\n`;

      wrongAnswersArray.forEach((wrongAnswer, index) => {
        message += `${index + 1}. <b>Question ${wrongAnswer.questionNumber}</b>\n`;
        message += `   Your answer: <code>${wrongAnswer.userAnswer}</code>\n`;
        message += `   Correct answer: <code>${wrongAnswer.correctAnswer}</code>\n`;
        
        if (wrongAnswer.attemptCount && wrongAnswer.attemptCount > 1) {
          message += `   Attempts: ${wrongAnswer.attemptCount}\n`;
        }
        
        if (wrongAnswer.questionText && wrongAnswer.questionText.length > 0) {
          const preview = wrongAnswer.questionText.length > 80 
            ? wrongAnswer.questionText.substring(0, 80) + '...' 
            : wrongAnswer.questionText;
          message += `   Preview: <i>${preview}</i>\n`;
        }
        
        message += '\n';
      });

      message += '💡 <b>Study Tips:</b>\n';
      message += '• Review the explanation for each wrong answer\n';
      message += '• Take your time reading questions carefully\n';
      message += '• Practice similar questions to reinforce learning\n';
      message += '• Consider taking notes on difficult topics\n\n';
      message += '� Continue practicing with /start to improve your score!';

      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error handling revision:', error);
      await ctx.reply('❌ Error loading revision data. Please try again.');
    }
  }

  async handleMessage(ctx, _userSessions, _userSelections) {
  // Handle regular text messages that aren't commands
    const text = ctx.message.text;

    // For now, just provide helpful guidance
    await ctx.reply(
      `🤖 I received your message: "${text}"\n\n` +
    '💡 Here\'s what you can do:\n' +
    '• Use /start to begin a quiz\n' +
    '• Use /help for detailed instructions\n' +
    '• Use /join to join a QuizBlitz game\n' +
    '• Send a 6-digit code to join a QuizBlitz quiz\n\n' +
    'If you\'re trying to join a quiz, make sure to send just the 6-digit code (e.g., 123456)'
    );
  }
}

module.exports = MessageHandlers;
