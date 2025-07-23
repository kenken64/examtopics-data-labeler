# Question Data Structure Analysis

## Database Information
- **Database**: `awscert`
- **Collection**: `quizzes`
- **Total Questions**: 2 (as of examination)

## Question Document Structure

### Fields Present in Question Documents:
1. `_id` - MongoDB ObjectId (Primary Key)
2. `question` - Question text (String)
3. `answers` - Answer options as formatted string (String)
4. `correctAnswer` - Correct answer letter (String: A, B, C, or D)
5. `explanation` - Explanation text (String)
6. `certificateId` - Reference to certificate (ObjectId)
7. `question_no` - Question number (Number)
8. `createdAt` - Creation timestamp (Date)
9. `aiExplanation` - AI-generated explanation (String)
10. `aiExplanationGeneratedAt` - AI explanation timestamp (Date)

### Sample Question Structure:
```javascript
{
  "_id": ObjectId("6869308ea216a13a7c4fc9b8"),
  "question": "A company has built a solution by using generative AI. The solution uses large language models (LLMs)...",
  "answers": "- A. Bilingual Evaluation Understudy (BLEU)\n- B. Root mean squared error (RMSE)\n- C. Recall-Oriented Understudy for Gisting Evaluation (ROUGE)\n- D. F1 score",
  "correctAnswer": "A",
  "explanation": "Present",
  "certificateId": ObjectId("..."),
  "question_no": 1,
  "createdAt": ISODate("..."),
  "aiExplanation": "...",
  "aiExplanationGeneratedAt": ISODate("...")
}
```

## Current Bot Code Issue

### Expected vs Actual Structure:

**Bot Code Expects** (lines 234-237 in bot.js):
```javascript
currentQuestion.options.A  // Object with A, B, C, D properties
currentQuestion.options.B
currentQuestion.options.C
currentQuestion.options.D
```

**Actual Database Structure**:
```javascript
currentQuestion.answers  // String with markdown-formatted options
```

### Actual Format of `answers` Field:
```
- A. [Option A text]
- B. [Option B text]
- C. [Option C text]
- D. [Option D text]
```

## Required Changes

The bot code needs to be updated to:
1. Use `answers` field instead of `options`
2. Parse the string format to extract individual option texts
3. Convert the markdown-style string into the expected A, B, C, D format for display

## Parsing Strategy

The `answers` string can be parsed using:
1. Split by newlines
2. Extract option letter and text using regex
3. Create an object with A, B, C, D properties for compatibility with existing display code