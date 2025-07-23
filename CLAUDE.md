# Claude AI Assistant Rules for ExamTopics Data Labeler

## Project Overview

This is a comprehensive AWS certification preparation ecosystem consisting of three main components:

1. **Frontend (Next.js)**: Web application with PDF data labeler, analytics dashboard, and user management
2. **Backend (Python/Flask)**: PDF conversion service with OCR capabilities using docling and OpenAI
3. **Telegram Bot (Node.js)**: Interactive quiz bot for AWS certification practice

## Architecture

```
examtopics-data-labeler/
├── frontend/          # Next.js web application (Port 3000)
├── backend/           # Python Flask PDF service (Port 5000)  
├── telegram-bot/      # Node.js Telegram bot (Port 8080)
├── mongodb/          # Database backup/restore scripts
├── scripts/          # Shared utility scripts
└── docker-compose.yml # Multi-service orchestration
```

## Technology Stack

### Frontend (Next.js)
- **Framework**: Next.js 15.3.5 with React 19
- **UI Components**: Radix UI, shadcn/ui, Tailwind CSS
- **Authentication**: WebAuthn (Passkeys) + JWT
- **Database**: MongoDB with Mongoose ODM
- **AI Integration**: Vercel AI SDK (Anthropic, OpenAI)
- **Charts**: Chart.js for analytics dashboard
- **PDF Rendering**: pdfjs-dist
- **Real-time**: Socket.io-client, Server-Sent Events (SSE)

### Backend (Python/Flask)
- **Framework**: Flask with Flask-CORS
- **PDF Processing**: docling, pypdf, pdf2image
- **OCR**: easyocr, OpenAI Vision API
- **AI/ML**: torch, transformers, huggingface-hub
- **Document**: python-docx, openpyxl

### Telegram Bot (Node.js)
- **Bot Framework**: Grammy
- **Database**: MongoDB native driver
- **Environment**: dotenv

## Development Guidelines

### Code Standards
- **TypeScript**: Strict mode enabled, ES2017+ target
- **ESLint**: Next.js config with relaxed rules for legacy code
- **Prettier**: 2-space indentation, single quotes, 100 char line width
- **Path Aliases**: Use `@/*` for frontend imports (maps to `./`)

### File Organization
- **API Routes**: `frontend/app/api/` - Next.js API routes
- **Components**: `frontend/components/` - Reusable UI components
- **Pages**: `frontend/app/` - Next.js 13+ app router pages
- **Utilities**: `frontend/lib/` and `frontend/app/utils/`
- **Charts**: `frontend/components/charts/` - Analytics components
- **Specs**: `frontend/specs/` - Comprehensive technical documentation

### Database Schema
- **Collections**: certificates, payees, access-codes, questions, users, quiz-attempts, bookmarks
- **Authentication**: Passkey challenges stored temporarily (needs production-ready session management)
- **Access Control**: Role-based access with JWT tokens

## Commands and Scripts

### Frontend Development
```bash
cd frontend
pnpm dev              # Start development server (Turbopack)
pnpm build            # Production build
pnpm lint             # ESLint check
pnpm start            # Start production server

# Database seeding
node seed-certificates.js
node seed-payees.js
node seed-access-code-questions.js

# Testing scripts
node test-mongodb.js
node debug-auth.js
```

### Backend Development
```bash
cd backend
python app.py         # Start Flask server
pip install -r requirements.txt
```

### Telegram Bot
```bash
cd telegram-bot
npm start             # Start bot
npm run lint          # ESLint check
```

### Docker Deployment
```bash
docker-compose up -d   # Start all services
docker-compose logs -f # Follow logs
```

## Environment Variables

### Frontend (.env.local)
```
MONGODB_URI=mongodb://...
JWT_SECRET=your-secret-key
RP_ID=localhost
RP_NAME="AWS Cert Web"
ORIGIN=http://localhost:3000
NEXT_PUBLIC_PDF_CONVERSION_API_URL=http://localhost:5000
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=ant-...
```

### Backend
```
MONGODB_URI=mongodb://...
FLASK_ENV=development
OPENAI_API_KEY=sk-...
```

### Telegram Bot (.env)
```
BOT_TOKEN=your-telegram-bot-token
MONGODB_URI=mongodb://...
```

## Key Features

### Authentication System
- **Passkey (WebAuthn)**: Primary authentication method
- **JWT**: Session management with edge-compatible tokens
- **Security Note**: Current challenge storage is development-only, needs production session management

### PDF Data Labeler
- **Upload**: PDF files via Google Drive integration
- **View**: Page-by-page PDF rendering with pdfjs
- **Convert**: PDF to Markdown using OpenAI Vision API
- **Label**: Mark questions, answers, explanations for quiz creation

### Analytics Dashboard
- **Charts**: Certificate stats, user engagement, quiz attempts
- **Real-time**: Live data from MongoDB aggregations
- **Responsive**: Mobile-friendly chart layouts

### Quiz System (Telegram Bot)
- **Interactive**: Real-time multiple choice questions
- **Progress**: Bookmark system, revision mode
- **Access Codes**: Paid customer integration
- **Feedback**: Instant results with AI explanations

### AI Integration
- **Second Opinion**: AI explanations for quiz answers
- **Caching**: Response caching to reduce API costs
- **OCR**: PDF to Markdown conversion with vision models
- **Providers**: OpenAI and Anthropic support

## Important Implementation Notes

### Authentication Security
- Current WebAuthn challenge storage uses global variables (development only)
- Production requires secure session management (Redis, database, or session library)

### Railway Deployment
- Optimized builds with `standalone` output
- ESLint/TypeScript checks disabled in production
- Lockfile fixes for Railway compatibility

### Database Considerations
- MongoDB with proper indexing for quiz performance
- Aggregation pipelines for analytics dashboard
- Change streams for real-time updates

### Error Handling
- Comprehensive error boundaries in React components
- Graceful fallbacks for PDF rendering failures
- Retry logic for AI API calls

## Development Workflow

1. **Local Setup**: Use docker-compose for full stack development
2. **Frontend**: Next.js with Turbopack for fast hot reloading
3. **Backend**: Flask development server with auto-reload
4. **Testing**: Extensive test scripts in each component
5. **Documentation**: Detailed specs in `frontend/specs/`

## Production Considerations

- **Security**: Implement proper session management for WebAuthn
- **Scaling**: Consider Redis for caching and session storage
- **Monitoring**: Add health checks and logging
- **Secrets**: Use proper secret management (not environment variables in production)
- **Database**: Configure MongoDB with authentication and SSL
- **CDN**: Consider cloudinary for image/PDF storage

## Code Review Guidelines

1. **Security**: Never commit secrets or API keys
2. **Authentication**: Verify JWT token validation in protected routes
3. **TypeScript**: Maintain strict type checking
4. **Error Handling**: Add proper error boundaries and validation
5. **Performance**: Optimize database queries and API calls
6. **Testing**: Add tests for new features
7. **Documentation**: Update specs for significant changes

## Quick Commands Reference

```bash
# Start full development environment
docker-compose up -d

# Frontend only
cd frontend && pnpm dev

# Backend only  
cd backend && python app.py

# Telegram bot only
cd telegram-bot && npm start

# Database operations
cd mongodb && ./mongodb-backup.sh
cd mongodb && ./mongodb-restore.sh

# Railway deployment
cd frontend && pnpm railway:build
```