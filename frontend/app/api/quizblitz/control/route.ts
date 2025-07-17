import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { quizCode, action } = await request.json();

    if (!quizCode || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Find active quiz session
    const quizSession = await db.collection('quizSessions').findOne({ 
      quizCode: quizCode.toUpperCase(),
      status: 'active'
    });

    if (!quizSession) {
      return NextResponse.json(
        { error: 'Active quiz session not found' },
        { status: 404 }
      );
    }

    if (action === 'next-question') {
      const nextQuestionIndex = quizSession.currentQuestionIndex + 1;
      
      if (nextQuestionIndex >= quizSession.questions.length) {
        // Quiz finished - use atomic update to prevent race condition
        const updateResult = await db.collection('quizSessions').updateOne(
          { 
            quizCode: quizCode.toUpperCase(),
            currentQuestionIndex: quizSession.currentQuestionIndex, // Ensure no other process updated this
            status: 'active' // Only update if still active
          },
          {
            $set: {
              status: 'finished',
              isQuizCompleted: true,
              finishedAt: new Date(),
              version: (quizSession.version || 0) + 1
            }
          }
        );

        if (updateResult.modifiedCount === 0) {
          return NextResponse.json({
            success: false,
            error: 'Quiz state changed by another process'
          }, { status: 409 });
        }

        return NextResponse.json({
          success: true,
          action: 'quiz-finished',
          message: 'Quiz completed'
        });
      }

      // Move to next question - use atomic update to prevent race condition
      const updateResult = await db.collection('quizSessions').updateOne(
        { 
          quizCode: quizCode.toUpperCase(),
          currentQuestionIndex: quizSession.currentQuestionIndex, // Ensure no other process updated this
          status: 'active' // Only update if still active
        },
        {
          $set: {
            currentQuestionIndex: nextQuestionIndex,
            lastQuestionChangeAt: new Date(),
            version: (quizSession.version || 0) + 1
          }
        }
      );

      if (updateResult.modifiedCount === 0) {
        return NextResponse.json({
          success: false,
          error: 'Quiz state changed by another process'
        }, { status: 409 });
      }

      const nextQuestion = quizSession.questions[nextQuestionIndex];

      return NextResponse.json({
        success: true,
        action: 'question-changed',
        currentQuestion: {
          _id: nextQuestion._id,
          question: nextQuestion.question,
          options: nextQuestion.options,
          difficulty: nextQuestion.difficulty
        },
        currentQuestionIndex: nextQuestionIndex,
        totalQuestions: quizSession.questions.length,
        timerDuration: quizSession.timerDuration
      });
    }

    if (action === 'get-current-state') {
      const currentQuestion = quizSession.questions[quizSession.currentQuestionIndex];
      
      return NextResponse.json({
        success: true,
        status: quizSession.status,
        currentQuestion: currentQuestion ? {
          _id: currentQuestion._id,
          question: currentQuestion.question,
          options: currentQuestion.options,
          difficulty: currentQuestion.difficulty
        } : null,
        currentQuestionIndex: quizSession.currentQuestionIndex,
        totalQuestions: quizSession.questions.length,
        timerDuration: quizSession.timerDuration,
        isQuizCompleted: quizSession.isQuizCompleted || false,
        players: quizSession.players || []
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Error in quiz control:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
