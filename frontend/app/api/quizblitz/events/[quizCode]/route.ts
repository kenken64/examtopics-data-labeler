import { NextRequest } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET(request: NextRequest, { params }: { params: Promise<{ quizCode: string }> }) {
  const { quizCode } = await params;
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);

  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  let isClientClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      let changeStream: any = null;
      let isRunning = true;
      let pollingInterval: NodeJS.Timeout | null = null;
      let isControllerClosed = false;
      
      const cleanup = async () => {
        isRunning = false;
        
        // Close change stream first
        if (changeStream && !changeStream.closed) {
          try {
            await changeStream.close();
            changeStream = null;
          } catch (error: any) {
            console.log('Change stream already closed or closing:', error.message);
            changeStream = null;
          }
        }
        
        // Clear polling interval
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
        
        // Close MongoDB client
        if (!isClientClosed && client) {
          try {
            await client.close();
            isClientClosed = true;
          } catch (error) {
            console.log('Client already closed or closing:', error.message);
          }
        }
      };

      const closeController = () => {
        if (!isControllerClosed) {
          try {
            controller.close();
            isControllerClosed = true;
          } catch (error) {
            console.log('Controller already closed');
          }
        }
      };

      try {
        // Try Change Streams first (for replica sets)
        const pipeline = [
          { $match: { 'fullDocument.quizCode': quizCode.toUpperCase() } }
        ];
        changeStream = db.collection('quizEvents').watch(pipeline, { fullDocument: 'updateLookup' });
        
        console.log('✅ Using Change Streams for real-time events');
        
        // Send initial heartbeat
        controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
        
        changeStream.on('change', (change: any) => {
          if (change.operationType === 'insert' && change.fullDocument && isRunning) {
            controller.enqueue(`data: ${JSON.stringify(change.fullDocument)}\n\n`);
          }
        });

        changeStream.on('error', async (error: any) => {
          console.error('Change stream error:', error);
          await cleanup();
          closeController();
        });

      } catch (changeStreamError: any) {
        console.log('⚠️ Change Streams not supported, using polling fallback');
        
        let lastEventId: string | null = null;
        
        // Send initial heartbeat
        controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
        
        const pollEvents = async () => {
          if (!isRunning) return;
          
          try {
            // Query for new events since last check
            const query: any = { quizCode: quizCode.toUpperCase() };
            if (lastEventId) {
              query._id = { $gt: lastEventId };
            }
            
            const events = await db.collection('quizEvents')
              .find(query)
              .sort({ _id: 1 })
              .limit(10)
              .toArray();
            
            for (const event of events) {
              if (isRunning) {
                controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
                lastEventId = event._id.toString();
              }
            }
          } catch (pollError) {
            console.error('Polling error:', pollError);
          }
        };
        
        // Start polling every 2 seconds
        pollingInterval = setInterval(pollEvents, 2000);
        // Initial poll
        pollEvents();
      }

      // Return cleanup function for when the stream is aborted
      return async () => {
        await cleanup();
      };
    },

    async cancel() {
      // This is called when the stream is cancelled
      console.log('🔌 Stream cancelled by client');
      if (!isClientClosed && client) {
        try {
          await client.close();
          isClientClosed = true;
        } catch (error) {
          console.log('Client already closed in cancel:', error.message);
        }
      }
    }
  });

  return new Response(stream, { headers });
}
