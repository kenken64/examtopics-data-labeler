import { NextRequest, NextResponse } from 'next/server';
import { verifyJWTEdgeRuntime } from '@/lib/edge-jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  
  console.log('🧪 Debug endpoint called');
  console.log('🧪 Token present:', !!token);
  
  let tokenValid = false;
  let tokenPayload = null;
  let verificationError = null;
  
  if (token) {
    console.log('🧪 Token preview:', token.substring(0, 50) + '...');
    
    try {
      tokenPayload = await verifyJWTEdgeRuntime(token, JWT_SECRET);
      tokenValid = true;
      console.log('🧪 Token verification successful:', tokenPayload);
    } catch (error: any) {
      verificationError = error.message;
      console.log('🧪 Token verification failed:', error.message);
    }
  }
  
  console.log('🧪 All cookies:', req.cookies.getAll().map(c => c.name));
  
  return NextResponse.json({
    tokenPresent: !!token,
    tokenValid,
    tokenPayload,
    verificationError,
    tokenPreview: token ? token.substring(0, 50) + '...' : 'No token',
    cookies: req.cookies.getAll().map(c => c.name),
    jwtSecret: JWT_SECRET === 'your_super_secret_jwt_key' ? 'Using fallback' : 'Using environment variable',
    message: 'Debug endpoint working with Edge Runtime JWT verification'
  });
}
