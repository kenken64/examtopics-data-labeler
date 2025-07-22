import { useState, useEffect, useRef, useCallback } from 'react';

export interface TimerConfig {
  duration: number; // Total duration in seconds
  questionStartedAt?: number; // Timestamp when question started
  updateInterval?: number; // Update frequency in milliseconds (default: 1000)
}

export interface TimerState {
  timeRemaining: number;
  progress: number; // 0-100 percentage
  isActive: boolean;
  isExpired: boolean;
  source: 'hook' | 'sse' | 'sync';
  totalDuration: number;
}

export interface UseTimerOptions {
  onTimerExpired?: () => void;
  onProgressMilestone?: (milestone: number, state: TimerState) => void;
  enableDebugLogging?: boolean;
}

export function useTimer(options: UseTimerOptions = {}) {
  const { 
    onTimerExpired, 
    onProgressMilestone, 
    enableDebugLogging = false 
  } = options;

  // Timer state
  const [timerState, setTimerState] = useState<TimerState>({
    timeRemaining: 0,
    progress: 0,
    isActive: false,
    isExpired: false,
    source: 'hook',
    totalDuration: 0
  });

  // Refs for managing intervals and callbacks
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<TimerConfig | null>(null);
  const previousProgressRef = useRef<number>(0);
  const callbacksRef = useRef({ onTimerExpired, onProgressMilestone });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onTimerExpired, onProgressMilestone };
  }, [onTimerExpired, onProgressMilestone]);

  // Clear interval helper
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Update timer state helper
  const updateTimerState = useCallback((updates: Partial<TimerState>) => {
    setTimerState(prev => {
      const newState = { ...prev, ...updates };
      
      if (enableDebugLogging) {
        console.log('⏰ [TIMER-HOOK] State updated:', newState);
      }

      // Check for progress milestones
      if (callbacksRef.current.onProgressMilestone && newState.progress > previousProgressRef.current) {
        const milestones = [25, 50, 75, 90, 95];
        const reachedMilestone = milestones.find(m => 
          previousProgressRef.current < m && newState.progress >= m
        );
        
        if (reachedMilestone) {
          callbacksRef.current.onProgressMilestone(reachedMilestone, newState);
        }
      }

      // Check for timer expiration
      if (!prev.isExpired && newState.isExpired && callbacksRef.current.onTimerExpired) {
        if (enableDebugLogging) {
          console.log('⏰ [TIMER-HOOK] Timer expired - calling callback');
        }
        callbacksRef.current.onTimerExpired();
      }

      previousProgressRef.current = newState.progress;
      return newState;
    });
  }, [enableDebugLogging]);

  // Calculate time remaining and progress from current time
  const calculateCurrentState = useCallback((config: TimerConfig, source: TimerState['source'] = 'hook'): Partial<TimerState> => {
    const now = Date.now();
    const startTime = config.questionStartedAt || now;
    const elapsed = Math.max(0, (now - startTime) / 1000);
    const timeRemaining = Math.max(0, config.duration - elapsed);
    const progress = Math.min(100, (elapsed / config.duration) * 100);
    const isExpired = timeRemaining <= 0;

    return {
      timeRemaining: Math.floor(timeRemaining),
      progress: Math.round(progress),
      isExpired,
      source,
      totalDuration: config.duration
    };
  }, []);

  // Start timer function
  const startTimer = useCallback((config: TimerConfig) => {
    if (enableDebugLogging) {
      console.log('▶️ [TIMER-HOOK] Starting timer with config:', config);
    }

    // Clear any existing timer
    clearTimerInterval();
    
    // Store config
    configRef.current = config;
    
    // Calculate initial state
    const initialState = calculateCurrentState(config, 'hook');
    
    // Update state
    updateTimerState({
      ...initialState,
      isActive: true
    });

    // Set up interval for updates
    const updateInterval = config.updateInterval || 1000;
    intervalRef.current = setInterval(() => {
      if (configRef.current) {
        const currentState = calculateCurrentState(configRef.current, 'hook');
        
        updateTimerState({
          ...currentState,
          isActive: !currentState.isExpired
        });

        // Stop interval if expired
        if (currentState.isExpired) {
          clearTimerInterval();
        }
      }
    }, updateInterval);

  }, [enableDebugLogging, clearTimerInterval, calculateCurrentState, updateTimerState]);

  // Update from SSE (sync with server time)
  const updateFromSSE = useCallback((timeRemaining: number) => {
    if (enableDebugLogging) {
      console.log('📡 [TIMER-HOOK] Updating from SSE:', timeRemaining);
    }

    if (!configRef.current) {
      console.warn('⚠️ [TIMER-HOOK] No timer config available for SSE update');
      return;
    }

    const progress = Math.min(100, ((configRef.current.duration - timeRemaining) / configRef.current.duration) * 100);
    const isExpired = timeRemaining <= 0;

    updateTimerState({
      timeRemaining: Math.floor(timeRemaining),
      progress: Math.round(progress),
      isExpired,
      source: 'sse',
      isActive: !isExpired
    });

    // Stop local timer if expired
    if (isExpired) {
      clearTimerInterval();
    }
  }, [enableDebugLogging, updateTimerState, clearTimerInterval]);

  // Stop timer function
  const stopTimer = useCallback(() => {
    if (enableDebugLogging) {
      console.log('⏹️ [TIMER-HOOK] Stopping timer');
    }

    clearTimerInterval();
    updateTimerState({
      isActive: false
    });
  }, [enableDebugLogging, clearTimerInterval, updateTimerState]);

  // Reset timer function
  const resetTimer = useCallback(() => {
    if (enableDebugLogging) {
      console.log('🔄 [TIMER-HOOK] Resetting timer');
    }

    clearTimerInterval();
    configRef.current = null;
    previousProgressRef.current = 0;
    
    setTimerState({
      timeRemaining: 0,
      progress: 0,
      isActive: false,
      isExpired: false,
      source: 'hook',
      totalDuration: 0
    });
  }, [enableDebugLogging, clearTimerInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimerInterval();
    };
  }, [clearTimerInterval]);

  // Derived state helpers
  const { timeRemaining, progress, isActive, isExpired, source, totalDuration } = timerState;

  // Format time remaining as MM:SS
  const formattedTime = formatTime(timeRemaining);

  // Get timer status color based on remaining time
  const getTimerColor = useCallback((): string => {
    if (isExpired) return 'text-red-600';
    if (timeRemaining <= 10) return 'text-red-500';
    if (timeRemaining <= 30) return 'text-orange-500';
    return 'text-green-600';
  }, [isExpired, timeRemaining]);

  // Get progress bar color
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
    isActive,
    isExpired,
    source,
    totalDuration,
    formattedTime,

    // Timer controls
    startTimer,
    updateFromSSE,
    stopTimer,
    resetTimer,

    // UI helpers
    getTimerColor,
    getProgressColor
  };
}

// Helper function to format time as MM:SS
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Hook for tracking timer progress milestones
export function useTimerMilestones(milestones: number[] = [25, 50, 75, 90]) {
  const [reachedMilestones, setReachedMilestones] = useState<number[]>([]);
  
  const resetMilestones = useCallback(() => {
    setReachedMilestones([]);
  }, []);

  const checkMilestone = useCallback((progress: number) => {
    milestones.forEach(milestone => {
      if (progress >= milestone && !reachedMilestones.includes(milestone)) {
        setReachedMilestones(prev => 
          prev.includes(milestone) ? prev : [...prev, milestone].sort((a, b) => a - b)
        );
      }
    });
  }, [milestones, reachedMilestones]);

  const hasReachedMilestone = useCallback((milestone: number) => {
    return reachedMilestones.includes(milestone);
  }, [reachedMilestones]);

  return {
    reachedMilestones,
    resetMilestones,
    hasReachedMilestone,
    checkMilestone
  };
}