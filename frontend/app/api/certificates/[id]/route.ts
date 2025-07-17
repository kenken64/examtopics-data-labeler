import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';

// MongoDB connection
const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return;
    }
    const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'awscert';
    const mongoUri = baseUri.endsWith('/') ? `${baseUri}${dbName}` : `${baseUri}/${dbName}`;
    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Certificate Schema
const certificateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  logoUrl: {
    type: String,
    trim: true,
    default: '',
  },
  pdfFileUrl: {
    type: String,
    trim: true,
    default: '',
  },
  pdfFileName: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);

// GET - Fetch single certificate
export const GET = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();
    const { id } = await params;
    const certificate = await Certificate.findById(id);
    
    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(certificate);
  } catch (error) {
    console.error('Error fetching certificate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificate' },
      { status: 500 }
    );
  }
});

// PUT - Update certificate
export const PUT = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { name, code, logoUrl, pdfFileUrl, pdfFileName } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check if certificate code already exists for other certificates
    const existingCertificate = await Certificate.findOne({ 
      code: code.trim().toUpperCase(),
      _id: { $ne: id }
    });
    
    if (existingCertificate) {
      return NextResponse.json(
        { error: 'Certificate code already exists' },
        { status: 400 }
      );
    }

    const certificate = await Certificate.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        logoUrl: logoUrl?.trim() || '',
        pdfFileUrl: pdfFileUrl?.trim() || '',
        pdfFileName: pdfFileName?.trim() || '',
      },
      { new: true }
    );

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(certificate);
  } catch (error) {
    console.error('Error updating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to update certificate' },
      { status: 500 }
    );
  }
});

// DELETE - Delete certificate
export const DELETE = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();
    const { id } = await params;
    const certificate = await Certificate.findByIdAndDelete(id);

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    return NextResponse.json(
      { error: 'Failed to delete certificate' },
      { status: 500 }
    );
  }
});
