import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { User } from '@/lib/db';
import { connectToDatabase } from '@/lib/mongodb';
import CloudinaryService from '@/lib/cloudinary-service';

/**
 * POST /api/profile/photo - Upload Profile Photo
 * 
 * Handles profile photo upload to Cloudinary and updates user profile.
 * Validates file type, size, and stores the photo with a unique filename.
 * 
 * @param request - Authenticated HTTP request with multipart/form-data
 * @returns JSON response with photo URL or error message
 */
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  console.log('📸 POST /api/profile/photo: Starting photo upload...');
  
  try {
    console.log('👤 POST /api/profile/photo: User info:', {
      userId: request.user?.userId,
      username: request.user?.username
    });

    // Parse multipart form data
    console.log('📋 POST /api/profile/photo: Parsing form data...');
    const formData = await request.formData();
    const photoFile = formData.get('photo') as File;

    if (!photoFile) {
      console.error('❌ POST /api/profile/photo: No photo file provided');
      return NextResponse.json(
        { error: 'No photo file provided' },
        { status: 400 }
      );
    }

    console.log('📊 POST /api/profile/photo: Photo file info:', {
      name: photoFile.name,
      size: photoFile.size,
      type: photoFile.type
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(photoFile.type)) {
      console.error('❌ POST /api/profile/photo: Invalid file type:', photoFile.type);
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (photoFile.size > maxSize) {
      console.error('❌ POST /api/profile/photo: File too large:', photoFile.size);
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    console.log('🔄 POST /api/profile/photo: Converting file to buffer...');
    const fileBuffer = Buffer.from(await photoFile.arrayBuffer());

    // Upload to Cloudinary
    console.log('☁️ POST /api/profile/photo: Uploading to Cloudinary...');
    
    if (CloudinaryService.hasCredentials()) {
      const cloudinaryService = new CloudinaryService();
      const uploadResult = await cloudinaryService.uploadProfilePhoto(
        fileBuffer,
        photoFile.name,
        request.user?.userId,
        photoFile.type
      );

      console.log('✅ POST /api/profile/photo: Upload successful:', uploadResult);

      // Update user profile in database
      console.log('💾 POST /api/profile/photo: Updating user profile...');
      await connectToDatabase();

      const updatedUser = await User.findByIdAndUpdate(
        request.user?.userId,
        {
          profilePhotoId: uploadResult.id,
          profilePhotoUrl: uploadResult.url
        },
        { new: true, select: '-passkeys' }
      );

      if (!updatedUser) {
        console.error('❌ POST /api/profile/photo: User not found');
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      console.log('✅ POST /api/profile/photo: Profile updated successfully');

      return NextResponse.json({
        success: true,
        message: 'Profile photo uploaded successfully',
        photo: {
          id: uploadResult.id,
          url: uploadResult.url,
          filename: uploadResult.filename
        }
      });
      
    } else {
      console.error('❌ POST /api/profile/photo: Cloudinary credentials not configured');
      return NextResponse.json(
        { error: 'File upload service not configured. Please set Cloudinary credentials.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ POST /api/profile/photo: Exception occurred:', error);
    console.error('❌ POST /api/profile/photo: Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Failed to upload profile photo' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/profile/photo - Delete Profile Photo
 * 
 * Removes the user's profile photo from Google Drive and updates the database.
 * 
 * @param request - Authenticated HTTP request
 * @returns JSON response confirming deletion or error message
 */
export const DELETE = withAuth(async (request: AuthenticatedRequest) => {
  console.log('🗑️ DELETE /api/profile/photo: Starting photo deletion...');
  
  try {
    console.log('👤 DELETE /api/profile/photo: User info:', {
      userId: request.user?.userId,
      username: request.user?.username
    });

    await connectToDatabase();

    // Get user's current profile photo info
    const user = await User.findById(request.user?.userId);
    if (!user) {
      console.error('❌ DELETE /api/profile/photo: User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete from Cloudinary if photo exists
    if (CloudinaryService.hasCredentials()) {
      console.log('☁️ DELETE /api/profile/photo: Deleting from Cloudinary...');
      try {
        const cloudinaryService = new CloudinaryService();
        await cloudinaryService.deleteExistingProfilePhoto(request.user?.userId);
        console.log('✅ DELETE /api/profile/photo: Photo deleted from Cloudinary');
      } catch (error) {
        console.error('⚠️ DELETE /api/profile/photo: Failed to delete from Cloudinary:', error);
        // Continue with database update even if Cloudinary deletion fails
      }
    }

    // Update user profile in database
    console.log('💾 DELETE /api/profile/photo: Updating user profile...');

    const updatedUser = await User.findByIdAndUpdate(
      request.user?.userId,
      {
        profilePhotoId: null,
        profilePhotoUrl: null
      },
      { new: true, select: '-passkeys' }
    );

    if (!updatedUser) {
      console.error('❌ DELETE /api/profile/photo: User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('✅ DELETE /api/profile/photo: Photo deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Profile photo deleted successfully'
    });

  } catch (error) {
    console.error('❌ DELETE /api/profile/photo: Exception occurred:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete profile photo' },
      { status: 500 }
    );
  }
});
