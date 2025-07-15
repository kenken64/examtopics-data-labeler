import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateRequest } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Listing access codes endpoint called');
    
    // Check authentication first
    const { user, error } = await authenticateRequest(request);
    
    if (error || !user) {
      console.log('❌ Authentication failed:', error);
      return NextResponse.json(
        { error: 'Authentication required. Please log in to list access codes.' },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.email);
    
    console.log('🔌 Attempting to connect to database...');
    const db = await connectToDatabase();
    console.log('✅ Connected to database successfully');
    
    // Get all payees with generated access codes
    console.log('📋 Fetching payees with generated access codes...');
    const payees = await db.collection('payees').find({
      generatedAccessCode: { $exists: true, $ne: null }
    }).limit(10).toArray();
    console.log('📄 Found payees with access codes:', payees.length);
    
    // Get collection stats
    const totalCount = await db.collection('payees').countDocuments({
      generatedAccessCode: { $exists: true, $ne: null }
    });
    console.log('📊 Total payees with access codes:', totalCount);
    
    return NextResponse.json({
      success: true,
      count: payees.length,
      accessCodes: payees.map(doc => ({
        generatedAccessCode: doc.generatedAccessCode,
        email: doc.email,
        certificateType: doc.certificateType || 'Unknown',
        createdAt: doc.createdAt
      })),
      stats: { totalDocuments: totalCount }
    });

  } catch (error) {
    console.error('💥 List access codes error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
