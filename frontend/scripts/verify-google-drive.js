/**
 * Google Drive Setup Verification Script
 * Run this to test your Google Drive integration setup
 */

const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function verifyGoogleDriveSetup() {
  console.log('🔍 Verifying Google Drive Setup...\n');

  // Check environment variables
  const requiredVars = [
    'GOOGLE_PROJECT_ID',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_EMAIL',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('\n📖 Please check the GOOGLE_DRIVE_SETUP.md file for setup instructions.');
    return;
  }

  console.log('✅ All required environment variables are present\n');

  try {
    // Test authentication
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

    console.log('🔐 Testing authentication...');
    
    // Test basic access
    const about = await drive.about.get({ fields: 'user' });
    console.log(`✅ Authentication successful`);
    console.log(`   Service Account: ${about.data.user?.emailAddress || process.env.GOOGLE_CLIENT_EMAIL}\n`);

    // Test folder access if folder ID is provided
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      console.log('📁 Testing folder access...');
      try {
        const folder = await drive.files.get({
          fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
          fields: 'id, name, parents, permissions'
        });
        
        console.log(`✅ Folder access successful`);
        console.log(`   Folder Name: ${folder.data.name}`);
        console.log(`   Folder ID: ${folder.data.id}`);
        console.log(`   📂 Files will be uploaded to: examcertbot/documents/\n`);
      } catch (folderError) {
        console.log('❌ Folder access failed:');
        console.log(`   Error: ${folderError.message}`);
        console.log('   📝 Make sure:');
        console.log('   1. The folder ID is correct');
        console.log('   2. The service account has "Editor" access to the folder');
        console.log('   3. You shared the "documents" folder (not just "examcertbot")');
      }
    } else {
      console.log('⚠️  No GOOGLE_DRIVE_FOLDER_ID specified');
      console.log('   Files will be uploaded to the service account\'s root Drive folder');
      console.log('   Consider setting GOOGLE_DRIVE_FOLDER_ID for better organization\n');
    }

    console.log('🎉 Google Drive setup verification complete!');
    console.log('   You can now upload PDF files through the certificate management interface.');

  } catch (error) {
    console.log('❌ Authentication failed:');
    console.log(`   Error: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check that your service account JSON values are correctly copied');
    console.log('   2. Ensure the private key includes proper line breaks (\\n)');
    console.log('   3. Verify the Google Drive API is enabled in your Google Cloud project');
    console.log('   4. Check the GOOGLE_DRIVE_SETUP.md file for detailed instructions');
  }
}

if (require.main === module) {
  verifyGoogleDriveSetup().catch(console.error);
}

module.exports = { verifyGoogleDriveSetup };
