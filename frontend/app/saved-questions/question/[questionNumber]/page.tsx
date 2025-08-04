"use client";

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Loader2, CheckCircle, XCircle, Info, Brain, Edit, Save, X, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getQuestionOptions, getCorrectAnswer, getAllCorrectAnswers } from '../../../utils/questionTransform';
import { isMultipleAnswerQuestion, validateMultipleAnswers, formatAnswerForDisplay, getAnswerInfo, answerToArray } from '../../../utils/multipleAnswerUtils';
import ReactMarkdown from 'react-markdown';
import StepQuizAnswering from '../../components/StepQuizAnswering';

interface Question {
  _id: string;
  question_no: number;
  question: string;
  options: string[];
  correctAnswer: number | string;
  isMultipleAnswer?: boolean;
  correctAnswers?: number[];
  explanation?: string;
  type?: string; // Add type field for step-based questions
  steps?: Array<{
    stepNumber: number;
    title: string;
    description?: string;
    options: Array<{
      id: string;
      label: string;
      value: string;
    }>;
    correctAnswer: string;
  }>; // Add steps field for step-based questions
  [key: string]: string | number | string[] | number[] | boolean | undefined | unknown;
}

const QuestionDetailPageContent = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const questionNumber = parseInt(params.questionNumber as string);
  const fromPage = searchParams.get('from'); // 'search' or 'certificate'
  const accessCode = searchParams.get('accessCode');
  const certificateCode = searchParams.get('certificateCode');
  
  // Helper function to convert old step format to new format
  const convertAnswersToSteps = (question: Question) => {
    console.log('🔧 convertAnswersToSteps called with:', {
      hasAnswers: !!question.answers,
      answersType: typeof question.answers,
      answersKeys: question.answers ? Object.keys(question.answers) : [],
      fullQuestion: question,
      questionKeys: Object.keys(question),
      step1: question.step1,
      step2: question.step2,
      step3: question.step3,
      questionAnswers: question.answers,
      actualAnswers: (question as any).answers
    });
    
    // Log the complete question object to see its structure
    console.log('📋 Complete question object:', JSON.stringify(question, null, 2));
    
    // Check if step data is in answers field as a JSON string
    let stepData: any = null;
    
    if (question.answers && typeof question.answers === 'string') {
      try {
        // Parse the JSON string in the answers field
        const parsedAnswers = JSON.parse(question.answers);
        console.log('📋 Parsed answers from JSON string:', parsedAnswers);
        if (parsedAnswers && typeof parsedAnswers === 'object') {
          stepData = parsedAnswers;
          console.log('📋 Using parsed JSON answers for step data');
        }
      } catch (error) {
        console.log('❌ Failed to parse answers JSON string:', error);
      }
    } else if (question.answers && typeof question.answers === 'object') {
      stepData = question.answers;
      console.log('📋 Using answers object for step data');
    } else {
      // Check if step data is directly on question object
      const directStepKeys = Object.keys(question).filter(key => key.startsWith('step'));
      if (directStepKeys.length > 0) {
        stepData = question;
        console.log('📋 Using question object directly for step data, found keys:', directStepKeys);
      } else {
        // Try to access step data with different possible field names
        const possibleStepData = (question as any);
        if (possibleStepData.step1 || possibleStepData.answers?.step1) {
          stepData = possibleStepData.answers || possibleStepData;
          console.log('📋 Found step data in alternative location');
        }
      }
    }
    
    if (!stepData) {
      console.log('❌ No step data found in answers or question object');
      return null;
    }
    
    const steps = [];
    
    // Extract step keys and sort them
    const stepKeys = Object.keys(stepData).filter(key => key.startsWith('step')).sort();
    console.log('📋 Step keys found:', stepKeys);
    
    for (const stepKey of stepKeys) {
      const stepDataArray = stepData[stepKey];
      const stepNumber = parseInt(stepKey.replace('step', ''));
      
      console.log(`🔍 Processing ${stepKey}:`, {
        stepNumber,
        isArray: Array.isArray(stepDataArray),
        length: stepDataArray?.length
      });
      
      if (stepDataArray && Array.isArray(stepDataArray) && stepDataArray.length > 0) {
        // Get correct answer key
        const stepKey = `step${stepNumber}`;
        
        // All items in the array are the available options for this step
        const options = stepDataArray.map((optionText: string, index: number) => ({
          id: String.fromCharCode(65 + index), // A, B, C, D, E...
          label: `${String.fromCharCode(65 + index)}. ${optionText}`,
          value: optionText
        }));
        
        console.log(`📋 Options created for ${stepKey}:`, {
          optionsCount: options.length,
          firstOption: options[0]?.value.substring(0, 50) + '...',
          allOptionValues: options.map(opt => opt.value.substring(0, 30) + '...')
        });
        
        // Get correct answer from correctAnswer field
        let correctAnswer = stepDataArray[0]; // Default to first option
        
        // Try to parse correctAnswer as JSON string first
        if (question.correctAnswer && typeof question.correctAnswer === 'string') {
          try {
            const parsedCorrectAnswers = JSON.parse(question.correctAnswer);
            console.log(`🎯 Parsed correctAnswer JSON for ${stepKey}:`, parsedCorrectAnswers);
            console.log(`🔍 Available keys in correctAnswer:`, Object.keys(parsedCorrectAnswers));
            
            if (parsedCorrectAnswers[stepKey]) {
              correctAnswer = parsedCorrectAnswers[stepKey];
              console.log(`✅ Found correct answer for ${stepKey}:`, {
                text: correctAnswer.substring(0, 50) + '...',
                fullText: correctAnswer,
                length: correctAnswer.length,
                charCodes: correctAnswer.split('').slice(0, 10).map((c: string) => c.charCodeAt(0)),
                rawBytes: Array.from(new TextEncoder().encode(correctAnswer.substring(0, 20)))
              });
            } else {
              console.log(`❌ Key ${stepKey} not found in parsed correctAnswer. Available keys:`, Object.keys(parsedCorrectAnswers));
            }
          } catch (error) {
            console.log(`❌ Failed to parse correctAnswer JSON:`, error);
          }
        }
        // Fallback: try object format with Step keys
        else if (question.correctAnswer && typeof question.correctAnswer === 'object') {
          const correctAnswerKey = `Step ${stepNumber}`;
          const correctAnswerLetter = (question.correctAnswer as any)[correctAnswerKey];
          if (correctAnswerLetter) {
            // Find the corresponding option text based on the letter
            const correctIndex = correctAnswerLetter.charCodeAt(0) - 65; // A=0, B=1, C=2, etc.
            if (correctIndex >= 0 && correctIndex < stepDataArray.length) {
              correctAnswer = stepDataArray[correctIndex];
            }
          }
        }
        
        const stepObj = {
          stepNumber,
          title: `Step ${stepNumber}`,
          description: `Select the appropriate action for step ${stepNumber}:`,
          options,
          correctAnswer
        };
        
        console.log(`✅ Created step ${stepNumber}:`, {
          optionsCount: options.length,
          correctAnswer: correctAnswer.substring(0, 50) + '...',
          correctAnswerFull: correctAnswer,
          correctAnswerLength: correctAnswer.length,
          firstOptionValue: options[0]?.value.substring(0, 50) + '...',
          optionsThatMatch: options.filter(opt => opt.value === correctAnswer).length,
          normalizedMatch: options.filter(opt => 
            opt.value.trim().normalize('NFKC') === correctAnswer.trim().normalize('NFKC')
          ).length
        });
        
        steps.push(stepObj);
      }
    }
    
    console.log(`🎯 Conversion result: ${steps.length} steps created`);
    return steps.length > 0 ? steps : null;
  };
  
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
  const [editingMultipleAnswers, setEditingMultipleAnswers] = useState<string[]>([]);
  const [editingExplanation, setEditingExplanation] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
  const { toast } = useToast();

  // Step quiz handler
  const handleStepQuizSubmit = async (answers: Record<number, string>, isCorrect: boolean) => {
    if (!question) return;
    
    try {
      const response = await fetch(`/api/saved-questions/${question._id}/step-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers,
          timeSpent: 0 // You can add time tracking if needed
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit step quiz');
      }

      const result = await response.json();
      
      toast({
        title: isCorrect ? "Perfect!" : "Good Attempt!",
        description: result.results.message,
        variant: isCorrect ? "default" : "destructive",
      });
      
      console.log('Step quiz results:', result.results);
    } catch (error) {
      console.error('Error submitting step quiz:', error);
      toast({
        title: "Error",
        description: "Failed to submit step quiz. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNextQuestion = () => {
    // Navigate to next question
    const nextQuestionNumber = questionNumber + 1;
    const searchParamsString = new URLSearchParams({
      from: fromPage || 'search',
      ...(accessCode && { accessCode }),
      ...(certificateCode && { certificateCode })
    }).toString();
    
    router.push(`/saved-questions/question/${nextQuestionNumber}?${searchParamsString}`);
  };

  const handlePreviousQuestion = () => {
    // Navigate to previous question
    const prevQuestionNumber = questionNumber - 1;
    if (prevQuestionNumber < 1) return;
    
    const searchParamsString = new URLSearchParams({
      from: fromPage || 'search',
      ...(accessCode && { accessCode }),
      ...(certificateCode && { certificateCode })
    }).toString();
    
    router.push(`/saved-questions/question/${prevQuestionNumber}?${searchParamsString}`);
  };

  useEffect(() => {
    if (questionNumber) {
      loadQuestion();
    }
  }, [questionNumber, accessCode, certificateCode]);

  // Initialize editing values when question loads
  useEffect(() => {
    if (question) {
      const isMultiple = question.isMultipleAnswer || isMultipleAnswerQuestion(question.correctAnswer as string);
      
      if (isMultiple && typeof question.correctAnswer === 'string') {
        // Multiple answer question - convert letters to indices
        const letters = answerToArray(question.correctAnswer);
        const indices = letters.map(letter => String(letter.charCodeAt(0) - 65));
        setEditingMultipleAnswers(indices);
        setEditingCorrectAnswer(''); // Clear single answer field
      } else {
        // Single answer question
        setEditingCorrectAnswer(String(question.correctAnswer || ''));
        setEditingMultipleAnswers([]); // Clear multiple answers field
      }
      
      setEditingExplanation(question.explanation || '');
    }
  }, [question]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      
      let url = '';
      if (fromPage === 'search' && accessCode) {
        // Load ALL questions without pagination to find the specific question
        url = `/api/saved-questions?accessCode=${encodeURIComponent(accessCode)}&limit=1000`;
      } else if (fromPage === 'certificate' && certificateCode) {
        // Load ALL questions without pagination to find the specific question
        url = `/api/saved-questions?certificateCode=${encodeURIComponent(certificateCode)}&limit=1000`;
      } else {
        throw new Error('Invalid navigation parameters');
      }
      
      console.log(`Loading question ${questionNumber} from URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load question');
      }
      
      const data = await response.json();
      console.log(`API returned ${data.questions?.length || 0} questions`);
      console.log(`Looking for question number: ${questionNumber}`);
      console.log(`Available question numbers: ${data.questions?.map((q: Question) => q.question_no).sort((a: number, b: number) => a - b).join(', ') || 'none'}`);
      
      const foundQuestion = data.questions?.find((q: Question) => q.question_no === questionNumber);
      
      if (!foundQuestion) {
        // Question not found - provide helpful error message and suggest alternatives
        const availableQuestions = data.questions?.map((q: Question) => q.question_no).sort((a: number, b: number) => a - b) || [];
        const totalQuestions = availableQuestions.length;
        
        console.error(`Question ${questionNumber} not found. Available questions:`, availableQuestions);
        
        let errorMessage = `Question ${questionNumber} not found`;
        if (fromPage === 'certificate' && certificateCode) {
          errorMessage += ` for certificate ${certificateCode}`;
          if (totalQuestions > 0) {
            errorMessage += `. Available questions: ${availableQuestions[0]}-${availableQuestions[availableQuestions.length - 1]} (${totalQuestions} total)`;
          }
        } else if (fromPage === 'search' && accessCode) {
          errorMessage += ` for access code ${accessCode}`;
          if (totalQuestions > 0) {
            errorMessage += `. Available questions: ${availableQuestions[0]}-${availableQuestions[availableQuestions.length - 1]} (${totalQuestions} total)`;
          }
        }
        
        // If we have questions available, suggest redirecting to the first one
        if (totalQuestions > 0) {
          toast({
            title: "Question Not Found",
            description: `${errorMessage}. Redirecting to question ${availableQuestions[0]}...`,
            variant: "destructive",
          });
          
          // Redirect to the first available question after a short delay
          setTimeout(() => {
            let redirectUrl = '';
            if (fromPage === 'certificate' && certificateCode) {
              redirectUrl = `/saved-questions/question/${availableQuestions[0]}?from=certificate&certificateCode=${encodeURIComponent(certificateCode)}`;
            } else if (fromPage === 'search' && accessCode) {
              redirectUrl = `/saved-questions/question/${availableQuestions[0]}?from=search&accessCode=${encodeURIComponent(accessCode)}`;
            } else {
              // Fallback to certificate page
              handleBackClick();
              return;
            }
            router.push(redirectUrl);
          }, 2000);
        } else {
          toast({
            title: "No Questions Available",
            description: `No questions found for ${fromPage === 'certificate' ? `certificate ${certificateCode}` : `access code ${accessCode}`}.`,
            variant: "destructive",
          });
          
          // Redirect back to previous page
          setTimeout(() => {
            handleBackClick();
          }, 2000);
        }
        
        throw new Error(errorMessage);
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
      if (question) {
        const isMultiple = question.isMultipleAnswer || isMultipleAnswerQuestion(question.correctAnswer as string);
        
        if (isMultiple && typeof question.correctAnswer === 'string') {
          const letters = answerToArray(question.correctAnswer);
          const indices = letters.map(letter => String(letter.charCodeAt(0) - 65));
          setEditingMultipleAnswers(indices);
          setEditingCorrectAnswer('');
        } else {
          setEditingCorrectAnswer(String(question.correctAnswer || ''));
          setEditingMultipleAnswers([]);
        }
        
        setEditingExplanation(question.explanation || '');
      }
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = async () => {
    if (!question) return;
    
    try {
      setSaving(true);
      
      // Determine the correct answer to save
      let answerToSave: string | number;
      const isMultiple = question.isMultipleAnswer || isMultipleAnswerQuestion(question.correctAnswer as string);
      
      if (isMultiple) {
        if (editingMultipleAnswers.length === 0) {
          toast({
            title: "Validation Error",
            description: "Please select at least one correct answer for this multiple-answer question.",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
        // Convert indices back to letters
        const letters = editingMultipleAnswers
          .map(index => String.fromCharCode(65 + parseInt(index)))
          .sort()
          .join('');
        answerToSave = letters;
      } else {
        if (!editingCorrectAnswer) {
          toast({
            title: "Validation Error",
            description: "Please select a correct answer.",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
        answerToSave = editingCorrectAnswer;
      }
      
      const response = await fetch('/api/saved-questions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: question._id,
          correctAnswer: answerToSave,
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
        correctAnswer: answerToSave,
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

  const isSelectedAnswer = (_option: string, index: number) => {
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

  const handleMultipleAnswerToggle = (optionIndex: string) => {
    setEditingMultipleAnswers(prev => {
      if (prev.includes(optionIndex)) {
        return prev.filter(index => index !== optionIndex);
      } else {
        return [...prev, optionIndex].sort();
      }
    });
  };

  const getCorrectAnswerDisplayText = () => {
    if (!question) return '';
    
    const isMultiple = question.isMultipleAnswer || isMultipleAnswerQuestion(question.correctAnswer as string);
    
    if (isMultiple && typeof question.correctAnswer === 'string') {
      // Multiple answer - show letters
      return formatAnswerForDisplay(question.correctAnswer);
    } else {
      // Single answer - show option text
      const options = getQuestionOptions(question);
      const index = parseInt(String(question.correctAnswer));
      const option = options[index];
      return option ? `${getOptionLabel(index)}: ${option.substring(0, 100)}${option.length > 100 ? '...' : ''}` : '';
    }
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
              <p className="text-gray-600 mb-4">
                Question {questionNumber} could not be found
                {fromPage === 'certificate' && certificateCode && ` for certificate ${certificateCode}`}
                {fromPage === 'search' && accessCode && ` for access code ${accessCode}`}.
              </p>
              <div className="text-sm text-gray-500 mb-6 space-y-1">
                <p><strong>Navigation:</strong> {fromPage}</p>
                {certificateCode && <p><strong>Certificate:</strong> {certificateCode}</p>}
                {accessCode && <p><strong>Access Code:</strong> {accessCode}</p>}
                <p><strong>Requested Question:</strong> {questionNumber}</p>
                <p className="text-xs mt-3">
                  💡 This usually happens when trying to access a question number that doesn't exist for this certificate or access code.
                </p>
              </div>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 pl-16 sm:pl-20 lg:pl-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button 
            variant="ghost" 
            onClick={handleBackClick}
            className="mb-4 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {fromPage === 'certificate' ? 'Back to Certificate Questions' : 'Back to Search Results'}
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
            <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Question {question.question_no}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 break-all">
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

        {/* Question Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Question</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <div 
                className="text-gray-800 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: question.question }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Step-based Quiz Interface */}
        {(() => {
          console.log('🔍 DEBUG: Question check for step quiz', {
            questionType: question.type,
            typeEqual: question.type === 'steps',
            hasSteps: !!question.steps,
            hasAnswers: !!question.answers,
            answerKeys: question.answers ? Object.keys(question.answers) : [],
            convertedSteps: convertAnswersToSteps(question)
          });
          
          const convertedSteps = convertAnswersToSteps(question);
          console.log('📋 Converted steps result:', convertedSteps);
          
          const typeCheck = question.type === 'steps';
          const dataCheck = question.steps || convertedSteps;
          const isStepQuiz = typeCheck && dataCheck;
          
          console.log('🎯 Step quiz condition breakdown:', {
            typeCheck,
            dataCheck: !!dataCheck,
            isStepQuiz,
            questionSteps: question.steps,
            convertedStepsLength: convertedSteps?.length
          });
          
          return isStepQuiz;
        })() ? (
          <StepQuizAnswering
            question={{
              _id: question._id,
              question: question.question,
              type: 'steps',
              steps: question.steps || convertAnswersToSteps(question) || [],
              explanation: question.explanation
            }}
            onSubmit={handleStepQuizSubmit}
            onNext={handleNextQuestion}
            onPrevious={handlePreviousQuestion}
            isFirstQuestion={questionNumber === 1}
            isLastQuestion={false} // You might want to add logic to determine this
          />
        ) : (
          <>
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
                Correct Answer{question && (question.isMultipleAnswer || isMultipleAnswerQuestion(question.correctAnswer as string)) ? 's' : ''}
                {question && (question.isMultipleAnswer || isMultipleAnswerQuestion(question.correctAnswer as string)) && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Multiple Answers
                  </Badge>
                )}
              </label>
              {isEditing ? (
                question && (question.isMultipleAnswer || isMultipleAnswerQuestion(question.correctAnswer as string)) ? (
                  /* Multiple Answer Selection */
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">Select all correct answers:</p>
                    {getAnswerOptions().map((option) => (
                      <div key={option.value} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`answer-${option.value}`}
                          checked={editingMultipleAnswers.includes(option.value)}
                          onChange={() => handleMultipleAnswerToggle(option.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label 
                          htmlFor={`answer-${option.value}`}
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                    {editingMultipleAnswers.length > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border text-sm text-blue-800">
                        Selected: {editingMultipleAnswers.map(index => getOptionLabel(parseInt(index))).join(', ')}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Single Answer Selection */
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
                )
              ) : (
                <div className="p-3 bg-gray-50 rounded-md border">
                  <span className="font-medium">
                    {getCorrectAnswerDisplayText()}
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

            {/* Save/Cancel Buttons - Show only when editing */}
            {isEditing && (
              <div className="flex gap-3 pt-4 border-t">
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
            )}
          </CardContent>
        </Card>



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

        {/* Question Management Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Question Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Question Number</Label>
                <p className="text-lg font-semibold">{question.question_no}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Question Type</Label>
                <Badge variant={question.type === 'steps' ? 'default' : 'secondary'}>
                  {question.type || 'multiple-choice'}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">Correct Answer(s)</Label>
              {question.type === 'steps' && question.correctAnswer && typeof question.correctAnswer === 'object' ? (
                <div className="mt-2 space-y-2">
                  {Object.entries(question.correctAnswer as Record<string, string>).map(([step, answer]) => (
                    <div key={step} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                      <span className="font-medium text-green-800">{step}:</span>
                      <Badge variant="outline" className="bg-white border-green-300 text-green-700">
                        {answer}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2">
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                    {getCorrectAnswerDisplayText()}
                  </Badge>
                </div>
              )}
            </div>

            {question.explanation && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Explanation</Label>
                <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-900">{question.explanation}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <Label className="text-xs font-medium text-gray-500">Created</Label>
                <p className="text-gray-700">
                  {question.createdAt ? new Date(question.createdAt as string).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500">Updated</Label>
                <p className="text-gray-700">
                  {question.updatedAt ? new Date(question.updatedAt as string).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500">Difficulty</Label>
                <p className="text-gray-700">{(question as any).difficulty || 'Medium'}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500">Multiple Answer</Label>
                <p className="text-gray-700">
                  {question.isMultipleAnswer ? 'Yes' : 'No'}
                </p>
              </div>
            </div>

            {(question as any).tags && Array.isArray((question as any).tags) && (question as any).tags.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Tags</Label>
                <div className="mt-2 flex flex-wrap gap-1">
                  {((question as any).tags as string[]).map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
          </>
        )}
      </div>
    </div>
  );
};

// Loading component for Suspense fallback
function QuestionDetailPageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg font-medium">Loading question...</p>
      </div>
    </div>
  );
}

// Main component wrapped with Suspense
function QuestionDetailPage() {
  return (
    <Suspense fallback={<QuestionDetailPageLoading />}>
      <QuestionDetailPageContent />
    </Suspense>
  );
}

export default QuestionDetailPage;
