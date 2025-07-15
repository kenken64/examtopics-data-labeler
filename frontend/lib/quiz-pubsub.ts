// MongoDB Change Streams-based PubSub for Live Quiz Synchronization
// Provides real-time sync between frontend and Telegram bot

import { MongoClient, ChangeStream } from 'mongodb';

export interface QuizEvent {
  type: 'quiz_started' | 'question_started' | 'question_ended' | 'timer_update' | 'quiz_ended' | 'answer_submitted';
  quizCode: string;
  data: any;
  timestamp: Date;
}

export interface QuestionData {
  questionIndex: number;
  question: string;
  options: { [key: string]: string };
  timeLimit: number;
  timeRemaining?: number;
}

export interface AnswerSubmission {
  playerId: string;
  playerName: string;
  answer: string;
  isCorrect: boolean;
  responseTime: number;
}

export class QuizPubSub {
  private client: MongoClient;
  private db: any;
  private changeStream: ChangeStream | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private isConnected = false;

  constructor(mongoUri: string, dbName: string) {
    this.client = new MongoClient(mongoUri);
    this.db = null;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.client.connect();
      this.db = this.client.db(process.env.MONGODB_DB_NAME);
      this.isConnected = true;
      console.log('📡 QuizPubSub connected to MongoDB');
      
      // Start listening to quiz events
      this.startListening();
    } catch (error) {
      console.error('❌ QuizPubSub connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.changeStream) {
      await this.changeStream.close();
      this.changeStream = null;
    }
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
    }
    console.log('📡 QuizPubSub disconnected');
  }

  private startListening(): void {
    // Watch for changes in quiz events collection
    const pipeline = [
      {
        $match: {
          'fullDocument.type': {
            $in: ['quiz_started', 'question_started', 'question_ended', 'timer_update', 'quiz_ended', 'answer_submitted']
          }
        }
      }
    ];

    this.changeStream = this.db.collection('quizEvents').watch(pipeline, {
      fullDocument: 'updateLookup'
    });

    this.changeStream.on('change', (change) => {
      if (change.operationType === 'insert' && change.fullDocument) {
        const event: QuizEvent = change.fullDocument;
        this.handleEvent(event);
      }
    });

    this.changeStream.on('error', (error) => {
      console.error('📡 Change stream error:', error);
    });

    console.log('📡 QuizPubSub listening for quiz events...');
  }

  private handleEvent(event: QuizEvent): void {
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`❌ Error handling ${event.type} event:`, error);
      }
    });

    // Also trigger global handlers
    const globalHandlers = this.eventHandlers.get('*') || [];
    globalHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('❌ Error in global event handler:', error);
      }
    });
  }

  // Subscribe to specific event types
  on(eventType: string, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  // Unsubscribe from events
  off(eventType: string, handler: Function): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Publish quiz events
  async publishEvent(event: Omit<QuizEvent, 'timestamp'>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('QuizPubSub not connected');
    }

    const eventWithTimestamp: QuizEvent = {
      ...event,
      timestamp: new Date()
    };

    try {
      await this.db.collection('quizEvents').insertOne(eventWithTimestamp);
      console.log(`📡 Published event: ${event.type} for quiz ${event.quizCode}`);
    } catch (error) {
      console.error('❌ Failed to publish event:', error);
      throw error;
    }
  }

  // Specific event publishers
  async publishQuizStarted(quizCode: string, questionData: QuestionData): Promise<void> {
    await this.publishEvent({
      type: 'quiz_started',
      quizCode,
      data: { question: questionData }
    });
  }

  async publishQuestionStarted(quizCode: string, questionData: QuestionData): Promise<void> {
    await this.publishEvent({
      type: 'question_started',
      quizCode,
      data: { question: questionData }
    });
  }

  async publishQuestionEnded(quizCode: string, results: any): Promise<void> {
    await this.publishEvent({
      type: 'question_ended',
      quizCode,
      data: { results }
    });
  }

  async publishTimerUpdate(quizCode: string, timeRemaining: number): Promise<void> {
    await this.publishEvent({
      type: 'timer_update',
      quizCode,
      data: { timeRemaining }
    });
  }

  async publishQuizEnded(quizCode: string, finalResults: any): Promise<void> {
    await this.publishEvent({
      type: 'quiz_ended',
      quizCode,
      data: { finalResults }
    });
  }

  async publishAnswerSubmitted(quizCode: string, answer: AnswerSubmission): Promise<void> {
    await this.publishEvent({
      type: 'answer_submitted',
      quizCode,
      data: { answer }
    });
  }

  // Get recent events for a quiz (for late joiners)
  async getRecentEvents(quizCode: string, since?: Date): Promise<QuizEvent[]> {
    if (!this.isConnected) {
      throw new Error('QuizPubSub not connected');
    }

    const query: any = { quizCode };
    if (since) {
      query.timestamp = { $gte: since };
    }

    const events = await this.db.collection('quizEvents')
      .find(query)
      .sort({ timestamp: 1 })
      .toArray();

    return events;
  }

  // Clean up old events (called periodically)
  async cleanupOldEvents(olderThanHours: number = 24): Promise<void> {
    if (!this.isConnected) return;

    const cutoffDate = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    try {
      const result = await this.db.collection('quizEvents').deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      console.log(`🧹 Cleaned up ${result.deletedCount} old quiz events`);
    } catch (error) {
      console.error('❌ Failed to cleanup old events:', error);
    }
  }
}

// Singleton instance for application-wide use
let quizPubSubInstance: QuizPubSub | null = null;

export async function getQuizPubSub(): Promise<QuizPubSub> {
  if (!quizPubSubInstance) {
    quizPubSubInstance = new QuizPubSub(
      process.env.MONGODB_URI!,
      process.env.MONGODB_DB_NAME!
    );
    await quizPubSubInstance.connect();
  }
  return quizPubSubInstance;
}

export async function closeQuizPubSub(): Promise<void> {
  if (quizPubSubInstance) {
    await quizPubSubInstance.disconnect();
    quizPubSubInstance = null;
  }
}
