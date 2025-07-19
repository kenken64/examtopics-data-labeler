/**
 * Test script to check if we can upload to a shared drive or regular drive with proper permissions
 */

const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function testSharedDriveUpload() {
  console.log('🧪 Testing Shared Drive Upload Compatibility...\n');

  try {
    // Create auth with the same credentials
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
      },
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    console.log('🔍 Checking folder information...');
    
    // Get info about the target folder
    const folderInfo = await drive.files.get({
      fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
      fields: 'id, name, parents, driveId, permissions, capabilities',
      supportsAllDrives: true
    });
    
    console.log('📁 Folder Details:');
    console.log(`   Name: ${folderInfo.data.name}`);
    console.log(`   ID: ${folderInfo.data.id}`);
    console.log(`   Drive ID: ${folderInfo.data.driveId || 'Personal Drive'}`);
    console.log(`   Shared Drive: ${folderInfo.data.driveId ? 'Yes' : 'No'}`);
    
    // Check if we can write to this folder
    const canWrite = folderInfo.data.capabilities?.canAddChildren;
    console.log(`   Can Add Files: ${canWrite ? 'Yes' : 'No'}`);
    
    if (folderInfo.data.driveId) {
      console.log('✅ This is a Shared Drive - uploads should work!');
      
      // Try a test upload
      await testUploadToSharedDrive(drive, folderInfo.data.driveId);
      
    } else {
      console.log('❌ This is a Personal Drive - service accounts cannot upload here');
      console.log('\n💡 Solutions:');
      console.log('   1. Create a Shared Drive (requires Google Workspace)');
      console.log('   2. Use a different storage service (AWS S3, Cloudinary, etc.)');
      console.log('   3. Implement OAuth with a real user account');
    }

  } catch (error) {
    console.error('❌ Error checking drive compatibility:', error.message);
    
    if (error.message.includes('storageQuotaExceeded')) {
      console.log('\n💡 This confirms the service account storage quota issue.');
      console.log('   You need to use a Shared Drive or different storage solution.');
    }
  }
}

async function testUploadToSharedDrive(drive, driveId) {
  try {
    console.log('\n🧪 Testing upload to Shared Drive...');
    
    const testContent = `Test file created at ${new Date().toISOString()}`;
    const testBuffer = Buffer.from(testContent);

    // Create a small test file
    const response = await drive.files.create({
      requestBody: {
        name: `test-upload-${Date.now()}.txt`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        driveId: driveId
      },
      media: {
        mimeType: 'text/plain',
        body: testContent
      },
      supportsAllDrives: true
    });

    console.log('✅ Upload to Shared Drive successful!');
    console.log(`   File ID: ${response.data.id}`);
    
    // Clean up the test file
    await drive.files.delete({
      fileId: response.data.id,
      supportsAllDrives: true
    });
    
    console.log('🗑️  Test file cleaned up');
    console.log('\n🎉 Your PDF and photo uploads should work with Shared Drive support!');
    
  } catch (uploadError) {
    console.error('❌ Shared Drive upload failed:', uploadError.message);
  }
}

if (require.main === module) {
  testSharedDriveUpload().catch(console.error);
}

module.exports = { testSharedDriveUpload };
