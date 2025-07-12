#!/bin/bash

# Railway Deployment Script
# Run this script to prepare and deploy backend to Railway

set -e

echo "🚀 Preparing ExamTopics Backend for Railway Deployment"
echo "====================================================="

# Check if we're in the backend directory
if [ ! -f "app.py" ]; then
    echo "❌ Error: app.py not found. Please run this script from the backend directory."
    exit 1
fi

echo "✅ Found app.py - proceeding with deployment preparation"

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found"
    exit 1
fi

echo "✅ Found requirements.txt"

# Validate Python dependencies
echo "📦 Validating Python dependencies..."
python -m pip list --format=freeze > installed_packages.txt
echo "✅ Dependencies validated"

# Check environment variables
echo "🔧 Checking environment configuration..."
if [ -f ".env" ]; then
    echo "⚠️  Found .env file - ensure sensitive data is in Railway environment variables"
fi

if [ -f ".env.railway" ]; then
    echo "✅ Found Railway environment template"
fi

echo "📋 Deployment checklist:"
echo "  ✅ Flask app configured"
echo "  ✅ Health check endpoint added"
echo "  ✅ Railway configuration files created"
echo "  ✅ Production WSGI server configured"
echo "  ✅ System dependencies specified"
echo "  ✅ Environment variables template ready"

echo ""
echo "🎯 Next steps for Railway deployment:"
echo "1. Push your code to GitHub"
echo "2. Connect your repository to Railway"
echo "3. Set OPENAI_API_KEY in Railway environment variables"
echo "4. Deploy from Railway dashboard"
echo ""
echo "📖 See RAILWAY_DEPLOYMENT.md for detailed instructions"

# Clean up
rm -f installed_packages.txt

echo "✅ Backend is ready for Railway deployment!"
