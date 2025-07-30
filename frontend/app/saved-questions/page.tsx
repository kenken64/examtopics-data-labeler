"use client";

import { useState, useEffect } from 'react';
import { Search, BookOpen, Users, ChevronRight, Loader2, Link, ExternalLink, ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { getQuestionOptions } from '../utils/questionTransform';

interface AccessCodeInfo {
  _id: string;
  originalAccessCode: string;
  generatedAccessCode: string;
  status: string;
  paymentDate: string;
  payeeName: string;
  certificateCode: string;
  certificateTitle: string;
  isLinkedToQuestions?: boolean; // New field to track if questions are linked
}

interface Question {
  _id: string;
  question_no: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  [key: string]: unknown; // Allow additional properties for Record compatibility
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalQuestions: number;
  questionsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface UserInfo {
  email: string;
  role: string;
  isAdmin: boolean;
}

const SavedQuestionsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [accessCodes, setAccessCodes] = useState<AccessCodeInfo[]>([]);
  const [searchResults, setSearchResults] = useState<Question[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [filterApplied, setFilterApplied] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingAccessCodes, setLoadingAccessCodes] = useState(true);
  const [searchMode, setSearchMode] = useState<'browse' | 'search'>('browse');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Load access codes on component mount
  useEffect(() => {
    loadAccessCodes();
  }, []);

  const loadAccessCodes = async () => {
    try {
      setLoadingAccessCodes(true);
      const response = await fetch('/api/saved-questions?listAccessCodes=true');
      
      if (!response.ok) {
        throw new Error('Failed to load access codes');
      }
      
      const data = await response.json();
      setAccessCodes(data.accessCodes || []);
      
      // Handle enhanced response with user info
      if (data.userInfo) {
        setUserInfo(data.userInfo);
        setFilterApplied(data.filterApplied || '');
      }
    } catch (error) {
      console.error('Error loading access codes:', error);
      toast({
        title: "Error",
        description: "Failed to load access codes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingAccessCodes(false);
    }
  };

  const handleSearch = async (page: number = 1) => {
    if (!searchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter an access code to search.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setSearchMode('search');
      setCurrentPage(page);
      
      const url = `/api/saved-questions?accessCode=${encodeURIComponent(searchTerm.trim())}&page=${page}&limit=50`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }
      
      const data = await response.json();
      setSearchResults(data.questions || []);
      setPagination(data.pagination || null);
      
      if (data.questions?.length === 0) {
        toast({
          title: "No Results",
          description: "No questions found for this access code.",
        });
      } else {
        toast({
          title: "Success",
          description: `Found ${data.pagination?.totalQuestions || data.questions?.length} questions.`,
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Search failed. Please try again.",
        variant: "destructive",
      });
      setSearchResults([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAccessCodeClick = (certificateCode: string) => {
    router.push(`/saved-questions/certificate/${certificateCode}`);
  };

  const handleLinkAccessCode = async (accessCode: AccessCodeInfo, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click

    try {
      // Find the payee ID by access code - this is a simplified approach
      // In a real implementation, you might want to store the payee ID in AccessCodeInfo
      const response = await fetch('/api/link-access-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generatedAccessCode: accessCode.generatedAccessCode,
          forceRelink: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to link access code');
      }

      const result = await response.json();

      // Update local state
      setAccessCodes(prev => prev.map(ac => 
        ac._id === accessCode._id 
          ? { ...ac, isLinkedToQuestions: true }
          : ac
      ));

      toast({
        title: "Success",
        description: `Successfully linked ${result.linkedQuestions} questions to access code ${result.accessCode}`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Reset to page 1 when search term changes
  const resetSearch = () => {
    setCurrentPage(1);
    setPagination(null);
    setSearchResults([]);
    setSearchMode('browse');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && pagination && newPage <= pagination.totalPages) {
      handleSearch(newPage);
    }
  };

  const handleQuestionClick = (questionNo: number) => {
    // Use the trimmed search term that was actually used for the search
    const actualAccessCode = searchTerm.trim();
    router.push(`/saved-questions/question/${questionNo}?from=search&accessCode=${encodeURIComponent(actualAccessCode)}`);
  };

  const handleBackToBrowse = () => {
    setSearchMode('browse');
    setSearchResults([]);
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 pl-16 sm:pl-20 lg:pl-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Saved Questions</h1>
              <p className="text-gray-600 text-sm sm:text-base">Search and browse your saved exam questions</p>
            </div>
            
            {/* Role and Data Scope Indicators */}
            {userInfo && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge 
                  variant={userInfo.isAdmin ? "default" : "secondary"}
                  className="text-xs"
                >
                  {userInfo.isAdmin ? "Admin" : "User"}: {userInfo.email}
                </Badge>
                {filterApplied && (
                  <Badge variant="outline" className="text-xs">
                    {filterApplied}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Questions
            </CardTitle>
            <CardDescription>
              Enter an access code to search for specific questions (accepts both original and generated codes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Enter original or generated access code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 min-h-[44px]"
              />
              <Button onClick={() => handleSearch()} disabled={loading} className="min-h-[44px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
              {searchMode === 'search' && (
                <Button variant="outline" onClick={handleBackToBrowse} className="min-h-[44px]">
                  Back to Browse
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content based on mode */}
        {searchMode === 'browse' ? (
          /* Browse Mode - Show Access Codes */
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Available Access Codes</h2>
              <Badge variant="secondary">{accessCodes.length} codes</Badge>
            </div>

            {loadingAccessCodes ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2 text-gray-600">Loading access codes...</span>
              </div>
            ) : accessCodes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Access Codes Found</h3>
                  <p className="text-gray-600">No paid customers with certificates found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accessCodes.map((accessCode) => (
                  <Card 
                    key={accessCode._id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleAccessCodeClick(accessCode.certificateCode)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span className="truncate">{accessCode.certificateTitle}</span>
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      </CardTitle>
                      <CardDescription className="text-sm">
                        <strong>Customer:</strong> {accessCode.payeeName}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Original Code:</span>
                          <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                            {accessCode.originalAccessCode}
                          </code>
                        </div>
                        <div>
                          <span className="font-medium">Generated Code:</span>
                          <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                            {accessCode.generatedAccessCode}
                          </code>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <Badge variant="outline" className="text-xs">
                            {accessCode.certificateCode}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-xs">
                              {accessCode.status}
                            </Badge>
                            {accessCode.generatedAccessCode && (
                              <Badge 
                                variant={accessCode.isLinkedToQuestions ? "default" : "secondary"}
                                className={`text-xs ${accessCode.isLinkedToQuestions ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
                              >
                                {accessCode.isLinkedToQuestions ? "Linked" : "Not Linked"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {accessCode.generatedAccessCode && !accessCode.isLinkedToQuestions && (
                          <div className="mt-2 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleLinkAccessCode(accessCode, e)}
                              className="w-full text-blue-600 hover:text-blue-700"
                            >
                              <Link className="h-4 w-4 mr-2" />
                              Link to Questions
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Search Mode - Show Search Results */
          <div>
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Search Results</h2>
              <Badge variant="secondary">
                {pagination ? `${pagination.totalQuestions} total` : `${searchResults.length} questions`}
              </Badge>
              {pagination && (
                <Badge variant="outline" className="text-xs">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </Badge>
              )}
            </div>

            {searchResults.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
                  <p className="text-gray-600">No questions found for access code &ldquo;{searchTerm}&rdquo;.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {searchResults.map((question) => (
                  <Card 
                    key={question.question_no}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleQuestionClick(question.question_no)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Question {question.question_no}</span>
                        <ChevronRight className="h-4 w-4" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 line-clamp-3">
                        {question.question}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getQuestionOptions(question).length} options
                        </Badge>
                        {question.explanation && (
                          <Badge variant="secondary" className="text-xs">
                            Has explanation
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.currentPage - 1) * pagination.questionsPerPage) + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.questionsPerPage, pagination.totalQuestions)} of{' '}
                  {pagination.totalQuestions} questions
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {/* Show page numbers */}
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.currentPage >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedQuestionsPage;
