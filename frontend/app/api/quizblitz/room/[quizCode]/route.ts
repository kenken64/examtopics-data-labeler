import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateRequest } from '@/lib/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizCode: string }> }
) {
  try {
    // Check authentication first
    const { user, error } = await authenticateRequest(request);
    
    if (error || !user) {
      console.log('❌ Authentication failed for room access:', error);
      return NextResponse.json(
        { error: 'Authentication required to access quiz room.' },
        { status: 401 }
      );
    }
    
    const { quizCode } = await params;

    if (!quizCode) {
      return NextResponse.json(
        { error: 'Quiz code is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Get quiz room with current players
    const quizRoom = await db.collection('quizRooms').findOne({ 
      quizCode: quizCode.toUpperCase()
    });

    if (!quizRoom) {
      return NextResponse.json(
        { error: 'Quiz room not found' },
        { status: 404 }
      );
    }

    // Get latest player notifications
    const notifications = await db.collection('quizNotifications')
      .find({
        quizCode: quizCode.toUpperCase(),
        type: 'player_joined',
        timestamp: { $gte: new Date(Date.now() - 30000) } // Last 30 seconds
      })
      .sort({ timestamp: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      players: quizRoom.players || [],
      status: quizRoom.status,
      recentJoins: notifications.map(n => n.player),
      playerCount: quizRoom.players?.length || 0
    });

  } catch (error) {
    console.error('Quiz room status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
