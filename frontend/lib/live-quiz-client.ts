// Frontend WebSocket client for live quiz functionality
// File: frontend/lib/live-quiz-client.ts

import { io, Socket } from 'socket.io-client';

export interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  rank?: number;
  connected?: boolean;
}

export interface QuizRoom {
  id: string;
  name: string;
  hostId: string;
  certificate: string;
  players: Player[];
  currentQuestionIndex: number;
  status: 'waiting' | 'active' | 'finished';
  settings: {
    questionTime: number;
    showLeaderboard: boolean;
    allowLateJoin: boolean;
  };
}

export interface Question {
  id: string;
  question: string;
  options: { [key: string]: string };
  timeLimit: number;
  points: number;
  index: number;
}

export interface QuestionResult {
  questionIndex: number;
  correctAnswer: string;
  explanation: string;
  answerBreakdown: { [key: string]: number };
  leaderboard: Player[];
}

export interface AnswerResult {
  isCorrect: boolean;
  points: number;
  newScore: number;
}

export class LiveQuizClient {
  private socket: Socket | null = null;
  private listeners: { [event: string]: Function[] } = {};

  constructor(private serverUrl: string = 'http://localhost:3001') {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl);

      this.socket.on('connect', () => {
        console.log('Connected to live quiz server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      this.setupDefaultHandlers();
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupDefaultHandlers() {
    if (!this.socket) return;

    this.socket.on('joined-room', (data) => {
      this.emit('room-joined', data);
    });

    this.socket.on('room-update', (room: QuizRoom) => {
      this.emit('room-updated', room);
    });

    this.socket.on('room-created', (data) => {
      this.emit('room-created', data);
    });

    this.socket.on('quiz-started', (data) => {
      this.emit('quiz-started', data);
    });

    this.socket.on('question-start', (question: Question) => {
      this.emit('question-started', question);
    });

    this.socket.on('timer-update', (timeRemaining: number) => {
      this.emit('timer-updated', timeRemaining);
    });

    this.socket.on('answer-submitted', (result: AnswerResult) => {
      this.emit('answer-submitted', result);
    });

    this.socket.on('question-end', (result: QuestionResult) => {
      this.emit('question-ended', result);
    });

    this.socket.on('quiz-ended', (finalResults) => {
      this.emit('quiz-ended', finalResults);
    });

    this.socket.on('player-disconnected', (data) => {
      this.emit('player-disconnected', data);
    });

    this.socket.on('error', (error) => {
      this.emit('error', error);
    });

    this.socket.on('join-error', (error) => {
      this.emit('join-error', error);
    });

    this.socket.on('creation-error', (error) => {
      this.emit('creation-error', error);
    });

    this.socket.on('answer-error', (error) => {
      this.emit('answer-error', error);
    });
  }

  // Event handling
  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.listeners[event]) return;

    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      this.listeners[event] = [];
    }
  }

  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Quiz actions
  async createRoom(config: {
    hostName: string;
    certificate: string;
    questions: any[];
    settings?: {
      questionTime?: number;
      showLeaderboard?: boolean;
      allowLateJoin?: boolean;
    };
  }): Promise<void> {
    if (!this.socket) throw new Error('Not connected');

    this.socket.emit('create-room', config);
  }

  async joinRoom(roomId: string, playerName: string, playerId?: string): Promise<void> {
    if (!this.socket) throw new Error('Not connected');

    this.socket.emit('join-room', {
      roomId: roomId.toUpperCase(),
      playerName,
      playerId
    });
  }

  async startQuiz(roomId: string): Promise<void> {
    if (!this.socket) throw new Error('Not connected');

    this.socket.emit('start-quiz', { roomId });
  }

  async submitAnswer(roomId: string, answer: string): Promise<void> {
    if (!this.socket) throw new Error('Not connected');

    this.socket.emit('submit-answer', {
      roomId,
      answer,
      timestamp: Date.now()
    });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// React hook for live quiz
import { useEffect, useRef, useState } from 'react';

export function useLiveQuiz(serverUrl?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<QuizRoom | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [lastResult, setLastResult] = useState<QuestionResult | null>(null);
  const [finalResults, setFinalResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<LiveQuizClient | null>(null);

  useEffect(() => {
    const client = new LiveQuizClient(serverUrl);
    clientRef.current = client;

    // Set up event listeners
    client.on('room-joined', (data) => {
      setCurrentRoom(data.room);
      setError(null);
    });

    client.on('room-updated', (room: QuizRoom) => {
      setCurrentRoom(room);
    });

    client.on('room-created', (data) => {
      setCurrentRoom(data.room);
      setError(null);
    });

    client.on('quiz-started', (data) => {
      setCurrentRoom(data.room);
      setFinalResults(null);
    });

    client.on('question-started', (question: Question) => {
      setCurrentQuestion(question);
      setTimeRemaining(question.timeLimit);
      setLastResult(null);
    });

    client.on('timer-updated', (time: number) => {
      setTimeRemaining(time);
    });

    client.on('answer-submitted', (result: AnswerResult) => {
      // Handle answer submission feedback
      console.log('Answer submitted:', result);
    });

    client.on('question-ended', (result: QuestionResult) => {
      setLastResult(result);
      setCurrentQuestion(null);
      
      // Update room with new scores
      if (currentRoom) {
        setCurrentRoom({
          ...currentRoom,
          players: result.leaderboard
        });
      }
    });

    client.on('quiz-ended', (results) => {
      setFinalResults(results);
      setCurrentQuestion(null);
      setCurrentRoom(prev => prev ? { ...prev, status: 'finished' } : null);
    });

    client.on('error', (error) => {
      setError(error.message);
    });

    client.on('join-error', (error) => {
      setError(error.message);
    });

    client.on('creation-error', (error) => {
      setError(error.message);
    });

    client.on('answer-error', (error) => {
      setError(error.message);
    });

    // Connect to server
    client.connect()
      .then(() => setIsConnected(true))
      .catch((err) => setError(err.message));

    return () => {
      client.disconnect();
    };
  }, [serverUrl]);

  const createRoom = async (config: Parameters<LiveQuizClient['createRoom']>[0]) => {
    await clientRef.current?.createRoom(config);
  };

  const joinRoom = async (roomId: string, playerName: string, playerId?: string) => {
    await clientRef.current?.joinRoom(roomId, playerName, playerId);
  };

  const startQuiz = async (roomId: string) => {
    await clientRef.current?.startQuiz(roomId);
  };

  const submitAnswer = async (roomId: string, answer: string) => {
    await clientRef.current?.submitAnswer(roomId, answer);
  };

  const clearError = () => setError(null);

  return {
    isConnected,
    currentRoom,
    currentQuestion,
    timeRemaining,
    lastResult,
    finalResults,
    error,
    createRoom,
    joinRoom,
    startQuiz,
    submitAnswer,
    clearError
  };
}
