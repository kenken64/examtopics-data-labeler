# Product Requirements Prompting (PRP)
## ExamTopics Data Labeler - AWS Certification Preparation Ecosystem

**Version:** 1.0
**Last Updated:** January 2025
**Document Type:** Product Requirements Prompting (PRP)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Product Components](#product-components)
4. [Core Features & Requirements](#core-features--requirements)
5. [Technical Stack](#technical-stack)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Authentication & Security](#authentication--security)
9. [User Workflows](#user-workflows)
10. [Development Guidelines](#development-guidelines)
11. [Deployment & Infrastructure](#deployment--infrastructure)
12. [Future Roadmap](#future-roadmap)

---

## Executive Summary

### Product Vision

ExamTopics Data Labeler is a comprehensive AWS certification preparation ecosystem that combines web-based PDF data labeling, interactive quiz management, analytics dashboards, and an AI-powered Telegram bot for seamless exam preparation. The platform enables educators and administrators to create, manage, and distribute AWS certification practice questions while providing students with multiple learning interfaces.

### Target Users

1. **Administrators**: Manage certificates, questions, access codes, and payee records
2. **Content Creators**: Upload PDFs, label questions, and create quiz content
3. **Students**: Practice AWS certification exams via web interface or Telegram bot
4. **Educators**: Monitor student progress through analytics dashboards

### Key Value Propositions

- **Multi-Channel Learning**: Web interface + Telegram bot for flexible study options
- **AI-Powered Explanations**: Automated second opinions using OpenAI/Anthropic AI
- **PDF-to-Quiz Pipeline**: Streamlined OCR and data labeling workflow
- **Progress Tracking**: Comprehensive analytics and performance monitoring
- **Secure Access Control**: WebAuthn passkeys + JWT authentication
- **Customizable Quizzes**: Question assignment per access code

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interfaces                          │
├──────────────────────────┬──────────────────────────────────────┤
│   Web Application        │      Telegram Bot                    │
│   (Next.js 15 + React)   │      (Grammy Framework)              │
└──────────┬───────────────┴───────────────┬──────────────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Next.js API Layer                             │
│  - Authentication (WebAuthn + JWT)                                │
│  - Business Logic & Data Transformation                           │
│  - MongoDB Integration (Mongoose ODM)                             │
│  - AI Services (OpenAI/Anthropic via Vercel AI SDK)              │
└───────────────┬──────────────────────────────────┬───────────────┘
                │                                  │
                ▼                                  ▼
    ┌───────────────────────┐        ┌───────────────────────┐
    │   MongoDB Database    │        │  Python Flask Backend │
    │   - Users             │        │  - PDF Processing     │
    │   - Certificates      │        │  - OCR (EasyOCR)      │
    │   - Questions         │        │  - Docling Conversion │
    │   - Access Codes      │        │  - OpenAI Vision API  │
    │   - Quiz Attempts     │        └───────────────────────┘
    │   - Bookmarks         │
    └───────────────────────┘
```

### Component Breakdown

#### 1. **Frontend (Next.js Web Application)**
- Port: 3000
- Framework: Next.js 15.3.5 with React 19
- Build Tool: Turbopack (development)
- Key Libraries: shadcn/ui, Radix UI, Tailwind CSS, Chart.js

#### 2. **Backend (Python/Flask)**
- Port: 5000
- Framework: Flask 3.1.1
- Key Libraries: docling, pypdf, easyocr, OpenAI SDK, torch
- Purpose: PDF processing and OCR conversion

#### 3. **Telegram Bot (Node.js)**
- Port: 8080
- Framework: Grammy
- Database: MongoDB (native driver)
- Purpose: Interactive quiz delivery

#### 4. **Database (MongoDB)**
- Database Name: `awscert`
- Collections: 8 (users, certificates, questions, access codes, etc.)
- ODM: Mongoose (frontend), Native Driver (Telegram bot)

---

## Product Components

### Component 1: Web Application Frontend

#### Purpose
Provide administrators and content creators with a comprehensive interface for managing AWS certification content, labeling PDF documents, and monitoring student progress.

#### Key Pages

1. **Login/Register Page** (`/login`, `/register`)
   - Passkey-based authentication (WebAuthn)
   - Username registration with passkey enrollment
   - JWT token issuance on successful authentication

2. **Analytics Dashboard** (`/dashboard`)
   - Certificate statistics (bar charts)
   - Quiz performance trends (line charts)
   - User engagement metrics
   - Access code distribution
   - Real-time data from quiz attempts

3. **PDF Data Labeler** (`/exam-q-labeler`)
   - PDF upload via Cloudinary integration
   - Page-by-page PDF rendering using pdfjs-dist
   - PDF-to-Markdown conversion via Python backend
   - Question/answer/explanation labeling interface
   - Save labeled data to MongoDB

4. **Certificate Management** (`/certificates`)
   - CRUD operations for AWS certificate types
   - Fields: name, code, logo URL, PDF certificate
   - Next question number tracking

5. **Payee Management** (`/payees`)
   - Customer payment records
   - Masked credit card details
   - Payment status tracking
   - Certificate associations

6. **Access Code Management** (`/access-codes`)
   - Generate unique access codes
   - Link access codes to certificates
   - Assign specific questions to codes

7. **Question Assignment** (`/manage-questions`)
   - Assign questions to generated access codes
   - Reorder question sequences
   - Enable/disable individual questions
   - Bulk question management

8. **Saved Questions Viewer** (`/saved-questions`)
   - Browse questions by certificate code
   - Search by access code
   - View question details and explanations
   - AI-powered second opinions

#### UI/UX Requirements

- **Responsive Design**: Mobile-first approach using Tailwind CSS
- **Accessibility**: WCAG 2.1 AA compliance
- **Loading States**: Skeleton screens and suspense boundaries
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Success/error feedback using Sonner
- **Sliding Menu**: Navigation drawer with user profile

### Component 2: Python Backend (PDF Conversion Service)

#### Purpose
Handle computationally intensive PDF processing, OCR, and document conversion tasks that are better suited for Python's ML/AI ecosystem.

#### Core Capabilities

1. **PDF Upload Handling**
   - Accept multipart/form-data uploads
   - Temporary file storage with automatic cleanup
   - File validation and sanitization

2. **Page Extraction**
   - Extract specific pages using PyPDF
   - Create single-page PDFs for focused conversion
   - Handle multi-page batch processing

3. **OCR Processing**
   - EasyOCR integration for text extraction
   - OpenAI Vision API for intelligent document understanding
   - Image preprocessing for better accuracy

4. **Markdown Conversion**
   - Docling library for PDF-to-Markdown transformation
   - Preserve document structure and formatting
   - Handle tables, lists, and special characters

5. **API Endpoints**
   - `POST /convert-pdf`: Main conversion endpoint
   - CORS enabled for Next.js frontend communication
   - JSON response format with markdown content

#### Technical Specifications

- **Runtime**: Python 3.8+
- **Server**: Flask development server (dev), Gunicorn (production)
- **Concurrency**: Single-threaded (dev), multi-worker (production)
- **Memory Management**: Automatic temp file cleanup
- **Error Handling**: Comprehensive try-catch with detailed logging

### Component 3: Telegram Bot

#### Purpose
Provide students with a convenient, mobile-friendly interface for practicing AWS certification questions through Telegram messenger.

#### Core Features

1. **Interactive Quiz Sessions**
   - Multiple choice questions (A, B, C, D options)
   - Inline keyboard navigation
   - Real-time score tracking
   - Question-by-question feedback

2. **Certificate Selection**
   - Display available certificates with inline buttons
   - Dynamic certificate loading from MongoDB
   - Certificate-specific question sets

3. **Access Code Integration**
   - Validate generated access codes
   - Load personalized question assignments
   - Track code usage per user

4. **Progress Tracking**
   - Save quiz attempts to MongoDB
   - Track correct/incorrect answers
   - Calculate scores and percentages
   - Store completion timestamps

5. **Bookmark System**
   - `/bookmark <number>` - Save specific questions
   - `/bookmarks` - View saved questions
   - Persistent bookmark storage per user

6. **Revision Mode**
   - `/revision` - Review previously answered questions
   - Focus on incorrect answers
   - Reinforcement learning approach

7. **Help System**
   - `/help` - Comprehensive command guide
   - Feature explanations
   - Usage instructions

#### Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize quiz session, show certificates |
| `/help` | Display help guide with all commands |
| `/bookmark <n>` | Save question N for later review |
| `/bookmarks` | View all saved bookmarks |
| `/revision` | Review previously answered questions |

#### Technical Specifications

- **Framework**: Grammy (modern Telegram bot framework)
- **Database**: MongoDB native driver
- **Session Management**: In-memory user session tracking
- **Error Handling**: Graceful error recovery with user feedback
- **Conflict Resolution**: Bot manager script for handling webhook conflicts

---

## Core Features & Requirements

### Feature 1: WebAuthn Passkey Authentication

#### Description
Implement passwordless authentication using FIDO2/WebAuthn standard with hardware-backed passkeys for enhanced security.

#### Requirements

**Functional:**
- FR-1.1: User registration with passkey enrollment
- FR-1.2: Passkey-based login with challenge-response
- FR-1.3: JWT token generation and management
- FR-1.4: Secure session handling with HTTP-only cookies
- FR-1.5: Automatic token refresh mechanism

**Non-Functional:**
- NFR-1.1: Authentication latency < 2 seconds
- NFR-1.2: Support for multiple passkeys per user
- NFR-1.3: Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- NFR-1.4: Mobile device support (iOS, Android)

**Technical Implementation:**
- Library: `@simplewebauthn/server` and `@simplewebauthn/browser`
- Challenge Storage: Server-side session (CRITICAL: current global variable is dev-only)
- JWT Signing: HMAC-SHA256 with configurable secret
- Token Expiration: 1 hour (configurable)

**Security Considerations:**
- ⚠️ **CRITICAL**: Current challenge storage uses global variable (development only)
- ✅ **Production Required**: Implement Redis/database-backed session management
- ✅ Store passkey credentials in MongoDB with encryption
- ✅ Implement counter validation to prevent replay attacks
- ✅ Validate relying party ID and origin

### Feature 2: PDF Data Labeler with OCR

#### Description
End-to-end pipeline for converting PDF exam dumps into structured quiz questions using AI-powered OCR and manual labeling interface.

#### Requirements

**Functional:**
- FR-2.1: Upload PDF files via Cloudinary integration
- FR-2.2: Render PDF pages using PDF.js
- FR-2.3: Select specific pages for conversion
- FR-2.4: Convert PDF to Markdown using OpenAI Vision API
- FR-2.5: Label questions, answers, and explanations
- FR-2.6: Save labeled data to MongoDB

**Non-Functional:**
- NFR-2.1: Support PDFs up to 50MB
- NFR-2.2: Conversion time < 30 seconds per page
- NFR-2.3: OCR accuracy > 95% for printed text
- NFR-2.4: Handle multiple PDF formats (PDF 1.4 to 2.0)

**Technical Implementation:**
- Frontend: pdfjs-dist for rendering
- Backend: Python Flask with docling + OpenAI
- Storage: Cloudinary for PDF files, MongoDB for questions
- API Flow: Next.js → Python Backend → OpenAI Vision API

**User Workflow:**
1. Upload PDF via Cloudinary widget
2. View PDF page-by-page in browser
3. Select page and click "Convert to Markdown"
4. Review AI-generated markdown
5. Label question sections (question, options, answer, explanation)
6. Save to database with certificate association

### Feature 3: AI-Powered Second Opinions

#### Description
Generate AI explanations for quiz questions to provide students with detailed reasoning for correct answers.

#### Requirements

**Functional:**
- FR-3.1: Generate explanations on-demand via API
- FR-3.2: Support multiple AI providers (OpenAI, Anthropic)
- FR-3.3: Cache explanations to reduce API costs
- FR-3.4: Display explanations in markdown format
- FR-3.5: Allow manual override of AI explanations

**Non-Functional:**
- NFR-3.1: Explanation generation < 5 seconds
- NFR-3.2: Cache hit rate > 80%
- NFR-3.3: Cost optimization through caching
- NFR-3.4: Support for code snippets in explanations

**Technical Implementation:**
- SDK: Vercel AI SDK (`ai` package)
- Providers: `@ai-sdk/openai`, `@ai-sdk/anthropic`
- Caching: MongoDB collection with TTL indexes
- API Endpoint: `/api/ai-explanation`

**Caching Strategy:**
- Key: Hash of (questionId + question text + options + correct answer)
- TTL: 30 days
- Invalidation: Manual or on question edit

### Feature 4: Analytics Dashboard

#### Description
Comprehensive analytics dashboard displaying certificate statistics, quiz performance trends, user engagement, and access code distribution.

#### Requirements

**Functional:**
- FR-4.1: Certificate statistics bar chart
- FR-4.2: Quiz performance line chart (30-day trend)
- FR-4.3: User engagement metrics
- FR-4.4: Access code distribution
- FR-4.5: Real-time data refresh
- FR-4.6: Export dashboard data to CSV/Excel

**Non-Functional:**
- NFR-4.1: Dashboard load time < 3 seconds
- NFR-4.2: Support up to 10,000 quiz attempts
- NFR-4.3: Responsive design for mobile/tablet
- NFR-4.4: Chart animations for better UX

**Technical Implementation:**
- Library: Chart.js with react-chartjs-2
- Data Source: MongoDB aggregation pipelines
- Update Mechanism: Server-side data fetching with Next.js
- Chart Types: Bar, Line, Doughnut, Pie

**Metrics Tracked:**
- Total quiz attempts
- Average score per certificate
- Completion rate
- Time spent per quiz
- Most challenging questions
- User activity heatmap

### Feature 5: QuizBlitz (Multiplayer Live Quiz)

#### Description
Kahoot-style live quiz sessions with real-time multiplayer features, leaderboards, and timer-based challenges.

#### Requirements

**Functional:**
- FR-5.1: Create quiz rooms with unique codes
- FR-5.2: Join rooms with access codes
- FR-5.3: Real-time answer submission
- FR-5.4: Live leaderboard updates
- FR-5.5: Timer synchronization across clients
- FR-5.6: Quiz control panel for hosts

**Non-Functional:**
- NFR-5.1: Support up to 100 concurrent players
- NFR-5.2: Latency < 500ms for updates
- NFR-5.3: Timer accuracy ±100ms
- NFR-5.4: Graceful handling of disconnections

**Technical Implementation:**
- Real-time: Server-Sent Events (SSE)
- State Management: RxJS observables
- Timer Service: Observable-based countdown
- API Endpoints: `/api/quizblitz/*`

**User Roles:**
- **Host**: Create room, start quiz, control flow
- **Player**: Join room, answer questions, view leaderboard

---

## Technical Stack

### Frontend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Next.js | 15.3.5 | React meta-framework with SSR/SSG |
| **UI Library** | React | 19.0.0 | Component-based UI |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS framework |
| **UI Components** | shadcn/ui | Latest | Accessible component library |
| **Component Primitives** | Radix UI | Latest | Unstyled accessible components |
| **Charts** | Chart.js + react-chartjs-2 | 4.5.0, 5.3.0 | Data visualization |
| **PDF Rendering** | pdfjs-dist | 5.3.31 | Client-side PDF viewing |
| **Authentication** | @simplewebauthn/browser | 2.1.1 | WebAuthn client |
| **AI SDK** | Vercel AI SDK | 4.3.16 | Unified AI provider interface |
| **State Management** | React Hooks + RxJS | 19.0.0, 7.8.2 | Local state + reactive streams |
| **HTTP Client** | Fetch API | Native | API requests |
| **Validation** | Zod | 3.25.74 | Schema validation |
| **Icons** | Lucide React | 0.525.0 | Icon library |
| **Notifications** | Sonner | 2.0.6 | Toast notifications |
| **Markdown** | react-markdown | 10.1.0 | Markdown rendering |

### Backend Technologies

#### Next.js API Layer

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Runtime** | Node.js | 20.x | JavaScript runtime |
| **Database ODM** | Mongoose | 8.16.1 | MongoDB object modeling |
| **Authentication** | jsonwebtoken | 9.0.2 | JWT token handling |
| **Edge JWT** | Custom implementation | N/A | Edge runtime JWT verification |
| **File Upload** | Cloudinary | 2.7.0 | Image/PDF hosting |
| **AI Providers** | @ai-sdk/openai, @ai-sdk/anthropic | 1.3.22, 1.2.12 | AI model integration |

#### Python Backend

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Flask | 3.1.1 | Web framework |
| **CORS** | flask-cors | 6.0.1 | Cross-origin requests |
| **PDF Processing** | docling | 2.40.0 | PDF document conversion |
| **PDF Parsing** | pypdf | 5.7.0 | PDF manipulation |
| **OCR** | easyocr | 1.7.2 | Optical character recognition |
| **AI** | openai | 1.93.3 | OpenAI API client |
| **ML Framework** | torch | 2.7.1 | PyTorch for models |
| **Image Processing** | opencv-python-headless | 4.12.0 | Computer vision |
| **Document** | python-docx, openpyxl | 1.2.0, 3.1.5 | Office document handling |
| **Server** | gunicorn (production) | 21.2.0 | WSGI HTTP server |

#### Telegram Bot

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Grammy | Latest | Telegram bot framework |
| **Database** | mongodb (native) | Latest | MongoDB driver |
| **Environment** | dotenv | Latest | Configuration management |

### Infrastructure & Deployment

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database** | MongoDB | NoSQL document database |
| **Hosting** | Railway | Cloud platform for deployment |
| **CDN** | Cloudinary | Media asset delivery |
| **Version Control** | Git | Source code management |
| **CI/CD** | GitHub Actions | Automated testing and deployment |
| **Containerization** | Docker + Docker Compose | Multi-service orchestration |
| **Process Management** | PM2 (optional) | Node.js process manager |

---

## Database Schema

### Collection: `users`

**Purpose:** Store user accounts and passkey credentials

```javascript
{
  _id: ObjectId,
  username: String,              // Unique username
  passkeys: [                    // Array of registered passkeys
    {
      credentialID: String,      // Base64 encoded credential ID
      credentialPublicKey: Buffer, // Public key for verification
      counter: Number,           // Signature counter (replay protection)
      credentialDeviceType: String, // "singleDevice" or "multiDevice"
      credentialBackedUp: Boolean, // Backup eligibility
      transports: [String]       // ["usb", "nfc", "ble", "internal"]
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `username`: Unique index
- `passkeys.credentialID`: Index for fast lookup

### Collection: `certificates`

**Purpose:** AWS certification types and metadata

```javascript
{
  _id: ObjectId,
  name: String,                  // Display name (e.g., "AWS Solutions Architect")
  code: String,                  // Unique code (e.g., "SAA-C03")
  logoUrl: String,               // URL to certificate logo
  pdfUrl: String,                // Cloudinary URL to certificate PDF
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `code`: Unique index

### Collection: `payees`

**Purpose:** Customer payment and subscription records

```javascript
{
  _id: ObjectId,
  name: String,                  // Customer name
  email: String,                 // Contact email
  creditCardLast4: String,       // Masked card number (last 4 digits)
  paymentStatus: String,         // "active", "expired", "pending"
  certificateIds: [ObjectId],    // Associated certificates
  generatedAccessCodes: [String], // Generated access codes
  subscriptionStart: Date,
  subscriptionEnd: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `email`: Unique index
- `generatedAccessCodes`: Index for access code lookups

### Collection: `access-codes`

**Purpose:** Access code management and certificate linking

```javascript
{
  _id: ObjectId,
  originalAccessCode: String,    // Original reference code
  generatedAccessCode: String,   // Unique generated code
  certificateId: ObjectId,       // Reference to certificate
  certificateCode: String,       // Denormalized certificate code
  payeeId: ObjectId,             // Reference to payee
  isActive: Boolean,             // Code activation status
  usageCount: Number,            // Number of times used
  maxUsage: Number,              // Maximum allowed usage
  expiresAt: Date,               // Expiration timestamp
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `generatedAccessCode`: Unique index
- `certificateCode`: Index
- `payeeId`: Index

### Collection: `access-code-questions`

**Purpose:** Question assignments for specific access codes

```javascript
{
  _id: ObjectId,
  generatedAccessCode: String,   // Access code this question belongs to
  certificateCode: String,       // Certificate this question is for
  questionNumber: Number,        // Order/sequence number
  question: String,              // Question text
  options: [String],             // Answer choices (4-6 options)
  correctAnswer: Number,         // Index of correct option (0-based)
  explanation: String,           // Human-written explanation
  aiExplanation: String,         // AI-generated explanation
  enabled: Boolean,              // Whether question is active
  difficulty: String,            // "easy", "medium", "hard"
  tags: [String],                // Topic tags
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- Compound: `{generatedAccessCode: 1, questionNumber: 1}` (unique)
- `certificateCode`: Index
- `enabled`: Index

### Collection: `questions` (Global Question Bank)

**Purpose:** Master question repository before assignment

```javascript
{
  _id: ObjectId,
  certificateCode: String,       // Certificate this question is for
  question: String,
  options: [String],
  correctAnswer: Number,
  explanation: String,
  aiExplanation: String,
  sourceDocument: String,        // Original PDF filename
  sourcePage: Number,            // Page number in PDF
  difficulty: String,
  tags: [String],
  reviewStatus: String,          // "pending", "approved", "rejected"
  createdBy: ObjectId,           // User who created
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `certificateCode`: Index
- `reviewStatus`: Index

### Collection: `quiz-attempts`

**Purpose:** Track student quiz sessions and results

```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // Reference to user (or Telegram user ID)
  telegramUserId: Number,        // Telegram user ID (if from bot)
  username: String,              // Telegram username
  certificateCode: String,       // Certificate attempted
  generatedAccessCode: String,   // Access code used
  questions: [                   // Questions in this attempt
    {
      questionId: ObjectId,
      questionText: String,
      selectedAnswer: Number,
      correctAnswer: Number,
      isCorrect: Boolean,
      timeSpent: Number          // Seconds spent on question
    }
  ],
  score: Number,                 // Correct answers count
  totalQuestions: Number,
  percentage: Number,            // Score percentage
  startedAt: Date,
  completedAt: Date,
  duration: Number,              // Total time in seconds
  source: String,                // "web" or "telegram"
  createdAt: Date
}
```

**Indexes:**
- `userId`: Index
- `telegramUserId`: Index
- `certificateCode`: Index
- `completedAt`: Index (for analytics)

### Collection: `bookmarks`

**Purpose:** Student saved questions for revision

```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // User or Telegram user ID
  telegramUserId: Number,
  questionId: ObjectId,          // Reference to question
  certificateCode: String,
  notes: String,                 // Optional user notes
  createdAt: Date
}
```

**Indexes:**
- Compound: `{userId: 1, questionId: 1}` (unique)
- Compound: `{telegramUserId: 1, questionId: 1}` (unique)

### Collection: `ai-explanation-cache`

**Purpose:** Cache AI-generated explanations to reduce API costs

```javascript
{
  _id: ObjectId,
  questionId: ObjectId,          // Reference to question
  questionHash: String,          // Hash of question content
  explanation: String,           // Cached AI explanation
  provider: String,              // "openai" or "anthropic"
  model: String,                 // Model used (e.g., "gpt-4")
  createdAt: Date,
  expiresAt: Date                // TTL expiration
}
```

**Indexes:**
- `questionId`: Index
- `questionHash`: Unique index
- `expiresAt`: TTL index (auto-delete expired)

### Collection: `quizblitz-rooms`

**Purpose:** Live multiplayer quiz sessions

```javascript
{
  _id: ObjectId,
  quizCode: String,              // Unique room code
  hostUserId: ObjectId,          // Creator of the room
  certificateCode: String,       // Certificate for this quiz
  generatedAccessCode: String,   // Access code for questions
  questionIds: [ObjectId],       // Questions in this quiz
  currentQuestionIndex: Number,  // Current question being shown
  status: String,                // "waiting", "active", "completed"
  players: [                     // Connected players
    {
      userId: ObjectId,
      username: String,
      score: Number,
      answers: [Number],         // Answer indexes
      joinedAt: Date
    }
  ],
  settings: {
    timePerQuestion: Number,     // Seconds per question
    maxPlayers: Number,
    autoStart: Boolean
  },
  startedAt: Date,
  completedAt: Date,
  createdAt: Date
}
```

**Indexes:**
- `quizCode`: Unique index
- `status`: Index

---

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/passkey/register-challenge`

**Purpose:** Generate WebAuthn registration challenge

**Request:**
```json
{
  "username": "john_doe"
}
```

**Response:**
```json
{
  "options": {
    "challenge": "base64-encoded-challenge",
    "rp": {
      "name": "AWS Cert Web",
      "id": "localhost"
    },
    "user": {
      "id": "base64-user-id",
      "name": "john_doe",
      "displayName": "john_doe"
    },
    "pubKeyCredParams": [...],
    "timeout": 60000,
    "attestation": "none"
  }
}
```

#### POST `/api/auth/passkey/register`

**Purpose:** Complete passkey registration

**Request:**
```json
{
  "username": "john_doe",
  "credential": { /* WebAuthn credential response */ }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully"
}
```

#### POST `/api/auth/passkey/login-challenge`

**Purpose:** Generate WebAuthn login challenge

**Request:**
```json
{
  "username": "john_doe"
}
```

**Response:**
```json
{
  "options": {
    "challenge": "base64-encoded-challenge",
    "allowCredentials": [
      {
        "id": "base64-credential-id",
        "type": "public-key",
        "transports": ["internal"]
      }
    ],
    "timeout": 60000
  }
}
```

#### POST `/api/auth/passkey/login`

**Purpose:** Complete passkey authentication and issue JWT

**Request:**
```json
{
  "username": "john_doe",
  "credential": { /* WebAuthn assertion response */ }
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "userId": "user-id",
    "username": "john_doe"
  }
}
```

**Side Effects:** Sets HTTP-only cookie with JWT token

#### POST `/api/auth/logout`

**Purpose:** Clear authentication session

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Side Effects:** Clears JWT cookie

#### GET `/api/auth/verify`

**Purpose:** Verify current authentication status

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "userId": "user-id",
    "username": "john_doe"
  }
}
```

---

### Certificate Management Endpoints

#### GET `/api/certificates`

**Purpose:** List all certificates

**Authentication:** Required

**Response:**
```json
[
  {
    "_id": "cert-id",
    "name": "AWS Solutions Architect",
    "code": "SAA-C03",
    "logoUrl": "https://...",
    "pdfUrl": "https://...",
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

#### POST `/api/certificates`

**Purpose:** Create new certificate

**Authentication:** Required

**Request:**
```json
{
  "name": "AWS Solutions Architect",
  "code": "SAA-C03",
  "logoUrl": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "certificate": { /* created certificate */ }
}
```

#### PUT `/api/certificates/[id]`

**Purpose:** Update existing certificate

**Authentication:** Required

**Request:**
```json
{
  "name": "AWS Solutions Architect - Associate",
  "logoUrl": "https://new-logo-url"
}
```

**Response:**
```json
{
  "success": true,
  "certificate": { /* updated certificate */ }
}
```

#### DELETE `/api/certificates/[id]`

**Purpose:** Delete certificate

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Certificate deleted successfully"
}
```

#### GET `/api/certificates/[id]/next-question-no`

**Purpose:** Get next available question number for certificate

**Authentication:** Required

**Response:**
```json
{
  "nextQuestionNo": 42
}
```

---

### Question Management Endpoints

#### GET `/api/access-code-questions`

**Purpose:** Get questions for specific access code

**Authentication:** Required

**Query Parameters:**
- `generatedAccessCode`: The access code (required)
- `certificateCode`: Filter by certificate (optional)

**Response:**
```json
{
  "questions": [
    {
      "_id": "question-id",
      "questionNumber": 1,
      "question": "What is AWS Lambda?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": 0,
      "explanation": "...",
      "aiExplanation": "...",
      "enabled": true
    }
  ],
  "total": 50
}
```

#### POST `/api/access-code-questions`

**Purpose:** Create or update question assignment

**Authentication:** Required

**Request:**
```json
{
  "generatedAccessCode": "ABC123",
  "certificateCode": "SAA-C03",
  "questionNumber": 1,
  "question": "What is AWS Lambda?",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": 0,
  "explanation": "...",
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "question": { /* created/updated question */ }
}
```

#### GET `/api/saved-questions`

**Purpose:** Get questions from global question bank

**Authentication:** Required

**Query Parameters:**
- `certificateCode`: Filter by certificate
- `reviewStatus`: Filter by review status

**Response:**
```json
{
  "questions": [ /* array of questions */ ],
  "total": 150
}
```

#### POST `/api/save-quiz`

**Purpose:** Save quiz attempt results

**Authentication:** Required (or Telegram user ID)

**Request:**
```json
{
  "certificateCode": "SAA-C03",
  "generatedAccessCode": "ABC123",
  "questions": [
    {
      "questionId": "question-id",
      "selectedAnswer": 0,
      "correctAnswer": 0,
      "isCorrect": true,
      "timeSpent": 30
    }
  ],
  "score": 45,
  "totalQuestions": 50,
  "percentage": 90,
  "source": "telegram"
}
```

**Response:**
```json
{
  "success": true,
  "attemptId": "attempt-id"
}
```

---

### AI & Processing Endpoints

#### POST `/api/ai-explanation`

**Purpose:** Generate AI explanation for a question

**Authentication:** Required

**Request:**
```json
{
  "questionId": "question-id",
  "question": "What is AWS Lambda?",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": 0,
  "existingExplanation": "..."
}
```

**Response:**
```json
{
  "explanation": "AWS Lambda is a serverless compute service...",
  "cached": false,
  "provider": "openai"
}
```

**Caching:** Checks cache first, generates if not found

#### POST `http://localhost:5000/convert-pdf` (Python Backend)

**Purpose:** Convert PDF to Markdown

**Request:** multipart/form-data
- `file`: PDF file (binary)
- `pageNumber`: Page to convert (optional)

**Response:**
```json
{
  "markdown": "# Converted Content\n\nQuestion 1: ...",
  "pageCount": 10
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Detailed error info"
}
```

---

### Dashboard & Analytics Endpoints

#### GET `/api/dashboard`

**Purpose:** Get dashboard analytics data

**Authentication:** Required

**Response:**
```json
{
  "certificateStats": [
    {
      "code": "SAA-C03",
      "name": "AWS Solutions Architect",
      "totalQuestions": 150,
      "totalAttempts": 324,
      "averageScore": 82.5
    }
  ],
  "recentAttempts": [ /* last 30 days */ ],
  "userEngagement": {
    "activeUsers": 45,
    "totalAttempts": 1234,
    "averageTimePerQuiz": 1800
  },
  "topPerformers": [ /* leaderboard */ ]
}
```

#### GET `/api/leaderboard`

**Purpose:** Get quiz leaderboard

**Authentication:** Required

**Query Parameters:**
- `certificateCode`: Filter by certificate (optional)
- `limit`: Number of results (default: 10)

**Response:**
```json
{
  "leaderboard": [
    {
      "username": "john_doe",
      "score": 95,
      "percentage": 95,
      "completedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### QuizBlitz (Multiplayer) Endpoints

#### POST `/api/quizblitz/create-room`

**Purpose:** Create new quiz room

**Authentication:** Required

**Request:**
```json
{
  "certificateCode": "SAA-C03",
  "generatedAccessCode": "ABC123",
  "settings": {
    "timePerQuestion": 20,
    "maxPlayers": 50
  }
}
```

**Response:**
```json
{
  "quizCode": "LIVE123",
  "roomId": "room-id"
}
```

#### POST `/api/quizblitz/join`

**Purpose:** Join quiz room

**Authentication:** Required

**Request:**
```json
{
  "quizCode": "LIVE123",
  "username": "jane_doe"
}
```

**Response:**
```json
{
  "success": true,
  "room": { /* room details */ }
}
```

#### GET `/api/quizblitz/events/[quizCode]`

**Purpose:** Server-Sent Events stream for real-time updates

**Authentication:** Required

**Response:** SSE stream
```
event: player-joined
data: {"username": "jane_doe", "playerCount": 5}

event: question-started
data: {"questionIndex": 0, "timeRemaining": 20}

event: leaderboard-updated
data: {"leaderboard": [...]}
```

#### POST `/api/quizblitz/submit-answer`

**Purpose:** Submit answer for current question

**Authentication:** Required

**Request:**
```json
{
  "quizCode": "LIVE123",
  "questionIndex": 0,
  "selectedAnswer": 2,
  "timeSpent": 15
}
```

**Response:**
```json
{
  "correct": true,
  "points": 100,
  "rank": 3
}
```

#### POST `/api/quizblitz/control`

**Purpose:** Host control actions (start, next, end)

**Authentication:** Required (must be host)

**Request:**
```json
{
  "quizCode": "LIVE123",
  "action": "start" // or "next", "end"
}
```

**Response:**
```json
{
  "success": true,
  "status": "active"
}
```

---

## Authentication & Security

### Security Architecture

#### 1. WebAuthn Passkey Authentication

**Overview:**
- FIDO2 standard for passwordless authentication
- Hardware-backed public key cryptography
- Phishing-resistant authentication

**Implementation:**
- Library: `@simplewebauthn/server` (backend), `@simplewebauthn/browser` (frontend)
- Challenge Storage: ⚠️ **CRITICAL SECURITY ISSUE** - Currently uses global variable (development only)
- Credential Storage: MongoDB users collection

**Production Requirements:**
```javascript
// ❌ CURRENT (DEV ONLY)
let currentChallenge = '';

// ✅ REQUIRED FOR PRODUCTION
// Option 1: Redis-based session
const session = await redis.get(`challenge:${sessionId}`);

// Option 2: Database-backed session
const session = await Session.findOne({ sessionId });

// Option 3: Encrypted JWT session
const session = jwt.verify(sessionToken, SECRET);
```

**Security Best Practices:**
- ✅ Validate relying party ID matches domain
- ✅ Verify origin matches expected origin
- ✅ Check counter to prevent replay attacks
- ✅ Store credentials with backup/device type flags
- ✅ Implement timeout for challenges (60 seconds)

#### 2. JWT Token Management

**Token Structure:**
```json
{
  "userId": "user-id",
  "username": "john_doe",
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Signing:**
- Algorithm: HMAC-SHA256
- Secret: `process.env.JWT_SECRET`
- Expiration: 1 hour (configurable)

**Storage:**
- HTTP-only cookies (not accessible via JavaScript)
- Secure flag in production (HTTPS only)
- SameSite=Strict to prevent CSRF

**Edge Runtime Compatibility:**
Custom JWT verification implementation in `lib/edge-jwt.ts` for Next.js middleware compatibility.

```typescript
// Custom edge-compatible JWT verification
export function verifyJWT(token: string): JWTPayload {
  const [headerB64, payloadB64, signature] = token.split('.');
  const data = `${headerB64}.${payloadB64}`;

  // Verify signature using Web Crypto API
  const expectedSignature = base64UrlEncode(
    hmacSHA256(data, JWT_SECRET)
  );

  if (signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(base64Decode(payloadB64));

  // Check expiration
  if (payload.exp < Date.now() / 1000) {
    throw new Error('Token expired');
  }

  return payload;
}
```

#### 3. Authorization Patterns

**Route Protection:**
```typescript
// Middleware approach
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect('/login');
  }

  try {
    const payload = verifyJWT(token);
    // Allow request
    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect('/login');
  }
}

// API route protection with HOC
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const userId = request.user.userId;
  // Route logic here
});
```

**Role-Based Access Control (Future):**
```javascript
// User roles
{
  role: "admin" | "creator" | "student"
}

// Permission checks
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

#### 4. Data Security

**MongoDB Security:**
- ✅ Parameterized queries (prevent NoSQL injection)
- ✅ Schema validation with Mongoose
- ✅ Connection string in environment variables
- ⚠️ TODO: Enable authentication in production
- ⚠️ TODO: Use SSL/TLS for connections

**Sensitive Data Handling:**
- Credit card numbers: Store only last 4 digits
- Passkey credentials: Store as Buffer (binary)
- JWT secrets: Never commit to version control
- API keys: Environment variables only

**CORS Configuration:**
```javascript
// Next.js API routes
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}

// Python backend
from flask_cors import CORS
CORS(app, origins=[os.getenv('FRONTEND_URL')])
```

#### 5. Input Validation & Sanitization

**Validation Libraries:**
- Zod for TypeScript schema validation
- Mongoose schema validation for database

**Example:**
```typescript
import { z } from 'zod';

const QuestionSchema = z.object({
  question: z.string().min(10).max(1000),
  options: z.array(z.string()).min(2).max(6),
  correctAnswer: z.number().min(0),
  explanation: z.string().optional()
});

// Usage
const validated = QuestionSchema.parse(requestBody);
```

#### 6. Rate Limiting

**Implementation (Future):**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

#### 7. Security Headers

**Next.js Configuration:**
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  }
};
```

---

## User Workflows

### Workflow 1: Administrator - Create Quiz from PDF

**Actors:** Content Creator/Administrator

**Preconditions:**
- User is authenticated
- Has access to Exam Q Labeler

**Steps:**

1. **Navigate to PDF Labeler**
   - Click "Exam Q Labeler" in sliding menu
   - Arrive at `/exam-q-labeler` page

2. **Upload PDF Document**
   - Click "Upload PDF" button
   - Cloudinary widget opens
   - Select PDF file (max 50MB)
   - Wait for upload confirmation
   - PDF URL stored in state

3. **View PDF Pages**
   - PDF.js renders first page
   - Use navigation buttons (Previous/Next)
   - Select specific page for conversion

4. **Convert Page to Markdown**
   - Click "Convert to Markdown" button
   - Frontend sends PDF to Next.js API proxy
   - Next.js forwards to Python backend
   - Python backend:
     - Extracts selected page using PyPDF
     - Converts to Markdown using Docling + OpenAI Vision
     - Returns Markdown content
   - Markdown displayed in editor

5. **Label Question Components**
   - Select question text range
   - Click "Mark as Question"
   - Select answer options (A, B, C, D)
   - Click "Mark as Options"
   - Indicate correct answer
   - Select explanation text
   - Click "Mark as Explanation"

6. **Save to Database**
   - Click "Save Question" button
   - Select target certificate
   - Question saved to global question bank
   - Confirmation toast notification

7. **Repeat for Multiple Questions**
   - Navigate to next page
   - Repeat steps 4-6
   - Build question library

**Postconditions:**
- Questions available in question bank
- Ready for assignment to access codes

**Alternative Flows:**
- **PDF Upload Fails**: Show error, retry upload
- **Conversion Timeout**: Show error, recommend smaller page range
- **Invalid Markdown**: Manual editing allowed

---

### Workflow 2: Administrator - Assign Questions to Access Code

**Actors:** Administrator

**Preconditions:**
- Questions exist in question bank
- Access code generated for customer

**Steps:**

1. **Navigate to Manage Questions**
   - Click "Manage Questions" in menu
   - Arrive at `/manage-questions` page

2. **Select Access Code**
   - View list of generated access codes
   - Select specific access code from dropdown
   - Associated certificate displayed

3. **View Available Questions**
   - Questions from question bank filtered by certificate
   - Pagination for large question sets
   - Preview question details

4. **Assign Questions**
   - Select individual questions via checkbox
   - OR use "Select All" for bulk assignment
   - Click "Assign Selected" button
   - Questions copied to `access-code-questions` collection

5. **Reorder Questions**
   - Drag-and-drop interface for question sequence
   - Update `questionNumber` field
   - Auto-save on reorder

6. **Enable/Disable Questions**
   - Toggle switch for each question
   - Disabled questions not shown in quizzes
   - Useful for question rotation

7. **Save Configuration**
   - Click "Save Changes" button
   - Questions linked to access code
   - Confirmation message

**Postconditions:**
- Access code has customized question set
- Questions available for students with that code

**Alternative Flows:**
- **No Questions Available**: Prompt to create questions first
- **Duplicate Questions**: Prevent assignment of already-assigned questions

---

### Workflow 3: Student - Take Quiz via Telegram Bot

**Actors:** Student

**Preconditions:**
- Student has Telegram account
- Has valid access code
- Bot is running

**Steps:**

1. **Start Bot Conversation**
   - Find bot on Telegram (e.g., @AWSCertBot)
   - Send `/start` command
   - Bot responds with welcome message

2. **Select Certificate**
   - Bot displays inline keyboard with certificates
   - Buttons: "SAA-C03", "DVA-C02", "SOA-C02", etc.
   - Student clicks desired certificate

3. **Enter Access Code**
   - Bot prompts for generated access code
   - Student types access code (e.g., "ABC123")
   - Bot validates code against database
   - If invalid: error message, retry
   - If valid: proceed to quiz

4. **Begin Quiz**
   - Bot loads questions for access code
   - Displays first question with options
   - Inline keyboard with A, B, C, D buttons

5. **Answer Questions**
   - Student clicks answer button
   - Bot immediately checks correctness
   - If correct:
     - ✅ "Correct! Score: 1/50"
     - Shows "Next Question" button
   - If incorrect:
     - ❌ "Wrong! Correct answer: B"
     - Shows detailed explanation
     - Option to bookmark question: "🔖 Bookmark this question"
     - Shows "Next Question" button

6. **Navigate Through Quiz**
   - Click "Next Question" for each question
   - Progress indicator: "Question 5/50"
   - Score tracking: "Score: 4/5 (80%)"

7. **Use Bookmark Feature** (Optional)
   - During quiz: `/bookmark 5` to save question 5
   - Later: `/bookmarks` to view saved questions
   - Review bookmarked questions anytime

8. **Complete Quiz**
   - After last question, bot displays results:
     - Final score: "45/50"
     - Percentage: "90%"
     - Time taken: "25 minutes"
     - Comparison: "Top 10% of test takers"
   - Option to take another quiz
   - Option to review wrong answers

9. **Review Wrong Answers** (Optional)
   - Send `/revision` command
   - Bot loads previously incorrect questions
   - Re-attempt questions for practice

10. **View Quiz History**
    - Bot saves attempt to `quiz-attempts` collection
    - Student can view past attempts
    - Track improvement over time

**Postconditions:**
- Quiz attempt saved to database
- Student receives feedback and score
- Questions marked for revision if incorrect

**Alternative Flows:**
- **Invalid Access Code**: Error message, re-prompt
- **Expired Access Code**: Notify student, direct to purchase
- **Bot Timeout**: Resume quiz from last answered question
- **Network Issues**: Auto-save progress, resume on reconnect

---

### Workflow 4: Student - Participate in Live QuizBlitz Session

**Actors:** Student (Player), Quiz Host

**Preconditions:**
- Student has account and is authenticated
- Quiz host has created room
- Questions assigned to access code

**Steps:**

1. **Join Quiz Room**
   - Navigate to `/quizblitz/join`
   - Enter quiz code (e.g., "LIVE123")
   - Click "Join Room" button
   - Redirected to waiting room

2. **Waiting Room**
   - Display room info: certificate, question count, timer setting
   - Show connected players list (real-time updates via SSE)
   - Wait for host to start quiz
   - "Waiting for host..." message

3. **Quiz Starts** (Host triggers)
   - SSE event: `quiz-started`
   - Countdown: "Starting in 3... 2... 1..."
   - First question appears

4. **Answer Questions**
   - Question displayed with options
   - Timer starts: "Time remaining: 20s"
   - Select answer (A, B, C, D)
   - Submit button or auto-submit on timer end

5. **Instant Feedback**
   - Correct: "✅ Correct! +100 points"
   - Incorrect: "❌ Wrong! Correct: B"
   - Points calculation: faster = more points
   - Leaderboard update

6. **View Leaderboard**
   - After each question, leaderboard displayed
   - Show top 10 players
   - Highlight current player's rank
   - "Next question in 5 seconds..."

7. **Progress Through Quiz**
   - Repeat steps 4-6 for all questions
   - Progress bar: "Question 8/20"

8. **Final Results**
   - Quiz complete message
   - Final leaderboard
   - Personal stats:
     - Total score
     - Correct answers
     - Average time per question
     - Final rank
   - Option to play again

9. **Post-Quiz Actions**
   - Review questions and explanations
   - View detailed statistics
   - Share results on social media (future)

**Postconditions:**
- Quiz attempt saved with timestamp
- Leaderboard finalized
- Statistics available for analysis

**Alternative Flows:**
- **Player Disconnects**: Auto-submit last answer, can rejoin
- **Host Leaves**: Designate new host or end quiz
- **Timer Expires**: Auto-submit current answer

---

## Development Guidelines

### Code Standards

#### TypeScript Style Guide

**File Organization:**
```
frontend/
├── app/
│   ├── (auth)/          # Auth route group
│   ├── api/             # API routes
│   ├── dashboard/       # Dashboard pages
│   ├── models/          # (deprecated, use lib)
│   └── utils/           # (deprecated, use lib)
├── components/
│   ├── ui/              # shadcn/ui components
│   └── charts/          # Chart components
├── lib/
│   ├── auth.ts          # Auth utilities
│   ├── db.ts            # Database helpers
│   └── mongodb.ts       # MongoDB connection
└── specs/               # Technical documentation
```

**Naming Conventions:**
- Components: PascalCase (`QuizCard.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- Constants: UPPER_SNAKE_CASE (`API_ENDPOINT`)
- Types/Interfaces: PascalCase with `I` prefix for interfaces (`IUser`, `QuestionType`)

**TypeScript Configuration:**
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Type Safety:**
```typescript
// ✅ Good: Explicit types
interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

function renderQuestion(question: Question): JSX.Element {
  // Implementation
}

// ❌ Bad: Any types
function renderQuestion(question: any) {
  // Implementation
}
```

#### Python Style Guide

**PEP 8 Compliance:**
- Indentation: 4 spaces
- Line length: 79 characters
- Function names: snake_case
- Class names: PascalCase

**Example:**
```python
# ✅ Good
def convert_pdf_to_markdown(pdf_path: str, page_number: int) -> str:
    """
    Convert a specific page of a PDF to markdown.

    Args:
        pdf_path: Path to the PDF file
        page_number: Page number to convert (0-indexed)

    Returns:
        Markdown string of the converted page
    """
    # Implementation
    pass

# ❌ Bad
def ConvertPDF(pdfPath, pageNum):
    # Implementation
    pass
```

**Error Handling:**
```python
try:
    result = convert_pdf(file_path, page)
except FileNotFoundError:
    logging.error(f"PDF file not found: {file_path}")
    return {"error": "File not found"}, 404
except Exception as e:
    logging.error(f"Conversion error: {str(e)}")
    return {"error": "Conversion failed"}, 500
```

### Git Workflow

**Branch Naming:**
- Feature: `feature/add-quiz-timer`
- Bugfix: `bugfix/fix-auth-redirect`
- Hotfix: `hotfix/security-patch`
- Release: `release/v1.2.0`

**Commit Messages:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build/tooling changes

**Example:**
```
feat(quiz): add multiplayer QuizBlitz feature

- Implement SSE for real-time updates
- Add leaderboard component
- Create timer service with RxJS observables

Closes #123
```

### Testing Strategy

**Unit Testing:**
```typescript
// Example: Testing question transformation utility
import { transformQuestion } from '@/lib/questionTransform';

describe('transformQuestion', () => {
  it('should transform database question to frontend format', () => {
    const dbQuestion = {
      _id: '123',
      question: 'What is AWS?',
      options: ['A) Cloud', 'B) Database'],
      correctAnswer: 0
    };

    const result = transformQuestion(dbQuestion);

    expect(result).toEqual({
      id: '123',
      questionText: 'What is AWS?',
      answerOptions: ['A) Cloud', 'B) Database'],
      correctAnswerIndex: 0
    });
  });
});
```

**Integration Testing:**
```typescript
// Example: Testing API endpoint
import { POST } from '@/app/api/certificates/route';

describe('POST /api/certificates', () => {
  it('should create new certificate', async () => {
    const request = new Request('http://localhost/api/certificates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Cert',
        code: 'TEST-001'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.certificate).toHaveProperty('_id');
  });
});
```

**End-to-End Testing (Future):**
- Playwright for browser automation
- Test critical user flows:
  - Registration and login
  - PDF upload and conversion
  - Quiz taking and submission
  - QuizBlitz multiplayer session

### Performance Optimization

**Frontend:**
- Code splitting: Automatic via Next.js
- Image optimization: Use `next/image` component
- Lazy loading: React.lazy() for large components
- Memoization: useMemo() and useCallback() for expensive computations

**Database:**
- Proper indexing on frequently queried fields
- Aggregation pipelines for complex queries
- Connection pooling for MongoDB
- Caching with TTL for static data

**API:**
- Response caching with appropriate headers
- Pagination for large datasets (limit 50 items per page)
- AI response caching to reduce costs
- Debouncing for search inputs

### Documentation Requirements

**Code Comments:**
```typescript
/**
 * Generates AI explanation for a quiz question using cached responses.
 *
 * @param questionId - MongoDB ObjectId of the question
 * @param question - Question text
 * @param options - Array of answer options
 * @param correctAnswer - Index of correct answer (0-based)
 * @returns AI-generated explanation with caching metadata
 *
 * @example
 * const explanation = await generateExplanation(
 *   '507f1f77bcf86cd799439011',
 *   'What is AWS Lambda?',
 *   ['A) VM', 'B) Serverless', 'C) Storage', 'D) Database'],
 *   1
 * );
 */
```

**API Documentation:**
- All API endpoints documented in this PRP
- Request/response examples provided
- Error codes and messages specified

**Technical Specs:**
- Major features documented in `frontend/specs/`
- Architecture diagrams for complex flows
- Database schema changes documented

---

## Deployment & Infrastructure

### Development Environment

**Prerequisites:**
- Node.js 20.x LTS
- Python 3.8+
- MongoDB 4.4+
- pnpm (Node package manager)

**Setup Steps:**

1. **Clone Repository:**
   ```bash
   git clone https://github.com/your-org/examtopics-data-labeler.git
   cd examtopics-data-labeler
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   pnpm install
   cp .env.example .env.local
   # Edit .env.local with your configuration
   pnpm dev
   ```

3. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python app.py
   ```

4. **Telegram Bot Setup:**
   ```bash
   cd telegram-bot
   npm install
   cp .env.example .env
   # Edit .env with your bot token
   npm start
   ```

5. **MongoDB Setup:**
   ```bash
   # Local MongoDB
   mongod --dbpath /data/db

   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

### Docker Deployment

**Docker Compose:**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/awscert
      - NEXT_PUBLIC_PDF_CONVERSION_API_URL=http://backend:5000
    depends_on:
      - mongodb
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/awscert

  telegram-bot:
    build:
      context: ./telegram-bot
      dockerfile: Dockerfile
    environment:
      - BOT_TOKEN=${BOT_TOKEN}
      - MONGODB_URI=mongodb://mongodb:27017/awscert
    depends_on:
      - mongodb

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

**Commands:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

### Production Deployment (Railway)

**Railway Configuration:**

1. **Frontend:**
   - Build Command: `pnpm railway:build`
   - Start Command: `pnpm start`
   - Environment Variables:
     - `MONGODB_URI`
     - `JWT_SECRET`
     - `OPENAI_API_KEY`
     - `ANTHROPIC_API_KEY`
     - `NEXT_PUBLIC_PDF_CONVERSION_API_URL`

2. **Backend:**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn -w 4 -b 0.0.0.0:5000 app:app`
   - Environment Variables:
     - `MONGODB_URI`
     - `OPENAI_API_KEY`

3. **Telegram Bot:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     - `BOT_TOKEN`
     - `MONGODB_URI`

**Optimization for Railway:**
```json
// frontend/package.json
{
  "scripts": {
    "railway:install": "pnpm install --no-frozen-lockfile",
    "railway:build": "pnpm railway:install && pnpm build"
  }
}

// next.config.js
module.exports = {
  output: 'standalone',  // Optimized for deployment
  eslint: {
    ignoreDuringBuilds: process.env.RAILWAY_ENVIRONMENT === 'true'
  },
  typescript: {
    ignoreBuildErrors: process.env.RAILWAY_ENVIRONMENT === 'true'
  }
};
```

### Database Backup & Restore

**Backup Script:**
```bash
#!/bin/bash
# mongodb-backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$DATE"

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR"

echo "Backup completed: $BACKUP_DIR"
```

**Restore Script:**
```bash
#!/bin/bash
# mongodb-restore.sh

BACKUP_DIR=$1

if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: ./mongodb-restore.sh <backup_directory>"
  exit 1
fi

mongorestore --uri="$MONGODB_URI" --drop "$BACKUP_DIR"

echo "Restore completed from: $BACKUP_DIR"
```

### Monitoring & Logging

**Application Logging:**
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Usage
logger.info({ userId: '123' }, 'User logged in');
logger.error({ error: err }, 'Authentication failed');
```

**Health Check Endpoints:**
```typescript
// app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'ok',
      python_backend: 'ok'
    }
  };

  try {
    // Check database
    await connectToDatabase();
  } catch (error) {
    health.status = 'degraded';
    health.services.database = 'error';
  }

  return Response.json(health);
}
```

### Scaling Considerations

**Horizontal Scaling:**
- Deploy multiple Next.js instances behind load balancer
- Use MongoDB replica sets for read scaling
- Queue-based PDF processing (e.g., Bull with Redis)

**Caching Layer:**
```typescript
// Future: Redis integration
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache AI explanations
await redis.setex(
  `explanation:${questionId}`,
  86400,  // 24 hours
  JSON.stringify(explanation)
);

// Retrieve cached explanation
const cached = await redis.get(`explanation:${questionId}`);
```

**Database Optimization:**
- Add indexes for frequently queried fields
- Use aggregation pipelines for complex queries
- Implement database connection pooling
- Consider sharding for very large datasets

---

## Future Roadmap

### Phase 1: Immediate Priorities (Q1 2025)

1. **Security Hardening**
   - ✅ Replace global challenge storage with Redis/database sessions
   - ✅ Implement rate limiting on API endpoints
   - ✅ Add MongoDB authentication and SSL/TLS
   - ✅ Security audit and penetration testing

2. **User Experience Improvements**
   - ✅ Mobile-responsive dashboard
   - ✅ Improved PDF viewer with zoom and annotation
   - ✅ Keyboard shortcuts for quiz navigation
   - ✅ Dark mode support

3. **Performance Optimization**
   - ✅ Implement Redis caching layer
   - ✅ Optimize database queries with proper indexes
   - ✅ Lazy loading for large question sets
   - ✅ Image optimization and CDN integration

### Phase 2: Feature Enhancements (Q2 2025)

1. **Advanced Analytics**
   - 📊 Per-question analytics (difficulty, time spent, pass rate)
   - 📈 Student progress tracking over time
   - 🎯 Personalized recommendations based on weak areas
   - 📉 Export analytics to CSV/Excel/PDF

2. **Collaborative Features**
   - 👥 Team accounts for organizations
   - 🏫 Classroom management for instructors
   - 📝 Question review and approval workflow
   - 💬 Comments and discussions on questions

3. **Enhanced Quiz Features**
   - ⏱️ Timed quiz mode
   - 🔀 Randomized question order
   - 📋 Custom quiz creation
   - 🏆 Achievements and badges

### Phase 3: Platform Expansion (Q3-Q4 2025)

1. **Multi-Certification Support**
   - 🔷 Azure certifications
   - ☁️ Google Cloud certifications
   - 🐳 Kubernetes certifications
   - 🔒 CompTIA Security+ and other IT certs

2. **Advanced AI Features**
   - 🤖 AI-generated practice questions
   - 💡 Personalized study plans
   - 🗣️ Voice-enabled quiz mode
   - 📸 Image-based questions with AI analysis

3. **Mobile Applications**
   - 📱 Native iOS app
   - 🤖 Native Android app
   - 🔔 Push notifications for study reminders
   - 📴 Offline mode for quiz practice

4. **Social Features**
   - 👨‍👩‍👧‍👦 Study groups and communities
   - 🏅 Global leaderboards
   - 🎖️ Certifications and verified achievements
   - 🤝 Peer-to-peer question sharing

### Phase 4: Enterprise Features (2026)

1. **Organization Management**
   - 🏢 Multi-tenant architecture
   - 🔐 SSO integration (SAML, OAuth)
   - 📊 Organization-wide reporting
   - 💳 Subscription management and billing

2. **Advanced Content Management**
   - 📚 Content versioning and history
   - 🔄 Automated question updates
   - 🌐 Multi-language support
   - ♿ Enhanced accessibility (WCAG 2.1 AAA)

3. **Integration Ecosystem**
   - 🔗 LMS integration (Moodle, Canvas)
   - 📧 Email marketing integration
   - 💬 Slack/Teams notifications
   - 📊 BI tools integration (Tableau, Power BI)

---

## Appendix

### A. Environment Variables Reference

#### Frontend (.env.local)

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/awscert
MONGODB_DB_NAME=awscert

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
RP_ID=localhost
RP_NAME="AWS Cert Web"
ORIGIN=http://localhost:3000

# External Services
NEXT_PUBLIC_PDF_CONVERSION_API_URL=http://localhost:5000
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Development
NEXT_DISABLE_OVERLAY=true
NODE_ENV=development
```

#### Backend (.env)

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/awscert

# OpenAI
OPENAI_API_KEY=sk-...

# Flask
FLASK_ENV=development
FLASK_DEBUG=true

# Frontend CORS
FRONTEND_URL=http://localhost:3000
```

#### Telegram Bot (.env)

```bash
# Telegram
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# MongoDB
MONGODB_URI=mongodb://localhost:27017/awscert
```

### B. Common Commands Reference

```bash
# Frontend Development
cd frontend
pnpm dev                          # Start dev server
pnpm build                        # Production build
pnpm start                        # Start production server
pnpm lint                         # Run ESLint
pnpm test                         # Run tests

# Database Seeding
node scripts/seed-certificates.js
node scripts/seed-payees.js
node scripts/seed-access-code-questions.js

# Backend Development
cd backend
python app.py                     # Start Flask dev server
pip install -r requirements.txt   # Install dependencies

# Telegram Bot
cd telegram-bot
npm start                         # Start bot
node bot-manager.js start         # Start with conflict resolution

# Docker
docker-compose up -d              # Start all services
docker-compose logs -f            # View logs
docker-compose down               # Stop all services
docker-compose up -d --build      # Rebuild and start

# Database Operations
cd mongodb
./mongodb-backup.sh               # Backup database
./mongodb-restore.sh backups/...  # Restore database
```

### C. Troubleshooting Guide

**Issue: WebAuthn registration fails**
- Verify `RP_ID` matches domain (use 'localhost' for local dev)
- Check HTTPS requirement (WebAuthn requires HTTPS except for localhost)
- Ensure browser supports WebAuthn (Chrome, Firefox, Safari, Edge)

**Issue: PDF conversion timeout**
- Increase timeout in Python backend
- Check Python backend is running on correct port
- Verify `NEXT_PUBLIC_PDF_CONVERSION_API_URL` is correct
- Check Python dependencies are installed

**Issue: MongoDB connection error**
- Verify MongoDB is running: `mongosh`
- Check `MONGODB_URI` is correct
- Ensure MongoDB allows connections from application

**Issue: Telegram bot 409 Conflict**
- Use `node bot-manager.js start` to automatically resolve
- Manually revoke webhook: `curl https://api.telegram.org/bot<TOKEN>/deleteWebhook`

**Issue: JWT authentication fails**
- Verify `JWT_SECRET` is set and matches between environments
- Check token expiration (default 1 hour)
- Clear cookies and re-login

### D. API Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | External service error |

### E. Database Indexes

```javascript
// Recommended indexes for optimal performance

// users collection
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ "passkeys.credentialID": 1 });

// certificates collection
db.certificates.createIndex({ code: 1 }, { unique: true });

// access-codes collection
db["access-codes"].createIndex({ generatedAccessCode: 1 }, { unique: true });
db["access-codes"].createIndex({ certificateCode: 1 });

// access-code-questions collection
db["access-code-questions"].createIndex(
  { generatedAccessCode: 1, questionNumber: 1 },
  { unique: true }
);
db["access-code-questions"].createIndex({ enabled: 1 });

// quiz-attempts collection
db["quiz-attempts"].createIndex({ userId: 1 });
db["quiz-attempts"].createIndex({ telegramUserId: 1 });
db["quiz-attempts"].createIndex({ completedAt: -1 });
db["quiz-attempts"].createIndex({ certificateCode: 1 });

// ai-explanation-cache collection
db["ai-explanation-cache"].createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);
db["ai-explanation-cache"].createIndex({ questionHash: 1 }, { unique: true });
```

---

## Conclusion

This Product Requirements Prompting (PRP) document serves as the comprehensive specification for the ExamTopics Data Labeler ecosystem. It encompasses:

- ✅ Complete system architecture and component breakdown
- ✅ Detailed feature requirements and user workflows
- ✅ Full technical stack documentation
- ✅ Database schema and API endpoint specifications
- ✅ Security and authentication guidelines
- ✅ Development and deployment procedures
- ✅ Future roadmap and expansion plans

**For Developers:**
Use this document as your primary reference when:
- Implementing new features
- Debugging existing functionality
- Understanding data flows and integrations
- Making architectural decisions

**For Product Managers:**
Use this document to:
- Define new feature requirements
- Understand technical constraints
- Plan roadmap priorities
- Communicate with stakeholders

**For AI Assistants:**
Use this document to:
- Understand the complete codebase context
- Generate accurate code implementations
- Suggest improvements aligned with architecture
- Answer technical questions about the system

**Document Maintenance:**
- Update version number on significant changes
- Document all new features in relevant sections
- Keep API endpoints and schemas in sync with code
- Review and update quarterly

---

**Document Version:** 1.0
**Created:** January 2025
**Last Updated:** January 2025
**Next Review:** April 2025
