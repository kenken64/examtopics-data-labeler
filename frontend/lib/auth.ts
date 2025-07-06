import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    username: string;
  };
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token from cookies and attaches user info to request
 */
export function withAuth<T extends any[]>(
  handler: (req: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T) => {
    const token = req.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' }, 
        { status: 401 }
      );
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        username: string;
        iat: number;
        exp: number;
      };

      // Create an authenticated request object
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        userId: decoded.userId,
        username: decoded.username,
      };

      return handler(authenticatedReq, ...args);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { error: 'Token expired. Please log in again.' }, 
          { status: 401 }
        );
      } else if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          { error: 'Invalid token. Please log in again.' }, 
          { status: 401 }
        );
      } else {
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
 * Verifies JWT token if present, but doesn't require authentication
 */
export function withOptionalAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const token = req.cookies.get('token')?.value;
    const authenticatedReq = req as AuthenticatedRequest;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
          userId: string;
          username: string;
          iat: number;
          exp: number;
        };

        authenticatedReq.user = {
          userId: decoded.userId,
          username: decoded.username,
        };
      } catch (error) {
        // Token is invalid, but we don't require auth, so continue without user
        console.warn('Invalid token in optional auth:', error);
      }
    }

    return handler(authenticatedReq);
  };
}

/**
 * Utility function to extract and verify JWT token
 * Returns user info if valid, null if invalid
 */
export function extractUser(req: NextRequest): { userId: string; username: string } | null {
  const token = req.cookies.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      iat: number;
      exp: number;
    };

    return {
      userId: decoded.userId,
      username: decoded.username,
    };
  } catch (error) {
    return null;
  }
}
