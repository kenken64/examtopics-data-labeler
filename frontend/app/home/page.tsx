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
      const response = await fetch(`${process.env.NEXT_PUBLIC_PDF_CONVERSION_API_URL || 'http://localhost:5000'}/convert-pdf`, {
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
      // If a different button is clicked, or no button is active, activate the new type
      setActiveHighlightType(type);
    }

    // Clear the highlight if the button is clicked when its highlight type is already present
    if (markdownOutputDivRef.current) {
      const spans = markdownOutputDivRef.current.getElementsByTagName('span');
      let colorClass = '';
      switch (type) {
        case "question":
          colorClass = 'bg-red-300';
          if (questionText) setQuestionText('');
          break;
        case "list":
          colorClass = 'bg-blue-300';
          if (listOfQuestionsText) setListOfQuestionsText('');
          break;
        case "answer":
          colorClass = 'bg-green-300';
          if (correctAnswerText) setCorrectAnswerText('');
          break;
        case "explanation":
          colorClass = 'bg-yellow-300';
          if (explanationText) setExplanationText('');
          break;
        default:
          break;
      }

      for (let i = spans.length - 1; i >= 0; i--) {
        if (spans[i].className.includes(colorClass)) {
          const parent = spans[i].parentNode;
          if (parent) {
            while (spans[i].firstChild) {
              const firstChild = spans[i].firstChild;
              if (firstChild) {
                parent.insertBefore(firstChild, spans[i]);
              }
            }
            parent.removeChild(spans[i]);
          }
        }
      }
      setMarkdownContent(markdownOutputDivRef.current.innerHTML);
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

  const handleSave = async () => {
    if (!selectedCertificate) {
      toast.error("Please select a certificate", {
        description: "You must choose a certificate before saving the quiz.",
        duration: 3000,
      });
      return;
    }

    setSaving(true);
    
    const quizData = {
      question: questionText,
      answers: listOfQuestionsText,
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

        {/* Highlight Buttons */}
        <Button
          onClick={() => handleHighlightButtonClick("question")}
          disabled={!pdfFile || !markdownContent}
          variant={activeHighlightType === 'question' ? 'default' : 'outline'}
        >
          Question
        </Button>
        <Button
          onClick={() => handleHighlightButtonClick("list")}
          disabled={!pdfFile || !markdownContent}
          variant={activeHighlightType === 'list' ? 'default' : 'outline'}
        >
          List of Answer
        </Button>
        <Button
          onClick={() => handleHighlightButtonClick("answer")}
          disabled={!pdfFile || !markdownContent}
          variant={activeHighlightType === 'answer' ? 'default' : 'outline'}
        >
          Correct Answer
        </Button>
        <Button
          onClick={() => handleHighlightButtonClick("explanation")}
          disabled={!pdfFile || !markdownContent}
          variant={activeHighlightType === 'explanation' ? 'default' : 'outline'}
        >
          Explanation
        </Button>
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