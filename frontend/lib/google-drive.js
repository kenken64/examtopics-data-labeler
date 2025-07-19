/**
 * Google Drive Service for Profile Photo Management
 * 
 * This service handles uploading, retrieving, and managing user profile photos
 * on Google Drive with proper authentication and unique file naming.
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.initialized = false;
  }

  /**
   * Initialize Google Drive API with service account credentials
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔧 GoogleDriveService: Initializing Google Drive service...');
      
      // Get required credentials from environment variables
      const projectId = process.env.GOOGLE_PROJECT_ID;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

      // Validate required credentials
      if (!projectId || !privateKey || !clientEmail || !folderId) {
        console.error('❌ GoogleDriveService: Missing required environment variables');
        console.error('Required: GOOGLE_PROJECT_ID, GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL, GOOGLE_DRIVE_FOLDER_ID');
        throw new Error('Missing required Google Drive credentials');
      }

      console.log('🔑 GoogleDriveService: Using credentials for project:', projectId);
      console.log('📧 GoogleDriveService: Service account email:', clientEmail);
      console.log('📁 GoogleDriveService: Target folder ID:', folderId);

      // Use the same authentication approach as the working PDF upload
      this.auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          project_id: projectId,
          private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
          private_key: privateKey,
          client_email: clientEmail,
          client_id: process.env.GOOGLE_CLIENT_ID,
        },
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      // Initialize Drive API client
      this.drive = google.drive({ version: 'v3', auth: this.auth });

      // Use the provided folder ID directly (same as working PDF upload)
      this.profilePhotosFolderId = folderId;

      this.initialized = true;
      console.log('✅ Google Drive service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive service:', error);
      throw new Error('Google Drive initialization failed');
    }
  }

  /**
   * Generate unique filename for user profile photo
   */
  generateUniqueFilename(userId, originalFilename) {
    const timestamp = Date.now();
    const extension = path.extname(originalFilename).toLowerCase();
    return `profile_${userId}_${timestamp}${extension}`;
  }

  /**
   * Upload user profile photo to Google Drive using direct HTTP approach (same as PDF upload)
   */
  async uploadProfilePhoto(userId, fileBuffer, originalFilename, mimeType) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log('📤 Uploading profile photo for user:', userId);

      // Generate unique filename
      const filename = this.generateUniqueFilename(userId, originalFilename);

      // Delete existing profile photo if it exists
      await this.deleteExistingProfilePhoto(userId);

      // Convert to Buffer (ensure it's a proper Buffer)
      const buffer = Buffer.from(fileBuffer);
      console.log(`Preparing to upload file: ${filename}, size: ${buffer.length} bytes`);
      
      // Get access token for direct API call (same as PDF upload)
      const authClient = await this.auth.getClient();
      const accessToken = await authClient.getAccessToken();
      
      if (!accessToken.token) {
        throw new Error('Failed to get access token');
      }

      // Prepare metadata
      const metadata = {
        name: filename,
        parents: [this.profilePhotosFolderId],
        description: `Profile photo for user ${userId}`
      };

      console.log(`Uploading to Google Drive folder: ${this.profilePhotosFolderId}`);

      // Create multipart body manually (same as PDF upload)
      const boundary = '-------314159265358979323846';
      const delimiter = '\r\n--' + boundary + '\r\n';
      const close_delim = '\r\n--' + boundary + '--';

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + mimeType + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        buffer.toString('base64') +
        close_delim;

      // Make direct HTTP request to Google Drive API (same as PDF upload)
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
      
      if (!fileId) {
        throw new Error('Failed to get file ID from Google Drive response');
      }

      // Make the file publicly readable
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      const fileData = {
        id: fileId,
        filename: filename,
        url: `https://drive.google.com/uc?id=${fileId}&export=view`,
        directUrl: `https://drive.google.com/uc?export=view&id=${fileId}`
      };

      console.log('✅ Profile photo uploaded successfully:', fileData);
      return fileData;

    } catch (error) {
      console.error('❌ Failed to upload profile photo:', error);
      throw new Error('Profile photo upload failed');
    }
  }

  /**
   * Delete existing profile photo for a user
   */
  async deleteExistingProfilePhoto(userId) {
    try {
      // Search for existing profile photos for this user
      const response = await this.drive.files.list({
        q: `parents in '${this.profilePhotosFolderId}' and name contains 'profile_${userId}_'`,
        fields: 'files(id, name)'
      });

      if (response.data.files && response.data.files.length > 0) {
        for (const file of response.data.files) {
          await this.drive.files.delete({
            fileId: file.id
          });
          console.log('🗑️ Deleted existing profile photo:', file.name);
        }
      }
    } catch (error) {
      console.error('⚠️ Error deleting existing profile photo:', error);
      // Don't throw error here - continue with upload even if deletion fails
    }
  }

  /**
   * Get profile photo URL for a user
   */
  async getProfilePhotoUrl(userId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await this.drive.files.list({
        q: `parents in '${this.profilePhotosFolderId}' and name contains 'profile_${userId}_'`,
        fields: 'files(id, name)',
        orderBy: 'createdTime desc',
        pageSize: 1
      });

      if (response.data.files && response.data.files.length > 0) {
        const fileId = response.data.files[0].id;
        return {
          id: fileId,
          url: `https://drive.google.com/uc?id=${fileId}&export=view`,
          directUrl: `https://drive.google.com/uc?export=view&id=${fileId}`
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get profile photo URL:', error);
      return null;
    }
  }

  /**
   * Delete profile photo for a user
   */
  async deleteProfilePhoto(userId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.deleteExistingProfilePhoto(userId);
      console.log('✅ Profile photo deleted for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete profile photo:', error);
      throw new Error('Profile photo deletion failed');
    }
  }
}

// Export singleton instance
const googleDriveService = new GoogleDriveService();
module.exports = googleDriveService;
