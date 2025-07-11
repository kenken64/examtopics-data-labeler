/**
 * Test script to verify multi-answer functionality in frontend utils
 */

// Import the utility functions (simulate import)
const fs = require('fs');
const path = require('path');

// Read the multipleAnswerUtils.ts file and evaluate it as JavaScript
const utilsPath = path.join(__dirname, 'frontend', 'app', 'utils', 'multipleAnswerUtils.ts');
const utilsContent = fs.readFileSync(utilsPath, 'utf8');

// Convert TypeScript to basic JavaScript for testing
const jsContent = utilsContent
  .replace(/export function/g, 'function')
  .replace(/: string/g, '')
  .replace(/: boolean/g, '')
  .replace(/: string\[\]/g, '')
  .replace(/string\[\]/g, 'any[]');

// Evaluate the JavaScript content
eval(jsContent);

console.log('Testing Frontend Multi-Answer Utilities');
console.log('=====================================');

// Test normalization
console.log('\n1. Testing normalizeMultipleAnswers:');
console.log('normalizeMultipleAnswers("B C"):', normalizeMultipleAnswers("B C"));
console.log('normalizeMultipleAnswers("BC"):', normalizeMultipleAnswers("BC"));
console.log('normalizeMultipleAnswers("A B C"):', normalizeMultipleAnswers("A B C"));
console.log('normalizeMultipleAnswers("CBA"):', normalizeMultipleAnswers("CBA"));

// Test validation
console.log('\n2. Testing isMultipleAnswerQuestion:');
console.log('isMultipleAnswerQuestion("A"):', isMultipleAnswerQuestion("A"));
console.log('isMultipleAnswerQuestion("BC"):', isMultipleAnswerQuestion("BC"));
console.log('isMultipleAnswerQuestion("B C"):', isMultipleAnswerQuestion("B C"));

// Test answer validation
console.log('\n3. Testing validateMultipleAnswers:');
console.log('validateMultipleAnswers(["B", "C"], "B C"):', validateMultipleAnswers(["B", "C"], "B C"));
console.log('validateMultipleAnswers(["C", "B"], "B C"):', validateMultipleAnswers(["C", "B"], "B C"));
console.log('validateMultipleAnswers(["A", "C"], "B C"):', validateMultipleAnswers(["A", "C"], "B C"));

// Test formatting
console.log('\n4. Testing formatMultipleAnswers:');
console.log('formatMultipleAnswers("BC"):', formatMultipleAnswers("BC"));
console.log('formatMultipleAnswers("B C"):', formatMultipleAnswers("B C"));

console.log('\nFrontend utilities test completed! ✅');
