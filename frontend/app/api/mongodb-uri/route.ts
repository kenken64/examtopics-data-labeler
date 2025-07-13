import { NextResponse } from 'next/server';
import { getConnectionUri, getDatabaseName } from '@/lib/mongodb';

export async function GET() {
  try {
    const uri = getConnectionUri();
    const dbName = getDatabaseName();
    
    console.log('=== MongoDB Configuration Debug ===');
    console.log('Full MongoDB URI:', uri);
    console.log('Database Name:', dbName);
    console.log('=====================================');
    
    return NextResponse.json({
      status: 'success',
      message: 'MongoDB URI has been logged to console',
      mongodbUri: uri,
      databaseName: dbName,
      maskedUri: uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting MongoDB URI:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}