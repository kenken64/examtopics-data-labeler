"use client";

import React, { useState, useEffect } from 'react';

interface PdfPageNavigatorProps {
  currentPage: number;
  numPages: number;
  setCurrentPage: (page: number) => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  className?: string;
}

/**
 * Enhanced PDF Page Navigator Component
 * 
 * Features:
 * - Direct page number input with validation
 * - Previous/Next navigation buttons
 * - Real-time validation preventing invalid page numbers
 * - Auto-correction on blur and Enter key
 * - Keyboard navigation support
 * - Responsive design
 */
export default function PdfPageNavigator({
  currentPage,
  numPages,
  setCurrentPage,
  goToPreviousPage,
  goToNextPage,
  className = ""
}: PdfPageNavigatorProps) {
  const [inputValue, setInputValue] = useState<string>(currentPage.toString());
  const [isValid, setIsValid] = useState<boolean>(true);

  // Update input value when currentPage changes externally
  useEffect(() => {
    setInputValue(currentPage.toString());
    setIsValid(true);
  }, [currentPage]);

  const validateAndSetPage = (value: string) => {
    const pageNum = parseInt(value, 10);
    
    if (isNaN(pageNum)) {
      setIsValid(false);
      return;
    }

    if (pageNum < 1) {
      setCurrentPage(1);
      setInputValue('1');
      setIsValid(true);
    } else if (pageNum > numPages) {
      setCurrentPage(numPages);
      setInputValue(numPages.toString());
      setIsValid(true);
    } else {
      setCurrentPage(pageNum);
      setInputValue(pageNum.toString());
      setIsValid(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const pageNum = parseInt(value, 10);
    
    if (value === '' || isNaN(pageNum)) {
      setIsValid(false);
      return;
    }
    
    if (pageNum >= 1 && pageNum <= numPages) {
      setCurrentPage(pageNum);
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    
    if (e.key === 'Enter') {
      e.preventDefault();
      validateAndSetPage(inputValue);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentPage < numPages) {
        goToNextPage();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentPage > 1) {
        goToPreviousPage();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setInputValue(currentPage.toString());
      setIsValid(true);
      e.currentTarget.blur();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation();
    validateAndSetPage(inputValue);
  };

  const handlePreviousClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToPreviousPage();
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToNextPage();
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Previous Button */}
      <button
        onClick={handlePreviousClick}
        disabled={currentPage <= 1}
        className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-1"
        title="Previous page (Arrow Down)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page Input Section */}
      <div className="flex items-center space-x-1">
        <span className="text-sm text-gray-600 hidden sm:inline">Page</span>
        <div className="relative">
          <input
            type="number"
            min="1"
            max={numPages}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={`w-16 px-2 py-1 text-center border rounded-md focus:outline-none focus:ring-2 transition-colors duration-200 ${
              isValid
                ? 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                : 'border-red-300 focus:ring-red-500 focus:border-transparent bg-red-50'
            }`}
            style={{ fontSize: '14px' }}
            title="Enter page number (Use Arrow Up/Down to navigate)"
            aria-label={`Current page number. Enter a number between 1 and ${numPages}`}
          />
          {!isValid && (
            <div className="absolute -bottom-6 left-0 text-xs text-red-600 whitespace-nowrap">
              1-{numPages} only
            </div>
          )}
        </div>
        <span className="text-sm text-gray-600">of {numPages}</span>
      </div>

      {/* Next Button */}
      <button
        onClick={handleNextClick}
        disabled={currentPage >= numPages}
        className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-1"
        title="Next page (Arrow Up)"
      >
        <span className="hidden sm:inline">Next</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
