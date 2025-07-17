"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Save,
  Search,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { getQuestionOptions, getCorrectAnswer } from '../utils/questionTransform';

interface Question {
  _id: string;
  assignedQuestionNo: number;
  originalQuestionNo: number;
  isEnabled: boolean;
  sortOrder: number;
  assignedAt: string;
  updatedAt: string;
  question: {
    _id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    createdAt: string;
  };
}

interface QuestionAssignment {
  _id: string;
  generatedAccessCode: string;
  questions: Question[];
  stats: {
    totalQuestions: number;
    enabledQuestions: number;
    disabledQuestions: number;
  };
  payee: {
    _id: string;
    payeeName: string;
    originalAccessCode: string;
  };
  certificate: {
    _id: string;
    name: string;
    code: string;
  };
}

export default function AccessCodeQuestionsManagement() {
  const [generatedAccessCode, setGeneratedAccessCode] = useState('');
  const [assignment, setAssignment] = useState<QuestionAssignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingUpdates, setPendingUpdates] = useState<{ _id: string; isEnabled?: boolean; sortOrder?: number; assignedQuestionNo?: number }[]>([]);
  const [includeDisabled, setIncludeDisabled] = useState(true);

  const loadAssignment = useCallback(async () => {
    if (!generatedAccessCode.trim()) {
      setError('Please enter a generated access code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/access-code-questions?generatedAccessCode=${encodeURIComponent(generatedAccessCode)}&includeDisabled=${includeDisabled}`);
      const data = await response.json();

      if (data.success) {
        setAssignment(data);
        setPendingUpdates([]);
      } else {
        setError(data.message || 'Failed to load assignment');
        setAssignment(null);
      }
    } catch {
      setError('Failed to fetch assignment data');
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  }, [generatedAccessCode, includeDisabled]);

  const toggleQuestionStatus = (questionId: string) => {
    if (!assignment) return;

    const updatedQuestions = assignment.questions.map(q => 
      q._id === questionId ? { ...q, isEnabled: !q.isEnabled } : q
    );

    setAssignment({
      ...assignment,
      questions: updatedQuestions
    });

    // Track pending update
    const existingUpdate = pendingUpdates.find(u => u._id === questionId);
    if (existingUpdate) {
      existingUpdate.isEnabled = !existingUpdate.isEnabled;
    } else {
      const question = assignment.questions.find(q => q._id === questionId);
      if (question) {
        setPendingUpdates([...pendingUpdates, {
          _id: questionId,
          isEnabled: !question.isEnabled
        }]);
      }
    }
  };

  const moveQuestion = (questionId: string, direction: 'up' | 'down') => {
    if (!assignment) return;

    const questions = [...assignment.questions];
    const currentIndex = questions.findIndex(q => q._id === questionId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= questions.length) return;

    // Swap questions
    [questions[currentIndex], questions[newIndex]] = [questions[newIndex], questions[currentIndex]];
    
    // Update sort orders and assigned question numbers
    questions.forEach((q, index) => {
      q.sortOrder = index + 1;
      q.assignedQuestionNo = index + 1;
    });

    setAssignment({
      ...assignment,
      questions
    });

    // Track pending updates for both affected questions
    const updates = [
      {
        _id: questions[currentIndex]._id,
        sortOrder: questions[currentIndex].sortOrder,
        assignedQuestionNo: questions[currentIndex].assignedQuestionNo
      },
      {
        _id: questions[newIndex]._id,
        sortOrder: questions[newIndex].sortOrder,
        assignedQuestionNo: questions[newIndex].assignedQuestionNo
      }
    ];

    // Merge with existing pending updates
    const newPendingUpdates = [...pendingUpdates];
    updates.forEach(update => {
      const existingIndex = newPendingUpdates.findIndex(u => u._id === update._id);
      if (existingIndex >= 0) {
        newPendingUpdates[existingIndex] = { ...newPendingUpdates[existingIndex], ...update };
      } else {
        newPendingUpdates.push(update);
      }
    });

    setPendingUpdates(newPendingUpdates);
  };

  const saveChanges = async () => {
    if (!assignment || pendingUpdates.length === 0) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/access-code-questions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          generatedAccessCode: assignment.generatedAccessCode,
          updates: pendingUpdates
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Updated ${data.modifiedCount} question assignments`);
        setPendingUpdates([]);
        // Reload to get fresh data
        await loadAssignment();
      } else {
        setError(data.message || 'Failed to save changes');
      }
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setPendingUpdates([]);
    loadAssignment();
  };

  useEffect(() => {
    if (generatedAccessCode) {
      loadAssignment();
    }
  }, [includeDisabled, generatedAccessCode, loadAssignment]);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pl-16 sm:pl-20 lg:pl-24">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Access Code Questions Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage question assignments for generated access codes. Reorder questions and enable/disable them as needed.
          </p>
        </div>

      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Access Code Assignment
          </CardTitle>
          <CardDescription>
            Enter a generated access code to manage its question assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
            <div className="flex-1">
              <Input
                placeholder="Enter generated access code (e.g., AC-9K363CQ4)"
                value={generatedAccessCode}
                onChange={(e) => setGeneratedAccessCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && loadAssignment()}
                className="min-h-[44px]"
              />
            </div>
            <div className="flex items-center gap-2 min-h-[44px]">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeDisabled}
                  onChange={(e) => setIncludeDisabled(e.target.checked)}
                  className="min-h-[20px] min-w-[20px]"
                />
                Include disabled
              </label>
            </div>
            <Button onClick={loadAssignment} disabled={loading} className="min-h-[44px] w-full sm:w-auto">
              {loading ? 'Loading...' : 'Load Assignment'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Assignment Details */}
      {assignment && (
        <>
          {/* Summary Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Assignment Details</span>
                <div className="flex gap-2">
                  {pendingUpdates.length > 0 && (
                    <>
                      <Button variant="outline" onClick={resetChanges} size="sm">
                        Reset Changes
                      </Button>
                      <Button onClick={saveChanges} disabled={saving} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : `Save ${pendingUpdates.length} Changes`}
                      </Button>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Access Code Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Generated Code:</strong> <span className="break-all">{assignment.generatedAccessCode}</span></p>
                    <p><strong>Payee:</strong> {assignment.payee.payeeName}</p>
                    <p><strong>Original Code:</strong> <span className="break-all">{assignment.payee.originalAccessCode}</span></p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Certificate & Statistics</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Certificate:</strong> {assignment.certificate.name}</p>
                    <p><strong>Code:</strong> {assignment.certificate.code}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">
                      {assignment.stats.enabledQuestions} Enabled
                    </Badge>
                    <Badge variant="outline">
                      {assignment.stats.disabledQuestions} Disabled
                    </Badge>
                    <Badge variant="outline">
                      {assignment.stats.totalQuestions} Total
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          <Card>
            <CardHeader>
              <CardTitle>Question Assignments</CardTitle>
              <CardDescription>
                Reorder questions and toggle their enabled status. Changes are tracked and saved when you click &ldquo;Save Changes&rdquo;.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignment.questions.map((question, index) => (
                  <div
                    key={question._id}
                    className={`border rounded-lg p-4 ${!question.isEnabled ? 'bg-gray-50 opacity-75' : 'bg-white'}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant={question.isEnabled ? "default" : "secondary"}>
                            Q{question.assignedQuestionNo}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Original: Q{question.originalQuestionNo}
                          </Badge>
                          {!question.isEnabled && (
                            <Badge variant="destructive" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium mb-3 text-sm sm:text-base break-words">{question.question.question}</h4>
                        <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                          <p><strong>Options:</strong> {getQuestionOptions(question.question).length} choices</p>
                          <p><strong>Correct Answer:</strong> Option {getCorrectAnswer(question.question) + 1}</p>
                        </div>
                      </div>
                      
                      <div className="flex sm:flex-col gap-2 justify-end sm:justify-start">
                        {/* Move buttons */}
                        <div className="flex sm:flex-row gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveQuestion(question._id, 'up')}
                            disabled={index === 0}
                            className="min-h-[44px] min-w-[44px] p-2"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveQuestion(question._id, 'down')}
                            disabled={index === assignment.questions.length - 1}
                            className="min-h-[44px] min-w-[44px] p-2"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Enable/Disable button */}
                        <Button
                          variant={question.isEnabled ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleQuestionStatus(question._id)}
                          className="min-h-[44px] min-w-[44px] p-2"
                        >
                          {question.isEnabled ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </div>
  );
}
