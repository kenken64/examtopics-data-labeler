// Simple test script to verify Telegram bot polling mechanism
const { spawn } = require('child_process');
const path = require('path');

console.log('🔧 DEBUG: Starting Telegram bot polling test...');
console.log('🔧 DEBUG: Current working directory:', process.cwd());
console.log('🔧 DEBUG: Bot script path:', path.resolve(__dirname, 'bot.js'));

// Start the bot process
const botProcess = spawn('node', ['bot.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

console.log('🔧 DEBUG: Bot process started with PID:', botProcess.pid);

// Handle process events
botProcess.on('error', (error) => {
  console.error('🔧 DEBUG: Process error:', error);
});

botProcess.on('exit', (code, signal) => {
  console.log('🔧 DEBUG: Process exited with code:', code, 'signal:', signal);
});

// Auto-kill after 30 seconds for testing
setTimeout(() => {
  console.log('🔧 DEBUG: Test timeout - killing bot process...');
  botProcess.kill('SIGINT');
}, 30000);

console.log('🔧 DEBUG: Bot will run for 30 seconds...');
console.log('🔧 DEBUG: Watch for polling debug messages...');
console.log('🔧 DEBUG: Press Ctrl+C to stop early');

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🔧 DEBUG: Received SIGINT - stopping bot...');
  botProcess.kill('SIGINT');
  process.exit(0);
});