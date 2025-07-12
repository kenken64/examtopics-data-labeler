#!/bin/bash
echo "Updating pnpm lockfile for Railway deployment..."

# Remove existing lockfile
rm -f pnpm-lock.yaml

# Reinstall packages to generate fresh lockfile
pnpm install

echo "Lockfile updated successfully!"
echo "Ready for Railway deployment with --frozen-lockfile"
