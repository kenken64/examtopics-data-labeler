"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import PdfAttachmentChart from '@/components/charts/PdfAttachmentChart';
import LeaderboardChart from '@/components/charts/LeaderboardChart';

interface LeaderboardPlayer {
  _id: string;
  username: string;
  displayName: string;
  totalPoints: number;
  quizzesTaken: number;
  accuracy: number;
  source: 'registered' | 'quizblitz';
  position: number;
}

interface DashboardData {
  pdfAttachmentStats: Array<{
    _id: boolean;
    count: number;
    certificates: Array<{
      _id: string;
      name: string;
      code: string;
      pdfFileName: string;
    }>;
  }>;
}

export default function Dashboard() {
  const [message, setMessage] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      const res = await fetch('/api/auth/verify');
      if (res.status !== 200) {
        router.push('/');
      } else {
        setMessage('Welcome to your protected dashboard!');
        // Fetch dashboard data
        fetchDashboardData();
      }
    };
    verifyAuth();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard data
      const dashboardResponse = await fetch('/api/dashboard');
      if (dashboardResponse.ok) {
        const data = await dashboardResponse.json();
        setDashboardData(data);
      }

      // Fetch leaderboard data
      const leaderboardResponse = await fetch('/api/leaderboard?limit=10');
      if (leaderboardResponse.ok) {
        const leaderboardResult = await leaderboardResponse.json();
        setLeaderboardData(leaderboardResult.leaderboard || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-gray-700">{message}</p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">PDF Attachments</h2>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <PdfAttachmentChart data={dashboardData?.pdfAttachmentStats || []} />
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Global Leaderboard</h2>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <>
                <div className="mb-2 text-sm text-gray-600">
                  Debug: {leaderboardData.length} players loaded
                </div>
                <LeaderboardChart data={leaderboardData.length > 0 ? leaderboardData : [
                  {
                    _id: "test1",
                    username: "testuser1",
                    displayName: "Test User 1",
                    totalPoints: 100,
                    quizzesTaken: 5,
                    accuracy: 85,
                    source: "registered" as const,
                    position: 1
                  },
                  {
                    _id: "test2",
                    username: "testuser2",
                    displayName: "Test User 2",
                    totalPoints: 80,
                    quizzesTaken: 4,
                    accuracy: 75,
                    source: "quizblitz" as const,
                    position: 2
                  }
                ]} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
