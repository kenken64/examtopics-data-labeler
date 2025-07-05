# Access Code Questions Management System

## Overview

A new collection and management system has been implemented to associate generated access codes with their assigned questions/quizzes. This allows for per-payee question customization with reordering and disable/enable functionality.

## New Database Collection: `access-code-questions`

### Schema Structure
```javascript
{
  _id: ObjectId,
  generatedAccessCode: String,        // The generated access code (e.g., "AC-9K363CQ4")
  payeeId: ObjectId,                  // Reference to payees collection
  certificateId: ObjectId,            // Reference to certificates collection
  questionId: ObjectId,               // Reference to quizzes collection
  originalQuestionNo: Number,         // Original question number from quiz
  assignedQuestionNo: Number,         // Reassigned question number (for reordering)
  isEnabled: Boolean,                 // Whether question is visible for this access code
  assignedAt: Date,                   // When question was assigned
  updatedAt: Date,                    // Last update timestamp
  sortOrder: Number                   // For custom ordering (separate from assignedQuestionNo)
}
```

### Indexes Created
- `generatedAccessCode: 1`
- `payeeId: 1`
- `certificateId: 1`
- `questionId: 1`
- `generatedAccessCode: 1, sortOrder: 1`
- `generatedAccessCode: 1, isEnabled: 1, sortOrder: 1`

## New Files Created

### 1. Seeding Scripts
- **`seed-access-code-questions.js`**: Creates question assignments for all paid payees with generated access codes
- **Updated `seed-payees.js`**: Now includes `generatedAccessCode` field for all payees

### 2. API Endpoints
- **`/app/api/access-code-questions/route.ts`**: CRUD operations for question assignments
  - `GET`: Retrieve questions for a generated access code
  - `PUT`: Update question assignments (reorder, enable/disable)
  - `POST`: Add new question assignments
  - `DELETE`: Remove question assignments

### 3. Management Interface
- **`/app/access-code-questions/page.tsx`**: Admin interface for managing question assignments

### 4. Updated APIs
- **`/app/api/saved-questions/route.ts`**: Updated to use new collection for generated access codes

## API Usage Examples

### Get Questions for Generated Access Code
```typescript
GET /api/access-code-questions?generatedAccessCode=AC-9K363CQ4&includeDisabled=true

Response:
{
  "success": true,
  "generatedAccessCode": "AC-9K363CQ4",
  "questions": [
    {
      "_id": "...",
      "assignedQuestionNo": 1,
      "originalQuestionNo": 5,
      "isEnabled": true,
      "sortOrder": 1,
      "question": {
        "_id": "...",
        "question": "What is AWS Lambda?",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": 0,
        "explanation": "..."
      }
    }
  ],
  "stats": {
    "totalQuestions": 10,
    "enabledQuestions": 8,
    "disabledQuestions": 2
  },
  "payee": {
    "_id": "...",
    "payeeName": "John Doe",
    "originalAccessCode": "AWS-CLF-001"
  },
  "certificate": {
    "_id": "...",
    "name": "AWS Certified Cloud Practitioner",
    "code": "CLF-C02"
  }
}
```

### Update Question Assignments
```typescript
PUT /api/access-code-questions

Body:
{
  "generatedAccessCode": "AC-9K363CQ4",
  "updates": [
    {
      "_id": "assignment_id_1",
      "assignedQuestionNo": 2,
      "isEnabled": false,
      "sortOrder": 10
    }
  ]
}
```

## Key Features

### 1. Question Reordering
- Each generated access code can have its own question sequence
- `assignedQuestionNo` and `sortOrder` allow flexible reordering
- Questions can be moved up/down in the sequence

### 2. Question Enable/Disable
- Individual questions can be disabled for specific access codes
- Disabled questions are hidden from the quiz interface
- Maintains question history (doesn't delete, just disables)

### 3. Dual Access Code Support
- Original access codes continue to work (show all certificate questions)
- Generated access codes use the new customized question assignments
- Updated `/api/saved-questions` automatically detects which type of code is being used

### 4. Management Interface
- Admin interface at `/access-code-questions`
- Search by generated access code
- Visual question management with drag-and-drop style controls
- Real-time statistics (enabled/disabled/total counts)
- Bulk save functionality

## Usage Workflow

### 1. Setup Data
```bash
# Seed payees with generated access codes
node seed-payees.js

# Create question assignments for paid payees
node seed-access-code-questions.js
```

### 2. Manage Questions
1. Navigate to `/access-code-questions` in the admin interface
2. Enter a generated access code (e.g., `AC-4AC2H2G`)
3. Reorder questions using up/down arrows
4. Enable/disable questions using eye icons
5. Save changes in bulk

### 3. Test Access
- Use original access codes for full question sets
- Use generated access codes for customized question assignments
- Questions maintain proper sequence and only enabled questions are shown

## Current Test Data

Based on seeding:
- **Total Access Codes with Assignments**: 2
- **Total Question Assignments**: 4
- **Test Access Codes**:
  - `AC-4AC2H2G` (Amanda Taylor) - 2 questions
  - `AC-34JUR81` (Daniel Lewis) - 2 questions

## Navigation

The management interface is accessible via:
- Sliding menu → "Manage Questions"
- Direct URL: `/access-code-questions`

## Benefits

1. **Per-Customer Customization**: Each generated access code can have unique question sets
2. **Flexible Question Management**: Reorder and enable/disable without data loss
3. **Backward Compatibility**: Original access codes continue to work unchanged
4. **Scalable Architecture**: Efficient database design with proper indexing
5. **Admin-Friendly Interface**: Easy-to-use management tools for question assignments

This system provides complete control over question assignments for generated access codes while maintaining compatibility with the existing access code system.
