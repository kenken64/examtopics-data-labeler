#!/bin/bash

# Git automation script
# Usage: ./git-auto.sh [commit-message-file]
# Reads commit message from commit-message.txt file by default

# Set default commit message file
COMMIT_MESSAGE_FILE="${1:-commit-message.txt}"

# Check if commit message file exists
if [ ! -f "$COMMIT_MESSAGE_FILE" ]; then
    echo "❌ Error: Commit message file '$COMMIT_MESSAGE_FILE' not found"
    echo "📝 Please create a '$COMMIT_MESSAGE_FILE' file with your commit message"
    exit 1
fi

# Read commit message from file and check if it's not empty
COMMIT_MESSAGE=$(cat "$COMMIT_MESSAGE_FILE" | tr -d '\0')
if [ -z "$(echo "$COMMIT_MESSAGE" | tr -d '[:space:]')" ]; then
    echo "❌ Error: Commit message file '$COMMIT_MESSAGE_FILE' is empty"
    echo "📝 Please add your commit message to '$COMMIT_MESSAGE_FILE'"
    exit 1
fi

echo "🔍 Checking git status..."
git status

echo ""
echo "📝 Adding all changes..."
git add .

echo ""
echo "💾 Committing changes with message from '$COMMIT_MESSAGE_FILE':"
echo "$COMMIT_MESSAGE"
git commit -F "$COMMIT_MESSAGE_FILE"

echo ""
echo "🚀 Getting current branch name..."
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

echo ""
echo "📤 Pushing to origin/$CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"

echo ""
echo "✅ Git workflow completed!"
