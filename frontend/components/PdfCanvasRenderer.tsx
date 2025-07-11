"use client";

import { useRef, useEffect, useState } from "react";
import * as pdfjs from "pdfjs-dist";

// Configure PDF.js worker for proper operation
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfCanvasRendererProps {
  pdfUrl: string;
  currentPage: number;
  onNumPagesLoad: (numPages: number) => void;
  setError: (error: string | null) => void;
  setCurrentPage: (page: number) => void;
}

/**
 * PdfCanvasRenderer Component
 * 
 * This component renders PDF pages on an HTML5 canvas with proper scaling and error handling.
 * It addresses the common PDF.js issue of "Cannot use the same canvas during multiple render() operations"
 * by implementing proper render task cancellation and state management.
 * 
 * Key Features:
 * - Proper render task cancellation to prevent overlapping operations
 * - Responsive canvas sizing based on container dimensions
 * - Robust error handling for PDF loading and rendering
 * - Prevention of memory leaks through proper cleanup
 * 
 * Fixes Applied:
 * - Added isRenderingRef flag to prevent overlapping render operations
 * - Improved render task cancellation with proper promise handling
 * - Enhanced canvas clearing to ensure clean state between renders
 * - Added canvas reference validation to prevent stale operations
 */
export default function PdfCanvasRenderer({
  pdfUrl,
  currentPage,
  onNumPagesLoad,
  setError,
  setCurrentPage,
}: PdfCanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocumentRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjs.RenderTask | null>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the container div
  const isRenderingRef = useRef<boolean>(false); // Flag to prevent overlapping render operations
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    // Initial dimensions
    updateDimensions();

    // Observe resize events
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const renderPdf = async () => {
      if (!pdfUrl || !canvasRef.current || containerDimensions.width === 0 || containerDimensions.height === 0) {
        console.log("Render skipped: Missing pdfUrl, canvasRef, or containerDimensions", { pdfUrl, canvasRef: canvasRef.current, containerDimensions });
        return;
      }

      // Prevent overlapping render operations
      if (isRenderingRef.current) {
        console.log("Render skipped: Already rendering");
        return;
      }

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) {
        setError("Failed to get 2D rendering context for canvas.");
        return;
      }

      // Cancel any ongoing render task and wait for it to complete
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
          // Wait for the cancellation to complete by catching the cancellation error
          await renderTaskRef.current.promise.catch(() => {
            // Ignore cancellation errors - they're expected
          });
        } catch (err) {
          // Ignore any errors during cancellation
        } finally {
          renderTaskRef.current = null;
        }
      }

      // Set rendering flag
      isRenderingRef.current = true;

      try {
        let pdf: pdfjs.PDFDocumentProxy;

        // Check if we need to load a new PDF document
        if (!pdfDocumentRef.current) {
          try {
            const loadingTask = pdfjs.getDocument(pdfUrl);
            pdf = await loadingTask.promise;
            pdfDocumentRef.current = pdf;
            onNumPagesLoad(pdf.numPages);
            console.log("PDF document loaded successfully.", { numPages: pdf.numPages });
          } catch (err) {
            console.error("Error loading PDF document:", err);
            setError(`Failed to load PDF document: ${(err as Error).message}.`);
            return;
          }
        } else {
          pdf = pdfDocumentRef.current;
        }

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
          const viewport = page.getViewport({ scale: 1.0, rotation: page.rotate }); // Start with scale 1.0

          console.log("Container Dimensions:", containerDimensions);
          console.log("Original Viewport (scale 1.0):", viewport.width, viewport.height);

          const scaleX = containerDimensions.width / viewport.width;
          const scaleY = containerDimensions.height / viewport.height;
          const scale = Math.min(scaleX, scaleY); // Fit to container

          console.log("Calculated Scale:", scale);

          const scaledViewport = page.getViewport({ scale: scale, rotation: page.rotate });

          console.log("Scaled Viewport:", scaledViewport.width, scaledViewport.height);

          // Clear the canvas completely before setting new dimensions
          context.clearRect(0, 0, canvas.width, canvas.height);
          
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;

          // Clear again after resizing to ensure clean state
          context.clearRect(0, 0, canvas.width, canvas.height);

          const renderContext = {
            canvasContext: context,
            viewport: scaledViewport,
          };

          // Check if we still have the same canvas (component hasn't unmounted)
          if (canvas !== canvasRef.current) {
            console.log("Canvas reference changed, aborting render");
            return;
          }

          renderTaskRef.current = page.render(renderContext);
          await renderTaskRef.current.promise;
          console.log("PDF page rendered successfully.");
          setError(null);
        } catch (err) {
          if (err && (err as any).name === 'RenderingCancelledException') {
            console.log('PDF rendering cancelled.');
            return;
          }
          console.error("Error rendering PDF page:", err);
          setError(`Failed to render PDF page: ${(err as Error).message}.`);
        } finally {
          renderTaskRef.current = null;
        }
      } finally {
        // Always clear the rendering flag
        isRenderingRef.current = false;
      }
    };

    renderPdf();

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      isRenderingRef.current = false;
    };
  }, [pdfUrl, currentPage, onNumPagesLoad, setError, setCurrentPage, containerDimensions]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <canvas ref={canvasRef} className="max-w-full max-h-full h-auto object-contain"></canvas>
    </div>
  );
}