'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Timer, Users, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSessionSSE } from '@/lib/use-sse';
import { useQuizEvents } from '@/lib/use-quiz-events';

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
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizStatus, setQuizStatus] = useState<string>('waiting');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextQuestionInProgress = useRef<boolean>(false); // Add debouncing flag

  // Use SSE for real-time quiz session updates instead of polling
  const { sessionData, isConnected: sseConnected, error: sseError } = useSessionSSE(quizCode || null);

  // Update component state when SSE data changes
  useEffect(() => {
    if (sessionData) {
      setCurrentQuestion(sessionData.currentQuestion);
      setQuestionIndex(sessionData.currentQuestionIndex);
      setTotalQuestions(sessionData.totalQuestions);
      setPlayers(sessionData.players || []);
      setQuizStatus(sessionData.status);
      setQuizFinished(sessionData.isQuizCompleted || false);
      setLoading(false);

      // Handle quiz status transitions
      if (sessionData.status === 'active' && sessionData.currentQuestion) {
        // Quiz has started with an active question
        if (sessionData.timerDuration) {
          setTimeRemaining(sessionData.timerDuration);
          startTimer();
        }
      }
    }
  }, [sessionData]);

  // Handle timer expiration - show results when timer reaches 0
  useEffect(() => {
    if (timeRemaining === 0 && currentQuestion && !showResults) {
      console.log('⏰ Timer expired! Showing question results...');
      handleTimeUp();
    }
  }, [timeRemaining, currentQuestion, showResults]);

  // Real-time quiz event sync (MongoDB Change Streams)
  useQuizEvents(quizCode, {
    onQuestionStarted: (question) => {
      console.log('🔧 DEBUG: [FRONTEND] onQuestionStarted called:', {
        questionIndex: question.questionIndex,
        question: question.question?.substring(0, 50) + '...',
        timeLimit: question.timeLimit
      });
      
      setCurrentQuestion(question);
      setQuestionIndex(question.questionIndex);
      setSelectedAnswer('');
      setHasAnswered(false);
      setShowResults(false);
      setQuestionResult(null);
      setTimeRemaining(question.timeLimit || 30);
      
      console.log('🔧 DEBUG: [FRONTEND] State reset for new question');
    },
    onTimerUpdate: (data) => {
      // Only log timer updates at key intervals to avoid spam
      if (data.timeRemaining % 10 === 0 || data.timeRemaining <= 5) {
        console.log('🔧 DEBUG: [FRONTEND] Timer update:', data.timeRemaining);
      }
      setTimeRemaining(data.timeRemaining);
    },
    onQuestionEnded: (data) => {
      console.log('🔧 DEBUG: [FRONTEND] onQuestionEnded called:', {
        correctAnswer: data.results?.correctAnswer,
        hasResults: !!data.results,
        leaderboardCount: data.results?.leaderboard?.length || 0
      });
      
      setShowResults(true);
      // Ensure data.results has the required structure
      const results = data.results || {};
      const safeResults = {
        correctAnswer: results.correctAnswer || '',
        explanation: results.explanation || '',
        playerAnswers: results.playerAnswers || {},
        leaderboard: results.leaderboard || []
      };
      setQuestionResult(safeResults);
      
      console.log('🔧 DEBUG: [FRONTEND] Results will be shown for 5 seconds');
      // Auto-advance to next question after 5 seconds
      setTimeout(() => {
        console.log('🔧 DEBUG: [FRONTEND] 5-second results timeout expired, hiding results');
        setShowResults(false);
        setQuestionResult(null);
      }, 5000);
    },
    onQuizEnded: (data) => {
      setQuizFinished(true);
      setShowResults(false);
      setQuestionResult(null);
    }
  });

  useEffect(() => {
    if (!quizCode) {
      router.push('/quizblitz');
      return;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    }, [quizCode, router]);

  const startTimer = (duration?: number) => {
    const initialTime = duration || timeRemaining;
    setTimeRemaining(initialTime);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Timer up logic should proceed regardless of answer status
    console.log('⏰ [FRONTEND] Time up! Processing...');
    console.log('🔧 DEBUG: [FRONTEND] Current state:', {
      questionIndex: questionIndex + 1,
      totalQuestions,
      hasAnswered,
      showResults
    });
    
    // Auto-submit empty answer if not answered yet
    if (!hasAnswered) {
      setHasAnswered(true);
      console.log('📝 [FRONTEND] Auto-submitting empty answer...');
    }
    
    // Check if this is the last question (7/7)
    const isLastQuestion = questionIndex + 1 >= totalQuestions;
    
    if (isLastQuestion) {
      console.log('🏁 [FRONTEND] Last question completed! Going directly to final results...');
      // Go directly to final results without showing individual question results
      setQuizFinished(true);
      setShowResults(false);
      setQuestionResult(null);
    } else {
      console.log('📊 [FRONTEND] Not last question, showing results and waiting for backend timer service...');
      // Show results for current question
      showQuestionResults();
      
      // IMPORTANT: The quiz timer service will automatically advance after 5 seconds
      // The backend timer service will send a new question_started event
      // The onQuestionStarted handler will reset the state for the next question
      console.log('⏱️ [FRONTEND] Backend timer service should send next question in 5 seconds...');
    }
  };

  const handleAnswerSelection = async (answer: string) => {
    if (hasAnswered) return;

    setSelectedAnswer(answer);
    setHasAnswered(true);

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
          playerId: 'current-player-id', // Replace with actual player ID
          timestamp: Date.now()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      toast.success('Answer submitted!');

    } catch (error) {
      console.error('Failed to submit answer:', error);
      toast.error('Failed to submit answer');
      // Reset state on error
      setHasAnswered(false);
      setSelectedAnswer('');
    }
  };

  const showQuestionResults = () => {
    console.log('📊 [FRONTEND] showQuestionResults called');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Create results with real player data
    const questionResult: QuestionResult = {
      correctAnswer: currentQuestion?.correctAnswer || '',
      explanation: currentQuestion?.explanation || '',
      playerAnswers: {
        'current-player': selectedAnswer || '' // Only show current player's answer
      },
      leaderboard: players.map(player => ({
        id: player.id,
        name: player.name,
        score: player.score
      }))
    };

    setQuestionResult(questionResult);
    setShowResults(true);
    
    console.log('📊 [FRONTEND] Question results displayed, showResults=true');
    console.log('⏱️ [FRONTEND] Backend timer service should send next question in 5 seconds...');

    // REMOVED: Don't manually advance question here - let the timer service handle it
    // The quiz timer service will automatically advance after 5 seconds
  };

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
        // Quiz finished
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

        // Start timer for new question
        startTimer(data.timerDuration);
        
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

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Your Stats */}
            <Card className="bg-white/90 backdrop-blur-sm border-2 border-blue-200">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Users className="h-6 w-6" />
                  Your Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-6xl font-bold text-blue-600 mb-2">
                    {currentPlayerRank}
                  </div>
                  <p className="text-lg text-muted-foreground">
                    out of {totalPlayers} players
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {correctAnswers}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Correct Answers
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {currentPlayer.score}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total Points
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-lg font-semibold">
                    Accuracy: {totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0}%
                  </div>
                  <Progress 
                    value={totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0} 
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Final Leaderboard */}
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
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

  if (showResults && questionResult) {
    // If this is the last question, skip showing results and go directly to final results
    if (questionIndex + 1 >= totalQuestions) {
      setQuizFinished(true);
      setShowResults(false);
      return null; // This will trigger the quiz finished view
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Results Header - Removed individual correct/incorrect status */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Question {questionIndex + 1} Results</h2>
            <p className="text-muted-foreground mt-2">See how everyone performed</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Answer Explanation */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Correct Answer: {questionResult.correctAnswer}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {currentQuestion?.question}
                </p>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm">{questionResult.explanation}</p>
                </div>
              </CardContent>
            </Card>

            {/* Current Leaderboard */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {questionResult?.leaderboard?.slice(0, 5).map((player, index) => (
                    <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <span className="font-bold text-sm w-6">{index + 1}</span>
                      <span className="flex-1 text-sm font-medium">{player.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {player.score}
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No leaderboard data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Question Info */}
          <div className="text-center mt-6">
            <p className="text-muted-foreground">
              Next question in 5 seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            <span className={`font-mono text-lg font-bold ${timeRemaining <= 10 ? 'text-red-600' : ''}`}>
              {timeRemaining}s
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress 
          value={(questionIndex / totalQuestions) * 100} 
          className="mb-6 h-2"
        />

        {/* Main Content: Question and Player Progress Side by Side */}
        <div className="grid xl:grid-cols-4 lg:grid-cols-3 gap-8">
          {/* Question Card - Takes up 3/4 of the space on large screens */}
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
                  {hasAnswered ? (
                    <div className="inline-flex items-center gap-2 px-8 py-4 bg-green-100 text-green-800 rounded-lg text-lg">
                      <CheckCircle className="h-6 w-6" />
                      Answer Submitted: {selectedAnswer}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-8 py-4 bg-blue-100 text-blue-800 rounded-lg text-lg">
                      <Timer className="h-6 w-6" />
                      Select your answer above
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Players Progress - Takes up 1/4 of the space on large screens */}
          <div className="xl:col-span-1 lg:col-span-1">
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
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
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
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {player.name}
                            </span>
                            {player.source === 'telegram' && (
                              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-600">
                                📱 TG
                              </Badge>
                            )}
                          </div>
                          <span className={`text-xs ${
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
