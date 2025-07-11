import ChartWrapper, { Doughnut } from './ChartWrapper';

interface PayeeStatusChartProps {
  data: Array<{
    paymentStatus: string;
    count: number;
  }>;
}

export default function PayeeStatusChart({ data }: PayeeStatusChartProps) {
  const chartData = {
    labels: data.map(item => item.paymentStatus === 'Unknown' ? 'No Status' : item.paymentStatus),
    datasets: [
      {
        label: 'Payees by Status',
        data: data.map(item => item.count),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',  // Green for paid
          'rgba(255, 193, 7, 0.8)',  // Yellow for pending
          'rgba(239, 68, 68, 0.8)',  // Red for failed
          'rgba(156, 163, 175, 0.8)', // Gray for unknown/no status
          'rgba(99, 102, 241, 0.8)',  // Blue for processing
          'rgba(245, 158, 11, 0.8)',  // Orange for overdue
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(156, 163, 175, 1)',
          'rgba(99, 102, 241, 1)',
          'rgba(245, 158, 11, 1)',
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
        text: 'Payment Status Distribution',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
  };

  if (data.length === 0) {
    return (
      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">No payee data available</span>
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
