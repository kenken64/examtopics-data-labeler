import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { buildUserFilter } from '@/lib/role-filter';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function _connectToDatabaseOld() {
  const client = new MongoClient(uri);
  await client.connect();
  return client.db('awscert');
}

// GET /api/payees - Get payees with role-based filtering
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const db = await connectToDatabase();
    
    // Build filter object with role-based user filtering
    const filter = buildUserFilter(request);
    
    if (status) {
      filter.status = status;
    }
    
    console.log('🔍 Payees API - User info:', {
      userId: request.user.userId,
      role: request.user.role,
      email: request.user.email
    });
    console.log('🔍 Payees API - MongoDB filter:', filter);
    
    // Get total count for pagination
    const totalCount = await db.collection('payees').countDocuments(filter);
    
    // Get paginated payees, sorted by createdAt descending (newest first)
    const payees = await db.collection('payees')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const totalPages = Math.ceil(totalCount / limit);
    
    console.log(`✅ Payees API - Found ${payees.length} payees for ${request.user.role} user`);
    
    return NextResponse.json({
      payees,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      userRole: request.user.role // Include role info for frontend
    });
  } catch (error) {
    console.error('Error fetching payees:', error);
    return NextResponse.json({ error: 'Failed to fetch payees' }, { status: 500 });
  }
});

// POST /api/payees - Create a new payee
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { certificateId, payeeName, creditCardNumber, expiryDate, accessCode, amountPaid, status, email } = body;

    // Validate required fields
    if (!certificateId || !payeeName || !creditCardNumber || !expiryDate || !accessCode || amountPaid === undefined || !status) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate amount paid is a number
    if (typeof amountPaid !== 'number' || amountPaid < 0) {
      return NextResponse.json({ error: 'Amount paid must be a positive number' }, { status: 400 });
    }

    // Validate credit card number (basic validation)
    if (!/^\d{13,19}$/.test(creditCardNumber.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Invalid credit card number format' }, { status: 400 });
    }

    // Validate expiry date format (MM/YY or MM/YYYY)
    if (!/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/.test(expiryDate)) {
      return NextResponse.json({ error: 'Invalid expiry date format. Use MM/YY or MM/YYYY' }, { status: 400 });
    }

    // Validate email format if provided (optional field)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const db = await connectToDatabase();
    
    const newPayee = {
      certificateId: new ObjectId(certificateId),
      payeeName,
      creditCardNumber,
      expiryDate,
      accessCode,
      amountPaid,
      status,
      userId: request.user.userId, // Always set to current user
      ...(email && { email }), // Only include email if provided
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('🆕 Creating new payee for user:', {
      userId: request.user.userId,
      role: request.user.role,
      payeeName
    });

    const result = await db.collection('payees').insertOne(newPayee);
    
    return NextResponse.json({ 
      message: 'Payee created successfully',
      payeeId: result.insertedId 
        }, { status: 201 });
  } catch (error) {
    console.error('Error creating payee:', error);
    return NextResponse.json({ error: 'Failed to create payee' }, { status: 500 });
  }
});
