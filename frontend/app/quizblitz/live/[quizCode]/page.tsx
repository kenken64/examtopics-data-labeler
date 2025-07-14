'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Timer, Users, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

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
}

interface QuestionResult {
  correctAnswer: string;
  explanation: string;
  playerAnswers: { [playerId: string]: string };
  leaderboard: Player[];
}

export default function LiveQuizPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const quizCode = params.quizCode as string;
  const isHost = searchParams.get('host') === 'true';
  
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
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!quizCode) {
      router.push('/quizblitz');
      return;
    }

    loadQuizSession();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizCode, router]);

  const loadQuizSession = async () => {
    try {
      const response = await fetch(`/api/quizblitz/session/${quizCode}`);
      if (!response.ok) {
        throw new Error('Quiz session not found');
      }

      const data = await response.json();
      setCurrentQuestion(data.currentQuestion);
      setQuestionIndex(data.currentQuestionIndex);
      setTotalQuestions(data.totalQuestions);
      setTimeRemaining(data.timerDuration);
      setPlayers(data.players || []);
      setLoading(false);

      // Start timer
      startTimer(data.timerDuration);

    } catch (error) {
      console.error('Failed to load quiz session:', error);
      toast.error('Failed to load quiz session');
      router.push('/quizblitz');
    }
  };

  const startTimer = (duration: number) => {
    setTimeRemaining(duration);
    
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

  const handleTimeUp = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (!hasAnswered && !showResults) {
      // Auto-submit empty answer or move to results
      setHasAnswered(true);
      showQuestionResults();
    }
  };

  const submitAnswer = async () => {
    if (!selectedAnswer || hasAnswered) return;

    try {
      const response = await fetch('/api/quizblitz/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizCode,
          questionIndex,
          answer: selectedAnswer,
          playerId: 'current-player-id', // Replace with actual player ID
          timestamp: Date.now()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      setHasAnswered(true);
      toast.success('Answer submitted!');

      // For demo purposes, show results after 2 seconds
      setTimeout(() => {
        showQuestionResults();
      }, 2000);

    } catch (error) {
      console.error('Failed to submit answer:', error);
      toast.error('Failed to submit answer');
    }
  };

  const showQuestionResults = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Mock results for demo
    const mockResult: QuestionResult = {
      correctAnswer: currentQuestion?.correctAnswer || '',
      explanation: currentQuestion?.explanation || '',
      playerAnswers: {
        'player1': selectedAnswer || '',
        'player2': currentQuestion?.correctAnswer || ''
      },
      leaderboard: [
        { id: 'player2', name: 'Demo Player 2', score: 1000 },
        { id: 'player1', name: 'You', score: selectedAnswer === currentQuestion?.correctAnswer ? 800 : 0 }
      ]
    };

    setQuestionResult(mockResult);
    setShowResults(true);

    // Auto-advance to next question after 5 seconds
    setTimeout(() => {
      nextQuestion();
    }, 5000);
  };

  const nextQuestion = () => {
    if (questionIndex + 1 >= totalQuestions) {
      // Quiz finished
      setQuizFinished(true);
      return;
    }

    // Move to next question
    setQuestionIndex(prev => prev + 1);
    setSelectedAnswer('');
    setHasAnswered(false);
    setShowResults(false);
    setQuestionResult(null);

    // Load next question (for demo, we'll just modify current question)
    if (currentQuestion) {
      setCurrentQuestion({
        ...currentQuestion,
        question: `Question ${questionIndex + 2}: This is a demo question...`,
        options: {
          A: 'Option A',
          B: 'Option B', 
          C: 'Option C',
          D: 'Option D'
        }
      });
    }

    // Restart timer
    startTimer(30);
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

  if (quizFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-2">Quiz Complete!</h1>
            <p className="text-lg text-muted-foreground">Great job everyone!</p>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Final Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {questionResult?.leaderboard.map((player, index) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium flex-1 text-left">{player.name}</span>
                    <Badge variant="outline" className="font-mono">
                      {player.score} pts
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => router.push('/quizblitz')}
            className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600"
            size="lg"
          >
            New Quiz
          </Button>
        </div>
      </div>
    );
  }

  if (showResults && questionResult) {
    const isCorrect = selectedAnswer === questionResult.correctAnswer;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Results Header */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white mb-4 ${
              isCorrect ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </div>
            <h2 className="text-2xl font-bold">Question {questionIndex + 1} Results</h2>
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
                  {questionResult.leaderboard.slice(0, 5).map((player, index) => (
                    <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <span className="font-bold text-sm w-6">{index + 1}</span>
                      <span className="flex-1 text-sm font-medium">{player.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {player.score}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Question Info */}
          <div className="text-center mt-6">
            <p className="text-muted-foreground">
              {questionIndex + 1 < totalQuestions 
                ? `Next question in 5 seconds...` 
                : 'Quiz completed!'}
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

        {/* Question Card */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">
              {currentQuestion?.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {currentQuestion?.options && Object.entries(currentQuestion.options).map(([key, value]) => (
                <Button
                  key={key}
                  variant={selectedAnswer === key ? "default" : "outline"}
                  className={`p-4 h-auto text-left justify-start ${
                    selectedAnswer === key 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-blue-50'
                  }`}
                  onClick={() => setSelectedAnswer(key)}
                  disabled={hasAnswered}
                >
                  <span className="font-bold mr-3">{key}.</span>
                  <span>{value}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="text-center">
          <Button
            onClick={submitAnswer}
            disabled={!selectedAnswer || hasAnswered}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3"
            size="lg"
          >
            {hasAnswered ? (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Answer Submitted
              </>
            ) : (
              <>
                Submit Answer
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>

        {/* Players Status */}
        {isHost && (
          <Card className="mt-6 bg-white/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Players ({players.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {players.map((player) => (
                  <Badge 
                    key={player.id} 
                    variant={player.hasAnswered ? "default" : "outline"}
                    className="text-xs"
                  >
                    {player.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
