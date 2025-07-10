# Access Code Questions Linking System

## Overview

The Access Code Questions Linking System automatically and manually manages the relationship between generated access codes and certificate questions in the MongoDB `access-code-questions` collection. This ensures that customers with access codes can access the appropriate questions for their certificates.

## Architecture

### Database Collections

1. **`payees`** - Contains customer payment information and access codes
2. **`certificates`** - Contains certificate definitions
3. **`quizzes`** - Contains individual questions for certificates
4. **`access-code-questions`** - Links generated access codes to specific questions

### Collection Schema: `access-code-questions`

```javascript
{
  _id: ObjectId,
  generatedAccessCode: String,       // The generated access code (e.g., "AC-4AC2H2G")
  payeeId: ObjectId,                 // Reference to payees collection
  certificateId: ObjectId,           // Reference to certificates collection
  questionId: ObjectId,              // Reference to quizzes collection
  originalQuestionNo: Number,        // Original question number in certificate
  assignedQuestionNo: Number,        // Assigned question number for this access code
  isEnabled: Boolean,                // Whether question is enabled for this access code
  assignedAt: Date,                  // When question was assigned
  updatedAt: Date,                   // Last update timestamp
  sortOrder: Number                  // Custom sort order for questions
}
```

## Features

### Automatic Linking

**When new questions are added:**
- The `/api/save-quiz` endpoint automatically creates corresponding entries in `access-code-questions`
- All existing generated access codes for the certificate get the new question assigned
- New questions are enabled by default
- Assigned question numbers and sort orders are automatically calculated

### Manual Linking

**Access Codes Management Page (`/access-codes`):**
- Shows link status for each generated access code
- "Link" button to manually create question assignments
- "Unlink" button to remove all question assignments
- Visual indicators showing linked/unlinked status

**Saved Questions Page (`/saved-questions`):**
- Shows access codes with their link status
- "Link to Questions" button for unlinked access codes
- Automatic status checking when loading access codes

## API Endpoints

### 1. Auto-linking (Internal)

**File:** `frontend/app/api/save-quiz/route.ts`

**Function:** `updateAccessCodeQuestions()`
- Called automatically when new questions are saved
- Finds all generated access codes for the certificate
- Creates new `access-code-questions` entries for each access code
- Calculates next available question numbers and sort orders

### 2. Manual Linking

**Endpoint:** `POST /api/link-access-code`

**Body:**
```json
{
  "payeeId": "string",              // Optional: Link by payee ID
  "generatedAccessCode": "string",  // Optional: Link by access code
  "forceRelink": false              // Optional: Force recreate existing links
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully linked X questions to access code",
  "linkedQuestions": 5,
  "accessCode": "AC-4AC2H2G",
  "payee": { ... },
  "certificate": { ... }
}
```

### 3. Manual Unlinking

**Endpoint:** `DELETE /api/link-access-code?payeeId=X&generatedAccessCode=Y`

**Response:**
```json
{
  "success": true,
  "message": "Successfully unlinked X questions from access code",
  "deletedCount": 5,
  "accessCode": "AC-4AC2H2G"
}
```

### 4. Query Linked Questions

**Endpoint:** `GET /api/access-code-questions?generatedAccessCode=AC-4AC2H2G`

**Response:**
```json
{
  "success": true,
  "questions": [...],
  "stats": {
    "totalQuestions": 5,
    "enabledQuestions": 5,
    "disabledQuestions": 0
  }
}
```

## UI Components

### Access Codes Management

**Location:** `frontend/app/access-codes/page.tsx`

**Features:**
- Table showing all paid customers with access codes
- "Questions Link Status" column with visual badges
- Link/Unlink buttons with loading states
- Toast notifications for success/error feedback

### Saved Questions Browser

**Location:** `frontend/app/saved-questions/page.tsx`

**Features:**
- Access code cards showing link status
- "Link to Questions" button for unlinked codes
- Status badges (Linked/Not Linked)
- Automatic status checking on load

## Workflow

### For New Questions

1. User adds a new question via the quiz interface
2. Question is saved to `quizzes` collection via `/api/save-quiz`
3. `updateAccessCodeQuestions()` function automatically runs
4. Function finds all payees with generated access codes for the certificate
5. New `access-code-questions` entries are created for each access code
6. Questions are automatically enabled and assigned sequential numbers

### For Manual Linking

1. User navigates to Access Codes management page
2. User sees "Not Linked" status for access codes without question assignments
3. User clicks "Link" button (🔗)
4. System creates question assignments for all certificate questions
5. Status updates to "Linked" with success notification

### For Manual Unlinking

1. User sees "Linked" status for access codes with question assignments
2. User clicks "Unlink" button (🔓)
3. System removes all question assignments for the access code
4. Status updates to "Not Linked" with success notification

## Database Operations

### Indexing

The system creates the following indexes for performance:

```javascript
// In access-code-questions collection
{ generatedAccessCode: 1 }
{ payeeId: 1 }
{ certificateId: 1 }
{ questionId: 1 }
{ generatedAccessCode: 1, sortOrder: 1 }
{ generatedAccessCode: 1, isEnabled: 1, sortOrder: 1 }
```

### Seeding

**Script:** `frontend/seed-access-code-questions.js`

- Creates initial question assignments for existing access codes
- Can be run to populate the collection with existing data
- Clears existing data before seeding

## Error Handling

### Automatic Linking Errors

- Logged as warnings, don't fail the main quiz save operation
- Non-blocking - quiz saves successfully even if linking fails

### Manual Linking Errors

- Displayed as toast notifications to user
- Common errors:
  - Access code not found
  - Payee not paid
  - No questions found for certificate
  - Conflicts when linking already-linked codes

## Security

- All endpoints protected with `withAuth()` middleware
- Only paid customers can have question assignments
- Access codes must be generated before linking
- Validates payee status and certificate relationships

## Monitoring

### Status Checking

The system provides several ways to monitor link status:

1. **UI Indicators:** Visual badges showing linked/unlinked status
2. **API Queries:** Dedicated endpoints to check question assignments
3. **Database Queries:** Direct MongoDB queries for troubleshooting

### Troubleshooting

Common issues and solutions:

1. **Questions not appearing for access code:**
   - Check if access code is linked (`isLinkedToQuestions: true`)
   - Verify questions exist in `access-code-questions` collection
   - Check if questions are enabled (`isEnabled: true`)

2. **Auto-linking not working for new questions:**
   - Check console logs in `/api/save-quiz` endpoint
   - Verify payees have `generatedAccessCode` field
   - Ensure payees have `status: 'paid'`

3. **Manual linking fails:**
   - Verify payee exists and has paid status
   - Check if generated access code exists
   - Ensure certificate has questions in `quizzes` collection

## Future Enhancements

1. **Bulk Operations:** Link/unlink multiple access codes at once
2. **Question Management:** Enable/disable individual questions per access code
3. **Analytics:** Track question assignment statistics
4. **Notifications:** Email notifications when questions are linked
5. **Question Ordering:** Custom question reordering per access code
