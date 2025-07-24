'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Timer, Users, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSessionSSE } from '@/lib/use-sse';
import { useQuizEvents } from '@/lib/use-quiz-events';
import { useTimer, useTimerMilestones } from '@/lib/use-timer-hook';

interface Question {
  _id: string;
  question: string;
  options: { [key: string]: string };
  correctAnswer: string;
  explanation: string;
  difficulty: string;
}

interface Player {
  id: string;
  name: string;
  score: number;
  currentAnswer?: string;
  hasAnswered?: boolean;
  source?: string; // 'web' or 'telegram'
}

interface QuestionResult {
  correctAnswer: string;
  explanation: string;
  playerAnswers: { [playerId: string]: string };
  leaderboard: Player[];
}

// Utility function to validate timer duration and handle NaN values
const validateTimerDuration = (duration: any, context: string = 'unknown'): number => {
  if (isNaN(duration) || duration == null || duration <= 0) {
    console.warn(`🔧 WARN: [FRONTEND] Invalid timer duration in ${context}, using default 30 seconds. Received:`, duration);
    return 30; // Default fallback
  }
  return Number(duration);
};

function LiveQuizPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const quizCode = params.quizCode as string;
  const isHost = searchParams.get('host') === 'true';
  const currentPlayerId = searchParams.get('playerId'); // Get current player ID
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizStatus, setQuizStatus] = useState<string>('waiting');
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null); // Synchronized timestamp
  const [timerDuration, setTimerDuration] = useState<number>(30); // Store timer duration for sync calculations
  
  const nextQuestionInProgress = useRef<boolean>(false); // Add debouncing flag

  // Define handleTimeUp before useEffect that depends on it
  const handleTimeUp = useCallback(async () => {
    // Don't process time up if quiz is already finished
    if (quizFinished) {
      console.log('⏸️ [FRONTEND-TIMER] Ignoring handleTimeUp call - quiz already finished');
      return;
    }

    // Timer up logic should proceed regardless of answer status
    console.log('⏰ [FRONTEND-TIMER] Time up! Processing...');
    console.log('🔧 DEBUG: [FRONTEND-TIMER] Current state:', {
      questionIndex: questionIndex + 1,
      totalQuestions,
      hasAnswered,
      showResults
    });
    
    // Auto-submit empty answer if not answered yet
    if (!hasAnswered) {
      setHasAnswered(true);
      console.log('📝 [FRONTEND-TIMER] Auto-submitting empty answer...');
    }
    
    // Check if this is the last question (7/7)
    const isLastQuestion = questionIndex + 1 >= totalQuestions;
    
    if (isLastQuestion) {
      console.log('🏁 [FRONTEND-TIMER] Last question completed! Waiting for backend quiz_ended event...');
      // Don't set quiz finished here - wait for backend quiz_ended event
      // The backend timer service will send quiz_ended event after processing final question
      // This prevents race conditions between frontend and backend quiz completion
      console.log('⏳ [FRONTEND-TIMER] Backend should send quiz_ended event shortly...');
      
      // Fallback: If no quiz_ended event arrives within 10 seconds, force completion
      setTimeout(() => {
        if (!quizFinished) {
          console.warn('⚠️ [FRONTEND-TIMER] No quiz_ended event received, forcing quiz completion');
          setQuizFinished(true);
          setShowResults(false);
          setQuestionResult(null);
          
          stopTimer(); // Stop timer hook
        }
      }, 10000);
    } else {
      console.log('⏭️ [FRONTEND-TIMER] Not last question - skipping results display, waiting for next question...');
      // SKIP showing results - just wait for backend timer service to send next question
      // The quiz timer service will automatically advance after 5 seconds
      // The backend timer service will send a new question_started event
      // The onQuestionStarted handler will reset the state for the next question
      
      // Set a simple "waiting for next question" state
      setShowResults(false);
      setQuestionResult(null);
      
      console.log('⏱️ [FRONTEND-TIMER] Backend timer service should send next question in 5 seconds...');
    }
  }, [quizFinished, questionIndex, totalQuestions, hasAnswered, showResults]);

  // Define timer callbacks with useCallback to prevent recreation
  const onTimerExpired = useCallback(() => {
    console.log('⏰ [FRONTEND-TIMER] Timer expired callback triggered');
    handleTimeUp();
  }, [handleTimeUp]);

  // Timer milestones for additional feedback
  const { reachedMilestones, resetMilestones, checkMilestone } = useTimerMilestones([25, 50, 75, 90, 95]);

  const onProgressMilestone = useCallback((milestone: number, state: any) => {
    console.log(`🎯 [FRONTEND-TIMER] Timer reached ${milestone}% milestone:`, state);
    if (milestone === 90) {
      toast.warning('⏰ Only 10% time remaining!');
    } else if (milestone === 95) {
      toast.error('🚨 Time almost up!');
    }
    // Update milestones tracker
    checkMilestone(state.progress);
  }, [checkMilestone]);

  // Initialize React hook-based timer system
  const {
    timeRemaining,
    progress,
    isActive: isTimerActive,
    isExpired: isTimerExpired,
    source: timerSource,
    formattedTime,
    startTimer,
    updateFromSSE,
    stopTimer,
    resetTimer,
    getTimerColor,
    getProgressColor
  } = useTimer({
    onTimerExpired,
    onProgressMilestone,
    enableDebugLogging: true
  });

  // Use SSE for real-time quiz session updates instead of polling
  const { sessionData, isConnected: sseConnected, error: sseError, disconnect: disconnectSSE } = useSessionSSE(quizCode || null);

  // Update component state when SSE data changes
  useEffect(() => {
    if (sessionData) {
      console.log('🔧 DEBUG: [FRONTEND] SSE data received:', {
        status: sessionData.status,
        currentQuestion: !!sessionData.currentQuestion,
        questionIndex: sessionData.currentQuestionIndex,
        timeRemaining: sessionData.timeRemaining,
        questionStartedAt: sessionData.questionStartedAt,
        timerDuration: sessionData.timerDuration,
        isQuizCompleted: sessionData.isQuizCompleted
      });

      // Don't update question state if quiz is already finished (prevents back-and-forth transitions)
      if (!quizFinished) {
        setCurrentQuestion(sessionData.currentQuestion);
        setQuestionIndex(sessionData.currentQuestionIndex);
        setTotalQuestions(sessionData.totalQuestions);
        setQuizStatus(sessionData.status);
        
        // CRITICAL: Update timer from SSE using hook system
        if (sessionData.timeRemaining !== undefined) {
          console.log('⏰ [FRONTEND-TIMER] SSE timer update (primary source):', sessionData.timeRemaining);
          updateFromSSE(sessionData.timeRemaining);
        }
        
        // Store timing metadata for sync calculations
        if (sessionData.timerDuration) {
          setTimerDuration(sessionData.timerDuration);
        }
        
        if (sessionData.questionStartedAt) {
          setQuestionStartedAt(new Date(sessionData.questionStartedAt).getTime());
          console.log('🔧 DEBUG: [FRONTEND] Synchronized start time from SSE:', new Date(sessionData.questionStartedAt).toISOString());
        }
      }
      
      // Always update players (for leaderboard on completion page)
      setPlayers(sessionData.players || []);
      
      // Handle quiz completion from SSE
      if (sessionData.isQuizCompleted && !quizFinished) {
        console.log('🏁 [FRONTEND-TIMER] Quiz completion detected via SSE');
        stopTimer(); // Stop timer hook
      }
      
      // Only update quizFinished if we're not already finished (prevent back-and-forth transitions)
      if (!quizFinished) {
        setQuizFinished(sessionData.isQuizCompleted || false);
      }
      setLoading(false);

      // Start synchronized timer if we have complete timing data
      if (!quizFinished && sessionData.status === 'active' && sessionData.currentQuestion && sessionData.questionStartedAt && sessionData.timerDuration) {
        console.log('🔧 DEBUG: [FRONTEND-TIMER] Starting synchronized timer from SSE data');
        startTimer({
          duration: sessionData.timerDuration,
          questionStartedAt: new Date(sessionData.questionStartedAt).getTime(),
          updateInterval: 100 // Update every 100ms for smooth progress
        });
      }
    }
  }, [sessionData, quizFinished, startTimer, updateFromSSE, stopTimer]);

  // Disconnect SSE when quiz is finished to prevent unnecessary data transmission
  useEffect(() => {
    if (quizFinished && sseConnected) {
      console.log('🔌 [FRONTEND] Quiz finished - disconnecting SSE to save resources');
      disconnectSSE();
    }
  }, [quizFinished, sseConnected, disconnectSSE]);

  // Handle timer expiration - show results when timer reaches 0
  useEffect(() => {
    if (timeRemaining === 0 && currentQuestion && !showResults && !quizFinished) {
      console.log('⏰ Timer expired! Showing question results...');
      handleTimeUp();
    }
  }, [timeRemaining, currentQuestion, showResults, quizFinished, handleTimeUp]);

  // Real-time quiz event sync (MongoDB Change Streams)
  useQuizEvents(quizCode, {
    onQuestionStarted: (question) => {
      // Prevent processing new questions if quiz is already finished
      if (quizFinished) {
        console.log('⏸️ [FRONTEND] Ignoring question started event - quiz already finished');
        return;
      }
      
      console.log('🔧 DEBUG: [FRONTEND] onQuestionStarted called:', {
        questionIndex: question.questionIndex,
        question: question.question?.substring(0, 50) + '...',
        timeLimit: question.timeLimit
      });
      
      console.log('🔧 DEBUG: [FRONTEND] Current state before update:', {
        showResults,
        currentQuestion: currentQuestion?.question?.substring(0, 50) + '...',
        questionIndex,
        timeRemaining
      });
      
      // Reset timer observables for new question
      resetTimer();
      resetMilestones();
      
      // Reset state for new question
      setCurrentQuestion(question);
      setQuestionIndex(question.questionIndex);
      setSelectedAnswer('');
      setHasAnswered(false);
      setShowResults(false); // Ensure results are hidden
      setQuestionResult(null); // Clear previous results
      
      // Validate and set timer duration with NaN protection
      const validTimer = validateTimerDuration(question.timeLimit, 'onQuestionStarted');
      
      console.log('🔧 DEBUG: [FRONTEND-TIMER] Question state updated, starting timer');
      
      // Start timer for the new question
      startTimer({
        duration: validTimer,
        questionStartedAt: questionStartedAt ?? undefined,
        updateInterval: 100
      });
      
      console.log('✅ [FRONTEND] onQuestionStarted processing complete');
    },
    onTimerUpdate: (data) => {
      // DISABLED: SSE is now the primary timer source (every 1 second, synchronized)
      // Change Streams timer updates are slower and cause conflicts
      console.log('⚠️ [FRONTEND] Ignoring Change Streams timer update - SSE is primary timer source');
      console.log('🔧 DEBUG: [FRONTEND] Change Streams timer data (ignored):', typeof data === 'number' ? data : data?.timeRemaining);
      return;
    },
    onQuestionEnded: (data) => {
      // Prevent processing question ended events if quiz is already finished
      if (quizFinished) {
        console.log('⏸️ [FRONTEND] Ignoring question ended event - quiz already finished');
        return;
      }
      
      console.log('🔧 DEBUG: [FRONTEND] onQuestionEnded called - skipping results display:', {
        correctAnswer: data.results?.correctAnswer,
        hasResults: !!data.results,
        leaderboardCount: data.results?.leaderboard?.length || 0
      });
      
      // SKIP showing results - go directly to waiting for next question
      console.log('⏭️ [FRONTEND] Skipping question results display - waiting for next question...');
      
      // Just clear any existing results state
      setShowResults(false);
      setQuestionResult(null);
      
      // The next question will arrive via onQuestionStarted handler
      console.log('⏱️ [FRONTEND] Next question should arrive via onQuestionStarted handler');
    },
    onQuizEnded: (data) => {
      console.log('🏁 [FRONTEND-TIMER] Quiz ended event received, cleaning up and navigating to completion');
      
      stopTimer(); // Stop timer hook
      
      // Set final state
      setQuizFinished(true);
      setShowResults(false);
      setQuestionResult(null);
      
      console.log('✅ [FRONTEND] Quiz completion page should now display');
    }
  });

  useEffect(() => {
    if (!quizCode) {
      router.push('/quizblitz');
      return;
    }

    // Cleanup timer on unmount
    return () => {
      console.log('🧹 [FRONTEND-TIMER] Component unmounting, cleaning up timer');
      stopTimer();
      resetTimer();
    };
  }, [quizCode, router, stopTimer, resetTimer]);

  const submitAnswer = async (answer: string) => {
    try {
      const response = await fetch('/api/quizblitz/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizCode,
          questionIndex,
          answer: answer,
          playerId: currentPlayerId || 'current-player-id',
          timestamp: Date.now()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      console.log('✅ [FRONTEND-TIMER] Answer submitted successfully:', answer);
      if (answer) {
        toast.success('Answer submitted!');
      }

    } catch (error) {
      console.error('❌ [FRONTEND-TIMER] Failed to submit answer:', error);
      toast.error('Failed to submit answer');
    }
  };

  const handleAnswerSelection = async (answer: string) => {
    if (hasAnswered) return;

    setSelectedAnswer(answer);
    setHasAnswered(true);

    await submitAnswer(answer);
  };

  // REMOVED: showQuestionResults function - no longer showing results
  // Results display has been disabled to streamline the quiz experience

  const nextQuestion = async () => {
    // Debouncing: Prevent multiple simultaneous calls
    if (nextQuestionInProgress.current) {
      console.log('⏸️ Next question already in progress, skipping...');
      return;
    }
    
    nextQuestionInProgress.current = true;
    
    try {
      // Call API to move to next question
      const response = await fetch('/api/quizblitz/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizCode: quizCode,
          action: 'next-question'
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle race condition gracefully
        if (response.status === 409) {
          console.log('⚠️ Quiz state changed by another process, refreshing...');
          return; // Let the timer service handle the update
        }
        throw new Error(data.error || 'Failed to advance question');
      }

      if (data.action === 'quiz-finished') {
        // Quiz finished - clean up timers and navigate to completion
        console.log('🏁 [FRONTEND-TIMER] Quiz finished via nextQuestion API');
        
        stopTimer(); // Stop timer hook
        
        setQuizFinished(true);
        return;
      }

      if (data.action === 'question-changed') {
        // Update to next question
        setCurrentQuestion(data.currentQuestion);
        setQuestionIndex(data.currentQuestionIndex);
        setTotalQuestions(data.totalQuestions);
        setSelectedAnswer('');
        setHasAnswered(false);
        setShowResults(false);
        setQuestionResult(null);

        // Start timer for new question with NaN validation
        const validatedDuration = validateTimerDuration(data.timerDuration, 'nextQuestion');
        startTimer({
          duration: validatedDuration,
          questionStartedAt: Date.now(),
          updateInterval: 100
        });
        
        console.log(`📝 Advanced to question ${data.currentQuestionIndex + 1}/${data.totalQuestions}`);
      }

    } catch (error) {
      console.error('Failed to advance question:', error);
      toast.error('Failed to load next question');
    } finally {
      // Reset debouncing flag
      nextQuestionInProgress.current = false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Waiting room state - show players waiting for host to start
  if (quizStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge variant="outline" className="font-mono mb-4">
              Quiz Code: {quizCode}
            </Badge>
            <h1 className="text-3xl font-bold mb-2">Waiting for Host</h1>
            <p className="text-muted-foreground">
              The quiz will start when the host begins the session
            </p>
          </div>

          {/* Players Waiting */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Players Ready ({players.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No players have joined yet</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {players.map((player, index) => (
                    <div 
                      key={player.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">
                          {player.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-sm">{player.name}</span>
                      <div className="ml-auto">
                        <Badge variant="outline" className="text-xs">
                          Ready
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Waiting Animation */}
          <div className="text-center mt-8">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm">Waiting for quiz to start...</span>
            </div>
          </div>

          {/* Host Instructions */}
          {isHost && (
            <Card className="mt-6 bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-blue-800 font-medium mb-2">
                    You are the host!
                  </p>
                  <p className="text-blue-600 text-sm">
                    Start the quiz from your host dashboard when ready
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (quizFinished) {
    // Calculate current player stats
    const currentPlayer = players.find(p => p.id === currentPlayerId) || { name: 'You', score: 0 };
    const totalPlayers = players.length;
    const sortedPlayers = players.sort((a, b) => b.score - a.score);
    const currentPlayerRank = sortedPlayers.findIndex(p => p.id === currentPlayerId) + 1;
    const correctAnswers = Math.floor(currentPlayer.score / 100); // Assuming 100 points per correct answer
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Trophy className="h-20 w-20 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-5xl font-bold mb-2">Quiz Complete!</h1>
            <p className="text-xl text-muted-foreground">Here are your final results</p>
          </div>

          <div className="max-w-2xl mx-auto mb-8">
            {/* Final Leaderboard */}
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Quiz Code</p>
                  <p className="text-lg font-mono font-bold bg-gray-100 px-3 py-1 rounded-md inline-block">
                    {quizCode}
                  </p>
                </div>
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Trophy className="h-6 w-6" />
                  Final Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedPlayers.slice(0, 10).map((player, index) => (
                    <div key={player.id} className={`flex items-center gap-3 p-3 rounded-lg ${
                      player.id === currentPlayerId ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium flex-1 text-left">
                        {player.name} {player.id === currentPlayerId && '(You)'}
                      </span>
                      <Badge variant="outline" className="font-mono">
                        {player.score} pts
                      </Badge>
                    </div>
                  ))}
                  {players.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No players data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center space-y-4">
            <p className="text-lg text-muted-foreground">
              Thank you for playing! 🎉
            </p>
            <Button
              onClick={() => router.push('/quizblitz')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              size="lg"
            >
              Play Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // REMOVED: Question results view - skip showing results, go directly to next question
  // if (showResults && questionResult) {
  //   return <ResultsView />; // This view has been removed
  // }

  // Skip results display entirely - results are handled by the backend timer service
  // Questions will automatically advance when timer expires via useQuizEvents

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Quiz Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="font-mono">
              Quiz: {quizCode}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Question {questionIndex + 1} of {totalQuestions}
            </span>
          </div>
          
          {/* Timer */}
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span className={`font-mono text-lg font-bold ${getTimerColor()}`}>
              {formattedTime}
            </span>
            {timerSource !== 'sse' && (
              <Badge variant="secondary" className="text-xs">
                {timerSource.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3 mb-6">
          {/* Question Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Quiz Progress</span>
              <span>Question {questionIndex + 1} of {totalQuestions}</span>
            </div>
            <Progress 
              value={(questionIndex / totalQuestions) * 100} 
              className="h-2"
            />
          </div>
          
          {/* Timer Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Time Progress</span>
              <span className={getTimerColor()}>{progress.toFixed(1)}%</span>
            </div>
            <Progress 
              value={progress} 
              className={`h-1 ${getProgressColor()}`}
            />
            {reachedMilestones.length > 0 && (
              <div className="flex gap-1">
                {reachedMilestones.map(milestone => (
                  <Badge key={milestone} variant="secondary" className="text-xs">
                    {milestone}%
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Question and Player Progress Side by Side */}
        <div className="grid xl:grid-cols-5 lg:grid-cols-3 gap-8">
          {/* Question Card - Takes up 3/5 of the space on XL screens, 2/3 on large screens */}
          <div className="xl:col-span-3 lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm min-h-[500px]">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl leading-relaxed">
                  {currentQuestion?.question}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Answer Options */}
                <div className="grid gap-4">
                  {currentQuestion?.options && Object.entries(currentQuestion.options).map(([key, value]) => (
                    <Button
                      key={key}
                      variant={selectedAnswer === key ? "default" : "outline"}
                      className={`p-6 h-auto text-left justify-start whitespace-normal break-words min-h-[4rem] w-full text-base ${
                        selectedAnswer === key 
                          ? 'bg-blue-600 text-white' 
                          : 'hover:bg-blue-50'
                      }`}
                      onClick={() => handleAnswerSelection(key)}
                      disabled={hasAnswered}
                    >
                      <div className="flex items-start gap-4 w-full">
                        <span className="font-bold flex-shrink-0 text-lg">{key}.</span>
                        <span className="break-words text-left leading-relaxed">{value}</span>
                      </div>
                    </Button>
                  ))}
                </div>

                {/* Answer Status */}
                <div className="text-center pt-6 border-t">
                  {timeRemaining === 0 && !hasAnswered ? (
                    <div className="inline-flex items-center gap-2 px-8 py-4 bg-yellow-100 text-yellow-800 rounded-lg text-lg">
                      <Timer className="h-6 w-6" />
                      Time&apos;s up! Waiting for next question...
                    </div>
                  ) : !hasAnswered ? (
                    <div className="inline-flex items-center gap-2 px-8 py-4 bg-blue-100 text-blue-800 rounded-lg text-lg">
                      <Timer className="h-6 w-6" />
                      Select your answer above
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Players Progress - Takes up 2/5 of the space on XL screens, 1/3 on large screens */}
          <div className="xl:col-span-2 lg:col-span-1 min-w-[280px]">
            <Card className="bg-white/80 backdrop-blur-sm h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  Players Progress
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  {players.filter(p => p.hasAnswered).length}/{players.length} completed
                </div>
                {players.length > 0 && (
                  <div className="mt-3">
                    <Progress 
                      value={(players.filter(p => p.hasAnswered).length / players.length) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((players.filter(p => p.hasAnswered).length / players.length) * 100)}% completed
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 overflow-auto max-h-[600px]">
                {players.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No players connected</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {players.map((player) => (
                      <div 
                        key={player.id} 
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
                          player.hasAnswered 
                            ? 'bg-green-50 border-green-200 shadow-sm' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                          player.hasAnswered 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {player.hasAnswered ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <span className="text-xs font-bold">
                              {player.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm break-words">
                              {player.name}
                            </span>
                            {player.source === 'telegram' && (
                              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-600 flex-shrink-0">
                                📱 TG
                              </Badge>
                            )}
                          </div>
                          <span className={`text-xs leading-tight ${
                            player.hasAnswered ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {player.hasAnswered 
                              ? (player.source === 'telegram' ? 'Answered via Telegram' : 'Answered') 
                              : (player.source === 'telegram' ? 'Answering via Telegram...' : 'Thinking...')
                            }
                          </span>
                        </div>
                        {player.hasAnswered && (
                          <div className="flex-shrink-0">
                            <Badge variant="outline" className="text-xs bg-white border-green-200">
                              ✓
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function LiveQuizPageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg font-medium">Loading quiz...</p>
      </div>
    </div>
  );
}

// Main component wrapped with Suspense
export default function LiveQuizPage() {
  return (
    <Suspense fallback={<LiveQuizPageLoading />}>
      <LiveQuizPageContent />
    </Suspense>
  );
}
