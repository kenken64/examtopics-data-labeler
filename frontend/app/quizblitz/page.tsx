'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Zap, Timer, Users, ArrowRight, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import QRCode from 'qrcode';

export default function QuizBlitzPage() {
  const [accessCode, setAccessCode] = useState('');
  const [timerDuration, setTimerDuration] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Generate QR code for Telegram bot
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    try {
      const telegramBotUrl = 'https://t.me/CertDevBot';
      const qrDataURL = await QRCode.toDataURL(telegramBotUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#7C3AED', // Purple color
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleContinue = async () => {
    console.log('🚀 QuizBlitz: handleContinue called', { accessCode, timerDuration });
    
    if (!accessCode.trim()) {
      console.log('❌ QuizBlitz: No access code provided');
      toast.error('Please enter an access code');
      return;
    }

    if (timerDuration < 5 || timerDuration > 300) {
      console.log('❌ QuizBlitz: Invalid timer duration', timerDuration);
      toast.error('Timer must be between 5 and 300 seconds');
      return;
    }

    setIsVerifying(true);
    console.log('🔄 QuizBlitz: Starting verification process...');

    try {
      console.log('📡 QuizBlitz: Sending verify request to /api/access-codes/verify');
      
      // Verify access code with authentication
      const response = await fetch(`/api/access-codes/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ accessCode }),
      });

      console.log('📨 QuizBlitz: Received response', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ QuizBlitz: Response not ok', errorText);
        throw new Error('Invalid access code');
      }

      const data = await response.json();
      console.log('✅ QuizBlitz: Verification successful', data);
      
      const hostUrl = `/quizblitz/host?accessCode=${accessCode}&timer=${timerDuration}&questions=${data.questionCount}`;
      console.log('🔗 QuizBlitz: Navigating to', hostUrl);
      
      // Navigate to waiting room with quiz configuration
      router.push(hostUrl);
      
    } catch (error) {
      console.error('💥 QuizBlitz: Verification error', error);
      toast.error('Invalid access code. Please check and try again.');
    } finally {
      setIsVerifying(false);
      console.log('🔄 QuizBlitz: Verification process completed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-full">
              <Zap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            QuizBlitz
          </h1>
          <p className="text-lg text-muted-foreground">
            Create live multiplayer quiz sessions
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - QR Code and Telegram Bot Info */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <QrCode className="h-6 w-6" />
                Join via Telegram Bot
              </CardTitle>
              <CardDescription>
                Scan to access our Telegram bot for joining quizzes
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {/* QR Code */}
              <div className="flex justify-center">
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="Telegram Bot QR Code" 
                    className="rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <QrCode className="h-12 w-12 mx-auto mb-2" />
                      <p>Generating QR Code...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Telegram Bot Link */}
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  Telegram Bot Link:
                </p>
                <a 
                  href="https://t.me/CertDevBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-mono text-sm break-all"
                >
                  t.me/CertDevBot
                </a>
              </div>

              {/* Instructions */}
              <div className="text-left space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-gray-700">How to join via Telegram:</p>
                <ol className="list-decimal list-inside space-y-1 pl-2">
                  <li>Scan QR code or click the link above</li>
                  <li>Start a chat with @CertDevBot</li>
                  <li>Type <code className="bg-gray-200 px-1 rounded">/quizblitz</code></li>
                  <li>Enter the 6-digit quiz code when prompted</li>
                  <li>Join the live quiz session!</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Right Side - Quiz Setup Form */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-semibold">Host a Quiz Session</CardTitle>
              <CardDescription className="text-base">
                Enter your access code and configure the quiz settings
              </CardDescription>
            </CardHeader>

          <CardContent className="space-y-6">
            {/* Generated Access Code Input */}
            <div className="space-y-2">
              <Label htmlFor="accessCode" className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Generated Access Code
              </Label>
              <Input
                id="accessCode"
                type="text"
                placeholder="Enter your generated access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono tracking-wider"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Use the access code generated from your question set
              </p>
            </div>

            {/* Timer Duration Input */}
            <div className="space-y-2">
              <Label htmlFor="timer" className="text-sm font-medium flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Timer Duration (seconds)
              </Label>
              <div className="flex items-center space-x-4">
                <Input
                  id="timer"
                  type="number"
                  min="5"
                  max="300"
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(parseInt(e.target.value) || 30)}
                  className="text-center text-lg font-semibold"
                />
                <div className="flex flex-col text-xs text-muted-foreground">
                  <span>Min: 5s</span>
                  <span>Max: 300s</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Time limit for each question (5-300 seconds)
              </p>
            </div>

            {/* Quick Timer Presets */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Presets</Label>
              <div className="flex gap-2 flex-wrap">
                {[10, 15, 30, 45, 60, 90].map((seconds) => (
                  <Button
                    key={seconds}
                    variant={timerDuration === seconds ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimerDuration(seconds)}
                    className="min-w-[60px]"
                  >
                    {seconds}s
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={handleContinue}
              disabled={isVerifying || !accessCode.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6"
            >
              {isVerifying ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  Continue to Quiz Room
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            {
              icon: Users,
              title: 'Multiplayer',
              description: 'Up to 100 players can join'
            },
            {
              icon: Timer,
              title: 'Timed Questions',
              description: 'Configurable time limits'
            },
            {
              icon: Zap,
              title: 'Real-time',
              description: 'Live results and leaderboard'
            }
          ].map((feature, index) => (
            <Card key={index} className="text-center bg-white/60 backdrop-blur-sm border-0">
              <CardContent className="pt-6">
                <feature.icon className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
