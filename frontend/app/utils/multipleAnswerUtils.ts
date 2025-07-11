/**
 * Utility functions for handling multiple-choice questions with multiple correct answers
 * 
 * Supports formats like:
 * - "A" (single answer)
 * - "BC" (multiple answers)
 * - "B C" (multiple answers with spaces)
 * - "A B C" (multiple answers with spaces)
 * - "ABF" (multiple answers)
 */

/**
 * Normalizes answer format to consistent format without spaces
 * @param answer - Answer in various formats like "B C", "BC", "A B C"
 * @returns Normalized answer like "BC", "ABC"
 */
export function normalizeAnswer(answer: string | number | null | undefined): string {
  // Handle non-string inputs
  if (!answer && answer !== 0) return '';
  
  // Convert to string if it's a number
  const answerStr = String(answer);
  
  // Remove spaces and convert to uppercase
  const normalized = answerStr.replace(/\s+/g, '').toUpperCase();
  
  // Sort letters alphabetically for consistent comparison
  return normalized.split('').sort().join('');
}

/**
 * Checks if a question has multiple correct answers
 * @param correctAnswer - The correct answer string
 * @returns True if multiple answers are required
 */
export function isMultipleAnswerQuestion(correctAnswer: string | number | null | undefined): boolean {
  if (!correctAnswer && correctAnswer !== 0) return false;
  
  const normalized = normalizeAnswer(correctAnswer);
  return normalized.length > 1;
}

/**
 * Validates if selected answers match the correct answer(s)
 * @param selectedAnswers - Array of selected answer letters or string of answers
 * @param correctAnswer - The correct answer string
 * @returns True if the selection is correct
 */
export function validateMultipleAnswers(
  selectedAnswers: string[] | string | null | undefined, 
  correctAnswer: string | number | null | undefined
): boolean {
  if (!correctAnswer && correctAnswer !== 0) return false;
  if (!selectedAnswers) return false;
  
  // Convert selectedAnswers to string if it's an array
  const selectedString = Array.isArray(selectedAnswers) 
    ? selectedAnswers.join('') 
    : String(selectedAnswers);
  
  // Normalize both for comparison
  const normalizedSelected = normalizeAnswer(selectedString);
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  
  return normalizedSelected === normalizedCorrect;
}

/**
 * Converts answer string to array of individual letters
 * @param answer - Answer string like "BC" or "B C"
 * @returns Array of individual letters like ["B", "C"]
 */
export function answerToArray(answer: string | number | null | undefined): string[] {
  if (!answer && answer !== 0) return [];
  
  const answerStr = String(answer);
  return answerStr.replace(/\s+/g, '').toUpperCase().split('').sort();
}

/**
 * Formats answer for display (adds spaces between letters)
 * @param answer - Answer string like "BC"
 * @returns Formatted string like "B, C"
 */
export function formatAnswerForDisplay(answer: string | number | null | undefined): string {
  if (!answer && answer !== 0) return '';
  
  const normalized = normalizeAnswer(answer);
  return normalized.split('').join(', ');
}

/**
 * Gets all possible combinations for a multiple answer question
 * Used for generating selection hints
 * @param availableOptions - Available option letters like ["A", "B", "C", "D"]
 * @param correctAnswer - The correct answer string
 * @returns Information about the correct combination
 */
export function getAnswerInfo(availableOptions: string[], correctAnswer: string | number | null | undefined) {
  const isMultiple = isMultipleAnswerQuestion(correctAnswer);
  const correctLetters = answerToArray(correctAnswer);
  const requiredCount = correctLetters.length;
  
  return {
    isMultiple,
    correctLetters,
    requiredCount,
    formattedAnswer: formatAnswerForDisplay(correctAnswer),
    hint: isMultiple 
      ? `Select ${requiredCount} answers` 
      : 'Select 1 answer'
  };
}

/**
 * Generates selection state for UI components
 * @param selectedAnswers - Currently selected answers
 * @param correctAnswer - The correct answer
 * @param showCorrect - Whether to show the correct answers
 * @returns State information for each option
 */
export function getSelectionState(
  selectedAnswers: string[],
  correctAnswer: string | number | null | undefined,
  showCorrect: boolean = false
) {
  const correctLetters = answerToArray(correctAnswer);
  const isCorrect = validateMultipleAnswers(selectedAnswers, correctAnswer);
  
  return {
    selectedAnswers,
    correctLetters,
    isCorrect,
    showCorrect,
    isComplete: selectedAnswers.length > 0
  };
}
