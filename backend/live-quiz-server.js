// WebSocket server for real-time quiz functionality
// File: backend/websocket-server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient } = require('mongodb');

class LiveQuizServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.rooms = new Map(); // Store active quiz rooms
    this.players = new Map(); // Store player sessions
    this.timers = new Map(); // Store question timers

    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Player connected: ${socket.id}`);

      // Join quiz room
      socket.on('join-room', async (data) => {
        const { roomId, playerName, playerId } = data;
        
        try {
          const room = await this.joinRoom(roomId, {
            id: playerId || socket.id,
            name: playerName,
            socketId: socket.id,
            score: 0,
            streak: 0
          });

          socket.join(roomId);
          socket.emit('joined-room', { success: true, room, playerId: socket.id });
          this.io.to(roomId).emit('room-update', room);
          
        } catch (error) {
          socket.emit('join-error', { message: error.message });
        }
      });

      // Create new quiz room
      socket.on('create-room', async (data) => {
        const { hostName, certificate, questions, settings } = data;
        
        try {
          const room = await this.createRoom({
            hostId: socket.id,
            hostName,
            certificate,
            questions,
            settings: {
              questionTime: settings.questionTime || 30,
              showLeaderboard: settings.showLeaderboard !== false,
              allowLateJoin: settings.allowLateJoin || false,
              ...settings
            }
          });

          socket.join(room.id);
          socket.emit('room-created', { success: true, room });
          
        } catch (error) {
          socket.emit('creation-error', { message: error.message });
        }
      });

      // Start quiz
      socket.on('start-quiz', async (data) => {
        const { roomId } = data;
        const room = this.rooms.get(roomId);
        
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }

        await this.startQuiz(roomId);
      });

      // Submit answer
      socket.on('submit-answer', async (data) => {
        const { roomId, answer, timestamp } = data;
        const playerId = socket.id;
        
        try {
          const result = await this.submitAnswer(roomId, playerId, answer, timestamp);
          socket.emit('answer-submitted', { success: true, result });
          
        } catch (error) {
          socket.emit('answer-error', { message: error.message });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        this.handlePlayerDisconnect(socket.id);
      });
    });
  }

  async createRoom(config) {
    const roomId = this.generateRoomId();
    
    const room = {
      id: roomId,
      name: config.name || `${config.hostName}'s Quiz`,
      hostId: config.hostId,
      hostSocketId: config.hostId,
      certificate: config.certificate,
      questions: config.questions,
      settings: config.settings,
      players: [],
      currentQuestionIndex: -1,
      status: 'waiting', // waiting, active, finished
      createdAt: new Date(),
      answers: new Map() // questionIndex -> Map(playerId -> answerData)
    };

    this.rooms.set(roomId, room);
    return room;
  }

  async joinRoom(roomId, player) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status === 'finished') {
      throw new Error('Quiz has already finished');
    }

    if (room.status === 'active' && !room.settings.allowLateJoin) {
      throw new Error('Quiz is in progress and late joining is disabled');
    }

    // Check if player already exists
    const existingPlayerIndex = room.players.findIndex(p => p.id === player.id);
    if (existingPlayerIndex >= 0) {
      // Update socket ID for reconnection
      room.players[existingPlayerIndex].socketId = player.socketId;
    } else {
      room.players.push(player);
    }

    this.players.set(player.socketId, { roomId, playerId: player.id });
    return room;
  }

  async startQuiz(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.status = 'active';
    room.currentQuestionIndex = 0;
    room.startedAt = new Date();

    // Notify all players
    this.io.to(roomId).emit('quiz-started', { room });
    
    // Start first question
    await this.startQuestion(roomId);
  }

  async startQuestion(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.currentQuestionIndex >= room.questions.length) {
      return this.endQuiz(roomId);
    }

    const question = room.questions[room.currentQuestionIndex];
    const questionData = {
      id: question._id,
      question: question.question,
      options: question.options,
      timeLimit: room.settings.questionTime,
      points: this.calculateQuestionPoints(question),
      index: room.currentQuestionIndex
    };

    // Initialize answers for this question
    if (!room.answers.has(room.currentQuestionIndex)) {
      room.answers.set(room.currentQuestionIndex, new Map());
    }

    // Start question timer
    let timeRemaining = room.settings.questionTime;
    const timerId = setInterval(() => {
      timeRemaining--;
      this.io.to(roomId).emit('timer-update', timeRemaining);

      if (timeRemaining <= 0) {
        clearInterval(timerId);
        this.endQuestion(roomId);
      }
    }, 1000);

    this.timers.set(`${roomId}-${room.currentQuestionIndex}`, timerId);

    // Send question to all players
    this.io.to(roomId).emit('question-start', questionData);
  }

  async submitAnswer(roomId, playerId, answer, timestamp) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const questionAnswers = room.answers.get(room.currentQuestionIndex);
    if (!questionAnswers) throw new Error('No active question');

    // Check if player already answered
    if (questionAnswers.has(playerId)) {
      throw new Error('Answer already submitted');
    }

    const question = room.questions[room.currentQuestionIndex];
    const isCorrect = answer === question.correctAnswer;
    const responseTime = Date.now() - timestamp;

    // Calculate points
    const player = room.players.find(p => p.id === playerId);
    const points = this.calculateAnswerPoints(question, isCorrect, responseTime, player.streak);

    // Update player score and streak
    if (isCorrect) {
      player.score += points;
      player.streak += 1;
    } else {
      player.streak = 0;
    }

    // Store answer
    questionAnswers.set(playerId, {
      answer,
      isCorrect,
      points,
      responseTime,
      timestamp
    });

    return { isCorrect, points, newScore: player.score };
  }

  async endQuestion(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const question = room.questions[room.currentQuestionIndex];
    const questionAnswers = room.answers.get(room.currentQuestionIndex);

    // Calculate results
    const results = {
      questionIndex: room.currentQuestionIndex,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      answerBreakdown: {},
      leaderboard: [...room.players]
        .sort((a, b) => b.score - a.score)
        .map((p, index) => ({ ...p, rank: index + 1 }))
    };

    // Calculate answer distribution
    Object.keys(question.options).forEach(option => {
      results.answerBreakdown[option] = 0;
    });

    questionAnswers.forEach(answerData => {
      results.answerBreakdown[answerData.answer] = 
        (results.answerBreakdown[answerData.answer] || 0) + 1;
    });

    // Send results
    this.io.to(roomId).emit('question-end', results);

    // Move to next question after delay
    setTimeout(() => {
      room.currentQuestionIndex++;
      this.startQuestion(roomId);
    }, 5000);
  }

  async endQuiz(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.status = 'finished';
    room.endedAt = new Date();

    const finalResults = {
      leaderboard: [...room.players]
        .sort((a, b) => b.score - a.score)
        .map((p, index) => ({ ...p, rank: index + 1 })),
      totalQuestions: room.questions.length,
      duration: room.endedAt - room.startedAt,
      certificate: room.certificate
    };

    // Save results to database
    await this.saveQuizResults(roomId, finalResults);

    // Send final results
    this.io.to(roomId).emit('quiz-ended', finalResults);

    // Clean up room after delay
    setTimeout(() => {
      this.cleanupRoom(roomId);
    }, 300000); // 5 minutes
  }

  calculateQuestionPoints(question) {
    const basePoints = 1000;
    const difficultyMultiplier = {
      'easy': 1.0,
      'medium': 1.2,
      'hard': 1.5
    };
    
    return Math.floor(basePoints * (difficultyMultiplier[question.difficulty] || 1.0));
  }

  calculateAnswerPoints(question, isCorrect, responseTime, streak) {
    if (!isCorrect) return 0;

    const basePoints = this.calculateQuestionPoints(question);
    const maxResponseTime = 30000; // 30 seconds
    const timeBonus = Math.max(0, (maxResponseTime - responseTime) / maxResponseTime * 200);
    const streakBonus = Math.min(streak * 50, 500); // Max 500 bonus points

    return Math.floor(basePoints + timeBonus + streakBonus);
  }

  async saveQuizResults(roomId, results) {
    try {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const db = client.db();

      // Save quiz session
      await db.collection('live-quiz-sessions').insertOne({
        roomId,
        results,
        createdAt: new Date()
      });

      // Save individual player results
      const playerResults = results.leaderboard.map(player => ({
        playerId: player.id,
        playerName: player.name,
        roomId,
        score: player.score,
        rank: player.rank,
        certificate: results.certificate,
        createdAt: new Date()
      }));

      await db.collection('live-quiz-player-results').insertMany(playerResults);
      await client.close();

    } catch (error) {
      console.error('Error saving quiz results:', error);
    }
  }

  handlePlayerDisconnect(socketId) {
    const playerSession = this.players.get(socketId);
    if (!playerSession) return;

    const room = this.rooms.get(playerSession.roomId);
    if (room) {
      // Mark player as disconnected but keep in room for potential reconnection
      const player = room.players.find(p => p.socketId === socketId);
      if (player) {
        player.connected = false;
        player.disconnectedAt = new Date();
      }

      // Notify room of player disconnection
      this.io.to(playerSession.roomId).emit('player-disconnected', {
        playerId: playerSession.playerId
      });
    }

    this.players.delete(socketId);
  }

  cleanupRoom(roomId) {
    // Clear any remaining timers
    this.timers.forEach((timerId, key) => {
      if (key.startsWith(roomId)) {
        clearInterval(timerId);
        this.timers.delete(key);
      }
    });

    this.rooms.delete(roomId);
    console.log(`Room ${roomId} cleaned up`);
  }

  generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  start(port = 3001) {
    this.server.listen(port, () => {
      console.log(`Live Quiz Server running on port ${port}`);
    });
  }
}

// Initialize and start server
if (require.main === module) {
  const quizServer = new LiveQuizServer();
  quizServer.start();
}

module.exports = LiveQuizServer;
