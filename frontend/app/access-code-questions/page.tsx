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
  CheckCircle,
  ChevronLeft,
  ChevronRight
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
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  
  // Question range search state
  const [enableRangeSearch, setEnableRangeSearch] = useState(false);
  const [fromQuestionNo, setFromQuestionNo] = useState('');
  const [toQuestionNo, setToQuestionNo] = useState('');

  const loadAssignment = useCallback(async () => {
    if (!generatedAccessCode.trim()) {
      setError('Please enter a generated access code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        generatedAccessCode,
        includeDisabled: includeDisabled.toString(),
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      // Add question range parameters if enabled
      if (enableRangeSearch) {
        if (fromQuestionNo.trim()) {
          params.append('fromQuestionNo', fromQuestionNo.trim());
        }
        if (toQuestionNo.trim()) {
          params.append('toQuestionNo', toQuestionNo.trim());
        }
      }

      const response = await fetch(`/api/access-code-questions?${params}`);
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
  }, [generatedAccessCode, includeDisabled, currentPage, itemsPerPage, enableRangeSearch, fromQuestionNo, toQuestionNo]);

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
        // Reload to get fresh data while maintaining current page
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

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page when searching
    loadAssignment();
  };

  const handleRangeToggle = (enabled: boolean) => {
    setEnableRangeSearch(enabled);
    if (!enabled) {
      setFromQuestionNo('');
      setToQuestionNo('');
      setCurrentPage(1);
    }
  };

  useEffect(() => {
    if (generatedAccessCode) {
      loadAssignment();
    }
  }, [loadAssignment]);

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
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
            <Button onClick={handleSearch} disabled={loading} className="min-h-[44px] w-full sm:w-auto">
              {loading ? 'Loading...' : 'Load Assignment'}
            </Button>
          </div>

          {/* Question Range Search */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="enableRangeSearch"
                checked={enableRangeSearch}
                onChange={(e) => handleRangeToggle(e.target.checked)}
                className="min-h-[20px] min-w-[20px]"
              />
              <label htmlFor="enableRangeSearch" className="text-sm font-medium">
                Search by question number range
              </label>
            </div>
            
            {enableRangeSearch && (
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 min-w-[40px]">From:</label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={fromQuestionNo}
                    onChange={(e) => setFromQuestionNo(e.target.value)}
                    className="w-20"
                    min="1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 min-w-[25px]">To:</label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={toQuestionNo}
                    onChange={(e) => setToQuestionNo(e.target.value)}
                    className="w-20"
                    min="1"
                  />
                </div>
                <Button 
                  onClick={handleSearch} 
                  disabled={loading}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Apply Range
                </Button>
              </div>
            )}
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
                    {assignment.pagination && (
                      <Badge variant="outline">
                        Page {assignment.pagination.currentPage} of {assignment.pagination.totalPages}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Question Assignments</span>
                {assignment.pagination && (
                  <div className="text-sm text-muted-foreground">
                    Showing {((assignment.pagination.currentPage - 1) * assignment.pagination.itemsPerPage) + 1} - {Math.min(assignment.pagination.currentPage * assignment.pagination.itemsPerPage, assignment.pagination.totalItems)} of {assignment.pagination.totalItems} questions
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                Reorder questions and toggle their enabled status. Changes are tracked and saved when you click &ldquo;Save Changes&rdquo;.
              </CardDescription>
            </CardHeader>
            
            {/* Pagination Controls - Top */}
            {assignment.pagination && assignment.pagination.totalPages > 1 && (
              <div className="px-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(assignment.pagination.currentPage - 1)}
                      disabled={!assignment.pagination.hasPreviousPage || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(assignment.pagination.currentPage + 1)}
                      disabled={!assignment.pagination.hasNextPage || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, assignment.pagination.totalPages) }, (_, i) => {
                      const pageNum = assignment.pagination.currentPage <= 3 
                        ? i + 1 
                        : assignment.pagination.currentPage >= assignment.pagination.totalPages - 2
                        ? assignment.pagination.totalPages - 4 + i
                        : assignment.pagination.currentPage - 2 + i;
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === assignment.pagination.currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
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
              
              {/* Pagination Controls - Bottom */}
              {assignment.pagination && assignment.pagination.totalPages > 1 && (
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(assignment.pagination.currentPage - 1)}
                        disabled={!assignment.pagination.hasPreviousPage || loading}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(assignment.pagination.currentPage + 1)}
                        disabled={!assignment.pagination.hasNextPage || loading}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Page {assignment.pagination.currentPage} of {assignment.pagination.totalPages}
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, assignment.pagination.totalPages) }, (_, i) => {
                        const pageNum = assignment.pagination.currentPage <= 3 
                          ? i + 1 
                          : assignment.pagination.currentPage >= assignment.pagination.totalPages - 2
                          ? assignment.pagination.totalPages - 4 + i
                          : assignment.pagination.currentPage - 2 + i;
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === assignment.pagination.currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loading}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </div>
  );
}
