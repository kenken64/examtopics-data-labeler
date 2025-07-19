/**
 * Cloudinary Service for File Management
 * 
 * This service handles uploading files (PDFs and images) to Cloudinary
 * as an alternative to Google Drive that doesn't have service account limitations.
 */

const { v2: cloudinary } = require('cloudinary');

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
      const result = await cloudinary.uploader.upload(base64Data, {
        resource_type: 'raw', // For non-image files like PDFs
        folder: 'certificates', // Organize in a folder
        public_id: `cert_${userId}_${Date.now()}.${fileExtension}`, // Include file extension
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        tags: ['certificate', 'pdf', `user_${userId}`]
      });

      const fileData = {
        id: result.public_id,
        filename: filename,
        url: result.secure_url,
        size: result.bytes,
        format: result.format
      };

      console.log('✅ PDF uploaded successfully to Cloudinary:', fileData);
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
      const result = await cloudinary.uploader.upload(base64Data, {
        resource_type: 'image',
        folder: 'profile-photos', // Organize in a folder
        public_id: `profile_${userId}`, // Fixed ID so we can easily replace it
        use_filename: false,
        unique_filename: false, // Don't make unique since we want to replace
        overwrite: true, // Replace existing file with same public_id
        tags: ['profile-photo', `user_${userId}`],
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Smart crop focusing on face
          { quality: 'auto', fetch_format: 'auto' } // Optimize quality and format
        ]
      });

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
