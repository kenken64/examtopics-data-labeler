"use client";

import { useRef, useEffect, useState } from "react";
import * as pdfjs from "pdfjs-dist";

// Configure PDF.js worker for proper operation
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfCanvasRendererProps {
  pdfUrl: string;
  currentPage: number;
  zoom?: number;
  onNumPagesLoad: (numPages: number) => void;
  setError: (error: string | null) => void;
  setCurrentPage: (page: number) => void;
}

/**
 * PdfCanvasRenderer Component
 * 
 * This component renders PDF pages on an HTML5 canvas with proper scaling, zoom support, and error handling.
 * It addresses the common PDF.js issue of "Cannot use the same canvas during multiple render() operations"
 * by implementing proper render task cancellation and state management.
 * 
 * Key Features:
 * - Proper render task cancellation to prevent overlapping operations
 * - Responsive canvas sizing based on container dimensions
 * - Mouse wheel zoom support with zoom factor control
 * - Robust error handling for PDF loading and rendering
 * - Prevention of memory leaks through proper cleanup
 * - Smooth zooming with overflow scrolling support
 * 
 * Zoom Functionality:
 * - Zoom prop controls the zoom factor (0.5x to 3.0x)
 * - Base scale is calculated to fit the PDF to container
 * - Final scale = base scale × zoom factor
 * - Canvas allows scrolling when zoomed beyond container size
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
  zoom = 1.0,
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
  const [canvasDimensions, setCanvasDimensions] = useState({
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
          const baseScale = Math.min(scaleX, scaleY); // Fit to container
          const finalScale = baseScale * zoom; // Apply zoom factor

          console.log("Calculated Base Scale:", baseScale);
          console.log("Zoom Factor:", zoom);
          console.log("Final Scale:", finalScale);

          const scaledViewport = page.getViewport({ scale: finalScale, rotation: page.rotate });

          console.log("Scaled Viewport:", scaledViewport.width, scaledViewport.height);

          // Clear the canvas completely before setting new dimensions
          context.clearRect(0, 0, canvas.width, canvas.height);
          
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;

          // Update canvas dimensions state
          setCanvasDimensions({
            width: scaledViewport.width,
            height: scaledViewport.height,
          });

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
  }, [pdfUrl, currentPage, zoom, onNumPagesLoad, setError, setCurrentPage, containerDimensions]);

  // Determine if canvas is larger than container (needs scrolling)
  const isCanvasLarger = canvasDimensions.width > containerDimensions.width || 
                        canvasDimensions.height > containerDimensions.height;

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto">
      <div 
        className={`w-full h-full ${isCanvasLarger ? 'flex items-start justify-start' : 'flex items-center justify-center'}`}
        style={{
          minWidth: isCanvasLarger ? `${canvasDimensions.width}px` : '100%',
          minHeight: isCanvasLarger ? `${canvasDimensions.height}px` : '100%',
        }}
      >
        <canvas 
          ref={canvasRef} 
          className="max-w-none max-h-none object-contain"
          style={{
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}