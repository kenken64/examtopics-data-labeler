"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from 'next/navigation';
import dynamic from "next/dynamic";
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { X } from "lucide-react";
import { toast, Toaster } from "sonner";
// import ReactMarkdown from "react-markdown"; // Removed for direct DOM manipulation

const PdfViewer = dynamic(() => import("../../components/PdfViewer"), { ssr: false });

interface Certificate {
  _id: string;
  name: string;
  code: string;
  createdAt: string;
}

interface HighlightData {
  id: string;
  type: 'question' | 'list' | 'answer' | 'explanation';
  text: string;
  startOffset: number;
  endOffset: number;
  page: number;
}

interface HighlightStorage {
  [page: number]: HighlightData[];
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      const res = await fetch('/api/auth/verify');
      if (res.status !== 200) {
        router.push('/'); // Redirect to login page
      }
    };
    
    const fetchCertificates = async () => {
      try {
        const response = await fetch('/api/certificates');
        if (response.ok) {
          const data = await response.json();
          setCertificates(data);
        }
      } catch (error) {
        console.error('Error fetching certificates:', error);
      }
    };

    verifyAuth();
    fetchCertificates();
  }, [router]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null); // Will store HTML string
  const [originalMarkdownContent, setOriginalMarkdownContent] = useState<string | null>(null); // Store original content
  const [originalContentByPage, setOriginalContentByPage] = useState<{[page: number]: string}>({}); // Store original content per page
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // New state for highlighting
  const [activeHighlightType, setActiveHighlightType] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState<string>("");
  const [listOfQuestionsText, setListOfQuestionsText] = useState<string>("");
  const [correctAnswerText, setCorrectAnswerText] = useState<string>("");
  const [explanationText, setExplanationText] = useState<string>("");

  // Enhanced highlighting storage
  const [highlights, setHighlights] = useState<HighlightStorage>({});
  const [highlightIdCounter, setHighlightIdCounter] = useState<number>(1);

  // Certificate state
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<string>("");
  const [nextQuestionNo, setNextQuestionNo] = useState<number>(1);

  const markdownOutputDivRef = useRef<HTMLDivElement>(null);

  // Function to fetch next question number for a certificate
  const fetchNextQuestionNumber = async (certificateId: string) => {
    if (!certificateId) {
      setNextQuestionNo(1);
      return;
    }
    
    try {
      const response = await fetch(`/api/certificates/${certificateId}/next-question-no`);
      if (response.ok) {
        const data = await response.json();
        setNextQuestionNo(data.nextQuestionNo);
      } else {
        setNextQuestionNo(1);
      }
    } catch (error) {
      console.error('Error fetching next question number:', error);
      setNextQuestionNo(1);
    }
  };

  // Handle certificate selection change
  const handleCertificateChange = (certificateId: string) => {
    setSelectedCertificate(certificateId);
    fetchNextQuestionNumber(certificateId);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
      setMarkdownContent(null);
      setOriginalMarkdownContent(null);
      setOriginalContentByPage({}); // Clear per-page content storage
      setError(null);
      setCurrentPage(1); // Reset to first page on new file upload
      
      // Reset all highlights and text when loading new file
      setHighlights({});
      setHighlightIdCounter(1);
      setQuestionText("");
      setListOfQuestionsText("");
      setCorrectAnswerText("");
      setExplanationText("");
      setActiveHighlightType(null);
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

    const formData = new FormData();
    formData.append("pdfFile", pdfFile);
    formData.append("pageNumber", currentPage.toString()); // Send current page number

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_PDF_CONVERSION_API_URL || 'http://localhost:5000'}/convert-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Conversion failed.");
      }

      const data = await response.json();
      
      // Store original content without any highlights
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data.markdown;
      const originalContent = tempDiv.innerHTML;
      setOriginalMarkdownContent(originalContent);
      
      // Store original content per page
      setOriginalContentByPage(prev => ({
        ...prev,
        [currentPage]: originalContent
      }));
      
      // Apply existing highlights for this page
      const pageHighlights = highlights[currentPage] || [];
      const contentWithHighlights = applyHighlightsToContent(originalContent, pageHighlights);
      setMarkdownContent(contentWithHighlights);
      
      // Update highlighted text state
      updateHighlightedTextFromAllPages();

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
      // If a different button is clicked, or no button is active, activate the new type
      setActiveHighlightType(type);
    }
  };

  const removeHighlightsByType = (type: string) => {
    setHighlights(prev => {
      const updated = { ...prev };
      
      // Remove highlights of this type from ALL pages
      Object.keys(updated).forEach(pageKey => {
        const pageNum = parseInt(pageKey);
        const pageHighlights = updated[pageNum] || [];
        updated[pageNum] = pageHighlights.filter(h => h.type !== type);
      });

      return updated;
    });

    // Refresh the current page's markdown content to remove visual highlights
    const currentPageOriginalContent = originalContentByPage[currentPage];
    if (currentPageOriginalContent) {
      // Get updated highlights for current page (without the removed type)
      const updatedCurrentPageHighlights = (highlights[currentPage] || []).filter(h => h.type !== type);
      const contentWithHighlights = applyHighlightsToContent(currentPageOriginalContent, updatedCurrentPageHighlights);
      setMarkdownContent(contentWithHighlights);
    }

    // Note: updateHighlightedTextFromAllPages will be called via useEffect when highlights state changes
  };

  const clearAllHighlights = () => {
    // Clear all highlights from all pages
    setHighlights({});
    
    // Clear all text content
    setQuestionText("");
    setListOfQuestionsText("");
    setCorrectAnswerText("");
    setExplanationText("");
    
    // Reset active highlight type
    setActiveHighlightType(null);
    
    // Refresh markdown content to remove visual highlights
    const currentPageOriginalContent = originalContentByPage[currentPage];
    if (currentPageOriginalContent) {
      setMarkdownContent(currentPageOriginalContent);
    }
    
    // Note: selectedCertificate is intentionally NOT cleared to preserve user selection
    
    toast.success("All highlights cleared", {
      description: "Highlights from all pages have been removed.",
      duration: 3000,
    });
  };

  const handleMouseUp = () => {
    if (activeHighlightType && markdownOutputDivRef.current && originalMarkdownContent) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString().trim();

        if (selectedText.length > 0) {
          // Get plain text content for position calculation
          const plainTextContent = extractPlainText(originalMarkdownContent);
          
          // Find position of selected text in plain content
          const pageHighlights = highlights[currentPage] || [];
          const position = findTextPosition(plainTextContent, selectedText, pageHighlights);
          
          if (position) {
            // Create new highlight
            const newHighlight: HighlightData = {
              id: `highlight-${highlightIdCounter}`,
              type: activeHighlightType as any,
              text: selectedText,
              startOffset: position.start,
              endOffset: position.end,
              page: currentPage
            };

            // Add new highlight (accumulate, don't replace)
            setHighlights(prev => {
              const updated = { ...prev };
              const currentPageHighlights = updated[currentPage] || [];
              
              // Simply add the new highlight (no removal of existing highlights of same type)
              updated[currentPage] = [...currentPageHighlights, newHighlight];
              
              return updated;
            });

            // Note: Text state will be updated via useEffect -> updateHighlightedTextFromAllPages

            setHighlightIdCounter(prev => prev + 1);
            setActiveHighlightType(null); // Reset active button
            
            // Clear selection
            selection.removeAllRanges();
          } else {
            toast.error("Cannot highlight overlapping text", {
              description: "Please select text that doesn't overlap with existing highlights.",
              duration: 3000,
            });
          }
        }
      }
    }
  };

  const handleSave = async () => {
    if (!selectedCertificate) {
      toast.error("Please select a certificate", {
        description: "You must choose a certificate before saving the quiz.",
        duration: 3000,
      });
      return;
    }

    setSaving(true);
    
    // Normalize the answers formatting before saving
    const normalizedAnswers = normalizeAnswerFormatting(listOfQuestionsText);
    
    // Log the formatting changes for debugging
    if (normalizedAnswers !== listOfQuestionsText) {
      console.log('📝 Answer formatting normalized:');
      console.log('Before:', listOfQuestionsText);
      console.log('After:', normalizedAnswers);
    }
    
    const quizData = {
      question: questionText,
      answers: normalizedAnswers,
      correctAnswer: correctAnswerText,
      explanation: explanationText,
      certificateId: selectedCertificate,
    };

    try {
      const response = await fetch("/api/save-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quizData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save quiz.");
      }

      const result = await response.json();
      toast.success(`Quiz saved successfully! Question #${result.questionNo}`, {
        description: "Your quiz has been saved to the database.",
        duration: 4000,
      });
      
      // Update the next question number
      setNextQuestionNo(result.questionNo + 1);
      
      // Clear only the highlighted text fields, keep certificate and markdown
      setQuestionText("");
      setListOfQuestionsText("");
      setCorrectAnswerText("");
      setExplanationText("");
      // Do NOT clear: setSelectedCertificate("") and setMarkdownContent("")
    } catch (err: any) {
      console.error("Error saving quiz:", err);
      toast.error("Failed to save quiz", {
        description: err.message || "An unexpected error occurred while saving.",
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  // Helper function to get color class for highlight type
  const getColorClass = (type: string): string => {
    switch (type) {
      case "question": return 'bg-red-300 hover:bg-red-400 transition-colors cursor-pointer';
      case "list": return 'bg-blue-300 hover:bg-blue-400 transition-colors cursor-pointer';
      case "answer": return 'bg-green-300 hover:bg-green-400 transition-colors cursor-pointer';
      case "explanation": return 'bg-yellow-300 hover:bg-yellow-400 transition-colors cursor-pointer';
      default: return '';
    }
  };

  // Helper function to apply highlights to content
  const applyHighlightsToContent = (content: string, pageHighlights: HighlightData[]): string => {
    if (!pageHighlights || pageHighlights.length === 0) return content;
    
    // Sort highlights by start position (descending) to apply from end to beginning
    const sortedHighlights = [...pageHighlights].sort((a, b) => b.startOffset - a.startOffset);
    
    let result = content;
    
    sortedHighlights.forEach(highlight => {
      const before = result.substring(0, highlight.startOffset);
      const highlightedText = result.substring(highlight.startOffset, highlight.endOffset);
      const after = result.substring(highlight.endOffset);
      
      const colorClass = getColorClass(highlight.type);
      const typeLabel = highlight.type.charAt(0).toUpperCase() + highlight.type.slice(1);
      result = `${before}<span class="${colorClass}" data-highlight-id="${highlight.id}" title="${typeLabel}: ${highlightedText.slice(0, 50)}${highlightedText.length > 50 ? '...' : ''}">${highlightedText}</span>${after}`;
    });
    
    return result;
  };

  // Helper function to extract plain text from HTML
  const extractPlainText = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  // Helper function to find text position in plain content
  const findTextPosition = (content: string, searchText: string, existingHighlights: HighlightData[]): { start: number, end: number } | null => {
    let start = 0;
    
    // Try to find a position that doesn't overlap with existing highlights
    while (true) {
      const index = content.indexOf(searchText, start);
      if (index === -1) return null;
      
      const end = index + searchText.length;
      
      // Check for overlaps with existing highlights
      const hasOverlap = existingHighlights.some(h => 
        (index < h.endOffset && end > h.startOffset)
      );
      
      if (!hasOverlap) {
        return { start: index, end };
      }
      
      start = index + 1;
    }
  };

  // Helper function to normalize answer formatting
  const normalizeAnswerFormatting = (answersText: string): string => {
    if (!answersText.trim()) return answersText;
    
    // Split by lines and process each line
    const lines = answersText.split('\n');
    const normalizedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        normalizedLines.push('');
        continue;
      }
      
      // Check if this looks like an answer option (starts with A., B., C., D., etc.)
      const answerOptionRegex = /^([A-Z])\.\s*/;
      const match = line.match(answerOptionRegex);
      
      if (match) {
        // This is an answer option
        if (line.startsWith('- ')) {
          // Already has bullet, keep as is
          normalizedLines.push(line);
        } else {
          // Add bullet prefix
          normalizedLines.push(`- ${line}`);
        }
      } else {
        // Not an answer option (might be continuation text)
        // Check if previous line was an answer option without bullet
        const prevLine = i > 0 ? lines[i - 1].trim() : '';
        const prevMatch = prevLine.match(answerOptionRegex);
        
        if (prevMatch && !prevLine.startsWith('- ')) {
          // Previous line was an answer option without bullet, this might be its continuation
          // Add this as continuation text (no bullet)
          normalizedLines.push(line);
        } else {
          // Regular text line, keep as is
          normalizedLines.push(line);
        }
      }
    }
    
    return normalizedLines.join('\n');
  };

  // Update highlighted text state based on ALL pages highlights (cumulative)
  const updateHighlightedTextFromAllPages = () => {
    // Clear existing text fields
    setQuestionText("");
    setListOfQuestionsText("");
    setCorrectAnswerText("");
    setExplanationText("");
    
    // Collect all highlights from all pages and group by type
    const allHighlights = Object.values(highlights).flat();
    
    // Group highlights by type and sort by page number for consistent ordering
    const highlightsByType = {
      question: [] as HighlightData[],
      list: [] as HighlightData[],
      answer: [] as HighlightData[],
      explanation: [] as HighlightData[]
    };
    
    allHighlights.forEach(highlight => {
      const type = highlight.type as keyof typeof highlightsByType;
      if (highlightsByType[type]) {
        highlightsByType[type].push(highlight);
      }
    });
    
    // Sort each type by page number to maintain consistent order
    Object.keys(highlightsByType).forEach(type => {
      highlightsByType[type as keyof typeof highlightsByType].sort((a, b) => a.page - b.page);
    });
    
    // Populate text fields with accumulated content from all pages
    if (highlightsByType.question.length > 0) {
      setQuestionText(highlightsByType.question.map(h => h.text).join('\n'));
    }
    
    if (highlightsByType.list.length > 0) {
      setListOfQuestionsText(highlightsByType.list.map(h => h.text).join('\n'));
    }
    
    if (highlightsByType.answer.length > 0) {
      setCorrectAnswerText(highlightsByType.answer.map(h => h.text).join('\n'));
    }
    
    if (highlightsByType.explanation.length > 0) {
      setExplanationText(highlightsByType.explanation.map(h => h.text).join('\n'));
    }
  };

  // Update content when page changes
  useEffect(() => {
    const currentPageOriginalContent = originalContentByPage[currentPage];
    if (currentPageOriginalContent) {
      const pageHighlights = highlights[currentPage] || [];
      const contentWithHighlights = applyHighlightsToContent(currentPageOriginalContent, pageHighlights);
      setMarkdownContent(contentWithHighlights);
      setOriginalMarkdownContent(currentPageOriginalContent); // Update current original content
      updateHighlightedTextFromAllPages();
    } else {
      // Clear content if no original content exists for this page
      setMarkdownContent(null);
      setOriginalMarkdownContent(null);
    }
  }, [currentPage, highlights, originalContentByPage]);

  return (
    <div className="min-h-screen p-8 pl-14 sm:pl-16 lg:pl-20 flex flex-col items-center">
      <Toaster position="top-right" richColors />
      <h1 className="text-3xl font-bold mb-8">Exam Q Labeler</h1>

      <div className="mb-8 flex items-center space-x-4">
        <Button asChild>
          <label>
            Choose PDF File
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </Button>
        <Button
          onClick={convertToMarkdown}
          disabled={!pdfFile || loading}
        >
          {loading ? "Converting..." : "Convert to Markdown"}
        </Button>

        {/* Highlight Buttons with indicators */}
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => handleHighlightButtonClick("question")}
            disabled={!pdfFile || !markdownContent}
            variant={activeHighlightType === 'question' ? 'default' : 'outline'}
            className="relative"
          >
            Question
            {highlights[currentPage]?.some(h => h.type === 'question') && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                ✓
              </span>
            )}
          </Button>
          
          <Button
            onClick={() => handleHighlightButtonClick("list")}
            disabled={!pdfFile || !markdownContent}
            variant={activeHighlightType === 'list' ? 'default' : 'outline'}
            className="relative"
          >
            List of Answer
            {highlights[currentPage]?.some(h => h.type === 'list') && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                ✓
              </span>
            )}
          </Button>
          
          <Button
            onClick={() => handleHighlightButtonClick("answer")}
            disabled={!pdfFile || !markdownContent}
            variant={activeHighlightType === 'answer' ? 'default' : 'outline'}
            className="relative"
          >
            Correct Answer
            {highlights[currentPage]?.some(h => h.type === 'answer') && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                ✓
              </span>
            )}
          </Button>
          
          <Button
            onClick={() => handleHighlightButtonClick("explanation")}
            disabled={!pdfFile || !markdownContent}
            variant={activeHighlightType === 'explanation' ? 'default' : 'outline'}
            className="relative"
          >
            Explanation
            {highlights[currentPage]?.some(h => h.type === 'explanation') && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                ✓
              </span>
            )}
          </Button>

          {/* Clear All Highlights Button */}
          <Button
            onClick={clearAllHighlights}
            disabled={!pdfFile || !markdownContent || Object.values(highlights).flat().length === 0}
            variant="destructive"
            size="sm"
            className="ml-4"
          >
            Clear All Highlights
          </Button>
        </div>
      </div>

      {/* Page Highlight Summary - Centered */}
      {markdownContent && (
        <div className="w-full max-w-6xl mb-4 text-center">
          <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-md inline-block">
            Page {currentPage}: {highlights[currentPage]?.length || 0} highlight(s)
            {Object.keys(highlights).length > 0 && (
              <span className="ml-2">
                | Total: {Object.values(highlights).flat().length} across {Object.keys(highlights).length} page(s)
              </span>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Instructions for highlighting */}
      {markdownContent && (
        <div className="w-full max-w-6xl mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="text-blue-600 mt-1">💡</div>
            <div className="text-sm text-blue-800">
              <strong>How to highlight:</strong> Click a highlight button above, then select text in the markdown output. 
              Content accumulates across pages - highlights of the same type combine together.
              Each button corresponds to a color: 
              <span className="inline-flex items-center ml-1 space-x-1">
                <span className="w-3 h-3 bg-red-300 rounded inline-block"></span><span>Question</span>
                <span className="w-3 h-3 bg-blue-300 rounded inline-block ml-2"></span><span>Answers</span>
                <span className="w-3 h-3 bg-green-300 rounded inline-block ml-2"></span><span>Correct</span>
                <span className="w-3 h-3 bg-yellow-300 rounded inline-block ml-2"></span><span>Explanation</span>
              </span>
            </div>
          </div>
        </div>
      )}

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
        
        {/* Certificate Selection */}
        <div className="mb-6">
          <Label htmlFor="certificate-select" className="text-sm font-medium">
            Select Certificate ({certificates.length} available)
            {selectedCertificate && (
              <span className="ml-2 text-xs text-muted-foreground">
                - Next question will be #{nextQuestionNo}
              </span>
            )}
          </Label>
          <Select value={selectedCertificate} onValueChange={handleCertificateChange}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Choose a certificate for this question" />
            </SelectTrigger>
            <SelectContent>
              {certificates.map((certificate) => (
                <SelectItem key={certificate._id} value={certificate._id}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{certificate.name}</span>
                    <span className="ml-2 text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                      {certificate.code}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {certificates.length === 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              No certificates available. <a href="/certificates" className="text-primary hover:underline">Add certificates</a> to get started.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center">
                <span className="w-3 h-3 bg-red-300 rounded-full mr-2"></span>
                Question:
                {questionText && (
                  <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    ✓ Highlighted
                  </span>
                )}
              </h3>
              {questionText && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    removeHighlightsByType('question');
                    setQuestionText("");
                  }}
                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Clear all question highlights from all pages"
                >
                  Clear All
                </Button>
              )}
            </div>
            <p className="p-2 bg-white rounded-md whitespace-pre-wrap min-h-[60px] text-sm">
              {questionText || <span className="text-gray-400 italic">No question highlighted</span>}
            </p>
          </div>

          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center">
                <span className="w-3 h-3 bg-blue-300 rounded-full mr-2"></span>
                List of Answer:
                {listOfQuestionsText && (
                  <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    ✓ Highlighted
                  </span>
                )}
              </h3>
              {listOfQuestionsText && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    removeHighlightsByType('list');
                    setListOfQuestionsText("");
                  }}
                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Clear all answer list highlights from all pages"
                >
                  Clear All
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <p className="p-2 bg-white rounded-md whitespace-pre-wrap min-h-[60px] text-sm">
                {listOfQuestionsText || <span className="text-gray-400 italic">No answers highlighted</span>}
              </p>
              {listOfQuestionsText && (
                <div className="text-xs">
                  <div className="text-gray-600 mb-1">Preview (how it will be saved):</div>
                  <p className="p-2 bg-blue-50 rounded-md whitespace-pre-wrap text-xs border">
                    {normalizeAnswerFormatting(listOfQuestionsText)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center">
                <span className="w-3 h-3 bg-green-300 rounded-full mr-2"></span>
                Correct Answer:
                {correctAnswerText && (
                  <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    ✓ Highlighted
                  </span>
                )}
              </h3>
              {correctAnswerText && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    removeHighlightsByType('answer');
                    setCorrectAnswerText("");
                  }}
                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Clear all correct answer highlights from all pages"
                >
                  Clear All
                </Button>
              )}
            </div>
            <p className="p-2 bg-white rounded-md whitespace-pre-wrap min-h-[60px] text-sm">
              {correctAnswerText || <span className="text-gray-400 italic">No correct answer highlighted</span>}
            </p>
          </div>

          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center">
                <span className="w-3 h-3 bg-yellow-300 rounded-full mr-2"></span>
                Explanation:
                {explanationText && (
                  <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    ✓ Highlighted
                  </span>
                )}
              </h3>
              {explanationText && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    removeHighlightsByType('explanation');
                    setExplanationText("");
                  }}
                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Clear all explanation highlights from all pages"
                >
                  Clear All
                </Button>
              )}
            </div>
            <p className="p-2 bg-white rounded-md whitespace-pre-wrap min-h-[60px] text-sm">
              {explanationText || <span className="text-gray-400 italic">No explanation highlighted</span>}
            </p>
          </div>
        </div>
        
        {/* Show selected certificate info */}
        {selectedCertificate && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <p className="text-sm text-blue-800">
              <strong>Selected Certificate:</strong> {certificates.find(cert => cert._id === selectedCertificate)?.name} 
              <span className="ml-2 text-blue-600">
                ({certificates.find(cert => cert._id === selectedCertificate)?.code})
              </span>
            </p>
            <button
              onClick={() => setSelectedCertificate("")}
              className="ml-3 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full p-1 transition-colors"
              title="Clear certificate selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={!questionText || !listOfQuestionsText || !correctAnswerText || !explanationText || !selectedCertificate || saving}
          className="mt-4"
        >
          {saving ? "Saving..." : "Save Quiz"}
        </Button>
      </div>
    </div>
  );
}