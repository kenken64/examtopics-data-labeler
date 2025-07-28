// CORS Fix Validation Script for Railway Deployment
// Run this in browser console to test CORS implementation

console.log('🔧 Testing CORS Fix for Railway Deployment');
console.log('='.repeat(60));

async function testCORSFix() {
  console.log('\n🧪 Testing CORS Implementation...\n');

  const testEndpoints = [
    {
      name: 'API Endpoint (Companies)',
      url: '/api/companies',
      method: 'GET',
      description: 'Test API CORS headers'
    },
    {
      name: 'File Serving Endpoint',
      url: '/api/files/test',
      method: 'GET',
      description: 'Test file serving CORS headers'
    },
    {
      name: 'OPTIONS Request (Preflight)',
      url: '/api/companies',
      method: 'OPTIONS',
      description: 'Test preflight CORS handling'
    }
  ];

  for (const endpoint of testEndpoints) {
    try {
      console.log(`📋 Testing: ${endpoint.name}`);
      console.log(`   URL: ${endpoint.url}`);
      console.log(`   Method: ${endpoint.method}`);
      
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://test-origin.com' // Simulate cross-origin request
        }
      });

      console.log(`   Status: ${response.status}`);
      
      // Check CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
      };

      console.log('   CORS Headers:');
      Object.entries(corsHeaders).forEach(([key, value]) => {
        const status = value ? '✅' : '❌';
        console.log(`     ${status} ${key}: ${value || 'Missing'}`);
      });

      if (endpoint.method === 'OPTIONS') {
        const maxAge = response.headers.get('Access-Control-Max-Age');
        console.log(`     ${maxAge ? '✅' : '❌'} Access-Control-Max-Age: ${maxAge || 'Missing'}`);
      }

      console.log('   ' + '-'.repeat(50));

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log('   ' + '-'.repeat(50));
    }
  }

  console.log('\n📊 CORS Fix Summary:');
  console.log('✅ Expected: All requests should have proper CORS headers');
  console.log('✅ Access-Control-Allow-Origin should be "*" or match origin');
  console.log('✅ OPTIONS requests should return 200 with preflight headers');
  console.log('✅ File requests should include comprehensive CORS headers');
}

// Test image loading specifically
async function testImageCORS() {
  console.log('\n🖼️  Testing Image CORS specifically...\n');
  
  // Test loading an image from your Railway domain
  const testImage = new Image();
  testImage.crossOrigin = 'anonymous';
  
  testImage.onload = function() {
    console.log('✅ Image loaded successfully with CORS');
    console.log('   Image dimensions:', this.width, 'x', this.height);
  };
  
  testImage.onerror = function() {
    console.log('❌ Image failed to load with CORS');
    console.log('   This indicates CORS headers are not properly set for images');
  };
  
  // Replace with an actual image URL from your app
  const imageUrl = '/api/files/test-image';
  console.log(`🔍 Testing image URL: ${imageUrl}`);
  testImage.src = imageUrl;
}

// Auto-run tests
console.log('\n🚀 Running CORS tests...');
testCORSFix().then(() => {
  testImageCORS();
});

console.log('\n📝 Manual Testing Instructions:');
console.log('1. Check Network tab in DevTools for CORS-related errors');
console.log('2. Look for "Access-Control-Allow-Origin" headers in responses');
console.log('3. Verify that OPTIONS requests return 200 status');
console.log('4. Test with different origins to ensure CORS works cross-domain');
console.log('5. Check that images load without CORS errors');
