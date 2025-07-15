import { NextRequest } from 'next/server';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

/**
 * Server-Sent Events (SSE) endpoint for host room updates
 * Replaces polling for real-time player join notifications
 * Authentication: Required (hosts only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizCode: string }> }
) {
  // Manual authentication for SSE endpoint
  const token = request.cookies.get('token')?.value;
  
  if (!token) {
    return new Response('Authentication required', { status: 401 });
  }

  try {
    // Verify JWT token
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return new Response('Invalid token', { status: 401 });
  }

  const { quizCode } = await params;
  
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue('data: {"type":"connected","message":"SSE connection established"}\n\n');

      let isActive = true;
      const client = new MongoClient(process.env.MONGODB_URI!);
      let intervalId: NodeJS.Timeout;

      const sendUpdate = async () => {
        if (!isActive) return;

        try {
          await client.connect();
          const db = client.db(process.env.MONGODB_DB_NAME);

          // Get current room state
          const quizRoom = await db.collection('quizRooms').findOne({
            quizCode: quizCode.toUpperCase()
          });

          if (quizRoom) {
            // Get recent player joins (last 30 seconds)
            const recentNotifications = await db.collection('quizNotifications')
              .find({
                quizCode: quizCode.toUpperCase(),
                type: 'player_joined',
                timestamp: { $gte: new Date(Date.now() - 30000) }
              })
              .sort({ timestamp: -1 })
              .toArray();

            const updateData = {
              type: 'room_update',
              data: {
                success: true,
                players: quizRoom.players || [],
                status: quizRoom.status,
                recentJoins: recentNotifications.map(n => n.player),
                playerCount: quizRoom.players?.length || 0,
                timestamp: new Date().toISOString()
              }
            };

            controller.enqueue(`data: ${JSON.stringify(updateData)}\n\n`);
          }
        } catch (error) {
          console.error('SSE room update error:', error);
          if (isActive) {
            const errorData = {
              type: 'error',
              data: { message: 'Failed to fetch room updates' }
            };
            controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
          }
        }
      };

      // Send updates every 2 seconds (same as original polling)
      intervalId = setInterval(sendUpdate, 2000);

      // Send initial update
      sendUpdate();

      // Cleanup function
      const cleanup = () => {
        isActive = false;
        if (intervalId) {
          clearInterval(intervalId);
        }
        client.close().catch(console.error);
      };

      // Handle client disconnect
      request.signal?.addEventListener('abort', cleanup);

      // Cleanup after 5 minutes to prevent resource leaks
      setTimeout(() => {
        cleanup();
        controller.close();
      }, 300000);
    }
  });

  return new Response(stream, { headers });
}
