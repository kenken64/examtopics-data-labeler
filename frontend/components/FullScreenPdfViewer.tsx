"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const PdfCanvasRenderer = dynamic(() => import("./PdfCanvasRenderer"), { ssr: false });

interface FullScreenPdfViewerProps {
  pdfUrl: string;
  initialPage: number;
}

/**
 * FullScreenPdfViewer Component
 * 
 * A full-screen PDF viewer with navigation controls and zoom functionality.
 * 
 * Features:
 * - Full-screen PDF display with responsive design
 * - Page navigation (Previous/Next buttons)
 * - Mouse wheel zoom (Ctrl/Cmd + wheel)
 * - Zoom controls with buttons (+, -, Reset)
 * - Zoom range: 50% to 300%
 * - Error handling and loading states
 * - Overflow scrolling when zoomed in
 * 
 * Zoom Controls:
 * - Mouse wheel + Ctrl/Cmd: Zoom in/out in 10% increments
 * - + Button: Zoom in by 25%
 * - - Button: Zoom out by 25%
 * - Reset Button: Return to 100% zoom
 * - Zoom percentage display
 */

export default function FullScreenPdfViewer({
  pdfUrl,
  initialPage,
}: FullScreenPdfViewerProps) {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
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

  const handleZoomIn = () => {
    setZoom(prevZoom => Math.min(prevZoom + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(prevZoom => Math.max(prevZoom - 0.25, 0.5));
  };

  const resetZoom = () => {
    setZoom(1.0);
  };

  // Handle mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prevZoom => Math.max(0.5, Math.min(3.0, prevZoom + delta)));
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Full Screen PDF Viewer</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div ref={containerRef} className="flex-grow flex items-center justify-center w-full h-full overflow-auto border rounded-lg shadow-md bg-white min-h-0">
        {pdfUrl ? (
          <PdfCanvasRenderer
            pdfUrl={pdfUrl}
            currentPage={currentPage}
            zoom={zoom}
            onNumPagesLoad={handleNumPagesLoad}
            setError={setError}
            setCurrentPage={setCurrentPage}
          />
        ) : (
          <p>Loading PDF...</p>
        )}
      </div>
      <div className="flex items-center space-x-4 mt-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="px-3 py-1 bg-blue-200 rounded-md hover:bg-blue-300 disabled:opacity-50 text-sm"
            title="Zoom Out"
          >
            -
          </button>
          <span className="text-sm min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 3.0}
            className="px-3 py-1 bg-blue-200 rounded-md hover:bg-blue-300 disabled:opacity-50 text-sm"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-xs"
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>
        <div className="flex items-center space-x-2">
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
      <div className="text-xs text-gray-500 mt-2 text-center">
        Ctrl/Cmd + Mouse Wheel to zoom
      </div>
    </div>
  );
}
