/**
 * Test script to verify Google Drive upload functionality
 */

const fs = require('fs');
const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function testGoogleDriveUpload() {
  console.log('🧪 Testing Google Drive Upload...\n');

  try {
    // Create test auth
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // Create a test file content
    const testContent = 'This is a test file for Google Drive upload verification.';
    const testBuffer = Buffer.from(testContent);

    const fileMetadata = {
      name: 'test-upload.txt',
      parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined,
    };

    console.log('📤 Uploading test file...');
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      console.log(`   Target folder: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
    } else {
      console.log('   Target: Service account root drive');
    }

    // Try simple upload without stream
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: 'text/plain',
        body: testContent, // Use string directly instead of buffer
      },
    });

    console.log('✅ Upload successful!');
    console.log(`   File ID: ${response.data.id}`);
    console.log(`   File name: ${response.data.name}`);
    console.log(`   View link: ${response.data.webViewLink}`);

    // Clean up - delete the test file
    await drive.files.delete({ fileId: response.data.id });
    console.log('🗑️  Test file cleaned up');

    console.log('\n🎉 Google Drive upload test passed!');
    console.log('   Your PDF upload functionality should work correctly.');

  } catch (error) {
    console.error('❌ Upload test failed:');
    console.error(`   Error: ${error.message}`);
    console.log('\n🔧 This suggests the same issue will occur with PDF uploads.');
  }
}

if (require.main === module) {
  testGoogleDriveUpload().catch(console.error);
}

module.exports = { testGoogleDriveUpload };
