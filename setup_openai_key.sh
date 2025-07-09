#!/bin/bash

# OpenAI API Key Setup Script for AWS Cert Web OCR Feature
echo "🔧 OpenAI API Key Setup for OCR Feature (.env file)"
echo "================================================="

cd backend

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ .env file found"
    # Check if API key is already set in .env
    if grep -q "OPENAI_API_KEY=" .env && ! grep -q "OPENAI_API_KEY=your_openai_api_key_here" .env; then
        current_key=$(grep "OPENAI_API_KEY=" .env | cut -d'=' -f2)
        echo "Current key in .env: ${current_key:0:10}...${current_key: -4}"
        echo ""
        read -p "Do you want to update it? (y/n): " update_key
        if [ "$update_key" != "y" ]; then
            echo "Keeping existing API key."
            exit 0
        fi
    fi
else
    echo "📝 Creating .env file from template..."
    cp .env.example .env
fi

echo ""
echo "📝 To use the OCR conversion feature, you need an OpenAI API key."
echo "   You can get one from: https://platform.openai.com/api-keys"
echo ""

# Prompt for API key
read -p "Enter your OpenAI API key: " api_key

if [ -z "$api_key" ]; then
    echo "❌ No API key provided. Exiting."
    exit 1
fi

# Validate API key format (should start with sk-)
if [[ ! $api_key =~ ^sk-[a-zA-Z0-9] ]]; then
    echo "⚠️  Warning: API key doesn't match expected format (should start with 'sk-')"
    read -p "Continue anyway? (y/n): " continue_anyway
    if [ "$continue_anyway" != "y" ]; then
        echo "Exiting."
        exit 1
    fi
fi

# Update .env file
if grep -q "OPENAI_API_KEY=" .env; then
    # Update existing entry
    sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$api_key/" .env
    echo "✅ Updated OPENAI_API_KEY in .env file"
else
    # Add new entry
    echo "OPENAI_API_KEY=$api_key" >> .env
    echo "✅ Added OPENAI_API_KEY to .env file"
fi

echo ""
echo "🎉 Setup complete!"
echo "   API key is now stored in backend/.env file"
echo ""
echo "🧪 To test the OCR endpoint:"
echo "   1. Place a test PDF in the backend directory as 'test.pdf'"
echo "   2. Run: cd backend && python test_ocr_endpoint.py"
echo ""
echo "🚀 To start the backend server:"
echo "   cd backend && source venv/bin/activate && python app.py"
echo ""
echo "📋 Note: The .env file is automatically loaded by the Flask application"
