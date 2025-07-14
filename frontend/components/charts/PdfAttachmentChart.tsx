import ChartWrapper, { Doughnut } from './ChartWrapper';

interface PdfAttachmentChartProps {
  data: Array<{
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

export default function PdfAttachmentChart({ data }: PdfAttachmentChartProps) {
  // Process the data to get counts
  const withPdf = data.find(item => item._id === true)?.count || 0;
  const withoutPdf = data.find(item => item._id === false)?.count || 0;
  const total = withPdf + withoutPdf;

  const chartData = {
    labels: ['With PDF', 'Without PDF'],
    datasets: [
      {
        data: [withPdf, withoutPdf],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)', // Green for with PDF
          'rgba(239, 68, 68, 0.8)',  // Red for without PDF
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
        labels: {
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: 'PDF Attachment Distribution',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (total === 0) {
    return (
      <ChartWrapper>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-sm">No certificate data available</p>
          </div>
        </div>
      </ChartWrapper>
    );
  }

  return (
    <ChartWrapper>
      <div className="h-64">
        <Doughnut data={chartData} options={options} />
      </div>
      <div className="mt-4 text-center">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-green-50 p-2 rounded">
            <div className="font-semibold text-green-800">{withPdf}</div>
            <div className="text-green-600">With PDF</div>
          </div>
          <div className="bg-red-50 p-2 rounded">
            <div className="font-semibold text-red-800">{withoutPdf}</div>
            <div className="text-red-600">Without PDF</div>
          </div>
        </div>
      </div>
    </ChartWrapper>
  );
}