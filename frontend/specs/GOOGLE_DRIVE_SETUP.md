# Google Drive Integration Setup

## Overview
The certificate management system includes Google Drive integration for uploading PDF certificates. Currently, it's running in **mock mode** for development. Follow this guide to enable real Google Drive uploads.

## Authentication Method
**Important**: This integration uses **Service Account credentials** (NOT API keys). Service accounts are more secure for server-to-server communication and don't require user consent flows.

## Current Status
- ✅ Logo URL field implemented in add/edit forms
- ✅ Fallback logo (gradient with star) when no logo URL provided
- ✅ PDF upload UI implemented with validation
- ✅ File upload progress indicators
- ✅ Google Drive API endpoint created (`/api/upload/google-drive`)
- ✅ `googleapis` package installed
- 🔧 **Mock mode active** - needs real Google Drive Service Account credentials

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create Service Account

**Why Service Account instead of API Key?**
- API Keys are for public, read-only access to public data
- Service Accounts are for secure server-to-server communication
- Service Accounts can access private data and perform write operations
- No user consent required for uploads

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account" (NOT "API Key")
3. Fill in the service account details:
   - Name: `examtopics-drive-service`
   - Description: `Service account for PDF uploads`
4. Click "Create and Continue"
5. Skip role assignment for now (click "Continue")
6. Click "Done"

### 3. Generate Service Account Key

1. Click on the created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" and click "Create"
5. Save the downloaded JSON file securely

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the values from your service account JSON:
   ```env
   GOOGLE_PROJECT_ID=your-project-id
   GOOGLE_PRIVATE_KEY_ID=your-private-key-id
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-private-key-here\n-----END PRIVATE KEY-----\n"
   GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com
   ```

### 5. Create Google Drive Folder Structure

1. Go to [Google Drive](https://drive.google.com/)
2. Create the folder structure:
   ```
   📁 examcertbot/
   └── 📁 documents/
   ```
3. Navigate to the "documents" folder inside "examcertbot"
4. Right-click the "documents" folder > "Share"
5. Add your service account email with "Editor" permissions
6. Copy the folder ID from the URL when viewing the "documents" folder:
   - URL format: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
   - The FOLDER_ID_HERE part is what you need
7. Add to `.env.local`:
   ```env
   GOOGLE_DRIVE_FOLDER_ID=your-documents-folder-id
   ```

**Important**: Make sure to share the "documents" folder (not the parent "examcertbot" folder) with your service account.

### 6. Enable Real Google Drive Upload

The Google Drive upload code is already written but commented out in `/api/upload/google-drive/route.ts`. To enable it:

1. Ensure all environment variables are set in `.env.local`
2. The system will automatically detect the environment variables and switch from mock mode to real uploads

### 7. Testing

1. **Verify Setup** (Recommended):
   ```bash
   cd frontend
   npm run verify-google-drive
   ```
   This will test your credentials and folder access.

2. **Test Upload via UI**:
   ```bash
   cd frontend
   npm run dev
   ```
   - Go to the Certificates page
   - Try adding a new certificate with a PDF file
   - The file should upload to your `examcertbot/documents` folder

### 8. Folder Structure

Your Google Drive will have this structure:
```
📁 examcertbot/
└── 📁 documents/        ← Files upload here
    ├── 📄 certificate1.pdf
    ├── 📄 certificate2.pdf
    └── 📄 ...
```

## File Permissions

By default, uploaded files are made publicly readable so they can be viewed directly from Drive URLs. This is configured in the API route and can be modified if needed.

## Troubleshooting

### Common Issues

1. **"Failed to upload file"**: Check that all environment variables are properly set
2. **Authentication errors**: Verify the service account JSON values are correctly copied
3. **Permission denied**: Ensure the service account has access to the Drive folder
4. **File not found**: Check that the Google Drive folder ID is correct
5. **"API Key" confusion**: This integration uses Service Account credentials, not API keys

### Authentication Method Clarification

**❌ API Key (NOT used)**
- For public, read-only access
- Suitable for client-side applications
- Cannot upload files or access private data

**✅ Service Account (Used in this project)**
- For secure server-to-server communication
- Can upload files and access private data
- Credentials include private key, client email, project ID
- More secure for backend applications

### Debug Mode

To see detailed error messages, check the server console when uploading files. The API route logs detailed error information.

## Security Notes

- Keep your service account JSON file secure and never commit it to version control
- The `.env.local` file is already in `.gitignore`
- Consider rotating service account keys periodically
- Review file permissions and sharing settings regularly
