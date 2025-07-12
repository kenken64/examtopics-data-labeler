import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET() {
  try {
    // Check if essential environment variables are set
    const envCheck = {
      mongodb: !!process.env.MONGODB_URI,
      jwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV || 'development',
    };

    // Test MongoDB connection
    let mongoStatus = 'disconnected';
    if (process.env.MONGODB_URI) {
      try {
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        // Use admin command to ping
        await client.db('admin').admin().ping();
        await client.close();
        mongoStatus = 'connected';
      } catch (error) {
        mongoStatus = 'error';
        console.error('MongoDB health check failed:', error);
      }
    }

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'examtopics-frontend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      mongodb: mongoStatus,
      env: envCheck,
      runtime: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
      },
    };

    // Determine overall status
    const isHealthy = mongoStatus === 'connected' && envCheck.mongodb && envCheck.jwtSecret;
    
    return NextResponse.json(healthData, { 
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'examtopics-frontend',
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}
