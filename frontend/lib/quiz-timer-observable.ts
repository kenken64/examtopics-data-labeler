import { 
  Observable, 
  BehaviorSubject, 
  interval, 
  combineLatest, 
  NEVER, 
  timer,
  fromEvent,
  merge,
  of
} from 'rxjs';
import { 
  map, 
  takeUntil, 
  takeWhile, 
  startWith, 
  distinctUntilChanged, 
  filter, 
  switchMap, 
  tap,
  catchError,
  retry,
  share,
  withLatestFrom,
  debounceTime
} from 'rxjs/operators';

export interface TimerState {
  timeRemaining: number;
  duration: number;
  isActive: boolean;
  isExpired: boolean;
  progress: number; // 0-100 percentage
  questionStartedAt: number | null;
  source: 'sse' | 'synchronized' | 'fallback';
}

export interface QuizTimerConfig {
  duration: number;
  questionStartedAt?: number;
  updateInterval?: number; // milliseconds
}

export class QuizTimerObservable {
  private readonly _timerState$ = new BehaviorSubject<TimerState>({
    timeRemaining: 0,
    duration: 0,
    isActive: false,
    isExpired: false,
    progress: 0,
    questionStartedAt: null,
    source: 'fallback'
  });

  private readonly _sseUpdates$ = new BehaviorSubject<{ timeRemaining: number; timestamp: number } | null>(null);
  private readonly _destroy$ = new BehaviorSubject<boolean>(false);
  private readonly _config$ = new BehaviorSubject<QuizTimerConfig | null>(null);

  // Public observables
  public readonly timerState$ = this._timerState$.asObservable();
  public readonly timeRemaining$ = this.timerState$.pipe(
    map(state => state.timeRemaining),
    distinctUntilChanged()
  );
  public readonly progress$ = this.timerState$.pipe(
    map(state => state.progress),
    distinctUntilChanged()
  );
  public readonly isExpired$ = this.timerState$.pipe(
    map(state => state.isExpired),
    distinctUntilChanged()
  );

  constructor() {
    this.setupTimerStream();
  }

  private setupTimerStream(): void {
    console.log('🔧 [TIMER-OBS] Setting up reactive timer stream...');

    // Create the main timer stream that combines SSE updates with synchronized calculations
    const timerStream$ = this._config$.pipe(
      filter(config => config !== null),
      switchMap(config => this.createTimerForConfig(config!)),
      takeUntil(this._destroy$),
      share()
    );

    // Subscribe to update the timer state
    timerStream$.subscribe({
      next: (state) => {
        console.log('📊 [TIMER-OBS] Timer state update:', state);
        this._timerState$.next(state);
      },
      error: (error) => {
        console.error('❌ [TIMER-OBS] Timer stream error:', error);
      }
    });

    console.log('✅ [TIMER-OBS] Reactive timer stream initialized');
  }

  private createTimerForConfig(config: QuizTimerConfig): Observable<TimerState> {
    console.log('🔧 [TIMER-OBS] Creating timer for config:', config);

    const { duration, questionStartedAt, updateInterval = 100 } = config;

    // Create base timer that ticks every updateInterval
    const baseTicker$ = interval(updateInterval).pipe(
      startWith(0),
      map(() => Date.now())
    );

    // SSE updates stream (priority source - always trust SSE over calculations)
    const sseStream$ = this._sseUpdates$.pipe(
      filter(update => update !== null),
      tap(update => console.log('🔧 [TIMER-OBS] SSE update received:', update)),
      map(update => ({
        timeRemaining: update!.timeRemaining,
        timestamp: update!.timestamp,
        source: 'sse' as const
      }))
    );

    // Synchronized timer stream (fallback when no SSE)
    const synchronizedStream$ = baseTicker$.pipe(
      filter(() => questionStartedAt !== undefined),
      map(now => {
        const elapsed = Math.max(0, (now - questionStartedAt!) / 1000);
        const timeRemaining = Math.max(0, Math.ceil(duration - elapsed));
        return {
          timeRemaining,
          timestamp: now,
          source: 'synchronized' as const
        };
      })
    );

    // Fallback timer stream (when no sync data available)
    const fallbackStream$ = this._timerState$.pipe(
      filter(state => !questionStartedAt),
      switchMap(currentState => 
        interval(1000).pipe(
          startWith(0),
          map(tick => ({
            timeRemaining: Math.max(0, currentState.timeRemaining - tick),
            timestamp: Date.now(),
            source: 'fallback' as const
          }))
        )
      )
    );

    // Combine all timer sources with simplified prioritization: SSE is authoritative
    const combinedStream$ = merge(
      sseStream$, // Primary source - SSE updates from backend
      synchronizedStream$.pipe(
        // Only use when no recent SSE data
        debounceTime(500), // Reduce noise
        filter(() => {
          const lastSSE = this._sseUpdates$.value;
          const hasRecentSSE = lastSSE && (Date.now() - lastSSE.timestamp) < 3000;
          return !hasRecentSSE; // Only use when SSE is stale
        })
      ),
      fallbackStream$ // Rarely used fallback
    ).pipe(
      // Take updates until timer expires
      takeWhile(update => update.timeRemaining > 0, true),
      // Add debouncing to prevent excessive updates
      debounceTime(50),
      // Convert to TimerState
      map(update => {
        const progress = duration > 0 ? Math.max(0, Math.min(100, ((duration - update.timeRemaining) / duration) * 100)) : 0;
        
        const state: TimerState = {
          timeRemaining: update.timeRemaining,
          duration,
          isActive: update.timeRemaining > 0,
          isExpired: update.timeRemaining <= 0,
          progress,
          questionStartedAt: questionStartedAt ?? null,
          source: update.source
        };

        return state;
      }),
      // Error handling with retry
      catchError(error => {
        console.error('❌ [TIMER-OBS] Timer calculation error:', error);
        // Return current state on error
        return of(this._timerState$.value);
      }),
      retry(3)
    );

    return combinedStream$;
  }

  // Start timer with configuration
  public startTimer(config: QuizTimerConfig): void {
    console.log('🔧 [TIMER-OBS] Starting timer with config:', config);
    
    // Validate configuration
    if (config.duration <= 0) {
      console.warn('⚠️ [TIMER-OBS] Invalid timer duration, using default 30 seconds');
      config.duration = 30;
    }

    this._config$.next(config);
  }

  // Update timer with SSE data (highest priority)
  public updateFromSSE(timeRemaining: number): void {
    console.log('📡 [TIMER-OBS] SSE timer update:', timeRemaining);
    this._sseUpdates$.next({
      timeRemaining,
      timestamp: Date.now()
    });
  }

  // Stop timer
  public stopTimer(): void {
    console.log('⏹️ [TIMER-OBS] Stopping timer');
    this._config$.next(null);
    this._sseUpdates$.next(null);
  }

  // Reset timer state
  public resetTimer(): void {
    console.log('🔄 [TIMER-OBS] Resetting timer');
    this.stopTimer();
    this._timerState$.next({
      timeRemaining: 0,
      duration: 0,
      isActive: false,
      isExpired: false,
      progress: 0,
      questionStartedAt: null,
      source: 'fallback'
    });
  }

  // Get current timer state
  public getCurrentState(): TimerState {
    return this._timerState$.value;
  }

  // Observable for timer expiration events
  public get onTimerExpired$(): Observable<TimerState> {
    return this.timerState$.pipe(
      filter(state => state.isExpired),
      distinctUntilChanged((prev, curr) => prev.isExpired === curr.isExpired)
    );
  }

  // Observable for timer progress milestones (25%, 50%, 75%, etc.)
  public getProgressMilestone$(milestone: number): Observable<TimerState> {
    return this.timerState$.pipe(
      filter(state => state.progress >= milestone),
      distinctUntilChanged((prev, curr) => 
        Math.floor(prev.progress / milestone) === Math.floor(curr.progress / milestone)
      )
    );
  }

  // Destroy the service
  public destroy(): void {
    console.log('💥 [TIMER-OBS] Destroying timer observable service');
    this._destroy$.next(true);
    this._destroy$.complete();
    this._timerState$.complete();
    this._sseUpdates$.complete();
    this._config$.complete();
  }
}

// Create a singleton instance for the quiz timer
export const quizTimerObservable = new QuizTimerObservable();

// React hook for using the quiz timer observable
export function useQuizTimerObservable() {
  return {
    timerObservable: quizTimerObservable,
    // Convenience methods
    startTimer: (config: QuizTimerConfig) => quizTimerObservable.startTimer(config),
    updateFromSSE: (timeRemaining: number) => quizTimerObservable.updateFromSSE(timeRemaining),
    stopTimer: () => quizTimerObservable.stopTimer(),
    resetTimer: () => quizTimerObservable.resetTimer(),
    getCurrentState: () => quizTimerObservable.getCurrentState(),
    // Observables
    timerState$: quizTimerObservable.timerState$,
    timeRemaining$: quizTimerObservable.timeRemaining$,
    progress$: quizTimerObservable.progress$,
    isExpired$: quizTimerObservable.isExpired$,
    onTimerExpired$: quizTimerObservable.onTimerExpired$
  };
}
