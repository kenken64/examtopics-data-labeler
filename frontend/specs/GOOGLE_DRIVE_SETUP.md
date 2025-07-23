# Google Drive Integration Setup

This document explains how to set up Google Drive integration for profile photo storage in the ExamTopics Data Labeler application.

## Overview

The application uses Google Drive API to store user profile photos. When a user uploads a profile photo, it's stored in a designated Google Drive folder with a unique filename to prevent conflicts.

## Prerequisites

1. Google Cloud Platform account
2. A Google Drive account (same as GCP account or a service account)
3. Node.js project with googleapis library (already included)

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID for later use

### 2. Enable Google Drive API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

### 3. Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - **Name**: `profile-photo-storage`
   - **Description**: `Service account for storing user profile photos`
4. Click "Create and Continue"
5. Skip role assignment for now (click "Continue")
6. Click "Done"

### 4. Generate Service Account Key

1. In the "Credentials" page, find your service account
2. Click on the service account name
3. Go to the "Keys" tab
4. Click "Add Key" > "Create new key"
5. Select "JSON" format
6. Click "Create"
7. The JSON key file will download automatically
8. **Important**: Store this file securely and never commit it to version control

### 5. Create Google Drive Folder

1. Open Google Drive in your web browser
2. Create a new folder for storing profile photos (e.g., "examtopics-profile-photos")
3. Right-click the folder and select "Share"
4. Add your service account email (found in the JSON key file) with "Editor" permissions
5. Copy the folder ID from the URL (the long string after `/folders/`)

### 6. Configure Environment Variables

1. Copy `.env.example` to `.env` if you haven't already
2. Set the following variables in your `.env` file:

```bash
# Path to your service account JSON key file
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY=/path/to/your-service-account-key.json

# Google Drive folder ID where photos will be stored
GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here
```

### 7. Service Account Permissions

The service account needs the following permissions:
- **Google Drive API scope**: `https://www.googleapis.com/auth/drive.file`
- **Folder access**: Editor permissions on the designated folder

## Security Considerations

1. **Service Account Key**: Never commit the JSON key file to version control
2. **Folder Permissions**: Only grant necessary permissions to the service account
3. **File Access**: Generated files have unique names to prevent access conflicts
4. **Environment Variables**: Keep your `.env` file secure and never commit it

## File Naming Convention

The application uses the following naming pattern for uploaded photos:
```
profile-photo-[userId]-[timestamp].[extension]
```

Example: `profile-photo-64f8a123b456c789-1703845234567.jpg`

## Supported File Types

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`) 
- GIF (`.gif`)
- WebP (`.webp`)

Maximum file size: 5MB

## API Endpoints

The Google Drive integration provides the following API endpoints:

- `POST /api/profile/photo` - Upload profile photo
- `DELETE /api/profile/photo` - Delete current profile photo

## Troubleshooting

### Common Issues

1. **"Service account key file not found"**
   - Check the path in `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY`
   - Ensure the file exists and is readable

2. **"Insufficient permissions"**
   - Verify the service account has Editor access to the folder
   - Check that the Google Drive API is enabled

3. **"Folder not found"**
   - Verify the `GOOGLE_DRIVE_FOLDER_ID` is correct
   - Ensure the service account has access to the folder

### Testing the Integration

You can test the Google Drive service by:

1. Starting the application
2. Going to the Profile page
3. Attempting to upload a photo
4. Checking the browser console and server logs for any errors

### Logs

The application provides detailed logging for Google Drive operations:
- Photo uploads: Look for `📸` emojis in logs
- Google Drive API calls: Look for `☁️` emojis in logs
- Error handling: Look for `❌` emojis in logs

## Development Notes

The Google Drive service is implemented in `frontend/lib/google-drive.js` and provides:

- JWT authentication with Google APIs
- Automatic folder management
- Unique file naming per user
- File upload and deletion operations
- Direct URL generation for photo access

## Production Deployment

For production deployment:

1. Store the service account key securely (not in the codebase)
2. Use environment variables for configuration
3. Consider using Google Cloud Secret Manager for key storage
4. Set appropriate CORS policies if needed
5. Monitor API usage and quotas

## Cost Considerations

Google Drive API usage is generally free for typical application usage, but monitor:
- API request quotas
- Storage usage in Google Drive
- Bandwidth usage for photo serving

## Support

If you encounter issues with Google Drive integration, check:
1. Google Cloud Console for API errors
2. Service account permissions
3. Folder access permissions
4. Application logs for detailed error messages
