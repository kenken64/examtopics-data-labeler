#!/usr/bin/env node

// Test the API endpoint directly
const http = require('http');

function testAPI(url, description) {
  return new Promise((resolve, reject) => {
    console.log(`🌐 Testing: ${description}`);
    console.log(`📡 URL: ${url}`);
    
    const req = http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`✅ Status: ${res.statusCode}`);
          console.log(`📊 Success: ${response.success}`);
          
          if (response.success && response.questions) {
            console.log(`📋 Questions returned: ${response.questions.length}`);
            if (response.questions.length > 0) {
              const firstQ = response.questions[0];
              console.log(`🔍 First question:`)
              console.log(`  question_no: ${firstQ.question_no}`);
              console.log(`  options: ${firstQ.options ? firstQ.options.length : 'undefined'} items`);
              console.log(`  correctAnswer: ${firstQ.correctAnswer} (${typeof firstQ.correctAnswer})`);
            }
          } else {
            console.log(`❌ Error: ${response.message}`);
          }
          
          resolve(response);
        } catch (e) {
          console.log(`❌ JSON Parse Error: ${e.message}`);
          console.log(`📄 Raw response: ${data.substring(0, 200)}...`);
          reject(e);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ Request Error: ${err.message}`);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      console.log('⏰ Request timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function testAPIs() {
  console.log('🧪 Testing API Endpoints');
  console.log('=' .repeat(50));
  
  try {
    // Test certificate questions endpoint
    await testAPI(
      'http://localhost:3001/api/saved-questions?certificateCode=AIF-C01',
      'Certificate Questions API'
    );
    
    console.log('\n' + '-'.repeat(30) + '\n');
    
    // Test access code questions endpoint  
    await testAPI(
      'http://localhost:3001/api/access-code-questions?generatedAccessCode=AC-4AC2H2G',
      'Access Code Questions API'
    );
    
  } catch (error) {
    console.log(`🔥 Test failed: ${error.message}`);
  }
}

testAPIs();
