# Access Code Questions Integrity System

This document describes the enhanced system that ensures data integrity between the `quizzes` collection and the `access-code-questions` collection.

## Problem Statement

When a certificate has questions in the `quizzes` collection and has generated access codes linked to it via payees, there should be a corresponding record in the `access-code-questions` collection for each combination of access code and question. However, due to various reasons (system issues, data migrations, etc.), some access codes might be missing records for certain questions.

For example:
- Certificate has 5 questions
- Access code should have 5 records in `access-code-questions`
- But actually only has 4 records (missing 1 question link)

## Solution Overview

The system now includes:

1. **Enhanced save-quiz logic** - When saving a new question, it ensures ALL access codes have complete question sets
2. **Integrity check API** - Standalone endpoint to check and fix missing records
3. **Comprehensive validation** - Scripts to test and validate the integrity

## Components

### 1. Enhanced Save Quiz Logic (`/api/save-quiz/route.ts`)

The `updateAccessCodeQuestions` function now:
- Calls `ensureCompleteAccessCodeQuestions` to fix any missing records for ALL questions
- Verifies the new question is properly linked to all access codes
- Provides detailed logging for troubleshooting

### 2. Integrity Check API (`/api/fix-access-code-questions/route.ts`)

**GET** - Check status without making changes:
```
GET /api/fix-access-code-questions
GET /api/fix-access-code-questions?certificateId=<id>
```

**POST** - Fix missing records:
```json
// Fix specific certificate
POST /api/fix-access-code-questions
{
  "certificateId": "certificate_id_here"
}

// Fix all certificates
POST /api/fix-access-code-questions
{
  "fixAll": true
}
```

### 3. Validation Scripts

**Database integrity test** (`scripts/test-access-code-questions-integrity.js`):
```bash
# Test all certificates
node scripts/test-access-code-questions-integrity.js

# Test specific certificate
node scripts/test-access-code-questions-integrity.js <certificateId>
```

**API testing** (`scripts/test-fix-access-code-questions.js`):
```bash
# Check status
node scripts/test-fix-access-code-questions.js check [certificateId]

# Fix issues
node scripts/test-fix-access-code-questions.js fix [certificateId]

# Test integration with save-quiz
node scripts/test-fix-access-code-questions.js test <certificateId>
```

## How It Works

### When Saving a New Question

1. Question is saved to `quizzes` collection with auto-incremented `question_no`
2. `updateAccessCodeQuestions` is called
3. `ensureCompleteAccessCodeQuestions` runs first:
   - Gets all questions for the certificate
   - Gets all access codes for the certificate
   - For each access code, checks which questions are missing from `access-code-questions`
   - Creates missing records with proper `sortOrder` and `assignedQuestionNo`
4. Additional verification ensures the new question is linked

### Data Integrity Guarantees

- **Complete coverage**: Every access code will have records for ALL questions
- **Proper ordering**: Records maintain correct `sortOrder` and `assignedQuestionNo` sequences
- **No duplicates**: Existing records are preserved, only missing ones are created
- **Atomic operations**: Uses transactions where possible to ensure consistency

## API Response Examples

### GET Status Check Response
```json
{
  "success": true,
  "totalCertificatesChecked": 3,
  "totalMissingRecords": 7,
  "needsFix": true,
  "results": [
    {
      "certificateId": "cert_123",
      "questionCount": 5,
      "accessCodeCount": 2,
      "totalMissingRecords": 3,
      "accessCodeDetails": [
        {
          "accessCode": "ABC123",
          "expectedRecords": 5,
          "existingRecords": 5,
          "missingRecords": 0,
          "isComplete": true
        },
        {
          "accessCode": "DEF456",
          "expectedRecords": 5,
          "existingRecords": 2,
          "missingRecords": 3,
          "isComplete": false
        }
      ],
      "needsFix": true
    }
  ]
}
```

### POST Fix Response
```json
{
  "success": true,
  "totalCertificatesProcessed": 1,
  "totalRecordsCreated": 3,
  "results": [
    {
      "certificateId": "cert_123",
      "questionsFound": 5,
      "accessCodesFound": 2,
      "recordsCreated": 3,
      "accessCodeDetails": [
        {
          "accessCode": "ABC123",
          "existingRecords": 5,
          "missingRecords": 0,
          "recordsCreated": 0
        },
        {
          "accessCode": "DEF456",
          "existingRecords": 2,
          "missingRecords": 3,
          "recordsCreated": 3
        }
      ],
      "message": "Successfully created 3 missing question assignments"
    }
  ]
}
```

## Testing and Validation

### Before Deployment
1. Run integrity check to identify current issues:
   ```bash
   node scripts/test-access-code-questions-integrity.js
   ```

2. Test API endpoints:
   ```bash
   node scripts/test-fix-access-code-questions.js check
   ```

### After Deployment
1. Fix any existing integrity issues:
   ```bash
   # Via API
   curl -X POST /api/fix-access-code-questions \
     -H "Content-Type: application/json" \
     -d '{"fixAll": true}'
   ```

2. Test new question saving:
   ```bash
   node scripts/test-fix-access-code-questions.js test <certificateId>
   ```

### Monitoring
- Check logs for "access code questions update completed" messages
- Monitor for any "Failed to update access-code-questions collection" warnings
- Periodically run integrity checks to ensure ongoing data consistency

## Error Handling

- Save quiz operations continue even if access-code-questions update fails
- Detailed error logging for troubleshooting
- Graceful handling of edge cases (no questions, no access codes, etc.)
- Non-blocking integrity checks won't affect main application flow

## Performance Considerations

- Integrity checks run only when necessary (when saving new questions)
- Batch operations for creating multiple missing records
- Efficient queries using MongoDB aggregation pipeline
- Minimal impact on save-quiz response times

## Security

- All endpoints require authentication via `withAuth` middleware
- Input validation for certificate IDs
- No exposure of sensitive access code data in responses
- Audit trail via timestamps and logging
