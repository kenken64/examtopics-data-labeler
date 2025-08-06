const { InlineKeyboard } = require('grammy');
const { ObjectId } = require('mongodb');
const FeedbackService = require('../services/FeedbackService');

class MessageHandlers {
  constructor(databaseService, quizService, botInstance = null) {
    this.databaseService = databaseService;
    this.quizService = quizService;
    this.botInstance = botInstance;
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
    '• /revision - Review questions you answered incorrectly for current access code\n' +
    '• /steptest - Try the new step-based quiz feature\n' +
    '• /ordertest - Try the ordering/drag-and-drop interface\n\n' +
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
    '🧪 <b>/steptest</b>\n' +
    '   • Test the new step-based quiz feature\n' +
    '   • Experience multi-step sequential questions\n' +
    '   • Similar to ML certification exam format\n' +
    '   • Usage: Simply type /steptest\n\n' +
    '🔄 <b>/ordertest</b>\n' +
    '   • Test the ordering/drag-and-drop interface\n' +
    '   • Reorder options using ⬆️ and ⬇️ buttons\n' +
    '   • Similar to the web interface drag-and-drop\n' +
    '   • Usage: Simply type /ordertest\n\n' +
    '🎯 <b>Quiz Features:</b>\n\n' +
    '✅ <b>Question Navigation:</b>\n' +
    '   • Answer questions using the A, B, C, D buttons\n' +
    '   • Get immediate feedback on correct/incorrect answers\n' +
    '   • See detailed explanations for each question\n' +
    '   • Use "Next Question" button to continue\n\n' +
    '📋 <b>Step-Based Quizzes:</b>\n' +
    '   • Complete multi-step sequential questions\n' +
    '   • Progress through steps in order\n' +
    '   • Visual progress tracking\n' +
    '   • Comprehensive results review\n\n' +
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
    console.log('🔍 DEBUG - Current question type:', currentQuestion.type);
    console.log('🔍 DEBUG - Has steps array:', !!currentQuestion.steps);
    console.log('🔍 DEBUG - Question ID:', currentQuestion._id);
    console.log('🔍 DEBUG - Question structure keys:', Object.keys(currentQuestion));
    console.log('🔍 DEBUG - Has answers field:', !!currentQuestion.answers);
    console.log('🔍 DEBUG - Answers type:', typeof currentQuestion.answers);
    
    // Only log first 500 chars of large objects to avoid console spam
    const debugQuestion = { ...currentQuestion };
    if (debugQuestion.answers && typeof debugQuestion.answers === 'string' && debugQuestion.answers.length > 500) {
      debugQuestion.answers = debugQuestion.answers.substring(0, 500) + '... (truncated)';
    }
    console.log('Current question (truncated):', JSON.stringify(debugQuestion, null, 2));

    // Check if this is a step-based question (multiple ways to detect)
    const hasStepsArray = currentQuestion.steps && Array.isArray(currentQuestion.steps) && currentQuestion.steps.length > 0;
    const hasStepsType = currentQuestion.type === 'steps';
    const hasHotspotMarker = currentQuestion.question && 
      (currentQuestion.question.includes('**HOTSPOT**') || 
       currentQuestion.question.includes('HOTSPOT') ||
       currentQuestion.question.includes('hotspot'));
    const hasMultipleSteps = currentQuestion.answers && 
      (currentQuestion.answers.includes('step1') || 
       currentQuestion.answers.includes('Step 1') ||
       currentQuestion.answers.includes('"step1"') ||
       currentQuestion.answers.includes('"Step 1"'));
    
    // ENHANCED: More aggressive step detection for HOTSPOT questions
    const hasStepData = currentQuestion.answers && 
      typeof currentQuestion.answers === 'string' && 
      (currentQuestion.answers.includes('{') || currentQuestion.answers.includes('['));
    
    // FORCE STEP MODE: For testing, force step mode for any HOTSPOT question
    const isStepQuestion = hasStepsArray || hasStepsType || hasHotspotMarker || (hasHotspotMarker && (hasMultipleSteps || hasStepData));
    
    console.log('🔍 DEBUG - Step question detection:', {
      questionNumber: session.currentQuestionIndex + 1,
      questionId: currentQuestion._id,
      hasStepsArray,
      hasStepsType,
      hasHotspotMarker,
      hasMultipleSteps,
      hasStepData,
      isStepQuestion,
      questionPreview: currentQuestion.question?.substring(0, 100) + '...'
    });
    
    if (isStepQuestion) {
      console.log('🔄 Detected step-based question, switching to step quiz mode');
      
      // Transform database format to expected step format if needed
      let stepQuestionData = currentQuestion;
      
      if (!currentQuestion.steps && (hasStepsType || (hasHotspotMarker && hasMultipleSteps))) {
        console.log('📄 Transforming database step question format...');
        try {
          stepQuestionData = this.transformDatabaseStepQuestion(currentQuestion);
          console.log("✅ Transformation successful! Created steps:", stepQuestionData?.steps?.length || 0);
          
          // Validate transformation result
          if (!stepQuestionData || !stepQuestionData.steps || stepQuestionData.steps.length === 0) {
            console.error('❌ Transformation produced no valid steps');
            stepQuestionData = null;
          } else {
            console.log("Transformed step question data (summary):", {
              id: stepQuestionData._id,
              topic: stepQuestionData.topic,
              stepsCount: stepQuestionData.steps.length,
              firstStepPreview: stepQuestionData.steps[0]?.question?.substring(0, 50) + '...'
            });
          }
        } catch (error) {
          console.error('❌ Error transforming step question:', error);
          console.error('❌ Error stack:', error.stack);
          // Fall back to regular quiz mode
          console.log('⚠️ Falling back to regular quiz mode due to transformation error');
          stepQuestionData = null;
        }
      }
      
      // Only proceed with step quiz if we have valid step data
      if (stepQuestionData && stepQuestionData.steps && stepQuestionData.steps.length > 0) {
        if (this.botInstance) {
          console.log('🚀 Calling botInstance.handleStepQuiz with transformed data');
          await this.botInstance.handleStepQuiz(ctx, stepQuestionData);
          console.log('✅ Step quiz handling completed, returning early');
          return;
        } else {
          console.warn('⚠️ Bot instance not available for step quiz, falling back to regular quiz');
        }
      } else {
        console.warn('⚠️ No valid step data found, falling back to regular quiz mode');
      }
    }

    console.log('📝 Continuing with regular quiz flow (not a step question)');

    // Safeguard: Double-check this isn't a step question that was missed
    if (currentQuestion.type === 'steps' || hasHotspotMarker) {
      console.error('🚨 CRITICAL: Step question was not handled properly!');
      console.log('📋 Question details:', {
        type: currentQuestion.type,
        hasHotspot: hasHotspotMarker,
        hasAnswers: !!currentQuestion.answers,
        answersPreview: typeof currentQuestion.answers === 'string' ? 
          currentQuestion.answers.substring(0, 100) + '...' : 
          'Not a string'
      });
      
      // Try to create a simple fallback interface for step questions
      try {
        let answersData = {};
        if (typeof currentQuestion.answers === 'string') {
          answersData = JSON.parse(currentQuestion.answers);
        } else if (typeof currentQuestion.answers === 'object') {
          answersData = currentQuestion.answers;
        }
        
        const stepKeys = Object.keys(answersData).filter(key => 
          key.startsWith('step') || (Array.isArray(answersData[key]) && answersData[key].length > 0)
        );
        
        if (stepKeys.length > 0) {
          let message = `⚠️ **Step-based Question** (Fallback Mode)\n\n`;
          message += `**Question ${questionNumber} of ${totalQuestions}**\n\n`;
          message += `${currentQuestion.question || 'Step-based question'}\n\n`;
          
          stepKeys.forEach((stepKey, index) => {
            const options = answersData[stepKey];
            if (Array.isArray(options)) {
              message += `**Step ${index + 1}:**\n`;
              if (stepKey.startsWith('step')) {
                message += `Select the appropriate action:\n`;
              } else {
                message += `${stepKey}\n`;
              }
              options.forEach((option, optIndex) => {
                const letter = String.fromCharCode(65 + optIndex);
                message += `${letter}. ${option}\n`;
              });
              message += '\n';
            }
          });
          
          message += '💡 This is a step-based question that requires the step quiz interface.\n';
          message += 'Please try again or contact support if this persists.';
          
          const keyboard = new InlineKeyboard()
            .text('⏭️ Next Question', `next_question_${userId}`)
            .row()
            .text('🏠 Main Menu', 'back_to_companies');
          
          await ctx.reply(message, {
            reply_markup: keyboard,
            parse_mode: 'Markdown'
          });
          return;
        }
      } catch (fallbackError) {
        console.error('❌ Error in step question fallback:', fallbackError);
      }
      
      await ctx.reply('❌ Error: Step question detected but not processed correctly. Please contact support.');
      return;
    }

    // Check if options exist for regular questions
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

    // Special test command for HOTSPOT questions
    if (text === '/hotspottest' || text === '/testhotspot') {
      await this.testHotspotQuestion(ctx);
      return;
    }

    // For now, just provide helpful guidance
    await ctx.reply(
      `🤖 I received your message: "${text}"\n\n` +
      '💡 Here\'s what you can do:\n' +
      '• Use /start to begin a quiz\n' +
      '• Use /help for detailed instructions\n' +
      '• Use /hotspottest to test step quiz directly\n' +
      '• Use /steptest to try the step quiz feature\n' +
      '• Send a 6-digit code to join a QuizBlitz quiz\n\n' +
      'If you\'re trying to join a quiz, make sure to send just the 6-digit code (e.g., 123456)'
    );
  }

  // Direct test for HOTSPOT questions bypassing navigation
  async testHotspotQuestion(ctx) {
    try {
      console.log('🧪 Testing HOTSPOT question directly...');
      
      // Directly fetch the HOTSPOT question from database
      const db = await this.databaseService.connectToDatabase();
      const hotspotQuestion = await db.collection('questions').findOne({
        question: { $regex: /HOTSPOT/i }
      });
      
      if (!hotspotQuestion) {
        await ctx.reply('❌ No HOTSPOT question found in database for testing.');
        return;
      }
      
      console.log('🎯 Found HOTSPOT question:', hotspotQuestion._id);
      console.log('📋 Question text preview:', hotspotQuestion.question?.substring(0, 100) + '...');
      
      // Test step detection on this question
      const hasHotspotMarker = hotspotQuestion.question && 
        (hotspotQuestion.question.includes('**HOTSPOT**') || 
         hotspotQuestion.question.includes('HOTSPOT') ||
         hotspotQuestion.question.includes('hotspot'));
      
      const hasStepData = hotspotQuestion.answers && 
        typeof hotspotQuestion.answers === 'string' && 
        (hotspotQuestion.answers.includes('{') || hotspotQuestion.answers.includes('['));
      
      console.log('🔍 HOTSPOT Test Detection:', {
        hasHotspotMarker,
        hasStepData,
        answersType: typeof hotspotQuestion.answers,
        answersLength: hotspotQuestion.answers?.length || 0
      });
      
      if (hasHotspotMarker) {
        console.log('✅ HOTSPOT marker detected, attempting transformation...');
        
        try {
          const transformedData = this.transformDatabaseStepQuestion(hotspotQuestion);
          console.log('🎯 Transformation successful!', {
            stepsCount: transformedData?.steps?.length || 0,
            topic: transformedData?.topic
          });
          
          if (this.botInstance && transformedData?.steps?.length > 0) {
            await ctx.reply('🧪 **HOTSPOT Test Mode**\n\nAttempting to show step quiz interface...');
            await this.botInstance.handleStepQuiz(ctx, transformedData);
            console.log('✅ Step quiz test completed');
          } else {
            await ctx.reply('❌ Bot instance not available or no steps created during transformation.');
          }
        } catch (transformError) {
          console.error('❌ Transformation failed:', transformError);
          await ctx.reply(`❌ Transformation error: ${transformError.message}`);
        }
      } else {
        await ctx.reply('❌ Question found but HOTSPOT marker not detected.');
      }
      
    } catch (error) {
      console.error('❌ Error in testHotspotQuestion:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  // Transform MongoDB step question format to bot expected format
  transformDatabaseStepQuestion(dbQuestion) {
    try {
      console.log('🔄 Starting transformation of database step question');
      console.log('📋 Original question structure:', {
        _id: dbQuestion._id,
        type: dbQuestion.type,
        hasAnswers: !!dbQuestion.answers,
        hasCorrectAnswer: !!dbQuestion.correctAnswer,
        answersType: typeof dbQuestion.answers
      });

      // Parse JSON strings from database
      let answersData = {};
      let correctAnswersData = {};

      if (typeof dbQuestion.answers === 'string') {
        answersData = JSON.parse(dbQuestion.answers);
      } else if (typeof dbQuestion.answers === 'object') {
        answersData = dbQuestion.answers;
      }

      if (typeof dbQuestion.correctAnswer === 'string') {
        correctAnswersData = JSON.parse(dbQuestion.correctAnswer);
      } else if (typeof dbQuestion.correctAnswer === 'object') {
        correctAnswersData = dbQuestion.correctAnswer;
      }
      
      console.log('📋 Parsed answers data:', Object.keys(answersData).length, 'scenarios');
      console.log('✅ Parsed correct answers data:', Object.keys(correctAnswersData).length, 'answers');
      
      // Extract topic from question (look for **Topic X**)
      const topicMatch = dbQuestion.question?.match(/\*\*Topic\s+(\d+)\*\*/);
      const topic = topicMatch ? `Topic ${topicMatch[1]}` : 'Step Quiz';
      
      // Extract main question (remove topic and HOTSPOT markers)
      let description = dbQuestion.question || '';
      description = description.replace(/\*\*Topic\s+\d+\*\*\s*\n*/g, '');
      description = description.replace(/\*\*HOTSPOT\*\*\s*\n*/g, '**HOTSPOT** - ');
      description = description.trim();
      
      // Convert each scenario to a step - handle both step1, step2 format and scenario keys
      const steps = [];
      const stepKeys = Object.keys(answersData).filter(key => 
        key.startsWith('step') || (Array.isArray(answersData[key]) && answersData[key].length > 0)
      ).sort();
      
      console.log('🔍 Found step keys:', stepKeys);
      
      stepKeys.forEach((stepKey, index) => {
        const options = answersData[stepKey];
        if (Array.isArray(options) && options.length > 0) {
          const stepNumber = index + 1;
          
          // Find correct answer for this step
          let correctAnswerLetter = 'A'; // Default
          
          // Try different keys for correct answer
          const possibleKeys = [
            stepKey, // exact match
            `Step ${stepNumber}`, // "Step 1", "Step 2" format
            stepNumber.toString() // just the number
          ];
          
          for (const key of possibleKeys) {
            if (correctAnswersData[key]) {
              const correctOption = correctAnswersData[key];
              
              // If it's already a letter (A, B, C, D), use it directly
              if (typeof correctOption === 'string' && correctOption.match(/^[A-Z]$/)) {
                correctAnswerLetter = correctOption;
                break;
              }
              
              // Otherwise, find the index of the correct option text
              const optionIndex = options.findIndex(opt => opt === correctOption);
              if (optionIndex >= 0) {
                correctAnswerLetter = String.fromCharCode(65 + optionIndex); // A, B, C, D
                break;
              }
            }
          }
          
          // FIXED: Create step question text based on actual data structure
          let stepQuestion = '';
          if (stepKey.startsWith('step')) {
            // Generic numbered steps
            stepQuestion = `Select the appropriate action for step ${stepNumber}:`;
          } else {
            // Scenario-based questions - use the actual scenario as the question
            stepQuestion = stepKey;
          }
          
          const step = {
            question: stepQuestion,
            options: options,
            correctAnswer: correctAnswerLetter
          };
          
          console.log(`🎯 Created step ${stepNumber}:`, {
            question: step.question.substring(0, 50) + '...',
            optionsCount: step.options.length,
            correctAnswer: step.correctAnswer
          });
          
          steps.push(step);
        }
      });
      
      console.log(`🔄 Created ${steps.length} steps from database question`);
      
      // Return transformed question data in the format expected by step quiz handler
      const transformed = {
        _id: dbQuestion._id,
        topic: topic,
        description: description,
        steps: steps,
        originalQuestion: dbQuestion, // Keep original for reference
        orderingMode: false, // Default to selection mode, not ordering
        type: 'steps'
      };
      
      console.log('✅ Transformation completed successfully');
      return transformed;
      
    } catch (error) {
      console.error('❌ Error in transformDatabaseStepQuestion:', error);
      throw new Error(`Failed to transform step question: ${error.message}`);
    }
  }
}

module.exports = MessageHandlers;
