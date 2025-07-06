# AWS Cert Web Application - Comprehensive Flow Diagram

## Overview

This document provides a detailed application flow diagram showing the complete data flow from the React frontend through Next.js API routes to the Python backend, including authentication, data processing, and user interactions.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Next.js API    │    │ Python Backend  │
│   (React/Next)  │◄──►│   Routes         │◄──►│   (Flask)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
│                      │                      │
│ • User Interface     │ • Authentication     │ • PDF Processing
│ • State Management   │ • Business Logic     │ • Document Convert
│ • Client Routing     │ • Database Ops       │ • File Management
│ • Form Handling      │ • API Orchestration  │
└─────────────────────┘└─────────────────────┘└─────────────────┘
```

## Technology Stack

### Frontend (Next.js 15)
- **Framework**: Next.js 15 with React 18
- **Authentication**: Passkey Authentication (WebAuthn)
- **State Management**: React Hooks + Context
- **UI Components**: Radix UI + Tailwind CSS
- **PDF Viewing**: PDF.js
- **HTTP Client**: Fetch API

### Backend Services
- **API Layer**: Next.js API Routes (Edge Runtime Compatible)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + Edge Runtime Compatible Verification
- **File Processing**: Python Flask Service

### Python Backend
- **Framework**: Flask with CORS
- **PDF Processing**: Docling + PyPDF
- **Document Conversion**: PDF to Markdown conversion

## Detailed Application Flow

### 1. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant M as Middleware
    participant A as Auth API
    participant DB as MongoDB

    U->>F: Access Application
    F->>M: Request with/without JWT
    
    alt No JWT Token
        M->>F: Redirect to Login
        F->>U: Show Login Form
        U->>F: Enter Username + Passkey
        F->>A: POST /api/auth/passkey/login-challenge
        A->>DB: Verify User Exists
        A->>F: Return Challenge
        F->>U: Request Passkey Authentication
        U->>F: Provide Passkey Response
        F->>A: POST /api/auth/passkey/login
        A->>DB: Verify Passkey + Update Counter
        A->>F: Set JWT Cookie + Success Response
        F->>F: Redirect to Protected Route
    else Valid JWT Token
        M->>M: Verify JWT with Edge Runtime
        M->>F: Allow Access
    end
```

### 2. Certificate Management Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend (/certificates)
    participant API as API Routes
    participant DB as MongoDB

    U->>F: Navigate to Certificates
    F->>API: GET /api/certificates
    API->>DB: Query certificates collection
    DB->>API: Return certificates data
    API->>F: JSON response with certificates
    F->>U: Display certificates list

    U->>F: Create New Certificate
    F->>API: POST /api/certificates {name, code}
    API->>DB: Insert new certificate
    DB->>API: Return created certificate
    API->>F: Success response
    F->>F: Update local state
    F->>U: Show updated list

    U->>F: Edit Certificate
    F->>API: PUT /api/certificates/[id] {name, code}
    API->>DB: Update certificate by ID
    DB->>API: Return updated certificate
    API->>F: Success response
    F->>F: Update local state

    U->>F: Delete Certificate
    F->>API: DELETE /api/certificates/[id]
    API->>DB: Remove certificate by ID
    DB->>API: Confirm deletion
    API->>F: Success response
    F->>F: Remove from local state
```

### 3. Question Management & AI Explanation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as Next.js API
    participant AI as AI Services
    participant DB as MongoDB
    participant Cache as AI Cache

    U->>F: View Question
    F->>API: GET /api/access-code-questions?generatedAccessCode=xxx
    API->>DB: Query questions with access code
    DB->>API: Return questions data
    API->>F: Transformed questions JSON
    F->>U: Display questions

    U->>F: Request AI Explanation
    F->>API: POST /api/ai-explanation {question, options, correctAnswer, questionId}
    
    API->>Cache: Check existing AI explanation
    Cache->>API: Return cached explanation OR null
    
    alt Cached Explanation Exists
        API->>F: Return cached explanation
    else No Cache
        API->>AI: Generate explanation (Vercel AI or OpenAI)
        AI->>API: Return AI explanation
        API->>Cache: Store explanation in cache
        API->>F: Return new explanation
    end
    
    F->>U: Display AI explanation with formatting
```

### 4. PDF Processing Flow (Frontend → Next.js → Python)

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant PV as PDF Viewer Component
    participant API as Next.js API
    participant PY as Python Backend (Flask)
    participant DC as Document Converter

    U->>F: Upload PDF File
    F->>PV: Initialize PDF Viewer
    PV->>PV: Load PDF with PDF.js
    PV->>U: Display PDF pages

    U->>PV: Select specific page for conversion
    PV->>API: POST request to proxy endpoint
    Note over API: Next.js acts as proxy to Python backend
    
    API->>PY: POST /convert-pdf {pdfFile, pageNumber}
    PY->>PY: Save uploaded PDF to temp file
    
    alt Single Page Conversion
        PY->>PY: Extract specific page with PyPDF
        PY->>PY: Create single-page PDF
    end
    
    PY->>DC: Convert PDF using Docling
    DC->>PY: Return markdown content
    PY->>PY: Cleanup temp files
    PY->>API: JSON {markdown: content}
    API->>F: Proxy response to frontend
    F->>U: Display converted markdown content
    
    Note over PY: Python backend handles:
    Note over PY: - PDF file processing
    Note over PY: - Page extraction
    Note over PY: - Document conversion
    Note over PY: - Temporary file management
```

### 5. Data Access Pattern Flow

```mermaid
flowchart TD
    A[User Request] --> B{Authenticated?}
    B -->|No| C[Redirect to Login]
    B -->|Yes| D[Middleware JWT Verification]
    D --> E{JWT Valid?}
    E -->|No| C
    E -->|Yes| F[Route to API Handler]
    
    F --> G{API Route Type}
    G -->|Database Operation| H[Connect to MongoDB]
    G -->|AI Operation| I[Connect to AI Service]
    G -->|File Processing| J[Connect to Python Backend]
    
    H --> K[Execute Query/Mutation]
    I --> L[Generate AI Response]
    J --> M[Process PDF/Documents]
    
    K --> N[Transform Data]
    L --> N
    M --> N
    
    N --> O[Return JSON Response]
    O --> P[Update Frontend State]
    P --> Q[Render UI Updates]
```

## API Endpoints Reference

### Authentication Endpoints
- `POST /api/auth/passkey/register-challenge` - Generate registration challenge
- `POST /api/auth/passkey/register` - Complete passkey registration
- `POST /api/auth/passkey/login-challenge` - Generate login challenge
- `POST /api/auth/passkey/login` - Complete passkey authentication
- `POST /api/auth/logout` - Clear authentication
- `GET /api/auth/verify` - Verify current authentication

### Certificate Management
- `GET /api/certificates` - List all certificates
- `POST /api/certificates` - Create new certificate
- `PUT /api/certificates/[id]` - Update certificate
- `DELETE /api/certificates/[id]` - Delete certificate
- `GET /api/certificates/[id]/next-question-no` - Get next question number

### Question Management
- `GET /api/access-code-questions` - Get questions by access code
- `POST /api/access-code-questions` - Create/update questions
- `GET /api/saved-questions` - Get saved questions
- `POST /api/save-quiz` - Save quiz results

### AI & Processing
- `POST /api/ai-explanation` - Generate AI explanations for questions
- External: `POST :5000/convert-pdf` - Python backend PDF conversion

### Administrative
- `GET /api/payees` - Manage payees
- `POST /api/payees` - Create payee
- `PUT /api/payees/[id]` - Update payee
- `DELETE /api/payees/[id]` - Delete payee

## Security Implementation

### Authentication Security
- **Passkey Authentication**: WebAuthn standard for secure passwordless login
- **JWT Tokens**: Signed with HMAC-SHA256, 1-hour expiration
- **Edge Runtime Compatible**: Custom JWT verification for Next.js middleware
- **HTTP-Only Cookies**: Secure token storage, not accessible via JavaScript
- **CORS Protection**: Configured for specific origins

### Authorization Patterns
```typescript
// All protected routes use withAuth HOC
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  // Route handler has access to authenticated user
  const userId = request.user.userId;
  // Business logic here
});
```

### Data Validation
- **Input Sanitization**: All API inputs validated and sanitized
- **MongoDB Injection Protection**: Parameterized queries with Mongoose
- **File Upload Security**: Temporary file handling with cleanup
- **Rate Limiting**: Implemented at API route level

## Database Schema Overview

### Collections Structure
```javascript
// Users Collection
{
  _id: ObjectId,
  username: String,
  passkeys: [{
    credentialID: String,
    credentialPublicKey: Buffer,
    counter: Number,
    credentialDeviceType: String,
    credentialBackedUp: Boolean,
    transports: [String]
  }],
  createdAt: Date
}

// Certificates Collection
{
  _id: ObjectId,
  name: String,
  code: String (unique),
  createdAt: Date,
  updatedAt: Date
}

// Access Code Questions Collection
{
  _id: ObjectId,
  generatedAccessCode: String,
  questionNumber: Number,
  question: String,
  options: [String],
  correctAnswer: Number,
  explanation: String,
  certificateCode: String,
  enabled: Boolean,
  aiExplanation: String,
  createdAt: Date,
  updatedAt: Date
}

// AI Explanations Cache
{
  _id: ObjectId,
  questionId: ObjectId,
  explanation: String,
  createdAt: Date,
  expiresAt: Date
}
```

## Environment Configuration

### Frontend Environment Variables
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/awscert

# Authentication
JWT_SECRET=your_super_secret_jwt_key
RP_ID=localhost
RP_NAME="AWS Cert Web"
ORIGIN=http://localhost:3000

# External Services
NEXT_PUBLIC_PDF_CONVERSION_API_URL=http://localhost:5000
VERCEL_API_KEY=your_vercel_api_key
OPENAI_API_KEY=your_openai_api_key

# Development
NEXT_DISABLE_OVERLAY=true
```

### Python Backend Configuration
```python
# Flask Configuration
app.debug = True
CORS(app)  # Enable CORS for all routes
host='0.0.0.0', port=5000
```

## Performance Considerations

### Frontend Optimizations
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js Image component
- **Caching**: API response caching with revalidation
- **Lazy Loading**: PDF components loaded on demand

### Backend Optimizations
- **Connection Pooling**: MongoDB connection reuse
- **AI Response Caching**: Cached explanations to reduce API calls
- **File Processing**: Temporary file cleanup
- **Edge Runtime**: Faster middleware execution

### Python Service Optimizations
- **Temporary File Management**: Automatic cleanup
- **Memory Management**: Efficient PDF processing
- **Error Handling**: Comprehensive error catching and logging

## Development Workflow

### Local Development Setup
1. **Frontend**: `npm run dev` (Port 3001)
2. **Python Backend**: `python app.py` (Port 5000)
3. **MongoDB**: Local instance on port 27017

### Testing Strategy
- **Authentication Flow**: Comprehensive passkey testing
- **API Endpoints**: Individual endpoint testing
- **PDF Processing**: End-to-end file processing tests
- **Database Operations**: CRUD operation verification

## Deployment Architecture

### Production Flow
```
User → CDN/Load Balancer → Next.js Frontend → Next.js API → MongoDB
                                           → Python Backend → Document Processing
                                           → AI Services → Response Generation
```

### Scalability Considerations
- **Horizontal Scaling**: Multiple Next.js instances
- **Database Scaling**: MongoDB replica sets
- **File Processing**: Queue-based PDF processing
- **Caching Layer**: Redis for session/data caching

---

*This diagram represents the current state of the AWS Cert Web application as of July 2025. For specific implementation details, refer to the codebase and individual component documentation.*
