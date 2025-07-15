import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateRequest } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    console.log('🏠 Quiz room creation endpoint called');
    
    // Check authentication first
    const { user, error } = await authenticateRequest(request);
    
    if (error || !user) {
      console.log('❌ Authentication failed:', error);
      return NextResponse.json(
        { error: 'Authentication required to create quiz rooms.' },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.email);
    const { quizCode, accessCode, timerDuration } = await request.json();

    if (!quizCode || !accessCode || !timerDuration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Verify access code exists in payees collection
    const payeeDoc = await db.collection('payees').findOne({ 
      generatedAccessCode: accessCode.toUpperCase()
    });

    if (!payeeDoc) {
      return NextResponse.json(
        { error: 'Invalid generated access code' },
        { status: 404 }
      );
    }

    // Create quiz room
    const quizRoom = {
      quizCode: quizCode.toUpperCase(),
      accessCode: accessCode.toUpperCase(),
      hostUserId: user.userId, // ✅ Use authenticated user ID with correct field name
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
