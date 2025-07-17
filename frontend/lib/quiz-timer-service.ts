// Quiz Timer Service - Handles automatic question progression and timer updates
// Publishes events via MongoDB Change Streams for real-time sync

import { connectToDatabase } from '@/lib/mongodb';
import { getQuizPubSub } from '@/lib/quiz-pubsub';

interface ActiveQuiz {
  quizCode: string;
  sessionId: string;
  currentQuestionIndex: number;
  timeRemaining: number;
  timerDuration: number;
  totalQuestions: number;
  timerId?: NodeJS.Timeout;
}

class QuizTimerService {
  private activeQuizzes: Map<string, ActiveQuiz> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Cleanup finished quizzes every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupFinishedQuizzes();
    }, 60000);
  }

  async startQuizTimer(quizCode: string): Promise<void> {
    try {
      console.log('🔧 DEBUG: [TIMER] startQuizTimer called for quiz:', quizCode.toUpperCase());
      
      const db = await connectToDatabase();
      const quizSession = await db.collection('quizSessions').findOne({
        quizCode: quizCode.toUpperCase(),
        status: 'active'
      });

      console.log('🔧 DEBUG: [TIMER] Quiz session found:', {
        found: !!quizSession,
        quizCode: quizSession?.quizCode,
        status: quizSession?.status,
        currentQuestionIndex: quizSession?.currentQuestionIndex,
        questionsLength: quizSession?.questions?.length,
        timerDuration: quizSession?.timerDuration
      });

      if (!quizSession) {
        throw new Error(`Quiz session not found: ${quizCode}`);
      }

      const activeQuiz: ActiveQuiz = {
        quizCode: quizCode.toUpperCase(),
        sessionId: quizSession._id.toString(),
        currentQuestionIndex: quizSession.currentQuestionIndex || 0,
        timeRemaining: quizSession.timerDuration,
        timerDuration: quizSession.timerDuration,
        totalQuestions: quizSession.questions.length
      };

      console.log('🔧 DEBUG: [TIMER] Creating active quiz:', activeQuiz);

      this.activeQuizzes.set(quizCode.toUpperCase(), activeQuiz);

      // Start the first question
      await this.startQuestion(activeQuiz);

      console.log(`⏱️ Started timer service for quiz ${quizCode}`);
    } catch (error) {
      console.error(`❌ Failed to start quiz timer for ${quizCode}:`, error);
      throw error;
    }
  }

  private async startQuestion(activeQuiz: ActiveQuiz): Promise<void> {
    const { quizCode, currentQuestionIndex, timerDuration, totalQuestions } = activeQuiz;

    console.log('🔧 DEBUG: [TIMER] startQuestion called:', {
      quizCode,
      currentQuestionIndex,
      timerDuration,
      totalQuestions
    });

    try {
      const db = await connectToDatabase();
      const quizSession = await db.collection('quizSessions').findOne({
        quizCode: quizCode
      });

      console.log('🔧 DEBUG: [TIMER] Quiz session state before update:', {
        found: !!quizSession,
        status: quizSession?.status,
        currentQuestionIndex: quizSession?.currentQuestionIndex,
        lastNotifiedQuestionIndex: quizSession?.lastNotifiedQuestionIndex,
        version: quizSession?.version
      });

      if (!quizSession || currentQuestionIndex >= totalQuestions) {
        // Quiz finished
        console.log('🔧 DEBUG: [TIMER] Quiz finished, ending quiz');
        await this.endQuiz(activeQuiz);
        return;
      }

      const currentQuestion = quizSession.questions[currentQuestionIndex];
      console.log('🔧 DEBUG: [TIMER] Current question:', {
        index: currentQuestionIndex,
        question: currentQuestion?.question?.substring(0, 100) + '...',
        optionsCount: Object.keys(currentQuestion?.options || {}).length
      });
      
      // Update session with current question - use atomic update to prevent race conditions
      const updateData = {
        currentQuestionIndex: currentQuestionIndex,
        questionStartedAt: new Date(),
        timeRemaining: timerDuration,
        lastNotifiedQuestionIndex: currentQuestionIndex - 1, // Reset Telegram notification tracking
        version: (quizSession.version || 0) + 1
      };

      console.log('🔧 DEBUG: [TIMER] Updating quiz session with:', updateData);

      const updateResult = await db.collection('quizSessions').updateOne(
        { 
          quizCode: quizCode,
          status: 'active' // Only update if still active
        },
        { $set: updateData }
      );

      console.log('🔧 DEBUG: [TIMER] Database update result:', {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
        acknowledged: updateResult.acknowledged
      });

      if (updateResult.modifiedCount === 0) {
        console.log(`⚠️ Quiz session ${quizCode} was modified by another process, skipping question start`);
        return;
      }

      // Publish question started event
      console.log('🔧 DEBUG: [TIMER] Publishing question started event');
      const pubsub = await getQuizPubSub();
      const questionData = {
        questionIndex: currentQuestionIndex,
        question: currentQuestion.question,
        options: currentQuestion.options,
        timeLimit: timerDuration,
        timeRemaining: timerDuration
      };

      console.log('🔧 DEBUG: [TIMER] Question data for PubSub:', {
        questionIndex: questionData.questionIndex,
        question: questionData.question?.substring(0, 100) + '...',
        optionsCount: Object.keys(questionData.options || {}).length,
        timeLimit: questionData.timeLimit
      });

      await pubsub.publishQuestionStarted(quizCode, questionData);
      console.log('🔧 DEBUG: [TIMER] Question started event published successfully');

      // Reset timer
      activeQuiz.timeRemaining = timerDuration;
      console.log('🔧 DEBUG: [TIMER] Timer reset to:', timerDuration);
      
      // Start countdown timer
      console.log('🔧 DEBUG: [TIMER] Starting countdown timer');
      this.startCountdown(activeQuiz);

      console.log(`📝 Started question ${currentQuestionIndex + 1}/${totalQuestions} for quiz ${quizCode}`);
    } catch (error) {
      console.error(`❌ Failed to start question for quiz ${quizCode}:`, error);
    }
  }

  private startCountdown(activeQuiz: ActiveQuiz): void {
    // Clear existing timer if any
    if (activeQuiz.timerId) {
      clearInterval(activeQuiz.timerId);
    }

    console.log('🔧 DEBUG: [TIMER] Starting countdown interval for quiz:', activeQuiz.quizCode);

    activeQuiz.timerId = setInterval(async () => {
      activeQuiz.timeRemaining--;

      // Log timer updates at key intervals
      if (activeQuiz.timeRemaining % 10 === 0 || activeQuiz.timeRemaining <= 5) {
        console.log('🔧 DEBUG: [TIMER] Time remaining for quiz', activeQuiz.quizCode, ':', activeQuiz.timeRemaining);
      }

      try {
        const pubsub = await getQuizPubSub();
        
        // Publish timer update every second
        await pubsub.publishTimerUpdate(activeQuiz.quizCode, activeQuiz.timeRemaining);

        // Update database every 5 seconds or when time is almost up
        if (activeQuiz.timeRemaining % 5 === 0 || activeQuiz.timeRemaining <= 5) {
          console.log('🔧 DEBUG: [TIMER] Updating database with time remaining:', activeQuiz.timeRemaining);
          const db = await connectToDatabase();
          await db.collection('quizSessions').updateOne(
            { quizCode: activeQuiz.quizCode },
            { $set: { timeRemaining: activeQuiz.timeRemaining } }
          );
        }

        // Time's up!
        if (activeQuiz.timeRemaining <= 0) {
          console.log('🔧 DEBUG: [TIMER] Time up! Ending question for quiz:', activeQuiz.quizCode);
          clearInterval(activeQuiz.timerId!);
          await this.endQuestion(activeQuiz);
        }
      } catch (error) {
        console.error(`❌ Timer update failed for quiz ${activeQuiz.quizCode}:`, error);
      }
    }, 1000);
  }

  private async endQuestion(activeQuiz: ActiveQuiz): Promise<void> {
    const { quizCode, currentQuestionIndex } = activeQuiz;

    console.log('🔧 DEBUG: [TIMER] endQuestion called for quiz:', quizCode, 'question:', currentQuestionIndex);

    try {
      const db = await connectToDatabase();
      
      // Get all player answers for this question
      const quizSession = await db.collection('quizSessions').findOne({
        quizCode: quizCode
      });

      if (!quizSession) {
        console.log('🔧 DEBUG: [TIMER] Quiz session not found, returning');
        return;
      }

      console.log('🔧 DEBUG: [TIMER] Processing question results for question:', currentQuestionIndex);

      const currentQuestion = quizSession.questions[currentQuestionIndex];
      const questionAnswers = quizSession.playerAnswers?.[currentQuestionIndex] || {};

      console.log('🔧 DEBUG: [TIMER] Question answers received:', {
        questionIndex: currentQuestionIndex,
        answersCount: Object.keys(questionAnswers).length,
        correctAnswer: currentQuestion.correctAnswer
      });

      // Calculate results
      const answerBreakdown: { [key: string]: number } = {};
      Object.keys(currentQuestion.options).forEach(option => {
        answerBreakdown[option] = 0;
      });

      // Count answers
      Object.values(questionAnswers).forEach((answer: any) => {
        if (answerBreakdown.hasOwnProperty(answer.answer)) {
          answerBreakdown[answer.answer]++;
        }
      });

      const questionResults = {
        questionIndex: currentQuestionIndex,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        answerBreakdown: answerBreakdown,
        totalAnswers: Object.keys(questionAnswers).length
      };

      console.log('🔧 DEBUG: [TIMER] Question results calculated:', {
        questionIndex: currentQuestionIndex,
        correctAnswer: questionResults.correctAnswer,
        totalAnswers: questionResults.totalAnswers,
        answerBreakdown: questionResults.answerBreakdown
      });

      // Save question results
      await db.collection('quizSessions').updateOne(
        { quizCode: quizCode },
        {
          $push: { questionResults: questionResults },
          $set: { timeRemaining: 0 }
        }
      );

      console.log('🔧 DEBUG: [TIMER] Question results saved to database');

      // Publish question ended event
      const pubsub = await getQuizPubSub();
      await pubsub.publishQuestionEnded(quizCode, questionResults);

      console.log('🔧 DEBUG: [TIMER] Question ended event published');

      console.log(`⏰ Question ${currentQuestionIndex + 1} ended for quiz ${quizCode}`);

      // Wait 5 seconds then move to next question
      console.log('🔧 DEBUG: [TIMER] Setting 5-second timeout for next question progression');
      setTimeout(async () => {
        console.log('🔧 DEBUG: [TIMER] 5-second timeout expired, progressing to next question');
        activeQuiz.currentQuestionIndex++;
        console.log('🔧 DEBUG: [TIMER] Updated currentQuestionIndex to:', activeQuiz.currentQuestionIndex);
        console.log('🔧 DEBUG: [TIMER] Total questions:', activeQuiz.totalQuestions);
        
        if (activeQuiz.currentQuestionIndex >= activeQuiz.totalQuestions) {
          console.log('🔧 DEBUG: [TIMER] All questions completed, quiz should end');
        } else {
          console.log('🔧 DEBUG: [TIMER] Starting next question:', activeQuiz.currentQuestionIndex);
        }
        
        await this.startQuestion(activeQuiz);
      }, 5000);

    } catch (error) {
      console.error(`❌ Failed to end question for quiz ${quizCode}:`, error);
    }
  }

  private async endQuiz(activeQuiz: ActiveQuiz): Promise<void> {
    const { quizCode } = activeQuiz;

    try {
      const db = await connectToDatabase();
      
      // Calculate final results
      const quizSession = await db.collection('quizSessions').findOne({
        quizCode: quizCode
      });

      if (!quizSession) return;

      // Mark quiz as completed
      await db.collection('quizSessions').updateOne(
        { quizCode: quizCode },
        {
          $set: {
            status: 'finished',
            finishedAt: new Date(),
            isQuizCompleted: true
          }
        }
      );

      // Update quiz room status
      await db.collection('quizRooms').updateOne(
        { quizCode: quizCode },
        {
          $set: {
            status: 'finished',
            finishedAt: new Date()
          }
        }
      );

      // Calculate player scores (if players are tracked)
      const finalResults = {
        totalQuestions: quizSession.questions.length,
        questionResults: quizSession.questionResults || [],
        completedAt: new Date()
      };

      // Publish quiz ended event
      const pubsub = await getQuizPubSub();
      await pubsub.publishQuizEnded(quizCode, finalResults);

      // Clean up active quiz
      this.activeQuizzes.delete(quizCode);

      console.log(`🏁 Quiz ${quizCode} completed successfully`);
    } catch (error) {
      console.error(`❌ Failed to end quiz ${quizCode}:`, error);
    }
  }

  async submitAnswer(quizCode: string, playerId: string, playerName: string, answer: string): Promise<boolean> {
    const activeQuiz = this.activeQuizzes.get(quizCode.toUpperCase());
    
    if (!activeQuiz || activeQuiz.timeRemaining <= 0) {
      return false; // Quiz not active or time's up
    }

    try {
      const db = await connectToDatabase();
      const quizSession = await db.collection('quizSessions').findOne({
        quizCode: quizCode.toUpperCase()
      });

      if (!quizSession) return false;

      const currentQuestion = quizSession.questions[activeQuiz.currentQuestionIndex];
      const isCorrect = answer === currentQuestion.correctAnswer;
      const responseTime = activeQuiz.timerDuration - activeQuiz.timeRemaining;

      // Store answer
      const answerData = {
        answer: answer,
        isCorrect: isCorrect,
        responseTime: responseTime,
        timestamp: new Date()
      };

      await db.collection('quizSessions').updateOne(
        { quizCode: quizCode.toUpperCase() },
        {
          $set: {
            [`playerAnswers.${activeQuiz.currentQuestionIndex}.${playerId}`]: answerData
          }
        }
      );

      // Publish answer submitted event
      const pubsub = await getQuizPubSub();
      await pubsub.publishAnswerSubmitted(quizCode.toUpperCase(), {
        playerId,
        playerName,
        answer,
        isCorrect,
        responseTime
      });

      console.log(`✅ Answer submitted: ${playerName} answered ${answer} for quiz ${quizCode}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to submit answer for quiz ${quizCode}:`, error);
      return false;
    }
  }

  stopQuizTimer(quizCode: string): void {
    const activeQuiz = this.activeQuizzes.get(quizCode.toUpperCase());
    if (activeQuiz && activeQuiz.timerId) {
      clearInterval(activeQuiz.timerId);
      this.activeQuizzes.delete(quizCode.toUpperCase());
      console.log(`⏹️ Stopped timer for quiz ${quizCode}`);
    }
  }

  private cleanupFinishedQuizzes(): void {
    // Remove quizzes that have been inactive for more than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [quizCode, activeQuiz] of this.activeQuizzes.entries()) {
      if (activeQuiz.timeRemaining <= 0) {
        this.stopQuizTimer(quizCode);
      }
    }
  }

  getActiveQuizzes(): string[] {
    return Array.from(this.activeQuizzes.keys());
  }

  destroy(): void {
    // Clean up all timers
    this.activeQuizzes.forEach((activeQuiz, quizCode) => {
      this.stopQuizTimer(quizCode);
    });
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
let quizTimerServiceInstance: QuizTimerService | null = null;

export function getQuizTimerService(): QuizTimerService {
  if (!quizTimerServiceInstance) {
    quizTimerServiceInstance = new QuizTimerService();
  }
  return quizTimerServiceInstance;
}

export function destroyQuizTimerService(): void {
  if (quizTimerServiceInstance) {
    quizTimerServiceInstance.destroy();
    quizTimerServiceInstance = null;
  }
}
