import { useState, useEffect, useRef, useCallback } from 'react';
import { Subscription } from 'rxjs';
import { 
  quizTimerObservable, 
  TimerState, 
  QuizTimerConfig 
} from './quiz-timer-observable';

export interface UseTimerObservableOptions {
  onTimerExpired?: () => void;
  onProgressMilestone?: (milestone: number, state: TimerState) => void;
  enableDebugLogging?: boolean;
}

export function useTimerObservable(options: UseTimerObservableOptions = {}) {
  const { 
    onTimerExpired, 
    onProgressMilestone, 
    enableDebugLogging = false 
  } = options;

  const [timerState, setTimerState] = useState<TimerState>(
    quizTimerObservable.getCurrentState()
  );

  const subscriptionsRef = useRef<Subscription[]>([]);
  const previousStateRef = useRef<TimerState>(timerState);

  useEffect(() => {
    if (enableDebugLogging) {
      console.log('🔗 [TIMER-HOOK] Initializing timer observable hook');
    }

    // Clear any existing subscriptions
    subscriptionsRef.current.forEach(sub => sub.unsubscribe());
    subscriptionsRef.current = [];

    // Subscribe to timer state changes
    const timerStateSub = quizTimerObservable.timerState$.subscribe({
      next: (state) => {
        if (enableDebugLogging) {
          console.log('📊 [TIMER-HOOK] Timer state updated:', state);
        }
        
        setTimerState(state);

        // Check for progress milestones
        if (onProgressMilestone && state.progress > previousStateRef.current.progress) {
          const milestones = [25, 50, 75, 90, 95];
          const currentMilestone = milestones.find(m => 
            previousStateRef.current.progress < m && state.progress >= m
          );
          
          if (currentMilestone) {
            onProgressMilestone(currentMilestone, state);
          }
        }

        previousStateRef.current = state;
      },
      error: (error) => {
        console.error('❌ [TIMER-HOOK] Timer state subscription error:', error);
      }
    });

    subscriptionsRef.current.push(timerStateSub);

    // Subscribe to timer expiration events
    if (onTimerExpired) {
      const expiredSub = quizTimerObservable.onTimerExpired$.subscribe({
        next: (state) => {
          if (enableDebugLogging) {
            console.log('⏰ [TIMER-HOOK] Timer expired:', state);
          }
          onTimerExpired();
        },
        error: (error) => {
          console.error('❌ [TIMER-HOOK] Timer expiration subscription error:', error);
        }
      });

      subscriptionsRef.current.push(expiredSub);
    }

    // Cleanup function
    return () => {
      if (enableDebugLogging) {
        console.log('🧹 [TIMER-HOOK] Cleaning up timer subscriptions');
      }
      subscriptionsRef.current.forEach(sub => sub.unsubscribe());
      subscriptionsRef.current = [];
    };
  }, [onTimerExpired, onProgressMilestone, enableDebugLogging]);

  // Timer control functions wrapped in useCallback to prevent infinite re-renders
  const startTimer = useCallback((config: QuizTimerConfig) => {
    if (enableDebugLogging) {
      console.log('▶️ [TIMER-HOOK] Starting timer with config:', config);
    }
    quizTimerObservable.startTimer(config);
  }, [enableDebugLogging]);

  const updateFromSSE = useCallback((timeRemaining: number) => {
    if (enableDebugLogging) {
      console.log('📡 [TIMER-HOOK] Updating timer from SSE:', timeRemaining);
    }
    quizTimerObservable.updateFromSSE(timeRemaining);
  }, [enableDebugLogging]);

  const stopTimer = useCallback(() => {
    if (enableDebugLogging) {
      console.log('⏹️ [TIMER-HOOK] Stopping timer');
    }
    quizTimerObservable.stopTimer();
  }, [enableDebugLogging]);

  const resetTimer = useCallback(() => {
    if (enableDebugLogging) {
      console.log('🔄 [TIMER-HOOK] Resetting timer');
    }
    quizTimerObservable.resetTimer();
  }, [enableDebugLogging]);

  // Derived state helpers
  const isTimerActive = timerState.isActive;
  const isTimerExpired = timerState.isExpired;
  const timeRemaining = timerState.timeRemaining;
  const progress = timerState.progress;
  const timerSource = timerState.source;

  // Format time remaining as MM:SS
  const formattedTime = formatTime(timeRemaining);

  // Get timer status color based on remaining time (wrapped in useCallback)
  const getTimerColor = useCallback((): string => {
    if (isTimerExpired) return 'text-red-600';
    if (timeRemaining <= 10) return 'text-red-500';
    if (timeRemaining <= 30) return 'text-orange-500';
    return 'text-green-600';
  }, [isTimerExpired, timeRemaining]);

  // Get progress bar color (wrapped in useCallback)
  const getProgressColor = useCallback((): string => {
    if (progress >= 95) return 'bg-red-500';
    if (progress >= 75) return 'bg-orange-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  }, [progress]);

  return {
    // Timer state
    timerState,
    timeRemaining,
    progress,
    isTimerActive,
    isTimerExpired,
    timerSource,
    formattedTime,

    // Timer controls
    startTimer,
    updateFromSSE,
    stopTimer,
    resetTimer,

    // UI helpers
    getTimerColor,
    getProgressColor,

    // Raw observables (for advanced usage)
    observables: {
      timerState$: quizTimerObservable.timerState$,
      timeRemaining$: quizTimerObservable.timeRemaining$,
      progress$: quizTimerObservable.progress$,
      isExpired$: quizTimerObservable.isExpired$,
      onTimerExpired$: quizTimerObservable.onTimerExpired$
    }
  };
}

// Helper function to format time as MM:SS
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Hook for timer progress milestones
export function useTimerMilestones(milestones: number[] = [25, 50, 75, 90]) {
  const [reachedMilestones, setReachedMilestones] = useState<number[]>([]);
  
  useEffect(() => {
    const subscriptions: Subscription[] = [];

    milestones.forEach(milestone => {
      const sub = quizTimerObservable.getProgressMilestone$(milestone).subscribe({
        next: (state) => {
          console.log(`🎯 [TIMER-MILESTONE] Reached ${milestone}% progress:`, state);
          setReachedMilestones(prev => 
            prev.includes(milestone) ? prev : [...prev, milestone].sort((a, b) => a - b)
          );
        }
      });
      subscriptions.push(sub);
    });

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [milestones.join(',')]);

  const resetMilestones = () => {
    setReachedMilestones([]);
  };

  return {
    reachedMilestones,
    resetMilestones,
    hasReachedMilestone: (milestone: number) => reachedMilestones.includes(milestone)
  };
}
