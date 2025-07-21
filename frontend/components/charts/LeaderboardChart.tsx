import { useEffect } from 'react';
import ChartWrapper, { Bar } from './ChartWrapper';

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

interface LeaderboardChartProps {
  data: LeaderboardPlayer[];
}

export default function LeaderboardChart({ data }: LeaderboardChartProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔥 LEADERBOARD CHART FUNCTION CALLED!!!');
      console.log('🚀 LeaderboardChart: === COMPONENT START ===');
      console.log('📈 LeaderboardChart: Received data:', data);
      console.log('📈 LeaderboardChart: Data type:', typeof data);
      console.log('📈 LeaderboardChart: Data length:', data?.length);
      console.log('📈 LeaderboardChart: Data is array:', Array.isArray(data));
      
      if (data && data.length > 0) {
        console.log('📈 LeaderboardChart: First player sample:', data[0]);
        data.forEach((player, index) => {
          console.log(`📈 Player ${index + 1}:`, {
            name: player.displayName || player.username,
            points: player.totalPoints,
            source: player.source
          });
        });
      }
    }
  }, [data]);
  
  if (!data || data.length === 0) {
    return (
      <ChartWrapper>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-sm">No leaderboard data available</p>
            <p className="text-xs mt-1">Data length: {data?.length || 0}</p>
          </div>
        </div>
      </ChartWrapper>
    );
  }

  const topPlayers = data.slice(0, 10);

  const labels = topPlayers.map(player => player.displayName || player.username);
  const points = topPlayers.map(player => player.totalPoints);
  const colors = topPlayers.map(player => 
    player.source === 'registered' 
      ? 'rgba(59, 130, 246, 0.8)'  // Blue for registered users
      : 'rgba(16, 185, 129, 0.8)'  // Green for QuizBlitz players
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Total Points',
        data: points,
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('0.8)', '1)')),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Top 10 Players - Global Leaderboard',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const player = topPlayers[context.dataIndex];
            return [
              `Points: ${player.totalPoints}`,
              `Quizzes: ${player.quizzesTaken}`,
              `Accuracy: ${player.accuracy.toFixed(1)}%`,
              `Source: ${player.source === 'registered' ? 'Registered' : 'QuizBlitz'}`
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Points',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Players',
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
        },
      },
    },
  };

  return (
    <ChartWrapper>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
      <div className="mt-4">
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Registered Users</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>QuizBlitz Players</span>
            </div>
          </div>
        </div>
        <div className="mt-3 text-center">
          <p className="text-xs text-muted-foreground">
            Showing top {topPlayers.length} players by total points
          </p>
        </div>
      </div>
    </ChartWrapper>
  );
}