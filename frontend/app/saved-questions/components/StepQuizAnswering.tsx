"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, XCircle, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StepOption {
  id: string;
  label: string;
  value: string;
}

interface QuizStep {
  stepNumber: number;
  title: string;
  description?: string;
  options: StepOption[];
  correctAnswer: string;
}

interface StepQuizQuestion {
  _id: string;
  question: string;
  type: 'steps';
  steps: QuizStep[];
  explanation?: string;
}

interface StepQuizAnsweringProps {
  question: StepQuizQuestion;
  onSubmit: (answers: Record<number, string>, isCorrect: boolean) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  showResult?: boolean;
  isLastQuestion?: boolean;
  isFirstQuestion?: boolean;
}

export default function StepQuizAnswering({ 
  question, 
  onSubmit, 
  onNext, 
  onPrevious,
  showResult = false,
  isLastQuestion = false,
  isFirstQuestion = false
}: StepQuizAnsweringProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setIsCorrect(false);
    setCurrentStep(1);
  }, [question._id]);

  const handleStepAnswer = (stepNumber: number, answer: string) => {
    console.log(`🔧 Step ${stepNumber} answer selected:`, {
      answer: answer.substring(0, 50) + '...',
      fullAnswer: answer,
      answerLength: answer.length,
      rawBytes: Array.from(new TextEncoder().encode(answer.substring(0, 20)))
    });
    
    setSelectedAnswers(prev => ({
      ...prev,
      [stepNumber]: answer
    }));

    // Auto-advance to next step if not the last step
    if (stepNumber < question.steps.length) {
      setCurrentStep(stepNumber + 1);
    }
  };

  const canProceedToStep = (stepNumber: number): boolean => {
    if (stepNumber === 1) return true;
    // Can proceed if previous step is answered
    return selectedAnswers[stepNumber - 1] !== undefined;
  };

  const isStepCompleted = (stepNumber: number): boolean => {
    return selectedAnswers[stepNumber] !== undefined;
  };

  const isStepCorrect = (stepNumber: number): boolean => {
    if (!isSubmitted) return false;
    const step = question.steps.find(s => s.stepNumber === stepNumber);
    if (!step) return false;
    
    const userAnswer = selectedAnswers[stepNumber];
    const correctAnswer = step.correctAnswer;
    
    // Normalize both strings for comparison (trim whitespace and normalize unicode)
    const normalizeString = (str: string) => str?.trim().normalize('NFKC') || '';
    
    const normalizedUserAnswer = normalizeString(userAnswer);
    const normalizedCorrectAnswer = normalizeString(correctAnswer);
    
    console.log(`🔍 Step ${stepNumber} comparison:`, {
      userAnswer: userAnswer?.substring(0, 50) + '...',
      correctAnswer: correctAnswer?.substring(0, 50) + '...',
      normalizedUserAnswer: normalizedUserAnswer?.substring(0, 50) + '...',
      normalizedCorrectAnswer: normalizedCorrectAnswer?.substring(0, 50) + '...',
      areEqual: normalizedUserAnswer === normalizedCorrectAnswer,
      userLength: userAnswer?.length,
      correctLength: correctAnswer?.length
    });
    
    return normalizedUserAnswer === normalizedCorrectAnswer;
  };

  const canSubmit = (): boolean => {
    return question.steps.every(step => selectedAnswers[step.stepNumber] !== undefined);
  };

  const handleSubmit = () => {
    if (!canSubmit()) {
      toast({
        title: "Incomplete",
        description: "Please complete all steps before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Check if all answers are correct
    const allCorrect = question.steps.every(step => {
      const userAnswer = selectedAnswers[step.stepNumber];
      const correctAnswer = step.correctAnswer;
      
      // Normalize both strings for comparison (trim whitespace and normalize unicode)
      const normalizeString = (str: string) => str?.trim().normalize('NFKC') || '';
      
      const normalizedUserAnswer = normalizeString(userAnswer);
      const normalizedCorrectAnswer = normalizeString(correctAnswer);
      
      console.log(`🎯 Submit validation Step ${step.stepNumber}:`, {
        userAnswer: userAnswer?.substring(0, 50) + '...',
        correctAnswer: correctAnswer?.substring(0, 50) + '...',
        isMatch: normalizedUserAnswer === normalizedCorrectAnswer
      });
      
      return normalizedUserAnswer === normalizedCorrectAnswer;
    });

    setIsCorrect(allCorrect);
    setIsSubmitted(true);
    onSubmit(selectedAnswers, allCorrect);

    toast({
      title: allCorrect ? "Correct!" : "Incorrect",
      description: allCorrect 
        ? "All steps completed correctly!" 
        : "Some steps are incorrect. Review your answers.",
      variant: allCorrect ? "default" : "destructive",
    });
  };

  const handleClearSelections = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setIsCorrect(false);
    setCurrentStep(1);
  };

  const getStepStatus = (stepNumber: number) => {
    if (!isSubmitted) {
      if (isStepCompleted(stepNumber)) return 'completed';
      if (stepNumber === currentStep) return 'current';
      if (canProceedToStep(stepNumber)) return 'available';
      return 'locked';
    } else {
      return isStepCorrect(stepNumber) ? 'correct' : 'incorrect';
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'current': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'available': return 'bg-gray-100 border-gray-300 text-gray-600';
      case 'locked': return 'bg-gray-50 border-gray-200 text-gray-400';
      case 'correct': return 'bg-green-100 border-green-300 text-green-800';
      case 'incorrect': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Steps Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {question.steps.map((step) => {
              const status = getStepStatus(step.stepNumber);
              return (
                <button
                  key={step.stepNumber}
                  onClick={() => canProceedToStep(step.stepNumber) && setCurrentStep(step.stepNumber)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${getStepStatusColor(status)} ${
                    canProceedToStep(step.stepNumber) ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'
                  }`}
                  disabled={!canProceedToStep(step.stepNumber)}
                >
                  <div className="flex items-center gap-1">
                    <span>Step {step.stepNumber}</span>
                    {isSubmitted && (
                      isStepCorrect(step.stepNumber) ? 
                        <CheckCircle className="h-3 w-3" /> : 
                        <XCircle className="h-3 w-3" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* List of Answers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">List of Answers</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete each step in order. All steps must match the correct answers to be considered correct.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.steps.map((step) => {
            const isDisabled = !canProceedToStep(step.stepNumber);
            const isCompleted = isStepCompleted(step.stepNumber);
            const stepStatus = getStepStatus(step.stepNumber);
            
            return (
              <div key={step.stepNumber} className={`space-y-2 p-4 rounded-lg border border-gray-200 ${isDisabled ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{step.title}</span>
                  {isSubmitted && (
                    <Badge variant={isStepCorrect(step.stepNumber) ? 'default' : 'destructive'}>
                      {isStepCorrect(step.stepNumber) ? 'Correct' : 'Incorrect'}
                    </Badge>
                  )}
                </div>
                
                {step.description && (
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                )}
                
                <Select
                  value={selectedAnswers[step.stepNumber] || ''}
                  onValueChange={(value) => handleStepAnswer(step.stepNumber, value)}
                  disabled={isDisabled || isSubmitted}
                >
                  <SelectTrigger className={`w-full ${
                    isSubmitted ? (isStepCorrect(step.stepNumber) ? 'border-green-300' : 'border-red-300') : ''
                  }`}>
                    <SelectValue placeholder={
                      isDisabled 
                        ? step.stepNumber === 1 
                          ? "Select your primary option..." 
                          : "Complete previous step first"
                        : isCompleted
                          ? "Selection made"
                          : `Select your ${step.stepNumber === 1 ? 'primary' : step.stepNumber === 2 ? 'secondary' : 'final'} option...`
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {step.options.map((option) => (
                      <SelectItem key={option.id} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {isSubmitted && selectedAnswers[step.stepNumber] && (
                  <div className="text-sm space-y-1">
                    <p className={isStepCorrect(step.stepNumber) ? 'text-green-600' : 'text-red-600'}>
                      <strong>Your answer:</strong> {step.options.find(opt => opt.value === selectedAnswers[step.stepNumber])?.label}
                    </p>
                    {!isStepCorrect(step.stepNumber) && (
                      <p className="text-green-600">
                        <strong>Correct answer:</strong> {(() => {
                          // Normalize strings for finding the correct option
                          const normalizeString = (str: string) => str?.trim().normalize('NFKC') || '';
                          const normalizedCorrectAnswer = normalizeString(step.correctAnswer);
                          
                          const correctOption = step.options.find(opt => 
                            normalizeString(opt.value) === normalizedCorrectAnswer
                          );
                          
                          console.log(`🎯 Looking for correct answer display for step ${step.stepNumber}:`, {
                            stepCorrectAnswer: step.correctAnswer?.substring(0, 50) + '...',
                            normalizedCorrectAnswer: normalizedCorrectAnswer?.substring(0, 50) + '...',
                            foundOption: correctOption?.label,
                            allOptionValues: step.options.map(opt => ({
                              label: opt.label,
                              value: opt.value.substring(0, 30) + '...',
                              normalized: normalizeString(opt.value).substring(0, 30) + '...',
                              matches: normalizeString(opt.value) === normalizedCorrectAnswer
                            }))
                          });
                          
                          return correctOption?.label || `[Unable to find matching option for: ${step.correctAnswer?.substring(0, 50) + '...'}]`;
                        })()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isSubmitted ? (
          <>
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmit()}
              className="flex-1"
            >
              Submit All Steps
              {canSubmit() && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClearSelections}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Clear All
            </Button>
          </>
        ) : (
          <div className="flex w-full gap-2">
            {onPrevious && !isFirstQuestion && (
              <Button 
                variant="outline" 
                onClick={onPrevious}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleClearSelections}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
            {onNext && !isLastQuestion && (
              <Button onClick={onNext} className="flex-1 flex items-center gap-2">
                Next Question
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {isLastQuestion && (
              <Button variant="default" className="flex-1">
                Quiz Complete!
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
