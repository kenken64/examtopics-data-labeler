#!/bin/bash
echo "Preparing Telegram Bot for Railway deployment..."

# Remove existing lockfile
rm -f package-lock.json

# Reinstall packages to generate fresh lockfile
echo "Installing dependencies..."
npm install

# Validate the bot code
echo "Validating bot code..."
npm run validate

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Telegram Bot is ready for Railway deployment!"
    echo "- Dependencies installed"
    echo "- Lockfile updated"
    echo "- Code validated"
else
    echo ""
    echo "❌ Validation failed. Please check the bot code."
    exit 1
fi
