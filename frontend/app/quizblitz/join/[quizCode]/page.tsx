'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Smartphone, Wifi, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function JoinQuizPage() {
  const params = useParams();
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [quizInfo, setQuizInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const quizCode = params.quizCode as string;

  useEffect(() => {
    if (quizCode) {
      checkQuizRoom();
    }
  }, [quizCode]);

  const checkQuizRoom = async () => {
    try {
      const response = await fetch(`/api/quizblitz/room/${quizCode}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuizInfo(data);
      } else {
        toast.error('Quiz room not found');
        router.push('/quizblitz');
      }
    } catch (error) {
      console.error('Error checking quiz room:', error);
      toast.error('Failed to connect to quiz room');
    } finally {
      setLoading(false);
    }
  };

  const joinQuiz = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch(`/api/quizblitz/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          quizCode,
          playerName: playerName.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Successfully joined the quiz!');
        // Redirect to the live quiz page
        router.push(`/quizblitz/live/${quizCode}?playerId=${data.playerId}`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to join quiz');
      }
    } catch (error) {
      console.error('Error joining quiz:', error);
      toast.error('Failed to join quiz');
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isJoining) {
      joinQuiz();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center">
              <Wifi className="h-12 w-12 mx-auto mb-4 text-purple-600 animate-pulse" />
              <p className="text-lg font-medium">Connecting to quiz...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-4">
            <Smartphone className="h-12 w-12 text-purple-600" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Join Quiz
          </CardTitle>
          <div className="mt-4">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full text-lg font-mono font-bold shadow-lg">
              # {quizCode}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {quizInfo && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-green-600 capitalize">{quizInfo.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Players:</span>
                <span className="font-medium">{quizInfo.players?.length || 0} connected</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="playerName" className="text-sm font-medium text-gray-700">
              Enter your name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="playerName"
                type="text"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 h-12 bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                maxLength={20}
                disabled={isJoining}
              />
            </div>
          </div>

          <Button
            onClick={joinQuiz}
            disabled={isJoining || !playerName.trim()}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:opacity-50"
          >
            {isJoining ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Joining...
              </div>
            ) : (
              'Join Quiz'
            )}
          </Button>

          <div className="flex items-center justify-center text-xs text-gray-500 mt-4">
            <AlertCircle className="h-3 w-3 mr-1" />
            Make sure you have a stable internet connection
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
