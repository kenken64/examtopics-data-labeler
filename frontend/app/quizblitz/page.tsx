'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Zap, Timer, Users, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function QuizBlitzPage() {
  const [accessCode, setAccessCode] = useState('');
  const [timerDuration, setTimerDuration] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();

  const handleContinue = async () => {
    if (!accessCode.trim()) {
      toast.error('Please enter an access code');
      return;
    }

    if (timerDuration < 5 || timerDuration > 300) {
      toast.error('Timer must be between 5 and 300 seconds');
      return;
    }

    setIsVerifying(true);

    try {
      // Verify access code
      const response = await fetch(`/api/access-codes/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessCode }),
      });

      if (!response.ok) {
        throw new Error('Invalid access code');
      }

      const data = await response.json();
      
      // Navigate to waiting room with quiz configuration
      router.push(`/quizblitz/host?accessCode=${accessCode}&timer=${timerDuration}&questions=${data.questionCount}`);
      
    } catch (error) {
      toast.error('Invalid access code. Please check and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
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

        {/* Main Setup Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-semibold">Host a Quiz Session</CardTitle>
            <CardDescription className="text-base">
              Enter your access code and configure the quiz settings
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Access Code Input */}
            <div className="space-y-2">
              <Label htmlFor="accessCode" className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Access Code
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
