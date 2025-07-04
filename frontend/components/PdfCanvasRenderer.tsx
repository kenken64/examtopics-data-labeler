"use client";

import { useRef, useEffect, useState } from "react";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfCanvasRendererProps {
  pdfUrl: string;
  currentPage: number;
  onNumPagesLoad: (numPages: number) => void;
  setError: (error: string | null) => void;
  setCurrentPage: (page: number) => void;
}

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

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) {
        setError("Failed to get 2D rendering context for canvas.");
        return;
      }

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      let pdf: pdfjs.PDFDocumentProxy;

      if (!pdfDocumentRef.current || pdfDocumentRef.current.loadingTask.url !== pdfUrl) {
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

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };

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
    };

    renderPdf();

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfUrl, currentPage, onNumPagesLoad, setError, setCurrentPage, containerDimensions]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <canvas ref={canvasRef} className="max-w-full max-h-full h-auto object-contain"></canvas>
    </div>
  );
}