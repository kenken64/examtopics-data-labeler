import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { accessCode } = await request.json();

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Find the access code and get question count
    const accessCodeDoc = await db.collection('accessCodes').findOne({ 
      code: accessCode.toUpperCase(),
      isActive: true 
    });

    if (!accessCodeDoc) {
      return NextResponse.json(
        { error: 'Invalid or expired access code' },
        { status: 404 }
      );
    }

    // Get question count for this access code
    const questionCount = await db.collection('questions').countDocuments({
      accessCode: accessCode.toUpperCase()
    });

    return NextResponse.json({
      valid: true,
      accessCode: accessCode.toUpperCase(),
      questionCount,
      certificateType: accessCodeDoc.certificateType || 'Unknown'
    });

  } catch (error) {
    console.error('Access code verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
