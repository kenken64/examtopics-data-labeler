import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';

export const GET = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ accessCode: string }> }
) => {
  try {
    const { accessCode } = await params;

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Find quiz room by access code
    const quizRoom = await db.collection('quizRooms').findOne({ 
      accessCode: accessCode.toUpperCase(),
      hostUserId: request.user?.userId // Ensure user owns this room
    });

    if (!quizRoom) {
      return NextResponse.json(
        { error: 'Quiz room not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      quizCode: quizRoom.quizCode,
      accessCode: quizRoom.accessCode,
      status: quizRoom.status,
      players: quizRoom.players || [],
      playerCount: quizRoom.players?.length || 0,
      createdAt: quizRoom.createdAt
    });

  } catch (error) {
    console.error('Quiz room lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});