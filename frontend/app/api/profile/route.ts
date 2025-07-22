import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { User } from '@/lib/db';
import { connectToDatabase } from '@/lib/mongodb';
import { z } from 'zod';

// Profile update validation schema
const profileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  contactNumber: z.string().min(10, 'Contact number must be at least 10 digits').max(15, 'Contact number must be less than 15 digits'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  location: z.string().min(1, 'Location is required').max(100, 'Location must be less than 100 characters'),
});

/**
 * GET /api/profile - Get User Profile
 * 
 * Retrieves the authenticated user's profile information including personal details.
 * Returns all profile fields except sensitive data like passkeys.
 * 
 * @param request - Authenticated HTTP request
 * @returns JSON response with user profile data
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  console.log('🔄 GET /api/profile: Starting profile fetch...');
  try {
    console.log('📡 GET /api/profile: User info from auth:', {
      userId: request.user?.userId,
      username: request.user?.username,
      role: request.user?.role
    });

    // Establish database connection
    console.log('🔗 GET /api/profile: Connecting to database...');
    await connectToDatabase();
    console.log('✅ GET /api/profile: Database connected successfully');
    
    // Find user by ID and exclude sensitive fields
    console.log('🔍 GET /api/profile: Searching for user with ID:', request.user?.userId);
    const user = await User.findById(request.user?.userId).select('-passkeys');
    
    console.log('📊 GET /api/profile: User query result:', {
      found: !!user,
      userId: user?._id?.toString(),
      username: user?.username,
      hasFirstName: !!user?.firstName,
      hasLastName: !!user?.lastName,
      hasContactNumber: !!user?.contactNumber,
      hasDateOfBirth: !!user?.dateOfBirth,
      hasLocation: !!user?.location,
      role: user?.role
    });
    
    if (user) {
      console.log('📋 GET /api/profile: Raw user data from database:', {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        contactNumber: user.contactNumber,
        dateOfBirth: user.dateOfBirth,
        location: user.location,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    }
    
    if (!user) {
      console.error('❌ GET /api/profile: User not found in database');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Prepare response data
    const responseData = {
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      contactNumber: user.contactNumber || '',
      dateOfBirth: user.dateOfBirth || '',
      location: user.location || '',
      role: user.role,
      profilePhotoUrl: user.profilePhotoUrl || null,
    };
    
    console.log('📤 GET /api/profile: Sending response data:', responseData);
    
    // Return user profile data
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('❌ GET /api/profile: Exception occurred:', error);
    console.error('❌ GET /api/profile: Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/profile - Update User Profile
 * 
 * Updates the authenticated user's profile information.
 * Validates input data and updates only the allowed fields.
 * Email (username) cannot be changed.
 * 
 * @param request - Authenticated HTTP request with profile data
 * @returns JSON response with updated profile or error message
 */
export const PUT = withAuth(async (request: AuthenticatedRequest) => {
  console.log('🔄 PUT /api/profile: Starting profile update...');
  try {
    console.log('📡 PUT /api/profile: User info from auth:', {
      userId: request.user?.userId,
      username: request.user?.username,
      role: request.user?.role
    });

    // Establish database connection
    console.log('🔗 PUT /api/profile: Connecting to database...');
    await connectToDatabase();
    console.log('✅ PUT /api/profile: Database connected successfully');
    
    // Parse request body
    console.log('📥 PUT /api/profile: Parsing request body...');
    const body = await request.json();
    console.log('📊 PUT /api/profile: Raw request body:', body);
    
    // Validate input data with Zod
    console.log('🔍 PUT /api/profile: Validating input data with schema...');
    const validation = profileUpdateSchema.safeParse(body);
    if (!validation.success) {
      console.error('❌ PUT /api/profile: Validation failed:', validation.error.errors);
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.errors.map(err => ({
            field: err.path[0],
            message: err.message
          }))
        },
        { status: 400 }
      );
    }
    
    console.log('✅ PUT /api/profile: Input validation passed');
    const { firstName, lastName, contactNumber, dateOfBirth, location } = validation.data;
    
    console.log('📋 PUT /api/profile: Processed data for update:', {
      firstName,
      lastName,
      contactNumber,
      dateOfBirth,
      location
    });
    
    // Find and update user
    console.log('💾 PUT /api/profile: Updating user in database...');
    console.log('🔍 PUT /api/profile: Searching for user with ID:', request.user?.userId);
    
    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      contactNumber: contactNumber.trim(),
      dateOfBirth: new Date(dateOfBirth),
      location: location.trim(),
    };
    
    console.log('📤 PUT /api/profile: Update data being sent to database:', updateData);
    
    const user = await User.findByIdAndUpdate(
      request.user?.userId,
      updateData,
      { new: true, select: '-passkeys' } // Return updated document, exclude passkeys
    );
    
    console.log('📊 PUT /api/profile: Database update result:', {
      found: !!user,
      userId: user?._id?.toString(),
      updatedFields: user ? {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        contactNumber: user.contactNumber,
        dateOfBirth: user.dateOfBirth,
        location: user.location,
        role: user.role
      } : null
    });
    
    if (!user) {
      console.error('❌ PUT /api/profile: User not found in database');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Prepare response data
    const responseData = {
      message: 'Profile updated successfully',
      profile: {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        contactNumber: user.contactNumber,
        dateOfBirth: user.dateOfBirth,
        location: user.location,
        role: user.role,
      }
    };
    
    console.log('📤 PUT /api/profile: Sending success response:', responseData);
    
    // Return updated profile
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('❌ PUT /api/profile: Exception occurred:', error);
    console.error('❌ PUT /api/profile: Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
});