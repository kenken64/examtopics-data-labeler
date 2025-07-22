# Cloudinary File Upload Setup

## Overview
The application now uses **Cloudinary** for file uploads instead of Google Drive. Cloudinary is a cloud-based service that provides image and video management solutions with automatic optimization, transformation, and delivery.

## Why Cloudinary?
- ✅ **No Service Account Limitations**: Unlike Google Drive, no storage quota issues
- ✅ **Free Tier Available**: Generous free tier with 25GB storage and 25GB bandwidth
- ✅ **Automatic Optimization**: Smart image compression and format conversion
- ✅ **Built-in Transformations**: Resize, crop, and enhance images on-the-fly
- ✅ **Fast CDN Delivery**: Global content delivery network for fast loading
- ✅ **Easy Integration**: Simple API with excellent Node.js support

## Setup Instructions

### 1. Create Cloudinary Account

1. Go to [Cloudinary](https://cloudinary.com/)
2. Click "Sign Up Free"
3. Fill in your details and create an account
4. Verify your email address

### 2. Get Your API Credentials

1. After logging in, go to your **Dashboard**
2. You'll see your account details in the "Account Details" section:
   - **Cloud Name** (e.g., `your-cloud-name`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 3. Configure Environment Variables

Add these credentials to your `.env` or `.env.local` file:

```env
# Cloudinary Configuration (Free alternative to Google Drive)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key  
CLOUDINARY_API_SECRET=your_api_secret
```

**Important**: 
- Replace the placeholder values with your actual Cloudinary credentials
- Keep your API Secret secure and never commit it to version control
- The `.env.local` file is already in `.gitignore`

### 4. Folder Structure

Cloudinary will automatically organize your uploads:

```
📁 Your Cloudinary Media Library/
├── 📁 certificates/           ← PDF files upload here
│   ├── 📄 cert_user123_1642345678901.pdf
│   ├── 📄 cert_user456_1642345678902.pdf
│   └── 📄 ...
└── 📁 profile-photos/        ← Profile photos upload here
    ├── 🖼️ profile_user123.jpg
    ├── 🖼️ profile_user456.png
    └── 🖼️ ...
```

### 5. Testing

1. **Start the development server**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Test Certificate Upload**:
   - Go to the Certificates page
   - Try adding a new certificate with a PDF file
   - The file should upload to Cloudinary

3. **Test Profile Photo Upload**:
   - Go to your Profile page
   - Try uploading a profile photo
   - The image should upload and be optimized automatically

### 6. Verification Script

Run the verification script to test your Cloudinary setup:

```bash
cd frontend
npm run verify-cloudinary
```

This will test your credentials and perform a sample upload.

## Features

### PDF Upload Features
- **File Validation**: Only PDF files allowed, max 10MB
- **Organized Storage**: Files stored in `certificates/` folder
- **Unique Naming**: Files get unique identifiers to prevent conflicts
- **User Tagging**: Files are tagged with user information for easy management

### Profile Photo Features
- **Image Optimization**: Automatic compression and format conversion
- **Smart Cropping**: Face-detection cropping for profile photos
- **Size Variants**: Multiple sizes generated automatically
- **Overwrite Protection**: New photos replace old ones for the same user

## Free Tier Limits

Cloudinary's free tier includes:
- **Storage**: 25GB
- **Bandwidth**: 25GB/month
- **Transformations**: 25,000/month
- **Admin API calls**: 500,000/month

This is more than enough for most applications. If you need more, paid plans start at $89/month.

## Troubleshooting

### Common Issues

1. **"Missing required Cloudinary credentials"**: 
   - Check that all three environment variables are set correctly
   - Make sure there are no extra spaces or quotes

2. **Upload fails with 401 error**:
   - Verify your API Key and API Secret are correct
   - Check that your Cloudinary account is active

3. **Images not loading**:
   - Check the generated URLs in the browser console
   - Verify your Cloud Name is correct

### Debug Mode

To see detailed error messages, check the server console when uploading files. The API routes log detailed error information.

## Migration from Google Drive

If you were previously using Google Drive:

1. **Existing Data**: Old Google Drive URLs in your database will continue to work
2. **New Uploads**: All new uploads will use Cloudinary
3. **Environment Variables**: You can keep the Google Drive variables or remove them
4. **Cleanup**: The Google Drive service files have been removed from the codebase

## Security Notes

- Keep your Cloudinary API Secret secure
- Never commit credentials to version control
- Consider using Cloudinary's signed uploads for additional security
- Review your upload settings and transformations regularly
- Monitor your usage to avoid unexpected charges

## Support

- **Cloudinary Documentation**: https://cloudinary.com/documentation
- **Node.js SDK**: https://cloudinary.com/documentation/node_integration
- **Community Support**: https://community.cloudinary.com/
