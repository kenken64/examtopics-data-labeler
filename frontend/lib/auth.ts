// Next.js server-side imports for handling HTTP requests and responses
import { NextRequest, NextResponse } from 'next/server';
// JSON Web Token library for secure authentication token handling
import jwt from 'jsonwebtoken';
// MongoDB connection for fetching user details
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

// JWT secret key for signing and verifying tokens
// Falls back to default if environment variable is not set (development only)
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

/**
 * Extended NextRequest interface that includes authenticated user information
 * This interface is used throughout the application to access user data in protected routes
 * 
 * @interface AuthenticatedRequest
 * @extends NextRequest
 * @property {Object} user - User object containing authentication details
 * @property {string} user.userId - MongoDB ObjectId of the authenticated user
 * @property {string} user.username - Username of the authenticated user
 * @property {string} user.email - Email of the authenticated user
 * @property {'user' | 'admin'} user.role - Role of the authenticated user
 */
export interface AuthenticatedRequest extends NextRequest {
  user: {
    userId: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
  };
}

/**
 * JWT Authentication Middleware - Higher-Order Function
 * 
 * This is the primary authentication mechanism for protecting API routes.
 * It wraps route handlers to automatically verify JWT tokens and provide user context.
 * 
 * Key Features:
 * - Automatic JWT token extraction from HTTP-only cookies
 * - Token verification using the application's secret key
 * - User information injection into request object
 * - Comprehensive error handling for various JWT failure scenarios
 * - Type-safe request object with authenticated user data
 * 
 * Usage Pattern:
 * ```typescript
 * export const GET = withAuth(async (req: AuthenticatedRequest) => {
 *   const userId = req.user.userId; // Always available
 *   // Route logic here
 * });
 * ```
 * 
 * Security Features:
 * - HTTP-only cookies prevent XSS attacks
 * - JWT signature verification prevents token tampering
 * - Automatic token expiration handling
 * - Detailed error messages for debugging (not exposed to client)
 * 
 * @template T - Generic type for additional route parameters (e.g., dynamic routes)
 * @param handler - The actual route handler function to be protected
 * @returns Protected route handler that requires valid authentication
 */
export function withAuth<T extends any[]>(
  handler: (req: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T) => {
    console.log('🔐 withAuth: Starting authentication check...');
    console.log('🔐 withAuth: Request URL:', req.url);
    console.log('🔐 withAuth: Request method:', req.method);
    
    // Extract JWT token from HTTP-only cookie
    // This cookie is set during login and should be automatically sent by the browser
    const token = req.cookies.get('token')?.value;
    
    console.log('🍪 withAuth: Cookie present:', !!token);
    if (token) {
      console.log('🍪 withAuth: Token length:', token.length);
      console.log('🍪 withAuth: Token preview:', token.substring(0, 20) + '...');
    } else {
      console.log('🍪 withAuth: Available cookies:', Object.keys(req.cookies.getAll()));
    }

    // Return 401 Unauthorized if no token is present
    // This forces the user to authenticate before accessing protected resources
    if (!token) {
      console.log('❌ withAuth: No token found, returning 401');
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' }, 
        { status: 401 }
      );
    }

    try {
      console.log('🔍 withAuth: Verifying JWT token...');
      // Verify the JWT token using the application's secret key
      // This ensures the token is valid, not expired, and not tampered with
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;     // MongoDB ObjectId as string
        username: string;   // User's username for display purposes
        iat: number;       // Token issued at timestamp
        exp: number;       // Token expiration timestamp
      };

      console.log('✅ withAuth: JWT token verified successfully');
      console.log('👤 withAuth: Decoded user info:', {
        userId: decoded.userId,
        username: decoded.username,
        tokenIssuedAt: new Date(decoded.iat * 1000).toISOString(),
        tokenExpiresAt: new Date(decoded.exp * 1000).toISOString()
      });

      // Fetch user details including role from database
      console.log('🔍 withAuth: Fetching user details from database...');
      const db = await connectToDatabase();
      const user = await db.collection('users').findOne({ 
        _id: new ObjectId(decoded.userId) 
      });

      if (!user) {
        console.log('❌ withAuth: User not found in database');
        return NextResponse.json(
          { error: 'User not found. Please log in again.' }, 
          { status: 401 }
        );
      }

      console.log('✅ withAuth: User found in database:', {
        userId: user._id.toString(),
        username: user.username,
        email: user.username, // In this system, username is the email
        role: user.role || 'user'
      });

      // Create an enhanced request object with user information
      // This allows route handlers to access authenticated user data directly
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        userId: decoded.userId,
        username: decoded.username,
        email: user.username, // In this system, username is the email
        role: (user.role as 'user' | 'admin') || 'user', // Default to 'user' if role not present
      };

      console.log('🚀 withAuth: Calling protected route handler...');
      // Call the original route handler with the authenticated request
      // At this point, the request is guaranteed to have valid user information
      return handler(authenticatedReq, ...args);
      
    } catch (error) {
      // Handle specific JWT verification errors with appropriate responses
      console.log('❌ withAuth: JWT verification failed');
      console.error('❌ withAuth: Error details:', error);
      
      if (error instanceof jwt.TokenExpiredError) {
        console.log('⏰ withAuth: Token expired');
        // Token has passed its expiration time - user needs to log in again
        return NextResponse.json(
          { error: 'Token expired. Please log in again.' }, 
          { status: 401 }
        );
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.log('🚫 withAuth: Invalid JWT token');
        // Token is malformed, has invalid signature, or other JWT-specific issues
        return NextResponse.json(
          { error: 'Invalid token. Please log in again.' }, 
          { status: 401 }
        );
      } else {
        console.log('💥 withAuth: Unexpected error during verification');
        // Unexpected error during verification - log for debugging but don't expose details
        console.error('JWT verification error:', error);
        return NextResponse.json(
          { error: 'Authentication failed.' }, 
          { status: 401 }
        );
      }
    }
  };
}

/**
 * Optional JWT Authentication Middleware
 * 
 * This middleware variant provides authentication when available but doesn't require it.
 * Useful for routes that can benefit from user context but should work for anonymous users too.
 * 
 * Key Differences from withAuth:
 * - No authentication required - continues execution even without valid token
 * - Gracefully handles invalid tokens without returning errors
 * - Sets user information when valid token is present
 * - Continues with undefined user when no token or invalid token
 * 
 * Use Cases:
 * - Public pages that can show personalized content for logged-in users
 * - API endpoints that provide different data based on authentication status
 * - Routes that need to check authentication status without enforcing it
 * 
 * @param handler - Route handler that may or may not have authenticated user
 * @returns Route handler that works with optional authentication
 */
export function withOptionalAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    // Extract token from cookies (same as withAuth)
    const token = req.cookies.get('token')?.value;
    const authenticatedReq = req as AuthenticatedRequest;

    // Only attempt verification if a token is present
    if (token) {
      try {
        // Verify token and extract user information
        const decoded = jwt.verify(token, JWT_SECRET) as {
          userId: string;
          username: string;
          iat: number;
          exp: number;
        };

        // Fetch user details including role from database
        const db = await connectToDatabase();
        const user = await db.collection('users').findOne({ 
          _id: new ObjectId(decoded.userId) 
        });

        if (user) {
          // Set user information on successful verification
          authenticatedReq.user = {
            userId: decoded.userId,
            username: decoded.username,
            email: user.username, // In this system, username is the email
            role: (user.role as 'user' | 'admin') || 'user',
          };
        }
      } catch (error) {
        // Token is invalid, but we don't require auth, so continue without user
        // Log warning for monitoring purposes but don't fail the request
        console.warn('Invalid token in optional auth:', error);
        // authenticatedReq.user remains undefined
      }
    }
    // If no token present, authenticatedReq.user remains undefined

    // Always call the handler regardless of authentication status
    // Handler should check if req.user exists before using it
    return handler(authenticatedReq);
  };
}

/**
 * Utility Function: Extract and Verify JWT Token
 * 
 * This utility function provides a way to verify authentication status
 * without the overhead of middleware. Useful for utility functions,
 * middleware checks, or when you need to conditionally access user data.
 * 
 * Key Features:
 * - Standalone JWT verification (no middleware overhead)
 * - Returns user data on success, null on failure
 * - Silent failure handling (no exceptions thrown)
 * - Can be used in middleware, utilities, or helper functions
 * 
 * Return Values:
 * - Valid token: { userId: string, username: string }
 * - Invalid/missing token: null
 * 
 * Use Cases:
 * - Middleware that needs to check authentication before route handling
 * - Utility functions that need user context
 * - Conditional logic based on authentication status
 * - Custom authentication flows
 * 
 * @param req - Next.js request object containing cookies
 * @returns User object if authentication is valid, null otherwise
 */
export function extractUser(req: NextRequest): { userId: string; username: string } | null {
  // Extract JWT token from HTTP-only cookie
  const token = req.cookies.get('token')?.value;

  // Return null immediately if no token is present
  if (!token) {
    return null;
  }

  try {
    // Attempt to verify and decode the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;   // MongoDB ObjectId as string
      username: string; // User's username
      iat: number;     // Token issued at timestamp
      exp: number;     // Token expiration timestamp
    };

    // Return only the essential user information
    // This matches the structure used in AuthenticatedRequest
    return {
      userId: decoded.userId,
      username: decoded.username,
    };
  } catch (error) {
    // Token verification failed (expired, invalid signature, malformed, etc.)
    // Return null for any verification error - caller can handle as needed
    return null;
  }
}
