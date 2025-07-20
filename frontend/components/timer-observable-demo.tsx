import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Timer, Play, Pause, RotateCcw, Zap } from 'lucide-react';
import { useTimerObservable, useTimerMilestones } from '@/lib/use-timer-observable';
import { toast } from 'sonner';

export function TimerObservableDemo() {
  const {
    timeRemaining,
    progress,
    isTimerActive,
    isTimerExpired,
    timerSource,
    formattedTime,
    startTimer,
    updateFromSSE,
    stopTimer,
    resetTimer,
    getTimerColor,
    getProgressColor,
    observables
  } = useTimerObservable({
    onTimerExpired: () => {
      toast.success('🎯 Timer Expired!');
    },
    onProgressMilestone: (milestone, state) => {
      toast.info(`🎯 ${milestone}% milestone reached!`);
    },
    enableDebugLogging: true
  });

  const { reachedMilestones, resetMilestones } = useTimerMilestones([25, 50, 75, 90, 95]);

  const handleStartTimer = (duration: number) => {
    resetMilestones();
    startTimer({
      duration,
      questionStartedAt: Date.now(),
      updateInterval: 100
    });
  };

  const handleSSESimulation = () => {
    const randomTime = Math.floor(Math.random() * 30) + 5;
    updateFromSSE(randomTime);
    toast.info(`📡 SSE Update: ${randomTime}s`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            RxJS Observable Timer Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="text-center space-y-4">
            <div className="text-6xl font-mono font-bold">
              <span className={getTimerColor()}>{formattedTime}</span>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Badge variant={isTimerActive ? 'default' : 'secondary'}>
                {isTimerActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline">
                Source: {timerSource.toUpperCase()}
              </Badge>
              {isTimerExpired && (
                <Badge variant="destructive">Expired</Badge>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Milestones */}
          {reachedMilestones.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Reached Milestones:</p>
              <div className="flex flex-wrap gap-2">
                {reachedMilestones.map(milestone => (
                  <Badge key={milestone} variant="secondary">
                    {milestone}%
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              onClick={() => handleStartTimer(30)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              30s
            </Button>
            
            <Button 
              onClick={() => handleStartTimer(60)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              60s
            </Button>
            
            <Button 
              onClick={stopTimer}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!isTimerActive}
            >
              <Pause className="h-4 w-4" />
              Stop
            </Button>
            
            <Button 
              onClick={() => {
                resetTimer();
                resetMilestones();
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          {/* SSE Simulation */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">SSE Simulation (Primary Timer Source):</p>
            <Button 
              onClick={handleSSESimulation}
              variant="secondary"
              className="w-full"
              disabled={!isTimerActive}
            >
              📡 Send Random SSE Update
            </Button>
          </div>

          {/* Observable State Debug */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm font-mono">
            <p><strong>Timer State:</strong></p>
            <p>Time Remaining: {timeRemaining}s</p>
            <p>Progress: {progress.toFixed(2)}%</p>
            <p>Is Active: {isTimerActive.toString()}</p>
            <p>Is Expired: {isTimerExpired.toString()}</p>
            <p>Source: {timerSource}</p>
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Observable Timer Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">✨ Reactive Features:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• RxJS-based observable streams</li>
                <li>• Multiple timer sources (SSE, Synchronized, Fallback)</li>
                <li>• Real-time progress tracking</li>
                <li>• Milestone notifications</li>
                <li>• Automatic error recovery</li>
                <li>• Smooth animations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎯 Smart Prioritization:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• SSE updates (highest priority)</li>
                <li>• Synchronized calculations</li>
                <li>• Fallback timer system</li>
                <li>• Debounced updates</li>
                <li>• Conflict resolution</li>
                <li>• Memory cleanup</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
