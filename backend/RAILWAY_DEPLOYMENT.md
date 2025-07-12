# Railway Deployment Guide for ExamTopics Backend

This guide will help you deploy the ExamTopics backend to Railway.app.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **OpenAI API Key**: Get one from [OpenAI Platform](https://platform.openai.com)

## Deployment Steps

### 1. Connect Repository to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `examtopics-data-labeler` repository
5. Select the `backend` folder as the root directory

### 2. Configure Environment Variables

In your Railway project dashboard, go to **Variables** and set:

```bash
# Required
OPENAI_API_KEY=your-openai-api-key-here

# Optional (Railway sets these automatically)
PORT=5000
FLASK_ENV=production
FLASK_DEBUG=False
PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1
```

### 3. Deploy Configuration

The following files are already configured for Railway:

- `railway.json` - Railway deployment configuration
- `nixpacks.toml` - Build configuration with system dependencies
- `Dockerfile` - Alternative Docker deployment method
- `requirements.txt` - Python dependencies with versions
- `wsgi.py` - Production WSGI server configuration

### 4. Domain and SSL

Railway automatically provides:
- HTTPS SSL certificate
- Custom subdomain (e.g., `your-app-name.railway.app`)
- Optional custom domain configuration

### 5. Health Checks

The backend includes health check endpoints:
- `GET /health` - Service health status
- `GET /` - Service information and available endpoints

### 6. Environment Detection

The app automatically detects Railway environment and:
- Uses Gunicorn WSGI server in production
- Configures appropriate logging
- Sets production Flask settings
- Uses Railway's PORT environment variable

## API Endpoints

Once deployed, your Railway app will expose:

```
https://your-app-name.railway.app/health
https://your-app-name.railway.app/convert-pdf
https://your-app-name.railway.app/ocr-pdf
```

## System Dependencies

The deployment includes these system packages:
- `poppler-utils` - PDF processing
- `tesseract-ocr` - OCR functionality
- OpenGL libraries for image processing
- Font rendering libraries

## Production Features

✅ **Gunicorn WSGI Server** - 4 workers with optimized settings
✅ **Health Checks** - Automatic service monitoring
✅ **Environment Variables** - Secure configuration
✅ **CORS Enabled** - Frontend integration ready
✅ **Structured Logging** - Production-ready logging
✅ **Auto-scaling** - Railway handles traffic scaling
✅ **SSL/HTTPS** - Automatic certificate management

## Monitoring

Railway provides built-in monitoring for:
- CPU and memory usage
- Request logs and metrics
- Deployment history
- Environment variables
- Service health checks

## Troubleshooting

### Common Issues:

1. **Build Fails**: Check system dependencies in `nixpacks.toml`
2. **App Crashes**: Verify `OPENAI_API_KEY` is set correctly
3. **Port Issues**: Railway automatically sets PORT, don't hardcode it
4. **Import Errors**: Ensure all dependencies are in `requirements.txt`

### Debug Commands:

```bash
# Check logs in Railway dashboard
# Variables -> View logs

# Test health endpoint
curl https://your-app-name.railway.app/health

# Test local deployment
python wsgi.py
```

## Cost Optimization

Railway offers:
- Free tier with usage limits
- Pay-per-use pricing model
- Sleep mode for inactive services
- Resource usage monitoring

For production use, monitor your usage and upgrade to a paid plan as needed.

## Security Notes

- Never commit API keys to repository
- Use Railway environment variables for secrets
- The app runs in production mode by default
- CORS is configured for frontend integration
- Health checks don't expose sensitive information
