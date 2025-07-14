import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { quizCode, accessCode, timerDuration, hostId } = await request.json();

    if (!quizCode || !accessCode || !timerDuration || !hostId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Verify access code exists
    const accessCodeDoc = await db.collection('accessCodes').findOne({ 
      code: accessCode.toUpperCase(),
      isActive: true 
    });

    if (!accessCodeDoc) {
      return NextResponse.json(
        { error: 'Invalid access code' },
        { status: 404 }
      );
    }

    // Create quiz room
    const quizRoom = {
      quizCode: quizCode.toUpperCase(),
      accessCode: accessCode.toUpperCase(),
      hostId,
      timerDuration,
      status: 'waiting', // waiting, active, finished
      players: [],
      currentQuestionIndex: -1,
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null
    };

    const result = await db.collection('quizRooms').insertOne(quizRoom);

    return NextResponse.json({
      success: true,
      roomId: result.insertedId,
      quizCode: quizCode.toUpperCase()
    });

  } catch (error) {
    console.error('Quiz room creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
