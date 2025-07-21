'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, TrendingUp, Users, Star, Calendar, Target, Award, ChevronLeft, ChevronRight } from 'lucide-react';

interface LeaderboardUser {
  _id: string;
  username: string;
  displayName: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string;
  totalPoints: number;
  quizzesTaken: number;
  correctAnswers: number;
  totalQuestions: number;
  averageScore: number;
  bestScore: number;
  currentStreak: number;
  bestStreak: number;
  lastQuizDate: string;
  rank: string;
  accuracy: number;
  position: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  currentUserPosition?: {
    position: number;
    user: LeaderboardUser;
  };
  lastUpdated: string;
}

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/leaderboard?page=${page}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      
      const data = await response.json();
      setLeaderboardData(data);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(1);
  }, []);

  const handlePageChange = (page: number) => {
    if (page >= 1 && leaderboardData && page <= leaderboardData.pagination.totalPages) {
      fetchLeaderboard(page);
    }
  };

  const getRankIcon = (position: number) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (position === 3) return <Trophy className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-semibold text-gray-600">#{position}</span>;
  };

  const getRankColor = (position: number) => {
    if (position === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (position === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500';
    if (position === 3) return 'bg-gradient-to-r from-amber-400 to-amber-600';
    return 'bg-gradient-to-r from-purple-500 to-blue-600';
  };

  const getRankBadge = (rank: string) => {
    const colors = {
      'Beginner': 'bg-gray-100 text-gray-800',
      'Novice': 'bg-green-100 text-green-800',
      'Intermediate': 'bg-blue-100 text-blue-800',
      'Advanced': 'bg-purple-100 text-purple-800',
      'Expert': 'bg-orange-100 text-orange-800',
      'Master': 'bg-red-100 text-red-800',
    };
    return colors[rank as keyof typeof colors] || colors['Beginner'];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = (displayName: string) => {
    return displayName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <Card className="text-center p-8">
            <div className="text-red-500 mb-4">
              <Trophy className="w-16 h-16 mx-auto opacity-50" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Leaderboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => fetchLeaderboard(currentPage)} className="bg-purple-600 hover:bg-purple-700">
              Try Again
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto pt-20">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-4">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Global Leaderboard
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Compete with quiz masters worldwide and climb the ranks based on your total points, accuracy, and achievements.
          </p>
        </div>

        {/* Stats Overview */}
        {leaderboardData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-xl">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-gray-900">{leaderboardData.pagination.totalUsers.toLocaleString()}</h3>
                <p className="text-gray-600">Active Players</p>
              </CardContent>
            </Card>
            
            <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-xl">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-gray-900">
                  {leaderboardData.leaderboard[0]?.totalPoints.toLocaleString() || 0}
                </h3>
                <p className="text-gray-600">Top Score</p>
              </CardContent>
            </Card>
            
            <Card className="backdrop-blur-sm bg-white/70 border-0 shadow-xl">
              <CardContent className="p-6 text-center">
                <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-gray-900">
                  {leaderboardData.lastUpdated ? formatDate(leaderboardData.lastUpdated) : 'Today'}
                </h3>
                <p className="text-gray-600">Last Updated</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leaderboard */}
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Top Players
              {leaderboardData && (
                <Badge variant="secondary" className="ml-auto">
                  Page {leaderboardData.pagination.currentPage} of {leaderboardData.pagination.totalPages}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Rankings based on total points, average score, and quiz performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboardData?.leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Players Yet</h3>
                <p className="text-gray-500">Be the first to take a quiz and appear on the leaderboard!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboardData?.leaderboard.map((user, index) => (
                  <div
                    key={user._id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-all hover:shadow-md ${
                      user.position <= 3 
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' 
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12">
                      {getRankIcon(user.position)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-12 h-12 border-2 border-gray-200">
                      <AvatarImage 
                        src={user.profilePhotoUrl} 
                        alt={user.displayName} 
                      />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white font-semibold">
                        {getInitials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {user.displayName}
                        </h3>
                        <Badge className={getRankBadge(user.rank)}>
                          {user.rank}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {Math.round(user.accuracy)}% accuracy
                        </span>
                        <span>{user.quizzesTaken} quizzes</span>
                        {user.currentStreak > 0 && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <Star className="w-3 h-3 fill-current" />
                            {user.currentStreak} streak
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {user.totalPoints.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">points</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {leaderboardData && leaderboardData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="text-sm text-gray-600">
                  Showing {((leaderboardData.pagination.currentPage - 1) * 20) + 1} to{' '}
                  {Math.min(leaderboardData.pagination.currentPage * 20, leaderboardData.pagination.totalUsers)} of{' '}
                  {leaderboardData.pagination.totalUsers} players
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!leaderboardData.pagination.hasPreviousPage}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 px-3">
                    Page {currentPage} of {leaderboardData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!leaderboardData.pagination.hasNextPage}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}