#!/usr/bin/env node

/**
 * Railway Lockfile Fix Script
 * This script removes the existing lockfile and regenerates it to avoid frozen-lockfile issues
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 Railway Lockfile Fix - Starting...');

// Remove existing lockfile if it exists
const lockfilePath = path.join(__dirname, 'pnpm-lock.yaml');
if (fs.existsSync(lockfilePath)) {
  console.log('📁 Removing existing pnpm-lock.yaml...');
  fs.unlinkSync(lockfilePath);
  console.log('✅ Existing lockfile removed');
} else {
  console.log('ℹ️  No existing pnpm-lock.yaml found');
}

// Remove node_modules if it exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('📁 Removing existing node_modules...');
  fs.rmSync(nodeModulesPath, { recursive: true, force: true });
  console.log('✅ node_modules removed');
}

// Check if package.json exists
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found!');
  process.exit(1);
}

console.log('📦 Reading package.json...');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
console.log(`✅ Project: ${packageJson.name || 'Unknown'}`);

try {
  console.log('🔄 Installing dependencies with pnpm...');
  execSync('pnpm install --no-frozen-lockfile --reporter=append-only', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('✅ Dependencies installed successfully');
  
  console.log('📋 Verifying lockfile...');
  if (fs.existsSync(lockfilePath)) {
    const lockfileSize = fs.statSync(lockfilePath).size;
    console.log(`✅ New pnpm-lock.yaml created (${lockfileSize} bytes)`);
  } else {
    console.warn('⚠️  pnpm-lock.yaml not found after install');
  }
  
  console.log('🎉 Railway lockfile fix completed successfully!');
  console.log('💡 You can now deploy to Railway without frozen-lockfile issues');
  
} catch (error) {
  console.error('❌ Error during dependency installation:', error.message);
  process.exit(1);
}
