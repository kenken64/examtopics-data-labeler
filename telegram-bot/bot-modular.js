#!/usr/bin/env node

/**
 * Modular Telegram Bot Entry Point
 * This file starts the refactored modular bot
 */

const path = require('path');

// Set up module paths
const srcPath = path.join(__dirname, 'src');
require('module').globalPaths.push(srcPath);

// Start the modular bot
require('./src/bot');

console.log('🚀 Modular Telegram Bot starting...');
console.log('📁 Using modular architecture from src/ directory');