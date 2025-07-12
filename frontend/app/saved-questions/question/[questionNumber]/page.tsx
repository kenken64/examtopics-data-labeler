"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Loader2, CheckCircle, XCircle, Info, Brain, Edit, Save, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getQuestionOptions, getCorrectAnswer, getAllCorrectAnswers } from '../../../utils/questionTransform';
import { isMultipleAnswerQuestion, validateMultipleAnswers, formatAnswerForDisplay, getAnswerInfo } from '../../../utils/multipleAnswerUtils';
import ReactMarkdown from 'react-markdown';

interface Question {
  _id: string;
  question_no: number;
  question: string;
  options: string[];
  correctAnswer: number | string;
  isMultipleAnswer?: boolean;
  correctAnswers?: number[];
  explanation?: string;
  [key: string]: string | number | string[] | number[] | boolean | undefined | unknown;
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
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]); // Changed to array for multiple selection
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [loadingAiExplanation, setLoadingAiExplanation] = useState(false);
  const [showAiExplanation, setShowAiExplanation] = useState(false);
  
  // Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editingCorrectAnswer, setEditingCorrectAnswer] = useState<string>('');
  const [editingExplanation, setEditingExplanation] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (questionNumber) {
      loadQuestion();
    }
  }, [questionNumber, accessCode, certificateCode]);

  // Initialize editing values when question loads
  useEffect(() => {
    if (question) {
      setEditingCorrectAnswer(String(question.correctAnswer || ''));
      setEditingExplanation(question.explanation || '');
    }
  }, [question]);

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

  const handleAnswerSelect = (optionLabel: string) => {
    if (!question) return;
    
    const isMultiple = question.isMultipleAnswer || isMultipleAnswerQuestion(question.correctAnswer as string);
    
    if (isMultiple) {
      // Multiple answer question - toggle selection
      setSelectedAnswers(prev => {
        if (prev.includes(optionLabel)) {
          return prev.filter(answer => answer !== optionLabel);
        } else {
          return [...prev, optionLabel];
        }
      });
    } else {
      // Single answer question - replace selection
      setSelectedAnswers([optionLabel]);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleReset = () => {
    setSelectedAnswers([]);
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

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset values
      setEditingCorrectAnswer(String(question?.correctAnswer || ''));
      setEditingExplanation(question?.explanation || '');
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = async () => {
    if (!question) return;
    
    try {
      setSaving(true);
      
      const response = await fetch('/api/saved-questions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: question._id,
          correctAnswer: editingCorrectAnswer,
          explanation: editingExplanation.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save changes');
      }

      // Update local question state
      setQuestion(prev => prev ? {
        ...prev,
        correctAnswer: editingCorrectAnswer,
        explanation: editingExplanation.trim()
      } : null);

      setIsEditing(false);
      
      toast({
        title: "Success",
        description: "Question updated successfully.",
      });

    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, D, etc.
  };

  const isCorrectAnswer = (option: string) => {
    if (!question) return false;
    const options = getQuestionOptions(question);
    const correctIndices = getAllCorrectAnswers(question);
    const optionIndex = options.indexOf(option);
    return correctIndices.includes(optionIndex);
  };

  const isSelectedAnswer = (option: string, index: number) => {
    const optionLabel = getOptionLabel(index);
    return selectedAnswers.includes(optionLabel);
  };

  const getCorrectAnswerDisplay = () => {
    if (!question) return '';
    
    const correctAnswerValue = question.correctAnswer;
    
    if (typeof correctAnswerValue === 'string') {
      // Already in letter format, use existing formatter
      return formatAnswerForDisplay(correctAnswerValue);
    } else {
      // Numeric format - convert to letter labels
      const correctIndices = getAllCorrectAnswers(question);
      const correctLabels = correctIndices.map(index => getOptionLabel(index));
      return correctLabels.join(', ');
    }
  };

  const isUserAnswerCorrect = () => {
    if (!question) return false;
    
    // Get correct answer in consistent format
    const correctAnswerValue = question.correctAnswer;
    
    // Check if it's multiple answer based on the original value
    const isMultiple = question.isMultipleAnswer || 
                      (typeof correctAnswerValue === 'string' && isMultipleAnswerQuestion(correctAnswerValue));
    
    if (isMultiple) {
      // For multiple answer questions, convert to letter format for validation
      if (typeof correctAnswerValue === 'string') {
        // Already in letter format, validate directly
        const selectedString = selectedAnswers.join('');
        return validateMultipleAnswers(selectedString, correctAnswerValue);
      } else {
        // Numeric format - convert both to indices for comparison
        const selectedIndices = selectedAnswers.map(letter => letter.charCodeAt(0) - 65).sort();
        const correctIndices = getAllCorrectAnswers(question).sort();
        return JSON.stringify(selectedIndices) === JSON.stringify(correctIndices);
      }
    } else {
      // Single answer: compare using indices
      const correctIndex = getCorrectAnswer(question);
      const selectedIndex = selectedAnswers.length === 1 ? (selectedAnswers[0].charCodeAt(0) - 65) : -1;
      return selectedIndex === correctIndex;
    }
  };

  const getAnswerOptions = () => {
    if (!question) return [];
    const options = getQuestionOptions(question);
    return options.map((option, index) => ({
      value: String(index),
      label: `${getOptionLabel(index)}: ${option.substring(0, 50)}${option.length > 50 ? '...' : ''}`
    }));
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
              {!showAnswer ? (
                <>
                  {question.isMultipleAnswer || isMultipleAnswerQuestion(question.correctAnswer as string) ? (
                    <span className="text-blue-600 font-medium">
                      {getAnswerInfo(getQuestionOptions(question), question.correctAnswer as string).hint} - You can select multiple options
                    </span>
                  ) : (
                    'Select an answer to see if you\'re correct'
                  )}
                </>
              ) : (
                'Correct answer highlighted'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {getQuestionOptions(question).map((option, index) => {
              const optionLabel = getOptionLabel(index);
              const isCorrect = isCorrectAnswer(option);
              const isSelected = isSelectedAnswer(option, index);
              
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
                  onClick={() => !showAnswer && handleAnswerSelect(optionLabel)}
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
              {!showAnswer ? (              <Button 
                onClick={handleShowAnswer}
                disabled={selectedAnswers.length === 0}
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
            
            {selectedAnswers.length > 0 && !showAnswer && (
              <p className="text-center text-sm text-gray-600 mt-3">
                You selected: <strong>{selectedAnswers.join(', ')}</strong>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Edit Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                Question Management
              </span>
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button 
                    onClick={handleEditToggle}
                    size="sm"
                    variant="outline"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Question
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={handleSaveChanges}
                      size="sm"
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                    <Button 
                      onClick={handleEditToggle}
                      size="sm"
                      variant="outline"
                      disabled={saving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Correct Answer Editor */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Correct Answer
              </label>
              {isEditing ? (
                <Select 
                  value={editingCorrectAnswer} 
                  onValueChange={setEditingCorrectAnswer}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAnswerOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-gray-50 rounded-md border">
                  <span className="font-medium">
                    {getOptionLabel(parseInt(String(question.correctAnswer)))}: 
                  </span>
                  <span className="ml-2">
                    {getQuestionOptions(question)[parseInt(String(question.correctAnswer))]?.substring(0, 100)}
                    {(getQuestionOptions(question)[parseInt(String(question.correctAnswer))]?.length || 0) > 100 ? '...' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Explanation Editor */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Explanation
              </label>
              {isEditing ? (
                <Textarea
                  value={editingExplanation}
                  onChange={(e) => setEditingExplanation(e.target.value)}
                  placeholder="Enter question explanation..."
                  className="min-h-[200px] resize-vertical"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md border min-h-[100px]">
                  {question.explanation ? (
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
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-700">{children}</blockquote>,
                        }}
                      >
                        {question.explanation}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="text-gray-500 italic">No explanation provided</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Original Explanation Card - Show when not editing and answer is shown */}
        {showAnswer && !isEditing && question.explanation && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                Explanation
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-700">{children}</blockquote>,
                  }}
                >
                  {question.explanation}
                </ReactMarkdown>
              </div>
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
        {showAnswer && selectedAnswers.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                {isUserAnswerCorrect() ? (
                  <div className="text-green-600">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3" />
                    <h3 className="text-xl font-semibold mb-2">Correct!</h3>
                    <p className="text-gray-600">You selected the right answer{selectedAnswers.length > 1 ? 's' : ''}.</p>
                  </div>
                ) : (
                  <div className="text-red-600">
                    <XCircle className="h-12 w-12 mx-auto mb-3" />
                    <h3 className="text-xl font-semibold mb-2">Incorrect</h3>
                    <p className="text-gray-600">
                      You selected: <strong>{selectedAnswers.join(', ')}</strong><br />
                      Correct answer{getAllCorrectAnswers(question).length > 1 ? 's' : ''}: <strong>{getCorrectAnswerDisplay()}</strong>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Editing Section */}
        {isEditing && question && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Edit className="h-5 w-5 text-green-600" />
                Edit Question
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Correct Answer Edit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correct Answer
                  </label>
                  <Select
                    value={editingCorrectAnswer}
                    onValueChange={setEditingCorrectAnswer}
                    disabled={saving}
                  >
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select correct answer" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAnswerOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Explanation Edit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Explanation
                  </label>
                  <Textarea
                    value={editingExplanation}
                    onChange={(e) => setEditingExplanation(e.target.value)}
                    placeholder="Enter explanation"
                    className="resize-none border-gray-300"
                    disabled={saving}
                    rows={3}
                  />
                </div>

                {/* Save/Cancel Buttons */}
                <div className="flex gap-3">
                  <Button 
                    onClick={handleSaveChanges}
                    className="flex-1"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                  <Button 
                    onClick={handleEditToggle}
                    variant="outline"
                    className="flex-1"
                    disabled={saving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Toggle Button */}
        <div className="text-center">
          {!isEditing && (
            <Button 
              onClick={handleEditToggle}
              variant="outline"
              className="mb-6"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Question
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionDetailPage;
