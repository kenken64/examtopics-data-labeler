const { isMultipleAnswerQuestion } = require('../utils/answerUtils');
const FeedbackService = require('../services/FeedbackService');

class CallbackHandlers {
  constructor(databaseService, quizService, messageHandlers) {
    this.databaseService = databaseService;
    this.quizService = quizService;
    this.messageHandlers = messageHandlers;
    this.feedbackService = new FeedbackService(databaseService);
  }

  async handleCertificateCallback(ctx, certificateId, userSessions) {
    await this.messageHandlers.handleCertificateSelection(ctx, certificateId, userSessions);
  }

  async handleAnswerCallback(ctx, selectedAnswer, userSessions, userSelections) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('❌ Session error. Please use /start to begin again.');
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    const isMultiple = isMultipleAnswerQuestion(currentQuestion.correctAnswer);

    if (isMultiple) {
    // Handle multiple choice selection
      let selections = userSelections[userId] || [];

      if (selections.includes(selectedAnswer)) {
        // Remove if already selected
        selections = selections.filter((s) => s !== selectedAnswer);
      } else {
        // Add to selections
        selections.push(selectedAnswer);
        selections.sort(); // Keep alphabetically sorted
      }

      userSelections[userId] = selections;

      // Update the question display to show current selections
      const questionNumber = session.currentQuestionIndex + 1;
      const totalQuestions = session.questions.length;

      const questionText = this.quizService.formatQuestionText(
        currentQuestion,
        questionNumber,
        totalQuestions,
        session.correctAnswers,
        session.currentQuestionIndex,
        selections
      );

      const keyboard = this.quizService.createQuestionKeyboard(currentQuestion, selections);

      await ctx.editMessageText(questionText, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
    } else {
    // Handle single answer - process immediately
      await this.processAnswer(ctx, [selectedAnswer], userSessions, userSelections);
    }
  }

  async handleConfirmAnswer(ctx, userSessions, userSelections) {
    const userId = ctx.from.id;
    const selections = userSelections[userId] || [];

    if (selections.length === 0) {
      await ctx.reply('❌ Please select at least one answer before confirming.');
      return;
    }

    await this.processAnswer(ctx, selections, userSessions, userSelections);
  }

  async handleClearSelection(ctx, userSessions, userSelections) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('❌ Session error. Please use /start to begin again.');
      return;
    }

    // Clear selections
    userSelections[userId] = [];

    // Update the question display
    const currentQuestion = session.questions[session.currentQuestionIndex];
    const questionNumber = session.currentQuestionIndex + 1;
    const totalQuestions = session.questions.length;

    const questionText = this.quizService.formatQuestionText(
      currentQuestion,
      questionNumber,
      totalQuestions,
      session.correctAnswers,
      session.currentQuestionIndex,
      []
    );

    const keyboard = this.quizService.createQuestionKeyboard(currentQuestion, []);

    await ctx.editMessageText(questionText, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  }

  async processAnswer(ctx, selectedAnswers, userSessions, userSelections) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('❌ Session error. Please use /start to begin again.');
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    const isCorrect = this.quizService.checkAnswer(selectedAnswers, currentQuestion.correctAnswer);

    if (isCorrect) {
      session.correctAnswers++;
      
      // Remove from wrong answers collection if user previously got it wrong
      await this.feedbackService.removeWrongAnswer(
        userId.toString(),
        currentQuestion._id,
        session.accessCode
      );
    } else {
      // Store wrong answer for revision (existing session storage)
      session.wrongAnswers.push({
        questionId: currentQuestion._id,
        questionNumber: session.currentQuestionIndex + 1,
        userAnswer: selectedAnswers.join(''),
        correctAnswer: currentQuestion.correctAnswer
      });

      // Save wrong answer to dedicated MongoDB collection
      await this.feedbackService.saveWrongAnswer(
        userId.toString(),
        session.accessCode,
        currentQuestion,
        selectedAnswers,
        currentQuestion.correctAnswer,
        session.currentQuestionIndex + 1
      );
    }

    // Get explanation (AI if available, otherwise regular)
    const explanation = await this.databaseService.getExplanationForQuestion(
      currentQuestion._id,
      currentQuestion.explanation
    );

    const resultMessage = this.quizService.formatAnswerExplanation(
      isCorrect,
      currentQuestion.correctAnswer,
      explanation,
      currentQuestion
    );

    // Store answer details in session for feedback collection
    session.currentAnswerData = {
      question: currentQuestion,
      isCorrect: isCorrect,
      selectedAnswers: selectedAnswers,
      questionNumber: session.currentQuestionIndex + 1,
      totalQuestions: session.questions.length
    };

    // Show result with feedback collection option
    const feedbackMessage = this.feedbackService.formatFeedbackMessage(
      currentQuestion,
      isCorrect,
      session.currentQuestionIndex + 1,
      session.questions.length
    );

    const feedbackKeyboard = this.feedbackService.createDifficultyRatingKeyboard(
      session.currentQuestionIndex
    );

    // First show the answer explanation
    await ctx.editMessageText(resultMessage, {
      parse_mode: 'HTML'
    });

    // Wait a moment then show feedback collection
    setTimeout(async () => {
      try {
        await ctx.reply(feedbackMessage, {
          reply_markup: feedbackKeyboard,
          parse_mode: 'HTML'
        });
      } catch (error) {
        console.error('Error showing feedback collection:', error);
        // Continue to next question if feedback fails
        await this.showNextQuestionOrComplete(ctx, userSessions, userSelections);
      }
    }, 2000);

    // Clear selections for next question
    userSelections[userId] = [];
  }

  async handleNextQuestion(ctx, userSessions, userSelections) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('❌ Session error. Please use /start to begin again.');
      return;
    }

    // Check if user should skip feedback collection
    if (session.skipAllFeedback) {
      await this.showNextQuestionOrComplete(ctx, userSessions, userSelections);
      return;
    }

    // If there's no pending answer data, proceed normally
    if (!session.currentAnswerData) {
      await this.showNextQuestionOrComplete(ctx, userSessions, userSelections);
      return;
    }

    // If user clicked next without providing feedback, save empty feedback
    await this.saveFeedbackAndContinue(ctx, userSessions);
  }

  async showNextQuestion(ctx, userSessions, userSelections) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('❌ Session error. Please use /start to begin again.');
      return;
    }

    // Clear selections for new question
    userSelections[userId] = [];

    // FIX: Use messageHandlers.showCurrentQuestion to ensure step detection works during navigation
    console.log('🔄 Navigation: Calling messageHandlers.showCurrentQuestion for proper step detection');
    await this.messageHandlers.showCurrentQuestion(ctx, userSessions, userSelections);
  }

  async handleFeedbackCallback(ctx, callbackData, userSessions, userSelections) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session || !session.currentAnswerData) {
      await ctx.reply('❌ Session error. Please use /start to begin again.');
      return;
    }

    const parts = callbackData.split('_');
    const action = parts[1]; // difficulty, text, skip, continue, skip_all
    const questionIndex = parseInt(parts[2]);
    const rating = parts[3] ? parseInt(parts[3]) : null;

    const answerData = session.currentAnswerData;

    try {
      if (action === 'difficulty' && rating) {
        // Save difficulty rating and offer text feedback
        session.pendingFeedback = {
          difficultyRating: rating,
          questionIndex: questionIndex
        };

        const textFeedbackMessage = this.feedbackService.formatTextFeedbackPrompt(
          answerData.questionNumber,
          answerData.totalQuestions,
          rating
        );

        const textFeedbackKeyboard = this.feedbackService.createTextFeedbackKeyboard(questionIndex);

        await ctx.editMessageText(textFeedbackMessage, {
          reply_markup: textFeedbackKeyboard,
          parse_mode: 'HTML'
        });

      } else if (action === 'text') {
        // Prompt for text feedback
        session.awaitingTextFeedback = true;
        session.textFeedbackQuestionIndex = questionIndex;

        await ctx.editMessageText(
          '💬 <b>Share Your Feedback</b>\n\n' +
          'Please type your feedback about this question. You can share thoughts about:\n' +
          '• Question clarity\n' +
          '• Relevance to the exam\n' +
          '• Suggestions for improvement\n' +
          '• Any other insights\n\n' +
          '<i>Type your message and send it, or use /skip to continue without feedback.</i>',
          { parse_mode: 'HTML' }
        );

      } else if (action === 'skip' || action === 'continue') {
        // Save feedback without text or skip feedback entirely
        if (session.pendingFeedback) {
          await this.saveFeedbackAndContinue(ctx, userSessions, userSelections, session.pendingFeedback.difficultyRating);
        } else {
          await this.saveFeedbackAndContinue(ctx, userSessions, userSelections);
        }

      } else if (action === 'skip' && parts.length > 3 && parts[2] === 'all') {
        // Skip all future feedback for this session (pattern: feedback_skip_all_X)
        session.skipAllFeedback = true;
        await this.showNextQuestionOrComplete(ctx, userSessions, new Map());
      }

    } catch (error) {
      console.error('Error handling feedback:', error);
      await ctx.reply('❌ Error processing feedback. Continuing to next question...');
      await this.showNextQuestionOrComplete(ctx, userSessions);
    }
  }

  async handleTextFeedback(ctx, userSessions, userSelections, textFeedback) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session || !session.awaitingTextFeedback || !session.currentAnswerData) {
      return;
    }

    // Clear text feedback state
    session.awaitingTextFeedback = false;
    session.textFeedbackQuestionIndex = null;

    const difficultyRating = session.pendingFeedback ? session.pendingFeedback.difficultyRating : null;

    await this.saveFeedbackAndContinue(ctx, userSessions, userSelections, difficultyRating, textFeedback);
  }

  async saveFeedbackAndContinue(ctx, userSessions, userSelections, difficultyRating = null, textFeedback = null) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session || !session.currentAnswerData) {
      await this.showNextQuestionOrComplete(ctx, userSessions, userSelections);
      return;
    }

    const answerData = session.currentAnswerData;

    // Save feedback to database
    await this.feedbackService.saveFeedback(
      userId.toString(),
      session.accessCode,
      answerData.question,
      answerData.isCorrect,
      difficultyRating,
      textFeedback,
      answerData.selectedAnswers,
      answerData.question.correctAnswer,
      answerData.questionNumber
    );

    // Clear feedback state
    session.currentAnswerData = null;
    session.pendingFeedback = null;

    // Show thank you message and continue
    let thankYouMessage = '🙏 <b>Thank you for your feedback!</b>\n\n';
    
    if (difficultyRating) {
      const difficultyText = this.feedbackService.getDifficultyText(difficultyRating);
      thankYouMessage += `⭐ Difficulty: ${difficultyText}\n`;
    }
    
    if (textFeedback) {
      thankYouMessage += `💬 Your insights help improve the learning experience!\n`;
    }

    thankYouMessage += '\n🔄 Moving to next question...';

    await ctx.reply(thankYouMessage, { parse_mode: 'HTML' });

    // Continue to next question immediately (remove delay to prevent user confusion)
    await this.showNextQuestionOrComplete(ctx, userSessions, userSelections);
  }

  async showNextQuestionOrComplete(ctx, userSessions, userSelections = new Map()) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session) {
      await ctx.reply('❌ Session error. Please use /start to begin again.');
      return;
    }

    // Move to next question
    session.currentQuestionIndex++;

    // Check if quiz is complete
    if (session.currentQuestionIndex >= session.questions.length) {
      await this.handleQuizCompletion(ctx, userSessions, userSelections);
    } else {
      await this.showNextQuestion(ctx, userSessions, userSelections);
    }
  }

  async handleQuizCompletion(ctx, userSessions, userSelections) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session) {
      await ctx.reply('❌ Session error. Please use /start to begin again.');
      return;
    }

    const percentage = Math.round((session.correctAnswers / session.questions.length) * 100);

    // Save quiz attempt to database for dashboard analytics
    try {
      const db = await this.databaseService.connectToDatabase();
      const quizAttempt = {
        userId: userId.toString(),
        accessCode: session.accessCode,
        certificateId: session.certificateId,
        certificateName: session.certificateName || 'Unknown Certificate',
        totalQuestions: session.questions.length,
        correctAnswers: session.correctAnswers,
        score: percentage,
        createdAt: new Date(),
        completedAt: new Date(),
        source: 'telegram'
      };

      await db.collection('quiz-attempts').insertOne(quizAttempt);
      console.log(`✅ Saved quiz attempt for user ${userId}: ${session.correctAnswers}/${session.questions.length} (${percentage}%) for ${session.certificateName}`);
    } catch (error) {
      console.error('❌ Error saving quiz attempt:', error);
    }

    const completionMessage =
      '🎉 <b>Quiz Completed!</b>\n\n' +
      '📊 <b>Your Results:</b>\n' +
      `✅ Correct: ${session.correctAnswers}/${session.questions.length}\n` +
      `❌ Wrong: ${session.questions.length - session.correctAnswers}/${session.questions.length}\n` +
      `📈 Score: ${percentage}%\n\n` +
      `🎯 <b>Performance:</b> ${this.getPerformanceMessage(percentage)}\n\n` +
      '📚 Use /bookmarks to review saved questions\n' +
      '📖 Use /revision to review wrong answers\n' +
      '🔄 Use /start to take another quiz';

    await ctx.reply(completionMessage, { parse_mode: 'HTML' });

    // Clear the session
    userSessions.delete(userId);
    userSelections.delete(userId);
  }

  getPerformanceMessage(percentage) {
    if (percentage >= 90) return 'Excellent! 🏆';
    if (percentage >= 80) return 'Great job! 🎯';
    if (percentage >= 70) return 'Good work! 👍';
    if (percentage >= 60) return 'Keep practicing! 📚';
    return 'More study needed! 💪';
  }
}

module.exports = CallbackHandlers;
