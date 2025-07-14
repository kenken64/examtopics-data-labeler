// Real-time multiplayer quiz room concept
// File: frontend/app/live-quiz/room/[roomId]/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Trophy, Clock, Zap } from 'lucide-react';

interface LiveQuizPlayer {
  id: string;
  name: string;
  score: number;
  streak: number;
  avatar?: string;
}

interface LiveQuizQuestion {
  id: string;
  question: string;
  options: { [key: string]: string };
  correctAnswer: string;
  timeLimit: number;
  points: number;
}

interface LiveQuizRoom {
  id: string;
  name: string;
  hostId: string;
  players: LiveQuizPlayer[];
  currentQuestion?: LiveQuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  status: 'waiting' | 'active' | 'finished';
  certificate: string;
}

export default function LiveQuizRoom({ params }: { params: { roomId: string } }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<LiveQuizRoom | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LiveQuizPlayer[]>([]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('/live-quiz', {
      query: { roomId: params.roomId }
    });

    newSocket.on('room-update', (updatedRoom: LiveQuizRoom) => {
      setRoom(updatedRoom);
    });

    newSocket.on('question-start', (question: LiveQuizQuestion) => {
      setSelectedAnswer('');
      setShowResults(false);
      setTimeRemaining(question.timeLimit);
    });

    newSocket.on('question-end', (results: any) => {
      setShowResults(true);
      setLeaderboard(results.leaderboard);
    });

    newSocket.on('timer-update', (time: number) => {
      setTimeRemaining(time);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [params.roomId]);

  const submitAnswer = (answer: string) => {
    if (!selectedAnswer && socket) {
      setSelectedAnswer(answer);
      socket.emit('submit-answer', {
        roomId: params.roomId,
        playerId,
        answer,
        timestamp: Date.now()
      });
    }
  };

  if (!room) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Room Header */}
        <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-2xl">
                🚀 {room.name}
              </CardTitle>
              <div className="flex items-center gap-4 text-white">
                <Badge variant="secondary" className="bg-white/20 text-white">
                  <Users className="h-4 w-4 mr-1" />
                  {room.players.length} Players
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {room.certificate}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {room.status === 'waiting' && (
          <Card className="bg-white/90 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-center">
                🎮 Waiting for players to join...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {room.players.map((player) => (
                  <div key={player.id} className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="w-12 h-12 bg-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-medium">{player.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {room.status === 'active' && room.currentQuestion && (
          <div className="space-y-6">
            
            {/* Question Progress */}
            <Card className="bg-white/90 backdrop-blur-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold">
                    Question {room.questionIndex + 1} of {room.totalQuestions}
                  </span>
                  <div className="flex items-center gap-2 text-orange-600">
                    <Clock className="h-5 w-5" />
                    <span className="font-bold text-xl">{timeRemaining}s</span>
                  </div>
                </div>
                <Progress 
                  value={(room.questionIndex / room.totalQuestions) * 100} 
                  className="mb-4"
                />
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-6">
                    {room.currentQuestion.question}
                  </h2>
                </div>
              </CardContent>
            </Card>

            {/* Answer Options */}
            {!showResults && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(room.currentQuestion.options).map(([key, option]) => (
                  <Button
                    key={key}
                    onClick={() => submitAnswer(key)}
                    disabled={!!selectedAnswer || timeRemaining === 0}
                    className={`h-24 text-lg font-semibold transition-all duration-300 ${
                      selectedAnswer === key 
                        ? 'bg-blue-600 hover:bg-blue-700 scale-105' 
                        : 'bg-white hover:bg-gray-50 text-gray-800 border-2'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-lg">
                        {key}
                      </Badge>
                      <span>{option}</span>
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {/* Live Results */}
            {showResults && (
              <Card className="bg-white/90 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-center text-2xl">
                    📊 Round Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {leaderboard.slice(0, 5).map((player, index) => (
                      <div 
                        key={player.id}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          index === 0 ? 'bg-yellow-100 border-2 border-yellow-400' :
                          index === 1 ? 'bg-gray-100 border-2 border-gray-400' :
                          index === 2 ? 'bg-orange-100 border-2 border-orange-400' :
                          'bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <Trophy className={`h-6 w-6 ${
                                index === 0 ? 'text-yellow-600' :
                                index === 1 ? 'text-gray-600' :
                                'text-orange-600'
                              }`} />
                            )}
                            <span className="text-2xl font-bold">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-lg">{player.name}</p>
                            {player.streak > 1 && (
                              <div className="flex items-center gap-1">
                                <Zap className="h-4 w-4 text-orange-500" />
                                <span className="text-sm text-orange-600">
                                  {player.streak} streak!
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {player.score}
                          </p>
                          <p className="text-sm text-gray-600">points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}

        {room.status === 'finished' && (
          <Card className="bg-white/90 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-center text-3xl">
                🏆 Final Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold mb-2">
                  Congratulations {leaderboard[0]?.name}!
                </h2>
                <p className="text-gray-600">
                  You won with {leaderboard[0]?.score} points!
                </p>
              </div>
              
              <Button 
                className="w-full h-12 text-lg"
                onClick={() => window.location.href = '/live-quiz'}
              >
                Play Another Round
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
