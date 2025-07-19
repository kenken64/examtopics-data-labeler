import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
const CloudinaryService = require('@/lib/cloudinary-service');

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

    // Check if Cloudinary credentials are available
    if (CloudinaryService.hasCredentials()) {
      try {
        console.log('🔧 Using Cloudinary for file upload...');
        
        const cloudinaryService = new CloudinaryService();
        
        // Get file data as buffer
        const fileBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(fileBuffer);

        console.log(`Preparing to upload file: ${file.name}, size: ${buffer.length} bytes`);
        
        // Upload to Cloudinary
        const uploadResult = await cloudinaryService.uploadPDF(
          buffer, 
          file.name, 
          request.user?.userId || 'anonymous'
        );
        
        console.log(`File uploaded successfully to Cloudinary: ${file.name}`);
        console.log(`File URL: ${uploadResult.url}`);
        
        return NextResponse.json({
          success: true,
          fileId: uploadResult.id,
          fileUrl: uploadResult.url,
          fileName: file.name,
          fileSize: file.size,
        });

      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        return NextResponse.json(
          { error: 'Failed to upload file to Cloudinary' },
          { status: 500 }
        );
      }
    } else {
      // Mock response for development when Cloudinary credentials are not available
      console.log('Cloudinary credentials not found, using mock response');
      console.log('To enable real uploads, set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
      
      const mockFileId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockFileUrl = `https://example.com/uploads/${mockFileId}.pdf`;

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
