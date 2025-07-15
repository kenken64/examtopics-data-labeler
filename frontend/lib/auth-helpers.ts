import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

// JWT verification function for API routes
export async function verifyJWTToken(token: string, secret: string = JWT_SECRET): Promise<any> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Decode header and payload
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    
    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new Error('Token expired');
    }
    
    // Verify signature using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Convert base64url signature to ArrayBuffer
    const signature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );
    
    const isValid = await crypto.subtle.verify('HMAC', secretKey, signature, data);
    
    if (!isValid) {
      throw new Error('Invalid signature');
    }
    
    return payload;
  } catch (error: any) {
    throw new Error(`JWT verification failed: ${error.message}`);
  }
}

// Helper function to extract and verify authentication from request
export async function authenticateRequest(request: NextRequest): Promise<{ user: any; error?: string }> {
  try {
    // Try to get token from cookies first
    let token = request.cookies.get('token')?.value;
    
    // If no token in cookies, try Authorization header
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return { user: null, error: 'No authentication token provided' };
    }
    
    const user = await verifyJWTToken(token);
    return { user };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
}

// Check if user has required permissions
export function hasPermission(user: any, requiredPermission: string): boolean {
  if (!user) return false;
  
  // Admin users have all permissions
  if (user.role === 'admin') return true;
  
  // Check if user has specific permission
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.includes(requiredPermission);
  }
  
  return false;
}
