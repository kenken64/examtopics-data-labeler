import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    console.log('👥 Quiz join endpoint called');
    
    const { quizCode, playerName } = await request.json();

    if (!quizCode || !playerName) {
      return NextResponse.json(
        { error: 'Quiz code and player name are required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Find the quiz room
    const quizRoom = await db.collection('quizRooms').findOne({ 
      quizCode: quizCode.toUpperCase()
    });

    if (!quizRoom) {
      return NextResponse.json(
        { error: 'Quiz room not found' },
        { status: 404 }
      );
    }

    if (quizRoom.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Quiz has already started or finished' },
        { status: 400 }
      );
    }

    // Generate unique player ID
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create player object
    const player = {
      id: playerId,
      name: playerName.trim(),
      joinedAt: new Date(),
      score: 0,
      answers: []
    };

    // Add player to the room
    await db.collection('quizRooms').updateOne(
      { quizCode: quizCode.toUpperCase() },
      { 
        $push: { players: player } as any,
        $set: { updatedAt: new Date() }
      }
    );

    console.log(`✅ Player ${playerName} joined quiz ${quizCode}`);

    return NextResponse.json({
      success: true,
      playerId,
      playerName: playerName.trim(),
      quizCode: quizCode.toUpperCase()
    });

  } catch (error) {
    console.error('💥 Quiz join error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
