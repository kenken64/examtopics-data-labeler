const puppeteer = require('puppeteer');

async function testAPI() {
  console.log('🚀 Starting API tests...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless mode
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('🖥️  Browser Console:', msg.text());
  });
  
  // Enable request/response logging
  page.on('request', request => {
    console.log('📤 Request:', request.method(), request.url());
  });
  
  page.on('response', response => {
    console.log('📥 Response:', response.status(), response.url());
  });

  try {
    // Navigate to localhost
    console.log('🌐 Navigating to localhost...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    // Test 1: Check if /api/access-codes/list works
    console.log('\n🧪 Test 1: Testing /api/access-codes/list endpoint');
    const listResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/access-codes/list');
        const text = await response.text();
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: text
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('📋 List API Result:', JSON.stringify(listResult, null, 2));
    
    // Test 2: Check if /api/access-codes/verify works with POST
    console.log('\n🧪 Test 2: Testing /api/access-codes/verify endpoint');
    const verifyResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/access-codes/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accessCode: 'TEST123' })
        });
        const text = await response.text();
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: text
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('🔍 Verify API Result:', JSON.stringify(verifyResult, null, 2));
    
    // Test 3: Test with a different access code
    console.log('\n🧪 Test 3: Testing with different access code');
    const verifyResult2 = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/access-codes/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accessCode: 'AWSCP001' })
        });
        const text = await response.text();
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: text
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('🔍 Verify API Result 2:', JSON.stringify(verifyResult2, null, 2));
    
    // Test 4: Navigate to QuizBlitz page and test there
    console.log('\n🧪 Test 4: Testing from QuizBlitz page');
    await page.goto('http://localhost:3001/quizblitz', { waitUntil: 'networkidle0' });
    
    const quizblitzResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/access-codes/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accessCode: 'AWSCP001' })
        });
        const text = await response.text();
        return {
          status: response.status,
          statusText: response.statusText,
          body: text,
          currentUrl: window.location.href
        };
      } catch (error) {
        return { error: error.message, currentUrl: window.location.href };
      }
    });
    
    console.log('🎯 QuizBlitz API Result:', JSON.stringify(quizblitzResult, null, 2));
    
    // Test 5: Check if MongoDB connection is working by testing a simple endpoint
    console.log('\n🧪 Test 5: Testing MongoDB connection via health endpoint');
    const healthResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/health');
        const text = await response.text();
        return {
          status: response.status,
          statusText: response.statusText,
          body: text
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('💊 Health API Result:', JSON.stringify(healthResult, null, 2));
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    console.log('\n🏁 Tests completed. Closing browser...');
    await browser.close();
  }
}

// Run the tests
testAPI().catch(console.error);
