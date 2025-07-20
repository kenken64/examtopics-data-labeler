import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

/**
 * GET /api/debug/auth - Debug Authentication State
 * 
 * This endpoint helps debug authentication issues by showing:
 * - Current cookies
 * - JWT token status
 * - Decoded token information
 * 
 * This is a public endpoint (no auth required) for debugging purposes.
 */
export async function GET(request: NextRequest) {
  console.log('🔍 DEBUG: Checking authentication state...');

  try {
    // Get all cookies
    const cookies = request.cookies.getAll();
    console.log('🍪 All cookies:', cookies.map(c => ({ name: c.name, hasValue: !!c.value })));

    // Try to get the auth token
    const token = request.cookies.get('auth-token')?.value;
    console.log('🔐 Auth token present:', !!token);

    if (!token) {
      return NextResponse.json({
        status: 'no_token',
        message: 'No auth token found in cookies',
        cookies: cookies.map(c => ({ name: c.name, hasValue: !!c.value })),
        suggestion: 'User needs to log in to get a valid token'
      });
    }

    console.log('🧪 Token preview:', token.substring(0, 50) + '...');

    // Try to decode the token
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log('✅ Token valid:', {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        issuedAt: new Date(decoded.iat * 1000).toISOString(),
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      });

      return NextResponse.json({
        status: 'valid_token',
        message: 'Authentication token is valid',
        user: {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          tokenIssuedAt: new Date(decoded.iat * 1000).toISOString(),
          tokenExpiresAt: new Date(decoded.exp * 1000).toISOString(),
          isExpired: decoded.exp * 1000 < Date.now()
        }
      });

    } catch (jwtError) {
      console.error('❌ JWT decode error:', jwtError);

      if (jwtError instanceof jwt.TokenExpiredError) {
        return NextResponse.json({
          status: 'token_expired',
          message: 'Authentication token has expired',
          error: jwtError.message,
          suggestion: 'User needs to log in again to get a fresh token'
        });
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        return NextResponse.json({
          status: 'invalid_token',
          message: 'Authentication token is invalid',
          error: jwtError.message,
          suggestion: 'Token may be corrupted or tampered with'
        });
      } else {
        return NextResponse.json({
          status: 'token_error',
          message: 'Error processing authentication token',
          error: jwtError instanceof Error ? jwtError.message : String(jwtError)
        });
      }
    }

  } catch (error) {
    console.error('❌ Debug auth error:', error);
    return NextResponse.json({
      status: 'debug_error',
      message: 'Error during authentication debug',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
