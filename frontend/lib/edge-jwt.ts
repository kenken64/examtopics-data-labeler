// Edge Runtime compatible JWT utilities for Next.js middleware

interface JWTPayload {
  userId: string;
  username: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

export async function verifyJWTEdgeRuntime(token: string, secret: string): Promise<JWTPayload> {
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
    
    return payload as JWTPayload;
  } catch (error: any) {
    throw new Error(`JWT verification failed: ${error.message}`);
  }
}

export function isTokenExpired(payload: JWTPayload): boolean {
  return payload.exp ? Date.now() >= payload.exp * 1000 : false;
}
