"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const PdfCanvasRenderer = dynamic(() => import("./PdfCanvasRenderer"), { ssr: false });

interface FullScreenPdfViewerProps {
  pdfUrl: string;
  initialPage: number;
}

export default function FullScreenPdfViewer({
  pdfUrl,
  initialPage,
}: FullScreenPdfViewerProps) {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNumPagesLoad = (numPages: number) => {
    setNumPages(numPages);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Full Screen PDF Viewer</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div ref={containerRef} className="flex-grow flex items-center justify-center w-full h-full overflow-auto border rounded-lg shadow-md bg-white min-h-0">
        {pdfUrl ? (
          <PdfCanvasRenderer
            pdfUrl={pdfUrl}
            currentPage={currentPage}
            onNumPagesLoad={handleNumPagesLoad}
            setError={setError}
            setCurrentPage={setCurrentPage}
          />
        ) : (
          <p>Loading PDF...</p>
        )}
      </div>
      <div className="flex items-center space-x-4 mt-4">
        <button
          onClick={goToPreviousPage}
          disabled={currentPage <= 1}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {numPages}
        </span>
        <button
          onClick={goToNextPage}
          disabled={currentPage >= numPages}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
