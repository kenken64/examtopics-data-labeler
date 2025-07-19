/**
 * Cloudinary Setup Verification Script
 * Run this to test your Cloudinary integration setup
 */

const CloudinaryService = require('../lib/cloudinary-service');
require('dotenv').config({ path: '.env.local' });

async function verifyCloudinarySetup() {
  console.log('🔍 Verifying Cloudinary Setup...\n');

  // Check environment variables
  const requiredVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('\n📖 Please check the CLOUDINARY_SETUP.md file for setup instructions.');
    return;
  }

  console.log('✅ All required environment variables are present\n');

  try {
    // Test Cloudinary service
    console.log('🔐 Testing Cloudinary authentication...');
    
    const cloudinaryService = new CloudinaryService();
    
    console.log('✅ Cloudinary service initialized successfully');
    console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   API Key: ${process.env.CLOUDINARY_API_KEY}\n`);

    // Test image upload
    console.log('🧪 Testing image upload...');
    
    // Create a simple test image (1x1 pixel PNG in base64)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGOHJDJjwAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(testImageBase64.split(',')[1], 'base64');
    
    const imageResult = await cloudinaryService.uploadProfilePhoto(
      testBuffer,
      'test-image.png',
      'test-user',
      'image/png'
    );
    
    console.log('✅ Image upload successful!');
    console.log(`   Image URL: ${imageResult.url}`);
    console.log(`   Public ID: ${imageResult.id}\n`);
    
    // Test PDF upload
    console.log('🧪 Testing PDF upload...');
    
    // Create a minimal PDF content
    const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n4 0 obj<</Length 44>>stream\nBT\n/F1 12 Tf\n100 700 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000207 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n299\n%%EOF';
    const pdfBuffer = Buffer.from(pdfContent);
    
    const pdfResult = await cloudinaryService.uploadPDF(
      pdfBuffer,
      'test-document.pdf',
      'test-user'
    );
    
    console.log('✅ PDF upload successful!');
    console.log(`   PDF URL: ${pdfResult.url}`);
    console.log(`   Public ID: ${pdfResult.id}\n`);
    
    // Clean up test files
    console.log('🗑️ Cleaning up test files...');
    const { v2: cloudinary } = require('cloudinary');
    
    await cloudinary.uploader.destroy(imageResult.id, { resource_type: 'image' });
    await cloudinary.uploader.destroy(pdfResult.id, { resource_type: 'raw' });
    
    console.log('✅ Test files cleaned up\n');
    
    console.log('🎉 Cloudinary setup verification complete!');
    console.log('   You can now upload files through the application interface.');

  } catch (error) {
    console.log('❌ Verification failed:');
    console.log(`   Error: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check that your Cloudinary credentials are correct');
    console.log('   2. Verify your Cloudinary account is active');
    console.log('   3. Ensure your API Secret is properly formatted');
    console.log('   4. Check the CLOUDINARY_SETUP.md file for detailed instructions');
  }
}

if (require.main === module) {
  verifyCloudinarySetup().catch(console.error);
}

module.exports = { verifyCloudinarySetup };
