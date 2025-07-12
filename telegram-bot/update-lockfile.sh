#!/bin/bash
echo "Updating npm lockfile for Railway deployment..."

# Remove existing lockfile
rm -f package-lock.json

# Reinstall packages to generate fresh lockfile
npm install

echo "Lockfile updated successfully!"
echo "Ready for Railway deployment"
