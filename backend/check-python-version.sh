#!/bin/bash
echo "Verifying Python version for Railway deployment..."

python3 --version
echo ""

echo "Checking Python version compatibility..."
python3 verify-python-version.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backend is ready for Railway deployment!"
else
    echo ""
    echo "❌ Please fix Python version issues before deploying."
    exit 1
fi
