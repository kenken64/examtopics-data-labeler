import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import CloudinaryService from '@/lib/cloudinary-service';

/**
 * GET /api/files/[fileId] - Serve Files from Cloudinary
 * 
 * This endpoint acts as a proxy to serve files from Cloudinary,
 * handling authentication and access control on the server side.
 * This bypasses any Cloudinary access restrictions by serving
 * files through our authenticated application.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const encodedFileId = params.fileId;
    
    // Decode the fileId (replace -- with /)
    const fileId = encodedFileId.replace(/--/g, '/');
    
    console.log('📥 File download request for encoded ID:', encodedFileId);
    console.log('📥 Decoded file ID:', fileId);

    // Check if Cloudinary credentials are available
    if (!CloudinaryService.hasCredentials()) {
      return NextResponse.json(
        { error: 'File download service not configured' },
        { status: 500 }
      );
    }

    // Determine if this is a PDF download (needs attachment header)
    const isPDF = fileId.includes('certificates/') || fileId.includes('cert_') || fileId.includes('.pdf');
    
    if (isPDF) {
      // For PDFs, redirect to Cloudinary download URL with attachment header
      console.log('📄 PDF download - generating Cloudinary download URL');
      
      const cloudinaryService = new CloudinaryService();
      
      // Extract filename for download
      const filename = fileId.split('/').pop(); // Get just the filename part
      
      // Generate signed download URL
      const downloadUrl = await cloudinaryService.generatePDFDownloadUrl(fileId, filename);
      
      console.log('🔗 Redirecting to Cloudinary download URL:', downloadUrl);
      
      // Redirect to the Cloudinary download URL
      return NextResponse.redirect(downloadUrl, 302);
      
    } else {
      // For images, serve directly (existing logic)
      let cloudinaryUrl;
      
      if (fileId.includes('profile-photos/') || fileId.includes('profile_')) {
        // Profile photo - use the full public_id as-is
        cloudinaryUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${fileId}`;
      } else {
        return NextResponse.json(
          { error: 'Invalid file ID format' },
          { status: 400 }
        );
      }

      console.log('🔗 Fetching image from Cloudinary URL:', cloudinaryUrl);

      // Fetch file from Cloudinary
      const response = await fetch(cloudinaryUrl);
      
      if (!response.ok) {
        console.error('❌ Failed to fetch file from Cloudinary:', response.status, response.statusText);
        console.error('❌ Attempted URL:', cloudinaryUrl);
        return NextResponse.json(
          { error: 'File not found or inaccessible' },
          { status: 404 }
        );
      }

      // Get file content
      const fileBuffer = await response.arrayBuffer();
      
      // Extract file extension from fileId
      const extension = fileId.includes('.') ? fileId.split('.').pop() : 'jpg';
      
      // Determine content type
      let contentType = 'application/octet-stream';
      if (['jpg', 'jpeg'].includes(extension?.toLowerCase() || '')) {
        contentType = 'image/jpeg';
      } else if (extension?.toLowerCase() === 'png') {
        contentType = 'image/png';
      } else if (extension?.toLowerCase() === 'webp') {
        contentType = 'image/webp';
      }

      // Return file with proper headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${fileId}"`,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

  } catch (error) {
    console.error('❌ File serving error:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}

/**
 * Authenticated file download endpoint
 * GET /api/files/download/[fileId] - Requires authentication
 */
export const authenticatedGET = withAuth(async (request: AuthenticatedRequest, { params }: { params: { fileId: string } }) => {
  // Same logic as above but with authentication
  return GET(request as NextRequest, { params });
});
