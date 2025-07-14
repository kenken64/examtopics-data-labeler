import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { quizCode: string } }
) {
  try {
    const { quizCode } = params;

    if (!quizCode) {
      return NextResponse.json(
        { error: 'Quiz code is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Find quiz session
    const quizSession = await db.collection('quizSessions').findOne({ 
      quizCode: quizCode.toUpperCase()
    });

    if (!quizSession) {
      return NextResponse.json(
        { error: 'Quiz session not found' },
        { status: 404 }
      );
    }

    // Get current question
    const currentQuestion = quizSession.questions[quizSession.currentQuestionIndex];

    return NextResponse.json({
      success: true,
      currentQuestion: currentQuestion ? {
        _id: currentQuestion._id,
        question: currentQuestion.question,
        options: currentQuestion.options,
        // Don't send correct answer to clients
        difficulty: currentQuestion.difficulty
      } : null,
      currentQuestionIndex: quizSession.currentQuestionIndex,
      totalQuestions: quizSession.questions.length,
      timerDuration: quizSession.timerDuration,
      players: quizSession.players || [],
      status: quizSession.status
    });

  } catch (error) {
    console.error('Quiz session fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
