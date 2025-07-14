import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { authenticateRequest } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  console.log('🔍 Access code verification endpoint called');
  
  // Check authentication first
  const { user, error } = await authenticateRequest(request);
  
  if (error || !user) {
    console.log('❌ Authentication failed:', error);
    return NextResponse.json(
      { error: 'Authentication required. Please log in to verify access codes.' },
      { status: 401 }
    );
  }
  
  console.log('✅ User authenticated:', user.email);
  
  try {
    const { accessCode } = await request.json();
    console.log('📥 Received access code:', accessCode);

    if (!accessCode) {
      console.log('❌ No access code provided');
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      );
    }

    console.log('🔌 Attempting to connect to database...');
    const db = await connectToDatabase();
    console.log('✅ Connected to database successfully');
    
    // Find the payee with this generated access code
    console.log('🔍 Searching for generated access code in payees collection...');
    const payeeDoc = await db.collection('payees').findOne({ 
      generatedAccessCode: accessCode.toUpperCase()
    });
    console.log('📄 Payee document found:', payeeDoc ? 'Yes' : 'No');

    if (!payeeDoc) {
      console.log('❌ Generated access code not found');
      return NextResponse.json(
        { error: 'Invalid generated access code' },
        { status: 404 }
      );
    }

    // Get question count for this access code from access-code-questions collection
    console.log('📊 Counting questions for access code...');
    const questionCount = await db.collection('access-code-questions').countDocuments({
      generatedAccessCode: accessCode.toUpperCase(),
      isEnabled: true  // Only count enabled questions
    });
    console.log('📈 Question count:', questionCount);

    console.log('✅ Access code verification successful');
    return NextResponse.json({
      valid: true,
      accessCode: accessCode.toUpperCase(),
      questionCount,
      certificateType: payeeDoc.certificateType || 'Unknown'
    });

  } catch (error) {
    console.error('💥 Access code verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
