import ChartWrapper, { Line } from './ChartWrapper';

interface QuizAttemptsChartProps {
  data: Array<{
    _id: { year: number; month: number; day: number };
    attempts: number;
    avgScore: number;
  }>;
}

export default function QuizAttemptsChart({ data }: QuizAttemptsChartProps) {
  // Sort data by date
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a._id.year, a._id.month - 1, a._id.day);
    const dateB = new Date(b._id.year, b._id.month - 1, b._id.day);
    return dateA.getTime() - dateB.getTime();
  });

  const chartData = {
    labels: sortedData.map(item => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Quiz Attempts',
        data: sortedData.map(item => item.attempts),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        yAxisID: 'y',
      },
      {
        label: 'Average Score (%)',
        data: sortedData.map(item => (item.avgScore || 0) * 100),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: 'Quiz Attempts & Performance Trends (Last 30 Days)',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Number of Attempts',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Average Score (%)',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  if (sortedData.length === 0) {
    return (
      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">No quiz attempt data available</span>
      </div>
    );
  }

  return (
    <ChartWrapper>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </ChartWrapper>
  );
}
