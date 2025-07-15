'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Play, Timer, Hash, QrCode, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import QRCode from 'qrcode';
import { useRoomSSE } from '@/lib/use-sse';

interface Player {
  id: string;
  name: string;
  joinedAt: Date;
}

function QuizHostPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [quizCode, setQuizCode] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const socketRef = useRef<Socket | null>(null);

  const accessCode = searchParams.get('accessCode');
  const timer = searchParams.get('timer');
  const questionCount = searchParams.get('questions');

  // Use SSE for real-time player updates instead of polling
  const { players: connectedPlayers, isConnected: sseConnected, error: sseError } = useRoomSSE(quizCode || null);

  useEffect(() => {
    if (!accessCode || !timer) {
      router.push('/quizblitz');
      return;
    }

    // Generate 6-digit quiz code
    const code = Math.random().toString().slice(2, 8);
    setQuizCode(code);

    // Generate QR code for the quiz URL
    generateQRCode(code);

    // Initialize quiz room
    initializeQuizRoom(code);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [accessCode, timer, router]);

  const initializeQuizRoom = async (code: string) => {
    try {
      // Create quiz room in database
      const response = await fetch('/api/quizblitz/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          quizCode: code,
          accessCode,
          timerDuration: parseInt(timer || '30')
          // hostUserId will be set automatically from authenticated user
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create quiz room');
      }

      // SSE will now handle real-time player updates automatically

    } catch (error) {
      console.error('Failed to initialize quiz room:', error);
      toast.error('Failed to create quiz room');
    }
  };

  const copyQuizCode = async () => {
    try {
      await navigator.clipboard.writeText(quizCode);
      setCopied(true);
      toast.success('Quiz code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy quiz code');
    }
  };

  const generateQRCode = async (code: string) => {
    try {
      // Create Telegram bot URL with the quiz code
      const telegramBotUrl = `https://t.me/CertDevBot?start=quiz_${code}`;
      
      // Generate QR code with purple color scheme
      const qrDataUrl = await QRCode.toDataURL(telegramBotUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#7C3AED', // Purple color
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const startQuiz = async () => {
    if (connectedPlayers.length === 0) {
      toast.error('Wait for at least one player to join');
      return;
    }

    setIsStarting(true);

    try {
      // Start quiz session
      const response = await fetch('/api/quizblitz/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          quizCode,
          accessCode,
          timerDuration: parseInt(timer || '30'),
          players: connectedPlayers.map(p => p.id)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start quiz');
      }

      // Navigate to live quiz
      router.push(`/quizblitz/live/${quizCode}?host=true`);

    } catch (error) {
      toast.error('Failed to start quiz');
      setIsStarting(false);
    }
  };

  if (!accessCode || !timer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Quiz Room Ready
          </h1>
          <p className="text-lg text-muted-foreground">
            Share the quiz code with participants
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Quiz Code Display */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Hash className="h-6 w-6" />
                Quiz Code
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              {/* Large Quiz Code */}
              <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-2xl p-8">
                <div className="text-6xl font-bold tracking-wider font-mono">
                  {quizCode}
                </div>
              </div>

              {/* Copy Button */}
              <Button
                onClick={copyQuizCode}
                variant="outline"
                className="w-full"
                disabled={copied}
              >
                {copied ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Quiz Code
                  </>
                )}
              </Button>

              {/* QR Code */}
              <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
                {qrCodeUrl ? (
                  <div className="text-center">
                    <img 
                      src={qrCodeUrl} 
                      alt="Quiz QR Code" 
                      className="mx-auto mb-2 rounded-lg"
                      style={{ maxWidth: '200px', height: 'auto' }}
                    />
                    <p className="text-sm text-gray-600">Scan to join via Telegram bot</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <QrCode className="h-16 w-16 mx-auto mb-2" />
                    <p className="text-sm">Generating QR Code...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quiz Settings & Players */}
          <div className="space-y-6">
            {/* Quiz Settings */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Quiz Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Access Code:</span>
                  <Badge variant="secondary" className="font-mono">
                    {accessCode}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Timer per Question:</span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {timer}s
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Questions:</span>
                  <Badge variant="outline">
                    {questionCount || '0'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Connected Players */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Connected Players ({connectedPlayers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {connectedPlayers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Waiting for players to join...</p>
                    <p className="text-sm mt-1">Share the quiz code above</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectedPlayers.map((player, index) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {player.name[0]}
                        </div>
                        <span className="font-medium">{player.name}</span>
                        <Badge variant="outline" className="ml-auto text-green-600">
                          Ready
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Start Quiz Button */}
            <Button
              onClick={startQuiz}
              disabled={isStarting || connectedPlayers.length === 0}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-lg py-6"
            >
              {isStarting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Starting Quiz...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Start Quiz ({connectedPlayers.length} players)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function QuizHostPageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg font-medium">Loading quiz setup...</p>
      </div>
    </div>
  );
}

// Main component wrapped with Suspense
export default function QuizHostPage() {
  return (
    <Suspense fallback={<QuizHostPageLoading />}>
      <QuizHostPageContent />
    </Suspense>
  );
}
