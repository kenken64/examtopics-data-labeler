import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { quizCode, accessCode, timerDuration, players } = await request.json();

    if (!quizCode || !accessCode || !timerDuration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Find quiz room
    const quizRoom = await db.collection('quizRooms').findOne({ 
      quizCode: quizCode.toUpperCase()
    });

    if (!quizRoom) {
      return NextResponse.json(
        { error: 'Quiz room not found' },
        { status: 404 }
      );
    }

    // Get questions for this access code
    const questions = await db.collection('questions').find({
      accessCode: accessCode.toUpperCase()
    }).toArray();

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found for this access code' },
        { status: 404 }
      );
    }

    // Update quiz room status and start time
    await db.collection('quizRooms').updateOne(
      { quizCode: quizCode.toUpperCase() },
      { 
        $set: { 
          status: 'active',
          startedAt: new Date(),
          currentQuestionIndex: 0,
          players: players || []
        }
      }
    );

    // Create quiz session
    const quizSession = {
      quizCode: quizCode.toUpperCase(),
      accessCode: accessCode.toUpperCase(),
      questions: questions.map(q => ({
        _id: q._id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty || 'medium'
      })),
      timerDuration,
      players: players || [],
      playerAnswers: {},
      questionResults: {},
      startedAt: new Date(),
      currentQuestionIndex: 0,
      status: 'active'
    };

    const result = await db.collection('quizSessions').insertOne(quizSession);

    return NextResponse.json({
      success: true,
      sessionId: result.insertedId,
      questionCount: questions.length,
      firstQuestion: questions[0]
    });

  } catch (error) {
    console.error('Quiz start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
