/**
 * Cloudinary Service for File Management
 * 
 * This service handles uploading files (PDFs and images) to Cloudinary
 * as an alternative to Google Drive that doesn't have service account limitations.
 */

import { v2 as cloudinary } from 'cloudinary';

class CloudinaryService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize Cloudinary with API credentials
   */
  initialize() {
    if (this.initialized) return;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('❌ CloudinaryService: Missing required environment variables');
      console.error('Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
      throw new Error('Missing required Cloudinary credentials');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });

    this.initialized = true;
    console.log('✅ Cloudinary service initialized successfully');
  }

  /**
   * Upload PDF file to Cloudinary
   */
  async uploadPDF(fileBuffer, filename, userId = 'anonymous') {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      console.log('📤 Uploading PDF to Cloudinary:', filename);

      // Extract file extension from original filename
      const fileExtension = filename.split('.').pop()?.toLowerCase() || 'pdf';

      // Convert buffer to base64 data URL
      const base64Data = `data:application/pdf;base64,${fileBuffer.toString('base64')}`;

      // Upload to Cloudinary with PDF-specific settings
      // Try signed upload first, fallback to unsigned if untrusted
      let result;
      try {
        result = await cloudinary.uploader.upload(base64Data, {
          resource_type: 'raw', // For non-image files like PDFs
          folder: 'certificates', // Organize in a folder
          public_id: `cert_${userId}_${Date.now()}.${fileExtension}`, // Include file extension
          use_filename: false,
          unique_filename: true,
          overwrite: false,
          access_mode: 'public', // Ensure public access
          type: 'upload', // Specify upload type
          tags: ['certificate', 'pdf', `user_${userId}`]
        });
      } catch (uploadError) {
        console.log('⚠️ Signed upload failed, trying unsigned upload...', uploadError.message);
        
        // Fallback to unsigned upload if account is marked as untrusted
        if (uploadError.message.includes('untrusted') || uploadError.message.includes('show_original')) {
          result = await cloudinary.uploader.unsigned_upload(base64Data, 'ml_default', {
            resource_type: 'raw',
            folder: 'certificates',
            public_id: `cert_${userId}_${Date.now()}.${fileExtension}`,
            access_mode: 'public', // Ensure public access for unsigned upload
            tags: ['certificate', 'pdf', `user_${userId}`]
          });
          console.log('✅ Used unsigned upload successfully');
        } else {
          throw uploadError;
        }
      }

      // Generate both public URL (primary) and fallback options
      const publicUrl = result.secure_url;
      
      const fileData = {
        id: result.public_id,
        filename: filename,
        url: publicUrl,
        size: result.bytes,
        format: result.format
      };

      console.log('✅ PDF uploaded successfully to Cloudinary:', fileData);
      console.log('🔗 Public URL:', publicUrl);
      return fileData;

    } catch (error) {
      console.error('❌ Failed to upload PDF to Cloudinary:', error);
      throw new Error('PDF upload failed');
    }
  }

  /**
   * Upload profile photo to Cloudinary
   */
  async uploadProfilePhoto(fileBuffer, filename, userId, mimeType) {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      console.log('📤 Uploading profile photo to Cloudinary for user:', userId);

      // Delete existing profile photo if it exists
      await this.deleteExistingProfilePhoto(userId);

      // Convert buffer to base64 data URL
      const base64Data = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

      // Upload to Cloudinary with image-specific settings
      // Try signed upload first, fallback to unsigned if untrusted
      let result;
      try {
        result = await cloudinary.uploader.upload(base64Data, {
          resource_type: 'image',
          folder: 'profile-photos', // Organize in a folder
          public_id: `profile_${userId}`, // Fixed ID so we can easily replace it
          use_filename: false,
          unique_filename: false, // Don't make unique since we want to replace
          overwrite: true, // Replace existing file with same public_id
          access_mode: 'public', // Ensure public access
          type: 'upload', // Specify upload type
          tags: ['profile-photo', `user_${userId}`],
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Smart crop focusing on face
            { quality: 'auto', fetch_format: 'auto' } // Optimize quality and format
          ]
        });
      } catch (uploadError) {
        console.log('⚠️ Signed upload failed for profile photo, trying unsigned upload...', uploadError.message);
        
        // Fallback to unsigned upload if account is marked as untrusted
        if (uploadError.message.includes('untrusted') || uploadError.message.includes('show_original')) {
          result = await cloudinary.uploader.unsigned_upload(base64Data, 'ml_default', {
            resource_type: 'image',
            folder: 'profile-photos',
            public_id: `profile_${userId}`,
            access_mode: 'public', // Ensure public access for unsigned upload
            tags: ['profile-photo', `user_${userId}`],
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' }
            ]
          });
          console.log('✅ Used unsigned upload successfully for profile photo');
        } else {
          throw uploadError;
        }
      }

      const fileData = {
        id: result.public_id,
        filename: filename,
        url: result.secure_url,
        size: result.bytes,
        format: result.format
      };

      console.log('✅ Profile photo uploaded successfully to Cloudinary:', fileData);
      return fileData;

    } catch (error) {
      console.error('❌ Failed to upload profile photo to Cloudinary:', error);
      throw new Error('Profile photo upload failed');
    }
  }

  /**
   * Delete existing profile photo for a user
   */
  async deleteExistingProfilePhoto(userId) {
    try {
      const publicId = `profile-photos/profile_${userId}`;
      
      // Try to delete existing photo (ignore errors if it doesn't exist)
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      console.log('🗑️ Deleted existing profile photo for user:', userId);
    } catch (error) {
      // Ignore errors - photo might not exist yet
      console.log('ℹ️ No existing profile photo to delete for user:', userId);
    }
  }

  /**
   * Delete a file by public ID
   */
  async deleteFile(publicId, resourceType = 'image') {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      console.log('🗑️ Deleted file from Cloudinary:', publicId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete file from Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Get profile photo URL for a user
   */
  getProfilePhotoUrl(userId, options = {}) {
    if (!this.initialized) {
      this.initialize();
    }

    const publicId = `profile-photos/profile_${userId}`;
    
    // Generate URL with optional transformations
    return cloudinary.url(publicId, {
      resource_type: 'image',
      secure: true,
      transformation: [
        { width: options.width || 200, height: options.height || 200, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      ...options
    });
  }

  /**
   * Generate secure URL for PDF access
   */
  generateSecurePDFUrl(publicId, options = {}) {
    if (!this.initialized) {
      this.initialize();
    }

    // Generate URL without auth_token to avoid compatibility issues
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      secure: true,
      ...options
    });
  }

  /**
   * Generate download URL for PDF files with attachment header
   */
  async generatePDFDownloadUrl(publicId, filename = null) {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      // Use Cloudinary's download URL API
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      
      // Create the base download URL
      const baseUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/download`;
      
      // Generate signature for the download request
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create parameters for signature (excluding api_key and signature itself)
      const signatureParams = {
        attachment: 'true',
        public_id: publicId,
        timestamp: timestamp.toString(),
        type: 'upload'
      };

      // Add filename if provided
      if (filename) {
        signatureParams.target_filename = filename;
      }

      // Create signature string (alphabetically sorted parameters, no URL encoding)
      const sortedParams = Object.keys(signatureParams)
        .sort()
        .map(key => `${key}=${signatureParams[key]}`)
        .join('&');

      // Add API secret to signature string
      const signatureString = `${sortedParams}${apiSecret}`;
      
      console.log('🔐 Signature string:', signatureString);
      
      // Generate SHA-1 hash signature
      const { createHash } = await import('crypto');
      const signature = createHash('sha1').update(signatureString).digest('hex');
      
      console.log('🔑 Generated signature:', signature);

      // Create final URL parameters
      const urlParams = new URLSearchParams({
        api_key: apiKey,
        attachment: 'true',
        public_id: publicId,
        timestamp: timestamp.toString(),
        type: 'upload',
        signature: signature
      });

      // Add filename if provided
      if (filename) {
        urlParams.append('target_filename', filename);
      }

      const finalUrl = `${baseUrl}?${urlParams.toString()}`;
      console.log('🔗 Final download URL:', finalUrl);
      
      return finalUrl;
    } catch (error) {
      console.error('❌ Failed to generate download URL:', error);
      // Fallback to regular URL
      return this.generateSecurePDFUrl(publicId);
    }
  }

  /**
   * Check if required credentials are available
   */
  static hasCredentials() {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }
}

module.exports = CloudinaryService;
