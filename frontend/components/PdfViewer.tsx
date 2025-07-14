"use client";

import { useRef, useEffect, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfViewerProps {
  pdfUrl: string | null;
  currentPage: number;
  numPages: number;
  setCurrentPage: (page: number) => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  setError: (error: string | null) => void;
  onNumPagesLoad: (numPages: number) => void;
}

export default function PdfViewer({
  pdfUrl,
  currentPage,
  numPages,
  setCurrentPage,
  goToPreviousPage,
  goToNextPage,
  setError,
  onNumPagesLoad,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocumentRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjs.RenderTask | null>(null);
  const currentPdfUrlRef = useRef<string | null>(null);
  const popupWindowRef = useRef<Window | null>(null);

  const renderPdf = useCallback(async () => {
    if (!pdfUrl || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      setError("Failed to get 2D rendering context for canvas.");
      return;
    }

    // Cancel any ongoing render task before starting a new one
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    try {
      let pdf: pdfjs.PDFDocumentProxy;

      // Check if we need to load a new PDF or can reuse the existing one
      if (currentPdfUrlRef.current !== pdfUrl || !pdfDocumentRef.current) {
        // Load new PDF
        pdf = await pdfjs.getDocument(pdfUrl).promise;
        pdfDocumentRef.current = pdf;
        currentPdfUrlRef.current = pdfUrl;

        // Update number of pages only when loading a new PDF
        onNumPagesLoad(pdf.numPages);
      } else {
        // Reuse existing PDF
        pdf = pdfDocumentRef.current;
      }

      // Ensure current page is within bounds after document load/change
      if (currentPage > pdf.numPages) {
        setCurrentPage(pdf.numPages);
        return;
      }
      if (currentPage < 1) {
        setCurrentPage(1);
        return;
      }

      const page = await pdf.getPage(currentPage);
      
      // Get the container dimensions
      const containerWidth = canvas.parentElement?.clientWidth || 400;
      const containerHeight = canvas.parentElement?.clientHeight || 600;
      
      // Calculate scale to fit the container while maintaining aspect ratio
      const baseViewport = page.getViewport({ scale: 1, rotation: page.rotate });
      const scaleX = (containerWidth - 40) / baseViewport.width; // -40 for padding
      const scaleY = (containerHeight - 100) / baseViewport.height; // -100 for header/controls
      const scale = Math.min(scaleX, scaleY, 2); // Max scale of 2 for readability
      
      const viewport = page.getViewport({ scale, rotation: page.rotate });

      // Set canvas dimensions to match viewport
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Clear the canvas before drawing a new page
      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;

      setError(null); // Clear any previous errors

    } catch (err) {
      if ((err as any).name === 'RenderingCancelledException') {
        console.log('Rendering was cancelled');
      } else {
        console.error("Error rendering PDF:", err);
        setError(`Failed to render PDF page: ${(err as Error).message}. Please try another file.`);
      }
    } finally {
      renderTaskRef.current = null;
    }
  }, [pdfUrl, currentPage, setError, onNumPagesLoad, setCurrentPage]);

  useEffect(() => {
    renderPdf();

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [renderPdf]);

  // Add resize listener to re-render PDF when container size changes  
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        renderPdf();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderPdf]);

  const handleViewerClick = () => {
    if (pdfUrl) {
      // If a window is already open and not closed, focus it
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.focus();
        return;
      }

      const newWindow = window.open(
        `/fullscreen-pdf?pdfUrl=${encodeURIComponent(pdfUrl)}&page=${currentPage}`,
        "FullScreenPdfViewer",
        "width=800,height=600,resizable=yes,scrollbars=yes"
      );

      if (newWindow) {
        popupWindowRef.current = newWindow;
        newWindow.focus();
      }
    }
  };

  return (
    <div className="w-full border p-4 rounded-lg shadow-md bg-white flex flex-col items-center h-full overflow-auto" onClick={handleViewerClick}>
      <h2 className="text-lg lg:text-xl font-semibold mb-4">PDF Viewer</h2>
      {pdfUrl ? (
        <>
          <canvas ref={canvasRef} className="border mb-4 max-w-full flex-1 w-full object-contain"></canvas>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPreviousPage();
              }}
              disabled={currentPage <= 1}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNextPage();
              }}
              disabled={currentPage >= numPages}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-center">Upload a PDF to view it here.</p>
        </div>
      )}
    </div>
  );
}