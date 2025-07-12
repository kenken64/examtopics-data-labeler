import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET() {
  try {
    // Check if MongoDB URI is configured
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({
        status: 'error',
        message: 'MongoDB URI not configured',
        mongodb: {
          configured: false,
          connected: false,
          error: 'MONGODB_URI environment variable not set'
        }
      }, { status: 503 });
    }

    // Attempt to connect to MongoDB
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
      // Connect with timeout
      await client.connect();
      
      // Test connection with ping
      const startTime = Date.now();
      await client.db('admin').admin().ping();
      const pingTime = Date.now() - startTime;
      
      // Get database stats
      const admin = client.db('admin');
      const dbStats = await admin.admin().serverStatus();
      
      // List databases to verify access
      const dbList = await admin.admin().listDatabases();
      
      await client.close();
      
      return NextResponse.json({
        status: 'connected',
        message: 'MongoDB connection successful',
        mongodb: {
          configured: true,
          connected: true,
          pingTime: `${pingTime}ms`,
          version: dbStats.version,
          uptime: dbStats.uptime,
          connections: {
            current: dbStats.connections?.current || 'N/A',
            available: dbStats.connections?.available || 'N/A'
          },
          databases: dbList.databases?.map(db => ({
            name: db.name,
            sizeOnDisk: db.sizeOnDisk || 0
          })) || [],
          host: dbStats.host || 'unknown',
          timestamp: new Date().toISOString()
        }
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
    } catch (connectionError) {
      await client.close().catch(() => {}); // Ensure cleanup
      
      return NextResponse.json({
        status: 'error',
        message: 'MongoDB connection failed',
        mongodb: {
          configured: true,
          connected: false,
          error: connectionError instanceof Error ? connectionError.message : 'Unknown connection error',
          uri: process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Mask credentials
          timestamp: new Date().toISOString()
        }
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('MongoDB check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'MongoDB check failed',
      mongodb: {
        configured: !!process.env.MONGODB_URI,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
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
