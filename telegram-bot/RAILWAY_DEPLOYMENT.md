# Railway Deployment Guide for ExamTopics Telegram Bot

This guide will help you deploy the ExamTopics Telegram Bot to Railway.app.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Telegram Bot Token**: Create a bot with [@BotFather](https://t.me/BotFather) on Telegram
4. **MongoDB Database**: MongoDB Atlas or Railway MongoDB service

## Lockfile Management

⚠️ **Important**: Before deploying, ensure your `package-lock.json` is synchronized with `package.json`.

If you encounter npm lockfile errors during deployment:

```bash
# Option 1: Use the comprehensive preparation script
./prepare-deployment.sh    # On Unix/Linux/macOS
./prepare-deployment.bat   # On Windows

# Option 2: Update lockfile manually
rm package-lock.json
npm install

# Option 3: Use simple update scripts
./update-lockfile.sh    # On Unix/Linux/macOS
./update-lockfile.bat   # On Windows
```

**Note**: The Railway configuration has been updated to automatically regenerate the lockfile during build.

## Deployment Steps

### 1. Create Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Use `/newbot` command to create a new bot
3. Choose a name and username for your bot
4. Save the Bot Token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### 2. Connect Repository to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `examtopics-data-labeler` repository
5. Select the `telegram-bot` folder as the root directory

### 3. Configure Environment Variables

In your Railway project dashboard, go to **Variables** and set:

```bash
# Required
BOT_TOKEN=your-telegram-bot-token-here
MONGODB_URI=your-mongodb-connection-string-here

# Optional (Railway sets these automatically)
PORT=8080
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=512
```

### 4. MongoDB Setup Options

#### Option A: Railway MongoDB Service
1. In your Railway project, click "New Service"
2. Select "MongoDB" from the databases
3. Railway will provide a `MONGODB_URI` automatically
4. Use this URI in your bot's environment variables

#### Option B: MongoDB Atlas
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster and database
3. Get connection string and set as `MONGODB_URI`

### 5. Deploy Configuration

The following files are configured for Railway:

- `railway.json` - Railway deployment configuration
- `nixpacks.toml` - Build configuration
- `Dockerfile` - Alternative Docker deployment
- `package.json` - Node.js dependencies and scripts

### 6. Health Checks and Monitoring

The bot includes health check endpoints for Railway:
- `GET /health` - Bot health status and database connection
- `GET /` - Service information

Railway will automatically monitor these endpoints and restart the service if unhealthy.

## Bot Features

Once deployed, your Telegram bot will provide:

### Available Commands:
- `/start` - Initialize bot and show certificate options
- `/help` - Show all available commands
- `/certificates` - List available AWS certifications
- `/quiz [certificate]` - Start a practice quiz
- `/stats` - Show your quiz statistics
- `/reset` - Reset your progress

### Quiz Features:
- ✅ **Multiple Choice Questions** - Single and multi-select support
- ✅ **Progress Tracking** - Save and resume quiz sessions
- ✅ **Statistics** - Track correct/incorrect answers
- ✅ **Certificate Categories** - AWS Solutions Architect, Developer, etc.
- ✅ **Instant Feedback** - Immediate answer validation
- ✅ **Explanation Support** - Detailed answer explanations

## Production Features

✅ **Health Check Server** - HTTP server for Railway monitoring
✅ **Graceful Shutdown** - Proper cleanup on deployment updates
✅ **Database Connection Pooling** - Efficient MongoDB connections
✅ **Error Handling** - Comprehensive error catching and logging
✅ **Session Management** - Persistent user quiz sessions
✅ **Auto-restart** - Railway automatically restarts on failures

## Monitoring and Logging

Railway provides built-in monitoring for:
- Bot uptime and response times
- Memory and CPU usage
- Database connection status
- Error logs and crash reports
- Deployment history

### Log Examples:
```bash
# Bot startup
Health check server running on port 8080
Connected to MongoDB
Bot is starting...

# Health check logs
GET /health - 200 OK
{"status":"healthy","mongodb":"connected"}
```

## Telegram Bot Configuration

### Setting Webhook (Optional)
For production bots, you can set up webhooks instead of polling:

```javascript
// Add to bot configuration for webhook mode
if (process.env.RAILWAY_ENVIRONMENT === 'production') {
  bot.api.setWebhook(`https://your-railway-app.railway.app/webhook`);
}
```

### Bot Commands Menu
Set up bot commands in BotFather:
```
start - Initialize bot and show options
help - Show all available commands
certificates - List available certifications
quiz - Start a practice quiz
stats - Show your quiz statistics
reset - Reset your progress
```

## Troubleshooting

### Common Issues:

1. **Bot Not Responding**: Check `BOT_TOKEN` is set correctly
2. **Database Errors**: Verify `MONGODB_URI` connection string
3. **Port Issues**: Railway automatically sets PORT, don't hardcode it
4. **Memory Issues**: Increase memory limits in Railway dashboard

### Debug Commands:

```bash
# Check bot health
curl https://your-bot-app.railway.app/health

# View Railway logs
# Check Railway dashboard -> Logs tab

# Test bot locally
npm install
npm start
```

### Environment Variables Check:
```javascript
// Add to bot startup for debugging
console.log('BOT_TOKEN:', process.env.BOT_TOKEN ? 'Set' : 'Missing');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
console.log('PORT:', process.env.PORT || 'Using default');
```

## Cost Optimization

Railway pricing for Telegram bots:
- **Free Tier**: $5 credit per month (sufficient for small bots)
- **Hobby Plan**: $5/month for personal projects
- **Usage-based**: Pay for actual resource consumption
- **Sleep Mode**: Automatic scaling to zero when inactive

## Security Best Practices

- ✅ Never commit bot tokens to repository
- ✅ Use Railway environment variables for secrets
- ✅ Enable MongoDB authentication
- ✅ Monitor bot usage and logs
- ✅ Regularly rotate bot tokens
- ✅ Validate all user inputs

## Bot Performance Tips

1. **Database Optimization**:
   - Use indexes on frequently queried fields
   - Implement connection pooling
   - Cache frequently accessed data

2. **Memory Management**:
   - Clear user sessions after timeout
   - Limit concurrent quiz sessions
   - Monitor memory usage in Railway

3. **Response Time**:
   - Implement request queuing for high traffic
   - Use pagination for large result sets
   - Optimize database queries

## Scaling Considerations

- Railway automatically scales based on demand
- Monitor response times and memory usage
- Consider implementing rate limiting for heavy users
- Use Railway metrics to optimize performance

Your Telegram bot is now ready for production deployment on Railway! 🚀
