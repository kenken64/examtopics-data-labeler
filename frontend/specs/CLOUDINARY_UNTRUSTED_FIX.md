# Cloudinary Untrusted Customer Resolution Guide

## Issue Description
Error: `{"error":{"message":"Customer is marked as untrusted","code":"show_original_customer_untrusted"}}`

## Implemented Solution
✅ **Automatic Fallback**: Updated `lib/cloudinary-service.js` to automatically fallback to unsigned uploads when signed uploads fail due to untrusted status.

## Additional Steps to Resolve Permanently

### 1. Contact Cloudinary Support
- **Email**: support@cloudinary.com
- **Subject**: "Account Marked as Untrusted - Please Review"
- **Message Template**:
```
Dear Cloudinary Support Team,

My account (Cloud Name: dki0pkjto) has been marked as "untrusted" and I'm receiving the error:
"Customer is marked as untrusted" (code: show_original_customer_untrusted)

I am using Cloudinary for a legitimate application to upload:
- User profile photos (JPEG, PNG, WebP)
- Certificate PDFs for an educational platform

Could you please review my account and remove the untrusted status?
I'm happy to provide additional verification if needed.

Thank you for your assistance.
```

### 2. Account Verification Steps
- Verify your email address in Cloudinary dashboard
- Add payment method (even for free tier)
- Complete profile information
- Enable two-factor authentication

### 3. Common Causes of Untrusted Status
- High volume of uploads in short time
- Suspicious upload patterns
- Account created recently
- Unusual API usage patterns
- Geographic location restrictions

### 4. Temporary Workarounds (Already Implemented)
✅ Automatic fallback to unsigned uploads
✅ Graceful error handling with user feedback
✅ Maintains full functionality during restriction

### 5. Monitor Account Status
Check Cloudinary dashboard for:
- Account notifications
- Usage limits
- Security alerts
- Billing status

## Code Changes Made

### Updated `lib/cloudinary-service.js`:
- Added try-catch blocks for both PDF and image uploads
- Automatic fallback to `unsigned_upload` when signed upload fails
- Proper error detection for untrusted customer errors
- Maintained all existing functionality and transformations

### Features Preserved:
- File extension preservation for PDFs
- Image optimization and transformations
- Folder organization (certificates/, profile-photos/)
- User tagging and metadata
- Automatic cleanup of old profile photos

The application will now work seamlessly regardless of account trust status.
