"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Activity, 
  Award,
  FileText,
  Target,
  Clock,
  BookmarkCheck,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  User,
  Settings
} from "lucide-react";

// Chart components
import CertificateStatsChart from "@/components/charts/CertificateStatsChart";
import QuizAttemptsChart from "@/components/charts/QuizAttemptsChart";
import AccessCodeStatusChart from "@/components/charts/AccessCodeStatusChart";
import UserEngagementChart from "@/components/charts/UserEngagementChart";
import PayeeStatusChart from "@/components/charts/PayeeStatusChart";
import PdfAttachmentChart from "@/components/charts/PdfAttachmentChart";

interface DashboardData {
  certificates: Array<{
    _id: string;
    name: string;
    code: string;
    questionCount: number;
    lastQuestionAdded: string;
  }>;
  accessCodes: {
    totalAccessCodes: number;
    totalAssignments: number;
    totalEnabled: number;
    totalDisabled: number;
    avgQuestionsPerCode: number;
  };
  quizAttempts: {
    totalAttempts: number;
    uniqueUsers: number;
    avgScore: number;
    overallAccuracy: number;
  };
  recentActivity: Array<{
    _id: { year: number; month: number; day: number };
    attempts: number;
    avgScore: number;
  }>;
  userEngagement: Array<{
    accessCode: string;
    userCount: number;
    totalAttempts: number;
    avgScore: number;
  }>;
  bookmarks: {
    totalBookmarks: number;
    uniqueUsers: number;
  };
  wrongAnswers: {
    totalWrongAnswers: number;
    uniqueUsers: number;
  };
  payees: Array<{
    paymentStatus: string;
    count: number;
  }>;
  pdfAttachments: Array<{
    _id: boolean;
    count: number;
    certificates: Array<{
      _id: string;
      name: string;
      code: string;
      pdfFileName: string;
    }>;
  }>;
  lastUpdated: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAuth = async () => {
      const res = await fetch('/api/auth/verify');
      if (res.status !== 200) {
        router.push('/'); // Redirect to login page
        return false;
      }
      return true;
    };

    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth().then(isAuthenticated => {
      if (isAuthenticated) {
        fetchDashboardData();
      }
    });
  }, [router]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Failed to refresh dashboard data');
      }
      const dashboardData = await response.json();
      setData(dashboardData);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 pl-12 sm:pl-16 lg:pl-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 pl-12 sm:pl-16 lg:pl-20 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refreshData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Calculate totals for overview cards
  const totalQuestions = data.certificates.reduce((sum, cert) => sum + cert.questionCount, 0);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pl-16 sm:pl-20 lg:pl-24">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              AWS Certification Management System Overview
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              Updated {new Date(data.lastUpdated).toLocaleTimeString()}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
            <Button size="sm" variant="outline" onClick={refreshData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuestions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across {data.certificates.length} certificates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.quizAttempts.totalAttempts.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {data.quizAttempts.uniqueUsers} unique users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(data.quizAttempts.avgScore || 0).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {(data.quizAttempts.overallAccuracy || 0).toFixed(1)}% overall accuracy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Access Codes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.accessCodes.totalAccessCodes}</div>
              <p className="text-xs text-muted-foreground">
                {data.accessCodes.totalAssignments} total assignments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Analytics & Trends</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Certificate Questions Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Certificate Distribution
                </CardTitle>
                <CardDescription>
                  Visual breakdown of questions per certificate type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CertificateStatsChart data={data.certificates} />
              </CardContent>
            </Card>

            {/* Access Code Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Question Status
                </CardTitle>
                <CardDescription>
                  Enabled vs disabled question distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AccessCodeStatusChart data={data.accessCodes} />
              </CardContent>
            </Card>

            {/* Quiz Attempts Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Quiz Performance Trends
                </CardTitle>
                <CardDescription>
                  Daily quiz attempts and average scores over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuizAttemptsChart data={data.recentActivity} />
              </CardContent>
            </Card>

            {/* User Engagement Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Access Code Engagement
                </CardTitle>
                <CardDescription>
                  Top performing access codes by user count and attempts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserEngagementChart data={data.userEngagement} />
              </CardContent>
            </Card>

            {/* Payee Status Chart */}
            {data.payees.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Payment Status
                  </CardTitle>
                  <CardDescription>
                    Customer payment status distribution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PayeeStatusChart data={data.payees} />
                </CardContent>
              </Card>
            )}

            {/* PDF Attachment Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  PDF Attachments
                </CardTitle>
                <CardDescription>
                  Certificate PDF attachment distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PdfAttachmentChart data={data.pdfAttachments || []} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Certificates Overview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Certificates & Questions
              </CardTitle>
              <CardDescription>
                Question distribution across AWS certification types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.certificates.length > 0 ? (
                  data.certificates.map((cert, index) => (
                    <div key={cert._id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-8 bg-primary rounded-full" />
                        <div>
                          <h3 className="font-semibold">{cert.name}</h3>
                          <p className="text-sm text-muted-foreground">{cert.code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{cert.questionCount}</div>
                        <p className="text-xs text-muted-foreground">
                          {cert.questionCount === 1 ? 'question' : 'questions'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No questions found. Start by adding certificates and questions.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Access Code Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Access Code Status
              </CardTitle>
              <CardDescription>
                Question assignment and enablement status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Assignments</span>
                  <Badge variant="secondary">{data.accessCodes.totalAssignments}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-600">Enabled Questions</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {data.accessCodes.totalEnabled}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-600">Disabled Questions</span>
                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                    {data.accessCodes.totalDisabled}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Avg per Access Code</span>
                  <Badge variant="outline">
                    {(data.accessCodes.avgQuestionsPerCode || 0).toFixed(1)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Engagement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                User Engagement
              </CardTitle>
              <CardDescription>
                Learning activity and interaction metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookmarkCheck className="mr-2 h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Bookmarks</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{data.bookmarks.totalBookmarks}</div>
                    <div className="text-xs text-muted-foreground">
                      {data.bookmarks.uniqueUsers} users
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Wrong Answers</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{data.wrongAnswers.totalWrongAnswers}</div>
                    <div className="text-xs text-muted-foreground">
                      {data.wrongAnswers.uniqueUsers} users
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {((data.bookmarks.totalBookmarks / (data.quizAttempts.totalAttempts || 1)) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Bookmark rate per attempt
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Access Codes */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Top Access Codes by Engagement
              </CardTitle>
              <CardDescription>
                Most active access codes by user count and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.userEngagement.length > 0 ? (
                  data.userEngagement.slice(0, 5).map((engagement, index) => (
                    <div key={engagement.accessCode} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-mono text-sm font-semibold">{engagement.accessCode}</div>
                          <div className="text-xs text-muted-foreground">
                            {engagement.totalAttempts} attempts
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{engagement.userCount} users</div>
                        <div className="text-xs text-muted-foreground">
                          {(engagement.avgScore || 0).toFixed(1)}% avg score
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No quiz attempts recorded yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and navigation shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-16 flex-col" onClick={() => router.push('/labeler')}>
                <FileText className="h-6 w-6 mb-2" />
                PDF Labeler
              </Button>
              <Button variant="outline" className="h-16 flex-col" onClick={() => router.push('/certificates')}>
                <Award className="h-6 w-6 mb-2" />
                Certificates
              </Button>
              <Button variant="outline" className="h-16 flex-col" onClick={() => router.push('/access-codes')}>
                <Users className="h-6 w-6 mb-2" />
                Access Codes
              </Button>
              <Button variant="outline" className="h-16 flex-col" onClick={() => router.push('/access-code-questions')}>
                <BookOpen className="h-6 w-6 mb-2" />
                Manage Questions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}