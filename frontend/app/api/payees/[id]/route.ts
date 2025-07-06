import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function connectToDatabase() {
  const client = new MongoClient(uri);
  await client.connect();
  return client.db('awscert');
}

// GET /api/payees/[id] - Get a specific payee
export const GET = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid payee ID' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const payee = await db.collection('payees').findOne({ _id: new ObjectId(id) });

    if (!payee) {
      return NextResponse.json({ error: 'Payee not found' }, { status: 404 });
    }

    return NextResponse.json(payee);
  } catch (error) {
    console.error('Error fetching payee:', error);
    return NextResponse.json({ error: 'Failed to fetch payee' }, { status: 500 });
  }
});

// PUT /api/payees/[id] - Update a specific payee
export const PUT = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid payee ID' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      certificateId, 
      payeeName, 
      creditCardNumber, 
      expiryDate, 
      accessCode, 
      amountPaid, 
      status,
      email,
      generatedAccessCode,
      accessCodeGenerated
    } = body;

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

    const updateData: any = {
      certificateId: new ObjectId(certificateId),
      payeeName,
      creditCardNumber,
      expiryDate,
      accessCode,
      amountPaid,
      status,
      updatedAt: new Date(),
    };

    // Add email if provided (optional field)
    if (email !== undefined && email !== '') {
      updateData.email = email;
    }

    // Add access code generation fields if provided
    if (generatedAccessCode !== undefined) {
      updateData.generatedAccessCode = generatedAccessCode;
    }
    if (accessCodeGenerated !== undefined) {
      updateData.accessCodeGenerated = accessCodeGenerated;
    }

    // Prepare update operations
    const updateOperations: any = { $set: updateData };

    // Remove email field if empty string is provided
    if (email === '') {
      updateOperations.$unset = { email: 1 };
    }

    const result = await db.collection('payees').updateOne(
      { _id: new ObjectId(id) },
      updateOperations
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Payee not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Payee updated successfully' });
  } catch (error) {
    console.error('Error updating payee:', error);
    return NextResponse.json({ error: 'Failed to update payee' }, { status: 500 });
  }
});

// DELETE /api/payees/[id] - Delete a specific payee
export const DELETE = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid payee ID' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const result = await db.collection('payees').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Payee not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Payee deleted successfully' });
  } catch (error) {
    console.error('Error deleting payee:', error);
    return NextResponse.json({ error: 'Failed to delete payee' }, { status: 500 });
  }
});
