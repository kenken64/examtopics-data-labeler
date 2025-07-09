// Test script for answer formatting normalization

function normalizeAnswerFormatting(answersText) {
  if (!answersText.trim()) return answersText;
  
  // Split by lines and process each line
  const lines = answersText.split('\n');
  const normalizedLines = [];
  
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
}

// Test case 1: Your provided example
const testInput1 = `- A. Deploy optimized small language models (SLMs) on edge devices.
- B. Deploy optimized large language models (LLMs) on edge devices.

C.
Incorporate a centralized small language model (SLM) API for asynchronous communication with edge devices.
- D. Incorporate a centralized large language model (LLM) API for asynchronous communication with edge devices.`;

console.log('=== TEST 1: Mixed formatting ===');
console.log('INPUT:');
console.log(testInput1);
console.log('\nOUTPUT:');
console.log(normalizeAnswerFormatting(testInput1));

// Test case 2: All without bullets
const testInput2 = `A. Deploy optimized small language models (SLMs) on edge devices.
B. Deploy optimized large language models (LLMs) on edge devices.
C. Incorporate a centralized small language model (SLM) API for asynchronous communication with edge devices.
D. Incorporate a centralized large language model (LLM) API for asynchronous communication with edge devices.`;

console.log('\n=== TEST 2: No bullets ===');
console.log('INPUT:');
console.log(testInput2);
console.log('\nOUTPUT:');
console.log(normalizeAnswerFormatting(testInput2));

// Test case 3: All with bullets (should remain unchanged)
const testInput3 = `- A. Deploy optimized small language models (SLMs) on edge devices.
- B. Deploy optimized large language models (LLMs) on edge devices.
- C. Incorporate a centralized small language model (SLM) API for asynchronous communication with edge devices.
- D. Incorporate a centralized large language model (LLM) API for asynchronous communication with edge devices.`;

console.log('\n=== TEST 3: All with bullets ===');
console.log('INPUT:');
console.log(testInput3);
console.log('\nOUTPUT:');
console.log(normalizeAnswerFormatting(testInput3));
