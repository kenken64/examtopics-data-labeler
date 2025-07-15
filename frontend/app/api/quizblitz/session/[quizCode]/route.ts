import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizCode: string }> }
) {
  try {
    const { quizCode } = await params;

    if (!quizCode) {
      return NextResponse.json(
        { error: 'Quiz code is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Find quiz room (players join quiz rooms, not quiz sessions)
    const quizRoom = await db.collection('quizRooms').findOne({ 
      quizCode: quizCode.toUpperCase()
    });

    if (!quizRoom) {
      return NextResponse.json(
        { error: 'Quiz room not found' },
        { status: 404 }
      );
    }

    // If quiz is still waiting, return waiting state with players
    if (quizRoom.status === 'waiting') {
      return NextResponse.json({
        success: true,
        status: 'waiting',
        players: quizRoom.players || [],
        playerCount: quizRoom.players?.length || 0,
        currentQuestion: null,
        currentQuestionIndex: -1,
        totalQuestions: 0,
        timerDuration: null
      });
    }

    // If quiz has started, look for active quiz session
    const quizSession = await db.collection('quizSessions').findOne({ 
      quizCode: quizCode.toUpperCase()
    });

    if (!quizSession) {
      // Quiz room exists but session hasn't started yet
      return NextResponse.json({
        success: true,
        status: quizRoom.status,
        players: quizRoom.players || [],
        playerCount: quizRoom.players?.length || 0,
        currentQuestion: null,
        currentQuestionIndex: -1,
        totalQuestions: 0,
        timerDuration: null
      });
    }

    // Get current question from active session
    const currentQuestion = quizSession.questions[quizSession.currentQuestionIndex];

    return NextResponse.json({
      success: true,
      status: quizSession.status,
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
      players: quizSession.players || quizRoom.players || [],
      playerCount: (quizSession.players || quizRoom.players || []).length
    });

  } catch (error) {
    console.error('Quiz session fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
