import { NextResponse } from 'next/server';

export async function GET() {
  // Simple health check that only verifies the server is running
  // This is used for Docker health checks to avoid dependency on external services
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'examtopics-frontend',
    uptime: process.uptime(),
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
