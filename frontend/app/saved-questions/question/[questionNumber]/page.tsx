"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Loader2, CheckCircle, XCircle, Info, Brain } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getQuestionOptions, getCorrectAnswer } from '../../../utils/questionTransform';
import ReactMarkdown from 'react-markdown';

interface Question {
  _id: string;
  question_no: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  [key: string]: string | number | string[] | undefined | unknown;
}

const QuestionDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const questionNumber = parseInt(params.questionNumber as string);
  const fromPage = searchParams.get('from'); // 'search' or 'certificate'
  const accessCode = searchParams.get('accessCode');
  const certificateCode = searchParams.get('certificateCode');
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [loadingAiExplanation, setLoadingAiExplanation] = useState(false);
  const [showAiExplanation, setShowAiExplanation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (questionNumber) {
      loadQuestion();
    }
  }, [questionNumber, accessCode, certificateCode]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      
      let url = '';
      if (fromPage === 'search' && accessCode) {
        url = `/api/saved-questions?accessCode=${encodeURIComponent(accessCode)}`;
      } else if (fromPage === 'certificate' && certificateCode) {
        url = `/api/saved-questions?certificateCode=${encodeURIComponent(certificateCode)}`;
      } else {
        throw new Error('Invalid navigation parameters');
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load question');
      }
      
      const data = await response.json();
      const foundQuestion = data.questions?.find((q: Question) => q.question_no === questionNumber);
      
      if (!foundQuestion) {
        throw new Error('Question not found');
      }
      
      setQuestion(foundQuestion);
    } catch (error) {
      console.error('Error loading question:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    if (fromPage === 'search') {
      router.push('/saved-questions');
    } else if (fromPage === 'certificate' && certificateCode) {
      router.push(`/saved-questions/certificate/${certificateCode}`);
    } else {
      router.push('/saved-questions');
    }
  };

  const handleAnswerSelect = (option: string) => {
    setSelectedAnswer(option);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleReset = () => {
    setSelectedAnswer('');
    setShowAnswer(false);
    setShowAiExplanation(false);
    setAiExplanation('');
  };

  const generateAiExplanation = async () => {
    if (!question) return;

    try {
      setLoadingAiExplanation(true);
      
      const response = await fetch('/api/ai-explanation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.question,
          options: getQuestionOptions(question),
          correctAnswer: getCorrectAnswer(question),
          explanation: question.explanation,
          questionId: question._id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate AI explanation');
      }

      const data = await response.json();
      setAiExplanation(data.aiExplanation);
      setShowAiExplanation(true);
      
      toast({
        title: "AI Explanation Generated",
        description: "AI has provided a second opinion on this question.",
      });
    } catch (error) {
      console.error('Error generating AI explanation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate AI explanation.",
        variant: "destructive",
      });
    } finally {
      setLoadingAiExplanation(false);
    }
  };

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, D, etc.
  };

  const isCorrectAnswer = (option: string) => {
    if (!question) return false;
    const options = getQuestionOptions(question);
    const correctIndex = getCorrectAnswer(question);
    return options[correctIndex] === option;
  };

  const isSelectedAnswer = (option: string) => {
    return selectedAnswer === option;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-gray-600">Loading question...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Question Not Found</h3>
              <p className="text-gray-600 mb-4">The requested question could not be loaded.</p>
              <Button onClick={handleBackClick}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={handleBackClick}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {fromPage === 'certificate' ? 'Back to Certificate Questions' : 'Back to Search Results'}
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Question {question.question_no}
              </h1>
              <p className="text-gray-600">
                {fromPage === 'search' && accessCode && `Access Code: ${accessCode}`}
                {fromPage === 'certificate' && certificateCode && `Certificate: ${certificateCode}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              Question #{question.question_no}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {getQuestionOptions(question).length} options
            </Badge>
            {question.explanation && (
              <Badge variant="default" className="text-sm">
                Has explanation
              </Badge>
            )}
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Question</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-gray-800 leading-relaxed whitespace-pre-wrap">
              {question.question}
            </p>
          </CardContent>
        </Card>

        {/* Options Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Answer Options</CardTitle>
            <CardDescription>
              {!showAnswer ? 'Select an answer to see if you\'re correct' : 'Correct answer highlighted'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {getQuestionOptions(question).map((option, index) => {
              const optionLabel = getOptionLabel(index);
              const isCorrect = isCorrectAnswer(option);
              const isSelected = isSelectedAnswer(option);
              
              let buttonVariant: "default" | "outline" | "secondary" = "outline";
              let iconElement = null;
              
              if (showAnswer) {
                if (isCorrect) {
                  buttonVariant = "outline";
                  iconElement = <CheckCircle className="h-4 w-4 text-green-600" />;
                } else if (isSelected && !isCorrect) {
                  buttonVariant = "outline";
                  iconElement = <XCircle className="h-4 w-4 text-red-600" />;
                }
              } else if (isSelected) {
                buttonVariant = "default";
              }
              
              return (
                <Button
                  key={index}
                  variant={buttonVariant}
                  className={`w-full justify-start text-left h-auto p-4 ${
                    showAnswer && isCorrect ? 'bg-green-50 border-green-200 hover:bg-green-100 text-green-800' :
                    showAnswer && isSelected && !isCorrect ? 'bg-red-50 border-red-200 hover:bg-red-100 text-red-800' : 
                    'text-gray-800'
                  }`}
                  onClick={() => !showAnswer && handleAnswerSelect(option)}
                  disabled={showAnswer}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {optionLabel}
                      </Badge>
                      {iconElement}
                    </div>
                    <span className="text-sm leading-relaxed whitespace-pre-wrap">
                      {option}
                    </span>
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-3 justify-center">
              {!showAnswer ? (
                <Button 
                  onClick={handleShowAnswer}
                  disabled={!selectedAnswer}
                  size="lg"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Show Correct Answer
                </Button>
              ) : (
                <Button 
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                >
                  Reset Question
                </Button>
              )}
            </div>
            
            {selectedAnswer && !showAnswer && (
              <p className="text-center text-sm text-gray-600 mt-3">
                You selected: <strong>{getOptionLabel((question.options || []).indexOf(selectedAnswer))}. {selectedAnswer}</strong>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Explanation Card */}
        {showAnswer && question.explanation && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                Explanation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {question.explanation}
              </p>
            </CardContent>
          </Card>
        )}

        {/* AI Second Opinion Section */}
        {showAnswer && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Second Opinion
              </CardTitle>
              <CardDescription>
                Get an AI-powered analysis and alternative perspective on this question
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showAiExplanation ? (
                <div className="text-center">
                  <Button 
                    onClick={generateAiExplanation}
                    disabled={loadingAiExplanation}
                    variant="outline"
                    size="lg"
                    className="border-purple-200 hover:bg-purple-50"
                  >
                    {loadingAiExplanation ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating AI Analysis...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Get AI Second Opinion
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">AI Analysis</span>
                    </div>
                    <div className="text-gray-800 leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 className="text-lg font-semibold text-gray-900 mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-semibold text-gray-900 mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mb-1">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3">{children}</ol>,
                          li: ({ children }) => <li className="text-gray-800">{children}</li>,
                          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-300 pl-4 italic text-gray-700">{children}</blockquote>,
                        }}
                      >
                        {aiExplanation}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="text-center">
                    <Button 
                      onClick={() => {
                        setShowAiExplanation(false);
                        setAiExplanation('');
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-purple-600 hover:text-purple-800"
                    >
                      Hide AI Opinion
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Result Summary */}
        {showAnswer && selectedAnswer && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                {isCorrectAnswer(selectedAnswer) ? (
                  <div className="text-green-600">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3" />
                    <h3 className="text-xl font-semibold mb-2">Correct!</h3>
                    <p className="text-gray-600">You selected the right answer.</p>
                  </div>
                ) : (
                  <div className="text-red-600">
                    <XCircle className="h-12 w-12 mx-auto mb-3" />
                    <h3 className="text-xl font-semibold mb-2">Incorrect</h3>
                    <p className="text-gray-600">
                      You selected: <strong>{getOptionLabel(getQuestionOptions(question).indexOf(selectedAnswer))}</strong><br />
                      Correct answer: <strong>{getOptionLabel(getCorrectAnswer(question))}</strong>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QuestionDetailPage;
