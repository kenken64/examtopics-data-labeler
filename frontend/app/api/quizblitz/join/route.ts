import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    console.log('👥 Quiz join endpoint called');
    
    const { quizCode, playerName, playerId, source } = await request.json();

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

    // Use provided player ID or generate new one
    const finalPlayerId = playerId || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if player already exists (for rejoining)
    const existingPlayer = quizRoom.players?.find((p: any) => p.id === finalPlayerId);
    
    if (existingPlayer) {
      console.log(`🔄 Player ${playerName} (${finalPlayerId}) already in quiz ${quizCode}`);
      return NextResponse.json({
        success: true,
        playerId: finalPlayerId,
        playerName: existingPlayer.name,
        quizCode: quizCode.toUpperCase(),
        playersCount: quizRoom.players?.length || 0
      });
    }

    // Create player object
    const player = {
      id: finalPlayerId,
      name: playerName.trim(),
      joinedAt: new Date(),
      score: 0,
      answers: [],
      source: source || 'web' // Track if player joined via Telegram or web
    };

    // Add player to the room
    await db.collection('quizRooms').updateOne(
      { quizCode: quizCode.toUpperCase() },
      { 
        $push: { players: player } as any,
        $set: { updatedAt: new Date() }
      }
    );

    console.log(`✅ Player ${playerName} (${source || 'web'}) joined quiz ${quizCode}`);

    return NextResponse.json({
      success: true,
      playerId: finalPlayerId,
      playerName: playerName.trim(),
      quizCode: quizCode.toUpperCase(),
      playersCount: (quizRoom.players?.length || 0) + 1
    });

  } catch (error) {
    console.error('💥 Quiz join error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
