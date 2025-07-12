import ChartWrapper, { Bar } from './ChartWrapper';

interface CertificateStatsChartProps {
  data: Array<{
    _id: string;
    name: string;
    code: string;
    questionCount: number;
  }>;
}

export default function CertificateStatsChart({ data }: CertificateStatsChartProps) {
  const chartData = {
    labels: data.map(cert => cert.code),
    datasets: [
      {
        label: 'Questions per Certificate',
        data: data.map(cert => cert.questionCount),
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
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
        text: 'Questions Distribution by Certificate',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <ChartWrapper>
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </ChartWrapper>
  );
}
