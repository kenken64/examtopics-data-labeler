import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

// Edge Runtime compatible JWT verification function
async function verifyJWTEdgeRuntime(token: string, secret: string): Promise<any> {
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

// Debug JWT_SECRET loading
console.log('🔑 Middleware JWT_SECRET:', JWT_SECRET);
console.log('🔑 Using fallback secret?', JWT_SECRET === 'your_super_secret_jwt_key');

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/register',
  '/api/auth/passkey/register-challenge',
  '/api/auth/passkey/register',
  '/api/auth/passkey/login-challenge',
  '/api/auth/passkey/login',
  '/api/auth/logout',
  '/api/auth/verify',
  '/api/debug-auth',
  '/api/health',
  '/api/quizblitz/join',
  '/api/quizblitz/session',
  '/api/quizblitz/events/session', // SSE endpoint for session updates (public)
];

// Define static file extensions that should be allowed
const STATIC_FILE_EXTENSIONS = [
  '.css',
  '.js',
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.webp',
  '.mp4',
  '.webm',
  '.ogg',
  '.mp3',
  '.wav',
  '.flac',
  '.aac',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.json',
  '.xml',
  '.txt',
];

function isPublicRoute(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }

  // Check QuizBlitz session API pattern (dynamic route)
  if (pathname.startsWith('/api/quizblitz/session/')) {
    return true;
  }

  // Check QuizBlitz SSE session events API pattern (dynamic route, public)
  if (pathname.startsWith('/api/quizblitz/events/session/')) {
    return true;
  }

  // Check if it's a static file
  const hasStaticExtension = STATIC_FILE_EXTENSIONS.some(ext => 
    pathname.toLowerCase().endsWith(ext)
  );
  if (hasStaticExtension) {
    return true;
  }

  // Check if it's a Next.js internal route
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/_next/')) {
    return true;
  }

  return false;
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const userAgent = request.headers.get('user-agent')?.substring(0, 50) || 'Unknown';
  
  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    });
  }
  
  console.log(`\n🔍 === MIDDLEWARE START ===`);
  console.log(`📍 Request: ${method} ${pathname}`);
  console.log(`🌐 User Agent: ${userAgent}...`);
  
  // Get token from cookies first, then Authorization header
  let token = request.cookies.get('token')?.value;
  let tokenSource = 'None';
  
  // If no token in cookies, try Authorization header
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      tokenSource = 'Authorization Header';
    }
  } else {
    tokenSource = 'Cookie';
  }
  
  console.log(`🔑 Token Status: ${!!token ? '✅ Present' : '❌ Missing'} | Source: ${tokenSource}`);
  
  if (token) {
    console.log(`🔍 Token Preview: ${token.substring(0, 50)}...`);
  }

  // Check if route is public
  const isPublic = isPublicRoute(pathname);
  console.log(`🌍 Route Type: ${isPublic ? '🌐 PUBLIC' : '🔒 PROTECTED'}`);
  
  if (isPublic) {
    console.log(`✅ ALLOWING: Public route - ${pathname}`);
    console.log(`🔍 === MIDDLEWARE END: ALLOWED ===\n`);
    return NextResponse.next();
  }

  // For API routes, check JWT token
  if (isApiRoute(pathname)) {
    console.log(`🔌 Processing API Route: ${pathname}`);
    
    if (!token) {
      console.log(`❌ REJECTING: API route requires authentication - ${pathname}`);
      console.log(`🔍 === MIDDLEWARE END: REJECTED (401) ===\n`);
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    try {
      const decoded = await verifyJWTEdgeRuntime(token, JWT_SECRET);
      console.log(`✅ JWT Valid: userId=${decoded.userId}, username=${decoded.username}`);
      console.log(`✅ ALLOWING: Authenticated API request - ${pathname}`);
      console.log(`🔍 === MIDDLEWARE END: ALLOWED ===\n`);
      // Token is valid, continue
      return NextResponse.next();
    } catch (error: any) {
      console.log(`❌ JWT Invalid: ${error.message}`);
      console.log(`❌ REJECTING: Invalid/expired token for API - ${pathname}`);
      console.log(`🔍 === MIDDLEWARE END: REJECTED (401) ===\n`);
      
      if (error.message.includes('expired')) {
        return NextResponse.json(
          { error: 'Token expired. Please log in again.' },
          { status: 401 }
        );
      } else {
        return NextResponse.json(
          { error: 'Invalid token. Please log in again.' },
          { status: 401 }
        );
      }
    }
  }

  // For non-API routes (pages), redirect to login if not authenticated
  console.log(`📄 Processing Page Route: ${pathname}`);
  
  if (!token) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    console.log(`❌ REDIRECTING: No token for page route - ${pathname} → ${loginUrl.pathname}${loginUrl.search}`);
    console.log(`🔍 === MIDDLEWARE END: REDIRECTED ===\n`);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const decoded = await verifyJWTEdgeRuntime(token, JWT_SECRET);
    console.log(`✅ JWT Valid: userId=${decoded.userId}, username=${decoded.username}`);
    console.log(`✅ ALLOWING: Authenticated page request - ${pathname}`);
    console.log(`🔍 === MIDDLEWARE END: ALLOWED ===\n`);
    // Token is valid, continue
    return NextResponse.next();
  } catch (error: any) {
    // Token is invalid, redirect to login
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    console.log(`❌ JWT Invalid: ${error.message}`);
    console.log(`❌ REDIRECTING: Invalid/expired token for page - ${pathname} → ${loginUrl.pathname}${loginUrl.search}`);
    console.log(`🔍 === MIDDLEWARE END: REDIRECTED ===\n`);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
