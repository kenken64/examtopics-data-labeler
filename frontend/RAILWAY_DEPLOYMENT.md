# Railway Deployment Guide for ExamTopics Frontend

This guide will help you deploy the ExamTopics Next.js frontend to Railway.app.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **MongoDB Database**: MongoDB Atlas or Railway MongoDB service
4. **Backend API**: Deployed backend service (see backend Railway guide)

## Deployment Steps

### 1. Connect Repository to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `examtopics-data-labeler` repository
5. Select the `frontend` folder as the root directory

### 2. Configure Environment Variables

In your Railway project dashboard, go to **Variables** and set:

```bash
# Required
MONGODB_URI=your-mongodb-connection-string-here
JWT_SECRET=your-jwt-secret-key-here
NEXT_PUBLIC_PDF_CONVERSION_API_URL=https://your-backend-app.railway.app

# Optional (Railway sets automatically)
PORT=3000
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Google Drive Integration (Optional)
GOOGLE_PROJECT_ID=your-google-project-id
GOOGLE_PRIVATE_KEY_ID=your-google-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id
```

### 3. Database Setup Options

#### Option A: Railway MongoDB Service
1. In your Railway project, click "New Service"
2. Select "MongoDB" from the databases
3. Railway will provide a `MONGODB_URI` automatically
4. Use this URI in your frontend environment variables

#### Option B: MongoDB Atlas
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster and database named `awscert`
3. Get connection string and set as `MONGODB_URI`

### 4. Link with Backend Service

Set the backend API URL in environment variables:
```bash
NEXT_PUBLIC_PDF_CONVERSION_API_URL=https://your-backend-app.railway.app
```

This connects the frontend to your deployed backend service.

### 5. Deploy Configuration

The following files are configured for Railway:

- `railway.json` - Railway deployment configuration
- `nixpacks.toml` - Build configuration for Next.js
- `Dockerfile` - Alternative Docker deployment
- `next.config.ts` - Next.js configuration with Railway optimizations

### 6. Health Checks and Monitoring

The frontend includes health check endpoints:
- `GET /api/health` - Application health, database connection, environment status

Railway automatically monitors these endpoints and restarts the service if unhealthy.

## Application Features

Once deployed, your frontend will provide:

### User Interface:
- 🎯 **Dashboard** - Quiz statistics and progress tracking
- 📚 **Question Management** - Browse and edit AWS certification questions
- 👤 **User Authentication** - JWT-based secure login system
- 📊 **Analytics** - Performance metrics and progress charts
- 🔍 **Search & Filter** - Find questions by category, difficulty, or keywords

### Admin Features:
- ✏️ **Question Editing** - Inline editing of questions and explanations
- 📈 **Statistics Dashboard** - User engagement and question analytics
- 🔧 **Content Management** - Add, edit, and organize certification content
- 💾 **Data Import/Export** - Bulk operations for question management

### API Endpoints:
- `/api/auth/*` - Authentication and authorization
- `/api/dashboard` - Analytics and statistics
- `/api/certificates/*` - Certification management
- `/api/saved-questions/*` - Question CRUD operations
- `/api/health` - Service health monitoring

## Production Features

✅ **Next.js 14** - Latest React framework with App Router
✅ **Standalone Output** - Optimized Docker deployment
✅ **Health Monitoring** - Comprehensive health checks
✅ **MongoDB Integration** - Full database connectivity
✅ **JWT Authentication** - Secure user sessions
✅ **CORS Configuration** - Proper API access controls
✅ **Error Handling** - Graceful error boundaries
✅ **SEO Optimization** - Server-side rendering
✅ **TypeScript** - Type-safe development

## Performance Optimizations

### Railway-Specific:
- **Standalone Build**: Minimal Docker image size
- **Static Asset Optimization**: CDN-ready static files
- **API Route Optimization**: Efficient serverless functions
- **Memory Management**: Optimized for Railway's limits

### Next.js Features:
- **Automatic Code Splitting**: Faster page loads
- **Image Optimization**: WebP and AVIF support
- **Font Optimization**: Google Fonts loading
- **Bundle Analysis**: Optimized JavaScript bundles

## Monitoring and Logging

Railway provides built-in monitoring for:
- Application uptime and response times
- Memory and CPU usage
- Build and deployment logs
- API request metrics
- Error tracking and alerts

### Log Examples:
```bash
# Application startup
✓ Ready on http://localhost:3000
✓ MongoDB connected successfully
✓ Health check endpoint active

# Health check logs
GET /api/health - 200 OK
{"status":"healthy","mongodb":"connected"}
```

## Security Configuration

### Environment Variables:
- All sensitive data stored in Railway environment variables
- JWT secrets properly configured
- MongoDB connection strings secured
- Google API credentials protected

### CORS and Headers:
```javascript
// Configured in next.config.ts
headers: [
  { key: 'Access-Control-Allow-Origin', value: '*' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
]
```

### Authentication:
- JWT-based session management
- Secure cookie handling
- Route protection middleware
- API endpoint authorization

## Troubleshooting

### Common Issues:

1. **Build Failures**: 
   - Check Node.js version compatibility
   - Verify all dependencies in package.json
   - Review TypeScript compilation errors

2. **Database Connection Errors**:
   - Verify `MONGODB_URI` format
   - Check MongoDB Atlas IP whitelist
   - Test connection string locally

3. **API Integration Issues**:
   - Verify `NEXT_PUBLIC_PDF_CONVERSION_API_URL` points to backend
   - Check CORS configuration
   - Verify backend service is running

4. **Authentication Problems**:
   - Ensure `JWT_SECRET` is set and consistent
   - Check cookie domain settings
   - Verify middleware configuration

### Debug Commands:

```bash
# Check application health
curl https://your-frontend-app.railway.app/api/health

# View Railway logs
# Check Railway dashboard -> Logs tab

# Test locally
npm install
npm run dev
```

### Environment Variables Check:
Add to your app for debugging:
```javascript
console.log('Environment Check:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');
console.log('Backend URL:', process.env.NEXT_PUBLIC_PDF_CONVERSION_API_URL);
```

## Custom Domain Setup

### Railway Domain:
- Railway provides: `https://your-app-name.railway.app`
- Custom subdomain available in settings

### Custom Domain:
1. Go to Railway project settings
2. Add your custom domain
3. Update DNS records as instructed
4. SSL certificate automatically provisioned

## Performance Monitoring

### Railway Metrics:
- Response time tracking
- Memory usage graphs
- CPU utilization
- Request volume analytics

### Application Metrics:
- Page load times
- API response times
- Database query performance
- User engagement analytics

## Cost Optimization

Railway pricing for Next.js apps:
- **Free Tier**: $5 credit per month
- **Hobby Plan**: $5/month for personal projects
- **Usage-based**: Pay for actual resource consumption
- **Optimizations**: 
  - Standalone build reduces memory usage
  - Static asset caching
  - Efficient API routes
  - Connection pooling

## Scaling Considerations

- **Automatic Scaling**: Railway scales based on demand
- **Database Connections**: Use connection pooling
- **Static Assets**: Leverage Railway's CDN
- **API Rate Limiting**: Implement for high traffic
- **Caching Strategy**: Redis for session storage (optional)

## Integration with Other Services

### Backend Connection:
```javascript
// Environment variable for backend API
const backendURL = process.env.NEXT_PUBLIC_PDF_CONVERSION_API_URL;
```

### Database Integration:
```javascript
// MongoDB connection in API routes
const client = new MongoClient(process.env.MONGODB_URI);
```

### Google Drive Integration:
```javascript
// Service account configuration
const credentials = {
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY,
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
};
```

Your Next.js frontend is now ready for production deployment on Railway! 🚀

## Quick Start Summary

1. **Connect GitHub repository to Railway**
2. **Set environment variables** (MONGODB_URI, JWT_SECRET, Backend URL)
3. **Deploy** - Railway handles the rest
4. **Configure custom domain** (optional)
5. **Monitor** using Railway dashboard

The application will be available at your Railway-provided URL with full functionality!
