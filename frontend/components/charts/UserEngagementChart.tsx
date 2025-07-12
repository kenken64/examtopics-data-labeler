import ChartWrapper, { Bar } from './ChartWrapper';

interface UserEngagementChartProps {
  data: Array<{
    accessCode: string;
    userCount: number;
    totalAttempts: number;
    avgScore: number;
  }>;
}

export default function UserEngagementChart({ data }: UserEngagementChartProps) {
  // Take top 10 access codes by user count
  const topEngagement = data.slice(0, 10);

  const chartData = {
    labels: topEngagement.map(item => item.accessCode),
    datasets: [
      {
        label: 'Unique Users',
        data: topEngagement.map(item => item.userCount),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        label: 'Total Attempts',
        data: topEngagement.map(item => item.totalAttempts),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Top Access Codes by User Engagement',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Unique Users',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Total Attempts',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  if (topEngagement.length === 0) {
    return (
      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">No user engagement data available</span>
      </div>
    );
  }

  return (
    <ChartWrapper>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </ChartWrapper>
  );
}
