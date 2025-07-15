import { NextRequest } from 'next/server';
import { MongoClient } from 'mongodb';

/**
 * Server-Sent Events (SSE) endpoint for quiz session updates
 * Replaces polling for real-time quiz status changes
 * Authentication: None required (public access for players)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizCode: string }> }
) {
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

          // First check if quiz room exists and get status
          const quizRoom = await db.collection('quizRooms').findOne({
            quizCode: quizCode.toUpperCase()
          });

          if (!quizRoom) {
            const errorData = {
              type: 'error',
              data: { error: 'Quiz room not found', status: 404 }
            };
            controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
            return;
          }

          // If quiz is still waiting, return waiting state
          if (quizRoom.status === 'waiting') {
            const updateData = {
              type: 'session_update',
              data: {
                success: true,
                status: 'waiting',
                players: quizRoom.players || [],
                playerCount: quizRoom.players?.length || 0,
                currentQuestion: null,
                currentQuestionIndex: -1,
                totalQuestions: 0,
                timerDuration: null,
                timestamp: new Date().toISOString()
              }
            };
            controller.enqueue(`data: ${JSON.stringify(updateData)}\n\n`);
            return;
          }

          // If quiz has started, look for active quiz session
          const quizSession = await db.collection('quizSessions').findOne({ 
            quizCode: quizCode.toUpperCase()
          });

          if (!quizSession) {
            // Quiz room exists but session hasn't started yet
            const updateData = {
              type: 'session_update',
              data: {
                success: true,
                status: quizRoom.status,
                players: quizRoom.players || [],
                playerCount: quizRoom.players?.length || 0,
                currentQuestion: null,
                currentQuestionIndex: -1,
                totalQuestions: 0,
                timerDuration: null,
                timestamp: new Date().toISOString()
              }
            };
            controller.enqueue(`data: ${JSON.stringify(updateData)}\n\n`);
            return;
          }

          // Get current question from active session
          const currentQuestion = quizSession.questions?.[quizSession.currentQuestionIndex] || null;

          const updateData = {
            type: 'session_update',
            data: {
              success: true,
              status: quizSession.status,
              players: quizRoom.players || [],
              playerCount: quizRoom.players?.length || 0,
              currentQuestion,
              currentQuestionIndex: quizSession.currentQuestionIndex,
              totalQuestions: quizSession.questions?.length || 0,
              timerDuration: quizSession.timerDuration,
              isQuizCompleted: quizSession.status === 'completed',
              startedAt: quizSession.startedAt,
              timestamp: new Date().toISOString()
            }
          };

          controller.enqueue(`data: ${JSON.stringify(updateData)}\n\n`);

        } catch (error) {
          console.error('SSE session update error:', error);
          if (isActive) {
            const errorData = {
              type: 'error',
              data: { message: 'Failed to fetch session updates' }
            };
            controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
          }
        }
      };

      // Send updates every 3 seconds (same as original polling)
      intervalId = setInterval(sendUpdate, 3000);

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
