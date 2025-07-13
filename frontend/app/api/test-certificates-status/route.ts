import { NextRequest, NextResponse } from 'next/server';
import { extractUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Test Certificates Status ===');
    
    // Check authentication
    const user = extractUser(request);
    console.log('User extracted:', user);
    
    // Test both protected and unprotected endpoints
    const baseUrl = request.nextUrl.origin;
    
    // Test protected certificates API
    let protectedResult;
    try {
      const protectedResponse = await fetch(`${baseUrl}/api/certificates`, {
        headers: {
          'Cookie': request.headers.get('Cookie') || ''
        }
      });
      
      protectedResult = {
        status: protectedResponse.status,
        statusText: protectedResponse.statusText,
        ok: protectedResponse.ok,
        body: protectedResponse.ok ? await protectedResponse.json() : await protectedResponse.text()
      };
    } catch (error) {
      protectedResult = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test unprotected debug endpoint
    let debugResult;
    try {
      const debugResponse = await fetch(`${baseUrl}/api/debug-certificates-unauth`);
      debugResult = await debugResponse.json();
    } catch (error) {
      debugResult = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    return NextResponse.json({
      authentication: {
        userAuthenticated: !!user,
        user: user,
        tokenPresent: !!request.cookies.get('token')?.value
      },
      protectedAPI: protectedResult,
      debugAPI: debugResult,
      recommendations: {
        issue: !user ? 'Authentication required' : 
               protectedResult.status !== 200 ? 'API error' : 
               'Check data in debug endpoint',
        solution: !user ? 'Please log in first' :
                 protectedResult.status !== 200 ? 'Check server logs for API errors' :
                 'Data should be visible in UI'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test certificates status error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}