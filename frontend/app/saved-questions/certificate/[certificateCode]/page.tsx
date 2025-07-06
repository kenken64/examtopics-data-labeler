"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Loader2, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getQuestionOptions, getCorrectAnswer } from '../../../utils/questionTransform';

interface Question {
  _id: string;
  question_no: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  [key: string]: unknown; // Allow additional properties for Record compatibility
}

interface CertificateInfo {
  certificateCode: string;
  certificateTitle: string;
  totalQuestions: number;
}

const CertificateQuestionsPage = () => {
  const params = useParams();
  const router = useRouter();
  const certificateCode = params.certificateCode as string;
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (certificateCode) {
      loadQuestions();
    }
  }, [certificateCode]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/saved-questions?certificateCode=${encodeURIComponent(certificateCode)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load questions');
      }
      
      const data = await response.json();
      setQuestions(data.questions || []);
      
      // Set certificate info from API response
      if (data.certificate) {
        setCertificateInfo({
          certificateCode: data.certificate.code,
          certificateTitle: data.certificate.name,
          totalQuestions: data.questions?.length || 0
        });
      } else if (data.questions && data.questions.length > 0) {
        // Fallback if certificate info not available
        setCertificateInfo({
          certificateCode: certificateCode,
          certificateTitle: `Certificate ${certificateCode}`,
          totalQuestions: data.questions.length
        });
      }
      
      if (data.questions?.length === 0) {
        toast({
          title: "No Questions",
          description: "No questions found for this certificate.",
        });
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionClick = (questionNo: number) => {
    router.push(`/saved-questions/question/${questionNo}?from=certificate&certificateCode=${encodeURIComponent(certificateCode)}`);
  };

  const handleBackClick = () => {
    router.push('/saved-questions');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-gray-600">Loading questions...</span>
          </div>
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
            Back to Saved Questions
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {certificateInfo?.certificateTitle || `Certificate ${certificateCode}`}
              </h1>
              <p className="text-gray-600">
                Questions for certificate code: <code className="bg-gray-200 px-2 py-1 rounded">{certificateCode}</code>
              </p>
            </div>
          </div>
          
          {certificateInfo && (
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                {certificateInfo.totalQuestions} questions
              </Badge>
              <Badge variant="outline" className="text-sm">
                {certificateCode}
              </Badge>
            </div>
          )}
        </div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
              <p className="text-gray-600">
                No questions found for certificate code "{certificateCode}".
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <Card 
                key={question.question_no}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handleQuestionClick(question.question_no)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between group-hover:text-blue-600 transition-colors">
                    <span>Question {question.question_no}</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 line-clamp-3 mb-3">
                    {question.question}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getQuestionOptions(question).length} options
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Answer: {getCorrectAnswer(question) + 1}
                    </Badge>
                    {question.explanation && (
                      <Badge variant="default" className="text-xs">
                        Has explanation
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Footer */}
        {questions.length > 0 && (
          <Card className="mt-8">
            <CardContent className="text-center py-6">
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                <span>Total Questions: <strong>{questions.length}</strong></span>
                <span>•</span>
                <span>Certificate: <strong>{certificateCode}</strong></span>
                <span>•</span>
                <span>Click any question to view details</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CertificateQuestionsPage;
