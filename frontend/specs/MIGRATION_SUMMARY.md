# File Upload Migration: Google Drive → Cloudinary

## Summary
Successfully migrated the file upload system from Google Drive to Cloudinary to resolve service account storage quota limitations.

## Issues Resolved
- ✅ **Service Account Storage Quota**: Google Drive service accounts don't have personal storage space
- ✅ **Authentication Complexity**: Simplified authentication with Cloudinary API keys
- ✅ **File Access Permissions**: No need for complex folder sharing setup
- ✅ **Reliability**: More stable upload service with better error handling

## Changes Made

### 🗑️ Removed Files
- `lib/google-drive.js` - Google Drive service implementation
- `specs/GOOGLE_DRIVE_SETUP.md` - Google Drive setup documentation  
- `scripts/verify-google-drive.js` - Google Drive verification script
- `scripts/test-google-drive-upload.js` - Google Drive test script
- `scripts/test-shared-drive-upload.js` - Shared drive test script

### ➕ Added Files
- `lib/cloudinary-service.js` - Cloudinary service implementation
- `specs/CLOUDINARY_SETUP.md` - Complete Cloudinary setup guide
- `scripts/verify-cloudinary.js` - Cloudinary verification script

### 🔄 Modified Files
- `app/api/upload/google-drive/route.ts` → `app/api/upload/files/route.ts` - Updated to use Cloudinary
- `app/api/profile/photo/route.ts` - Updated to use Cloudinary service
- `app/certificates/page.tsx` - Updated API endpoint reference
- `package.json` - Replaced Google Drive script with Cloudinary verification
- `.env.example` - Updated environment variables

### 📦 Dependencies
- ❌ Removed: `googleapis` (16 packages removed)
- ✅ Added: `cloudinary` (3 packages added)

## Features Comparison

### Google Drive (Previous)
- ❌ Service account storage limitations
- ❌ Complex folder sharing setup required
- ❌ Limited free storage (15GB personal drive)
- ✅ Familiar interface for end users

### Cloudinary (Current)
- ✅ No storage quota limitations for service accounts
- ✅ Simple API key authentication
- ✅ Generous free tier (25GB storage + 25GB bandwidth/month)
- ✅ Automatic image optimization and transformation
- ✅ CDN delivery for faster loading
- ✅ Built-in image processing (resize, crop, optimize)
- ✅ Support for both images and raw files (PDFs)

## Setup Required

### For Existing Installations
1. **Get Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com)
2. **Update Environment Variables**:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key  
   CLOUDINARY_API_SECRET=your_api_secret
   ```
3. **Remove Old Variables**: Google Drive environment variables are no longer needed
4. **Test Setup**: Run `npm run verify-cloudinary`

### For New Installations
Follow the setup guide in `specs/CLOUDINARY_SETUP.md`

## File Organization

### Cloudinary Structure
```
📁 Your Cloudinary Media Library/
├── 📁 certificates/           ← PDF files upload here
│   ├── 📄 cert_user123_1642345678901.pdf
│   └── 📄 ...
└── 📁 profile-photos/        ← Profile photos upload here
    ├── 🖼️ profile_user123.jpg (optimized automatically)
    └── 🖼️ ...
```

### Features
- **PDF Uploads**: Stored in `certificates/` folder with user tagging
- **Profile Photos**: Stored in `profile-photos/` with automatic optimization
- **Unique Naming**: Prevents filename conflicts
- **Automatic Cleanup**: Old profile photos are replaced automatically

## Backward Compatibility
- **Existing Data**: Old Google Drive URLs in database will continue to work
- **New Uploads**: All new uploads use Cloudinary
- **Graceful Fallback**: Mock responses when Cloudinary credentials not configured

## Testing
Both upload types have been tested:
- ✅ Certificate PDF uploads (max 10MB)
- ✅ Profile photo uploads (max 5MB) with automatic optimization
- ✅ Error handling and validation
- ✅ Database integration

## Next Steps
1. Configure Cloudinary credentials in production environment
2. Test file uploads in production
3. Monitor Cloudinary usage and optimize if needed
4. Consider implementing signed uploads for additional security

## Support
- **Cloudinary Documentation**: https://cloudinary.com/documentation
- **Setup Guide**: See `specs/CLOUDINARY_SETUP.md`
- **Verification Script**: Run `npm run verify-cloudinary`
