const { isMultipleAnswerQuestion } = require('../utils/answerUtils');

class CallbackHandlers {
  constructor(databaseService, quizService, messageHandlers) {
    this.databaseService = databaseService;
    this.quizService = quizService;
    this.messageHandlers = messageHandlers;
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
      let selections = userSelections.get(userId) || [];

      if (selections.includes(selectedAnswer)) {
        // Remove if already selected
        selections = selections.filter((s) => s !== selectedAnswer);
      } else {
        // Add to selections
        selections.push(selectedAnswer);
        selections.sort(); // Keep alphabetically sorted
      }

      userSelections.set(userId, selections);

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
    const selections = userSelections.get(userId) || [];

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
    userSelections.set(userId, []);

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
    } else {
    // Store wrong answer for revision
      session.wrongAnswers.push({
        questionId: currentQuestion._id,
        questionNumber: session.currentQuestionIndex + 1,
        userAnswer: selectedAnswers.join(''),
        correctAnswer: currentQuestion.correctAnswer
      });
    }

    // Get explanation (AI if available, otherwise regular)
    const explanation = await this.databaseService.getExplanationForQuestion(
      currentQuestion._id,
      currentQuestion.explanation
    );

    const resultMessage = this.quizService.formatAnswerExplanation(
      isCorrect,
      currentQuestion.correctAnswer,
      explanation
    );

    // Show result with next question button
    const keyboard = {
      inline_keyboard: [[{ text: '➡️ Next Question', callback_data: 'next_question' }]]
    };

    await ctx.editMessageText(resultMessage, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });

    // Clear selections for next question
    userSelections.set(userId, []);
  }

  async handleNextQuestion(ctx, userSessions, userSelections) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('❌ Session error. Please use /start to begin again.');
      return;
    }

    session.currentQuestionIndex++;

    if (session.currentQuestionIndex >= session.questions.length) {
    // Quiz completed
      const percentage = Math.round((session.correctAnswers / session.questions.length) * 100);

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

      await ctx.editMessageText(completionMessage, { parse_mode: 'HTML' });

      // Clear the session
      userSessions.delete(userId);
      userSelections.delete(userId);
    } else {
    // Show next question
      await this.showNextQuestion(ctx, userSessions, userSelections);
    }
  }

  async showNextQuestion(ctx, userSessions, userSelections) {
    const userId = ctx.from.id;
    const session = userSessions.get(userId);

    if (!session || !session.questions) {
      await ctx.reply('❌ Session error. Please use /start to begin again.');
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    const questionNumber = session.currentQuestionIndex + 1;
    const totalQuestions = session.questions.length;

    // Clear selections for new question
    userSelections.set(userId, []);

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

  getPerformanceMessage(percentage) {
    if (percentage >= 90) return 'Excellent! 🏆';
    if (percentage >= 80) return 'Great job! 🎯';
    if (percentage >= 70) return 'Good work! 👍';
    if (percentage >= 60) return 'Keep practicing! 📚';
    return 'More study needed! 💪';
  }
}

module.exports = CallbackHandlers;
