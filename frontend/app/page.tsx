"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
// import ReactMarkdown from "react-markdown"; // Removed for direct DOM manipulation

const PdfViewer = dynamic(() => import("../components/PdfViewer"), { ssr: false });

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null); // Will store HTML string
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // New state for highlighting
  const [activeHighlightType, setActiveHighlightType] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState<string>("");
  const [listOfQuestionsText, setListOfQuestionsText] = useState<string>("");
  const [correctAnswerText, setCorrectAnswerText] = useState<string>("");
  const [explanationText, setExplanationText] = useState<string>("");

  const markdownOutputDivRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
      setMarkdownContent(null);
      setError(null);
      setCurrentPage(1); // Reset to first page on new file upload
    }
  };

  const handleNumPagesLoad = (numPages: number) => {
    setNumPages(numPages);
  };

  const convertToMarkdown = async () => {
    if (!pdfFile) {
      setError("Please upload a PDF file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setMarkdownContent(null);

    const formData = new FormData();
    formData.append("pdfFile", pdfFile);
    formData.append("pageNumber", currentPage.toString()); // Send current page number

    try {
      const response = await fetch("http://localhost:5000/convert-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Conversion failed.");
      }

      const data = await response.json();
      // Store the raw markdown, it will be rendered to HTML by ReactMarkdown in the div
      // For highlighting, we will convert it to HTML first.
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data.markdown; // Simple assignment for now, consider a markdown-to-html library if needed
      setMarkdownContent(tempDiv.innerHTML);

    } catch (err: any) {
      console.error("Error converting to markdown:", err);
      setError(err.message || "An unexpected error occurred during conversion.");
    } finally {
      setLoading(false);
    }
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

  const handleHighlightButtonClick = (type: string) => {
    if (activeHighlightType === type) {
      // If the same button is clicked again, deactivate highlighting
      setActiveHighlightType(null);
    } else {
      // Activate the new highlight type
      setActiveHighlightType(type);
    }
  };

  const handleMouseUp = () => {
    if (activeHighlightType && markdownOutputDivRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();

        if (selectedText.length > 0) {
          const span = document.createElement('span');
          let colorClass = '';
          switch (activeHighlightType) {
            case "question":
              colorClass = 'bg-red-300'; // Tailwind class for red highlight
              setQuestionText(selectedText);
              break;
            case "list":
              colorClass = 'bg-blue-300'; // Tailwind class for blue highlight
              setListOfQuestionsText(selectedText);
              break;
            case "answer":
              colorClass = 'bg-green-300'; // Tailwind class for green highlight
              setCorrectAnswerText(selectedText);
              break;
            case "explanation":
              colorClass = 'bg-yellow-300'; // Tailwind class for yellow highlight
              setExplanationText(selectedText);
              break;
            default:
              break;
          }
          span.className = colorClass;
          try {
            range.surroundContents(span);
            // Update the markdownContent state with the new HTML
            setMarkdownContent(markdownOutputDivRef.current.innerHTML);
          } catch (e) {
            console.error("Error surrounding contents:", e);
            // This can happen if the selection is not a single contiguous range
            // or if it contains partial tags.
            alert("Could not highlight. Please select a contiguous block of text.");
          }
          setActiveHighlightType(null); // Reset active button
        }
      }
    }
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-8">ExamTopics Data Labeler</h1>

      <div className="mb-8 flex items-center space-x-4">
        <label className="px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600 transition-colors duration-200">
          Choose PDF File
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        <button
          onClick={convertToMarkdown}
          disabled={!pdfFile || loading}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors duration-200"
        >
          {loading ? "Converting..." : "Convert to Markdown"}
        </button>

        {/* Highlight Buttons */}
        <button
          onClick={() => handleHighlightButtonClick("question")}
          disabled={!pdfFile || !markdownContent || activeHighlightType !== null}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors duration-200 inline-flex items-center justify-center min-w-[120px]"
        >
          Question
        </button>
        <button
          onClick={() => handleHighlightButtonClick("list")}
          disabled={!pdfFile || !markdownContent || activeHighlightType !== null}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors duration-200 inline-flex items-center justify-center min-w-[120px]"
        >
          List of Answer
        </button>
        <button
          onClick={() => handleHighlightButtonClick("answer")}
          disabled={!pdfFile || !markdownContent || activeHighlightType !== null}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors duration-200 inline-flex items-center justify-center min-w-[120px]"
        >
          Correct Answer
        </button>
        <button
          onClick={() => handleHighlightButtonClick("explanation")}
          disabled={!pdfFile || !markdownContent || activeHighlightType !== null}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 transition-colors duration-200 inline-flex items-center justify-center min-w-[120px]"
        >
          Explanation
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="flex space-x-4 w-full h-[80vh]">
        <PdfViewer
          pdfUrl={pdfUrl}
          currentPage={currentPage}
          numPages={numPages}
          setCurrentPage={setCurrentPage}
          goToPreviousPage={goToPreviousPage}
          goToNextPage={goToNextPage}
          setError={setError}
          onNumPagesLoad={handleNumPagesLoad}
        />

        {/* Markdown Output Section */}
        <div className="w-1/2 border p-4 rounded-lg shadow-md bg-white flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Markdown Output</h2>
          {markdownContent ? (
            <div
              ref={markdownOutputDivRef}
              contentEditable={true}
              onMouseUp={handleMouseUp}
              className="w-full flex-1 p-2 border rounded-md bg-gray-50 font-mono text-sm overflow-auto"
              dangerouslySetInnerHTML={{ __html: markdownContent || '' }}
            ></div>
          ) : (
            <p>Click "Convert to Markdown" to see the output.</p>
          )}
        </div>
      </div>

      {/* Display Highlighted Text */}
      <div className="w-full max-w-6xl mt-8 p-4 border rounded-lg shadow-md bg-white">
        <h2 className="text-xl font-semibold mb-4">Highlighted Content</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">Question:</h3>
            <p className="p-2 bg-gray-100 rounded-md whitespace-pre-wrap">{questionText}</p>
          </div>
          <div>
            <h3 className="font-semibold">List of Answer:</h3>
            <p className="p-2 bg-gray-100 rounded-md whitespace-pre-wrap">{listOfQuestionsText}</p>
          </div>
          <div>
            <h3 className="font-semibold">Correct Answer:</h3>
            <p className="p-2 bg-gray-100 rounded-md whitespace-pre-wrap">{correctAnswerText}</p>
          </div>
          <div>
            <h3 className="font-semibold">Explanation:</h3>
            <p className="p-2 bg-gray-100 rounded-md whitespace-pre-wrap">{explanationText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}