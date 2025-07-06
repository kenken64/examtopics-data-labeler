#!/usr/bin/env node

// Simple test to check login flow
const puppeteer = require('puppeteer');

async function testLoginFlow() {
  let browser;
  
  try {
    console.log('🧪 Testing Login Flow Navigation');
    console.log('=' .repeat(50));
    
    browser = await puppeteer.launch({ 
      headless: false, // Show browser for debugging
      slowMo: 1000 // Slow down for visibility
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    // Go to login page
    console.log('📱 Navigating to login page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    console.log('🔍 Current URL:', page.url());
    
    // Check if login form is present
    const loginForm = await page.$('form');
    if (!loginForm) {
      console.log('❌ Login form not found');
      return;
    }
    
    console.log('✅ Login form found');
    
    // Fill username (you'll need to use an existing user)
    await page.type('#username', 'testuser'); // Replace with actual username
    
    console.log('📝 Username entered');
    
    // Note: Since we can't easily test WebAuthn without actual credentials,
    // we'll stop here and check the current state
    
    console.log('⚠️  WebAuthn testing requires actual passkey credentials');
    console.log('🔧 To test manually:');
    console.log('   1. Open http://localhost:3000');
    console.log('   2. Enter a registered username');
    console.log('   3. Use your passkey to authenticate');
    console.log('   4. Check if it redirects to /home');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if running as main script
if (require.main === module) {
  // Check if server is running first
  const http = require('http');
  
  const checkServer = () => {
    return new Promise((resolve) => {
      const req = http.get('http://localhost:3000', (res) => {
        resolve(true);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  };
  
  checkServer().then((isRunning) => {
    if (isRunning) {
      testLoginFlow();
    } else {
      console.log('❌ Server not running on http://localhost:3000');
      console.log('💡 Start the server with: npm run dev');
    }
  });
}

module.exports = { testLoginFlow };
