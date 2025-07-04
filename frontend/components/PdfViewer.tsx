"use client";

import { useRef, useEffect } from "react";
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
  const pdfDocumentRef = useRef<pdfjs.PDFDocumentProxy | null>(null); // To store the PDF document
  const renderTaskRef = useRef<pdfjs.RenderTask | null>(null); // To store the current render task

  useEffect(() => {
    const renderPdf = async () => {
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

      let pdf: pdfjs.PDFDocumentProxy;

      // If pdfUrl changes, or if pdfDocumentRef is null (first load), fetch the document
      if (!pdfDocumentRef.current || pdfDocumentRef.current.loadingTask.url !== pdfUrl) {
        try {
          const loadingTask = pdfjs.getDocument(pdfUrl);
          pdf = await loadingTask.promise;
          pdfDocumentRef.current = pdf; // Store the document
          onNumPagesLoad(pdf.numPages); // Update parent with total pages
        } catch (err) {
          console.error("Error loading PDF document:", err);
          setError(`Failed to load PDF document: ${(err as Error).message}. Please try another file.`);
          return;
        }
      } else {
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

      try {
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5, rotation: page.rotate });

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
        console.log("PDF page rendered successfully.");
        setError(null); // Clear error on successful render
      } catch (err) {
        // Check if the error is due to cancellation
        if (err && (err as any).name === 'RenderingCancelledException') {
          console.log('PDF rendering cancelled.');
          return; // Do not set error for cancellations
        }
        console.error("Error rendering PDF page:", err);
        setError(`Failed to render PDF page: ${(err as Error).message}. Please try another file.`);
      } finally {
        renderTaskRef.current = null; // Clear the render task reference after completion or error
      }
    };

    renderPdf();

    // Cleanup function for useEffect
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfUrl, currentPage, setError, onNumPagesLoad, setCurrentPage]);

  const popupWindowRef = useRef<Window | null>(null);

  const handleViewerClick = () => {
    if (pdfUrl) {
      // If a window is already open and not closed, focus it
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.focus();
        return;
      }

      const newWindow = window.open(
        `/fullscreen-pdf?pdfUrl=${encodeURIComponent(pdfUrl)}&page=${currentPage}`,
        "FullScreenPdfViewer", // Give the window a unique name
        "width=800,height=600,resizable=yes,scrollbars=yes"
      );

      if (newWindow) {
        popupWindowRef.current = newWindow; // Store reference to the new window
        newWindow.focus();
      }
    }
  };

  return (
    <div className="w-1/2 border p-4 rounded-lg shadow-md bg-white flex flex-col items-center h-full overflow-auto" onClick={handleViewerClick}>
      <h2 className="text-xl font-semibold mb-4">PDF Viewer</h2>
      {pdfUrl ? (
        <>
          {/* The canvas will now dynamically size itself */}
          <canvas ref={canvasRef} className="border mb-4 max-w-full max-h-full h-auto object-contain"></canvas>
          <div className="flex items-center space-x-2 mt-auto"> {/* mt-auto to push buttons to bottom */}
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
        </>
      ) : (
        <p>Upload a PDF to view it here.</p>
      )}
    </div>
  );
}
