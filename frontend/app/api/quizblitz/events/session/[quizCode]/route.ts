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
      let isControllerClosed = false;
      const client = new MongoClient(process.env.MONGODB_URI!);
      let intervalId: NodeJS.Timeout;

      const sendUpdate = async () => {
        if (!isActive || isControllerClosed) return;

        try {
          await client.connect();
          const db = client.db(process.env.MONGODB_DB_NAME);

          // First check if quiz room exists and get status
          const quizRoom = await db.collection('quizRooms').findOne({
            quizCode: quizCode.toUpperCase()
          });

          if (!quizRoom) {
            if (!isControllerClosed) {
              const errorData = {
                type: 'error',
                data: { error: 'Quiz room not found', status: 404 }
              };
              controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
            }
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
          
          // Use database timeRemaining as authoritative source for RxJS observable synchronization
          // The backend timer service is the single source of truth
          const calculatedTimeRemaining = quizSession.timeRemaining;

          // Ensure questionStartedAt is a valid timestamp
          let questionStartedAt = quizSession.questionStartedAt;
          if (questionStartedAt && typeof questionStartedAt === 'object') {
            // Convert Date object to timestamp if needed
            questionStartedAt = new Date(questionStartedAt).getTime();
          } else if (questionStartedAt && typeof questionStartedAt === 'string') {
            // Convert string to timestamp if needed
            questionStartedAt = new Date(questionStartedAt).getTime();
          }

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
              timeRemaining: calculatedTimeRemaining, // Use synchronized time
              questionStartedAt: questionStartedAt, // Ensure it's a valid timestamp
              isQuizCompleted: quizSession.status === 'completed',
              startedAt: quizSession.startedAt,
              timestamp: new Date().toISOString()
            }
          };

        if (!isControllerClosed) {
          controller.enqueue(`data: ${JSON.stringify(updateData)}\n\n`);
        }

      } catch (error) {
        console.error('SSE session update error:', error);
        if (isActive && !isControllerClosed) {
          const errorData = {
            type: 'error',
            data: { message: 'Failed to fetch session updates' }
          };
          controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
        }
      }
    };

        // Send updates every 2 seconds for better timer sync (matches backend update frequency)
        intervalId = setInterval(sendUpdate, 2000);    // Send initial update
    sendUpdate();

    // Cleanup function
    const cleanup = () => {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      client.close().catch(console.error);
    };

    // Safe controller close function
    const safeControllerClose = () => {
      if (!isControllerClosed) {
        try {
          isControllerClosed = true;
          controller.close();
        } catch (error) {
          // Controller already closed, ignore error
          console.debug('Controller close error (likely already closed):', error instanceof Error ? error.message : 'Unknown error');
        }
      }
    };

    // Handle client disconnect
    request.signal?.addEventListener('abort', () => {
      cleanup();
      safeControllerClose();
    });

    // Cleanup after 5 minutes to prevent resource leaks
    const timeoutId = setTimeout(() => {
      cleanup();
      safeControllerClose();
    }, 300000);

    // Store cleanup for potential early termination
    (controller as any)._cleanup = () => {
      cleanup();
      clearTimeout(timeoutId);
      safeControllerClose();
    };
    }
  });

  return new Response(stream, { headers });
}
