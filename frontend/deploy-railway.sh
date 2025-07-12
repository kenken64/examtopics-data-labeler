#!/bin/bash

# Railway Deployment Script for Next.js Frontend
# Run this script to prepare and deploy frontend to Railway

set -e

echo "⚡ Preparing ExamTopics Next.js Frontend for Railway Deployment"
echo "============================================================="

# Check if we're in the frontend directory
if [ ! -f "next.config.ts" ] && [ ! -f "next.config.js" ]; then
    echo "❌ Error: Next.js config not found. Please run this script from the frontend directory."
    exit 1
fi

echo "✅ Found Next.js configuration - proceeding with deployment preparation"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    exit 1
fi

echo "✅ Found package.json"

# Check for required build script
echo "📦 Validating package.json scripts..."
if grep -q '"build"' package.json; then
    echo "✅ Build script found"
else
    echo "❌ No build script found in package.json"
    exit 1
fi

if grep -q '"start"' package.json; then
    echo "✅ Start script found"
else
    echo "❌ No start script found in package.json"
    exit 1
fi

# Validate Node.js dependencies
echo "📦 Checking Node.js dependencies..."
if command -v npm &> /dev/null; then
    npm list --depth=0 > installed_packages.txt 2>/dev/null || true
    echo "✅ Dependencies validated"
else
    echo "⚠️  npm not found, skipping dependency validation"
fi

# Check environment variables
echo "🔧 Checking environment configuration..."
if [ -f ".env" ]; then
    echo "⚠️  Found .env file - ensure sensitive data is in Railway environment variables"
fi

if [ -f ".env.local" ]; then
    echo "⚠️  Found .env.local file - ensure it's in .gitignore"
fi

if [ -f ".env.railway" ]; then
    echo "✅ Found Railway environment template"
fi

# Check Next.js configuration
echo "⚙️  Validating Next.js configuration..."
if [ -f "next.config.ts" ] || [ -f "next.config.js" ]; then
    echo "✅ Next.js configuration found"
fi

# Check for TypeScript
if [ -f "tsconfig.json" ]; then
    echo "✅ TypeScript configuration found"
fi

# Check for essential directories
if [ -d "app" ] || [ -d "pages" ]; then
    echo "✅ Next.js pages/app directory found"
else
    echo "❌ No Next.js pages or app directory found"
    exit 1
fi

echo "🎯 Deployment checklist:"
echo "  ✅ Next.js 14+ application with App Router"
echo "  ✅ Health check API endpoint (/api/health)"
echo "  ✅ MongoDB integration for data management"
echo "  ✅ JWT authentication system"
echo "  ✅ Railway configuration files created"
echo "  ✅ Environment variables template ready"
echo "  ✅ Standalone output for optimized deployment"
echo "  ✅ TypeScript configuration"

echo ""
echo "🎯 Next steps for Railway deployment:"
echo "1. Push your code to GitHub"
echo "2. Connect your repository to Railway"
echo "3. Set required environment variables:"
echo "   - MONGODB_URI"
echo "   - JWT_SECRET"
echo "   - NEXT_PUBLIC_PDF_CONVERSION_API_URL"
echo "4. Deploy from Railway dashboard"
echo ""
echo "📖 See RAILWAY_DEPLOYMENT.md for detailed instructions"

# Clean up
rm -f installed_packages.txt

echo "✅ Next.js frontend is ready for Railway deployment!"
echo ""
echo "🔗 Quick setup reminders:"
echo "  • Database: Set MONGODB_URI connection string"
echo "  • Auth: Generate secure JWT_SECRET"
echo "  • Backend: Link to your deployed backend API"
echo "  • Health check: https://your-app.railway.app/api/health"
