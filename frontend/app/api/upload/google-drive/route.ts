import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { google } from 'googleapis';

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (e.g., max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Check if Google Drive credentials are available
    const hasGoogleCredentials = !!(
      process.env.GOOGLE_PROJECT_ID &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_CLIENT_EMAIL
    );

    if (hasGoogleCredentials) {        // Real Google Drive implementation using Service Account authentication
        // Note: This uses Service Account credentials, NOT API keys
        // Service accounts are more secure for server-to-server communication
        try {
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
          
          // Get file data as buffer
          const fileBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(fileBuffer);

          console.log(`Preparing to upload file: ${file.name}, size: ${buffer.length} bytes`);
          
          // Get access token for direct API call
          const authClient = await auth.getClient();
          const accessToken = await authClient.getAccessToken();
          
          if (!accessToken.token) {
            throw new Error('Failed to get access token');
          }

          // Prepare metadata
          const metadata = {
            name: file.name,
            parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined,
          };

          if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
            console.log(`Uploading to Google Drive folder: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
          } else {
            console.log('No Google Drive folder specified, uploading to root');
          }

          // Create multipart body manually
          const boundary = '-------314159265358979323846';
          const delimiter = '\r\n--' + boundary + '\r\n';
          const close_delim = '\r\n--' + boundary + '--';

          const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + file.type + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n\r\n' +
            buffer.toString('base64') +
            close_delim;

          // Make direct HTTP request to Google Drive API
          const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken.token}`,
              'Content-Type': `multipart/related; boundary="${boundary}"`,
            },
            body: multipartRequestBody,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Google Drive API error: ${uploadResponse.status} - ${errorText}`);
          }

          const uploadResult = await uploadResponse.json();
          const fileId = uploadResult.id;
          
          if (fileId) {
            // Make file public (optional)
            await drive.permissions.create({
              fileId: fileId,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
            });

            const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
            
            console.log(`File uploaded successfully to examcertbot/documents: ${file.name}`);
            console.log(`File URL: ${fileUrl}`);
            
            return NextResponse.json({
              success: true,
              fileId: fileId,
              fileUrl: fileUrl,
              fileName: file.name,
              fileSize: file.size,
            });
          } else {
            throw new Error('Failed to get file ID from Google Drive response');
          }

      } catch (driveError) {
        console.error('Google Drive upload error:', driveError);
        return NextResponse.json(
          { error: 'Failed to upload file to Google Drive' },
          { status: 500 }
        );
      }
    } else {
      // Mock response for development when credentials are not available
      console.log('Google Drive credentials not found, using mock response');
      
      const mockFileId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockFileUrl = `https://drive.google.com/file/d/${mockFileId}/view`;

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      return NextResponse.json({
        success: true,
        fileId: mockFileId,
        fileUrl: mockFileUrl,
        fileName: file.name,
        fileSize: file.size,
        mock: true, // Indicate this is a mock response
      });
    }

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
});
