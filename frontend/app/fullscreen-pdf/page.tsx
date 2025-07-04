"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const FullScreenPdfViewer = dynamic(() => import('../../components/FullScreenPdfViewer'), { ssr: false });

function FullScreenPdfPageContent() {
  const searchParams = useSearchParams();
  const pdfUrl = searchParams.get('pdfUrl');
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  if (!pdfUrl) {
    return <p>Error: PDF URL not provided.</p>;
  }

  return (
    <FullScreenPdfViewer pdfUrl={pdfUrl} initialPage={initialPage} />
  );
}

export default function FullScreenPdfPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FullScreenPdfPageContent />
    </Suspense>
  );
}
