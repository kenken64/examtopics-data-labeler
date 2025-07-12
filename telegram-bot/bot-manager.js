#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

// Function to find and kill any running bot processes
function killExistingBots() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      // Windows: Find Node.js processes running bot.js
      exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', (error, stdout) => {
        if (error) {
          console.log('No existing bot processes found');
          resolve();
          return;
        }
        
        const lines = stdout.split('\n');
        let foundBots = false;
        
        lines.forEach(line => {
          if (line.includes('node.exe')) {
            // Extract PID from CSV format
            const parts = line.split(',');
            if (parts.length >= 2) {
              const pid = parts[1].replace(/"/g, '');
              if (pid && !isNaN(pid)) {
                // Check if this process is running bot.js
                exec(`wmic process where ProcessId=${pid} get CommandLine /format:value`, (cmdError, cmdStdout) => {
                  if (!cmdError && cmdStdout.includes('bot.js')) {
                    console.log(`Found existing bot process (PID: ${pid}). Terminating...`);
                    exec(`taskkill /PID ${pid} /F`, (killError) => {
                      if (!killError) {
                        console.log(`Successfully terminated bot process ${pid}`);
                        foundBots = true;
                      }
                    });
                  }
                });
              }
            }
          }
        });
        
        // Wait a moment for processes to be killed
        setTimeout(() => {
          if (foundBots) {
            console.log('Waiting for processes to terminate...');
            setTimeout(resolve, 2000);
          } else {
            console.log('No existing bot processes found');
            resolve();
          }
        }, 1000);
      });
    } else {
      // Unix-like systems
      exec("ps aux | grep 'node.*bot.js' | grep -v grep", (error, stdout) => {
        if (error || !stdout.trim()) {
          console.log('No existing bot processes found');
          resolve();
          return;
        }
        
        const lines = stdout.trim().split('\n');
        console.log(`Found ${lines.length} existing bot process(es). Terminating...`);
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[1];
          if (pid && !isNaN(pid)) {
            exec(`kill -TERM ${pid}`, (killError) => {
              if (!killError) {
                console.log(`Successfully terminated bot process ${pid}`);
              }
            });
          }
        });
        
        // Wait for processes to terminate
        setTimeout(resolve, 3000);
      });
    }
  });
}

// Main function
async function main() {
  const command = process.argv[2];
  
  if (command === 'kill') {
    console.log('Searching for and terminating existing bot processes...');
    await killExistingBots();
    console.log('Done.');
    return;
  }
  
  if (command === 'start') {
    console.log('Starting bot with cleanup...');
    await killExistingBots();
    
    // Start the bot
    console.log('Starting fresh bot instance...');
    require('./bot.js');
    return;
  }
  
  console.log('Telegram Bot Manager');
  console.log('Usage:');
  console.log('  node bot-manager.js kill   - Kill any existing bot processes');
  console.log('  node bot-manager.js start  - Kill existing processes and start fresh bot');
  console.log('  node bot.js                - Start bot normally (may conflict with existing instances)');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { killExistingBots };
