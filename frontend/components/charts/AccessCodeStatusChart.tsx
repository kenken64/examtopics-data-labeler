import ChartWrapper, { Doughnut } from './ChartWrapper';

interface AccessCodeStatusChartProps {
  data: {
    totalEnabled: number;
    totalDisabled: number;
  };
}

export default function AccessCodeStatusChart({ data }: AccessCodeStatusChartProps) {
  const chartData = {
    labels: ['Enabled Questions', 'Disabled Questions'],
    datasets: [
      {
        label: 'Question Status',
        data: [data.totalEnabled, data.totalDisabled],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)', // Green for enabled
          'rgba(239, 68, 68, 0.8)',  // Red for disabled
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Question Status Distribution',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
  };

  const total = data.totalEnabled + data.totalDisabled;
  
  if (total === 0) {
    return (
      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">No access code data available</span>
      </div>
    );
  }

  return (
    <ChartWrapper>
      <div className="h-64">
        <Doughnut data={chartData} options={options} />
      </div>
    </ChartWrapper>
  );
}
