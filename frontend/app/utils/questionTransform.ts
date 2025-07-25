// Utility functions to transform question data from database format to frontend format

import { isMultipleAnswerQuestion, answerToArray } from './multipleAnswerUtils';

export interface DatabaseQuestion {
  _id: unknown;
  question_no: number;
  question: string;
  answers?: string; // Database format: "- A. Option 1\n- B. Option 2\n..."
  options?: string[]; // Frontend format: ["Option 1", "Option 2", ...]
  correctAnswer: string | number; // Database: "A", "B", etc. | Frontend: 0, 1, etc.
  explanation?: string;
  createdAt?: Date;
  [key: string]: unknown; // Allow additional properties
}

export interface FrontendQuestion {
  _id: unknown;
  question_no: number;
  question: string;
  options: string[];
  correctAnswer: number | string; // Support both index and multiple letters
  isMultipleAnswer?: boolean; // Flag to indicate multiple answer question
  correctAnswers?: number[]; // Array of correct answer indices for multiple answers
  explanation?: string;
  createdAt?: Date;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Converts answers text format to options array
 * Input: "- A. Option 1\n- B. Option 2\n- C. Option 3\n- D. Option 4"
 * Output: ["Option 1", "Option 2", "Option 3", "Option 4"]
 */
export function parseAnswersToOptions(answers: string): string[] {
  if (!answers || typeof answers !== 'string') {
    return [];
  }

  // Split by lines and process each line
  const lines = answers.split('\n').filter(line => line.trim());
  const options: string[] = [];

  for (const line of lines) {
    // Match pattern like "- A. Some text" or "A. Some text" or "A) Some text"
    const match = line.match(/^[\s-]*[A-Z][.)]\s*(.+)$/i);
    if (match && match[1]) {
      options.push(match[1].trim());
    }
  }

  return options;
}

/**
 * Converts letter-based correct answer to numeric index or array of indices
 * Input: "A" -> Output: 0, "BC" -> Output: [1, 2], etc.
 */
export function convertCorrectAnswerToIndex(correctAnswer: string | number): number | number[] {
  if (typeof correctAnswer === 'number') {
    return correctAnswer; // Already in correct format
  }

  if (typeof correctAnswer === 'string') {
    // Check if it's a multiple answer question
    if (isMultipleAnswerQuestion(correctAnswer)) {
      // Convert each letter to index
      const letters = answerToArray(correctAnswer);
      return letters.map(letter => letter.charCodeAt(0) - 65);
    } else {
      // Single answer
      const upperCase = correctAnswer.toUpperCase();
      const charCode = upperCase.charCodeAt(0);
      
      // Convert A=0, B=1, C=2, D=3, etc.
      if (charCode >= 65 && charCode <= 90) { // A-Z
        return charCode - 65;
      }
    }
  }

  return 0; // Default fallback
}

/**
 * Transforms a database question to frontend format
 */
export function transformQuestionForFrontend(dbQuestion: Record<string, unknown>): FrontendQuestion {
  const question: FrontendQuestion = {
    _id: dbQuestion._id,
    question_no: dbQuestion.question_no as number,
    question: dbQuestion.question as string,
    options: [],
    correctAnswer: 0,
    explanation: dbQuestion.explanation as string | undefined,
    createdAt: dbQuestion.createdAt as Date | undefined,
    ...dbQuestion
  };

  // Transform options
  if (dbQuestion.options && Array.isArray(dbQuestion.options)) {
    // Already in correct format
    question.options = dbQuestion.options;
  } else if (dbQuestion.answers) {
    // Convert from database text format
    question.options = parseAnswersToOptions(dbQuestion.answers as string);
  } else {
    question.options = [];
  }

  // Transform correct answer and detect multiple answers
  const correctAnswerString = dbQuestion.correctAnswer as string;
  const isMultiple = isMultipleAnswerQuestion(correctAnswerString);
  
  question.isMultipleAnswer = isMultiple;
  
  if (isMultiple) {
    // Store as string for multiple answers and create indices array
    question.correctAnswer = correctAnswerString;
    question.correctAnswers = convertCorrectAnswerToIndex(correctAnswerString) as number[];
  } else {
    // Single answer - store as index
    question.correctAnswer = convertCorrectAnswerToIndex(correctAnswerString) as number;
  }

  return question;
}

/**
 * Transforms an array of database questions to frontend format
 */
export function transformQuestionsForFrontend(dbQuestions: Record<string, unknown>[]): FrontendQuestion[] {
  if (!Array.isArray(dbQuestions)) {
    return [];
  }

  return dbQuestions.map(transformQuestionForFrontend);
}

/**
 * Safe accessor for question options with fallback
 */
export function getQuestionOptions(question: Record<string, unknown>): string[] {
  if (question?.options && Array.isArray(question.options)) {
    return question.options;
  }
  if (question?.answers && typeof question.answers === 'string') {
    return parseAnswersToOptions(question.answers);
  }
  return [];
}

/**
 * Safe accessor for correct answer with fallback
 * Returns primary correct answer index for single answers, first index for multiple
 */
export function getCorrectAnswer(question: Record<string, unknown>): number {
  if (question?.correctAnswers && Array.isArray(question.correctAnswers)) {
    // Multiple answer question - return first correct answer index
    return question.correctAnswers[0] || 0;
  }
  
  if (question?.correctAnswer !== undefined) {
    if (typeof question.correctAnswer === 'number') {
      return question.correctAnswer;
    }
    
    // Convert string answer to index (single answer only)
    const result = convertCorrectAnswerToIndex(question.correctAnswer as string | number);
    return Array.isArray(result) ? result[0] : result;
  }
  
  return 0;
}

/**
 * Safe accessor for all correct answer indices
 * Returns array for multiple answers, single-item array for single answers
 */
export function getAllCorrectAnswers(question: Record<string, unknown>): number[] {
  if (question?.correctAnswers && Array.isArray(question.correctAnswers)) {
    return question.correctAnswers;
  }
  
  if (question?.isMultipleAnswer && question?.correctAnswer) {
    const result = convertCorrectAnswerToIndex(question.correctAnswer as string | number);
    return Array.isArray(result) ? result : [result];
  }
  
  // Single answer
  const singleAnswer = getCorrectAnswer(question);
  return [singleAnswer];
}
