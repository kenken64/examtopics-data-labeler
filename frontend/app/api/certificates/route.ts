import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';

// MongoDB connection
const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aws-cert-web');
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

// GET - Fetch all certificates
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    await connectDB();
    const certificates = await Certificate.find({}).sort({ createdAt: -1 });
    return NextResponse.json(certificates);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
});

// POST - Create new certificate
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const { name, code, logoUrl, pdfFileUrl, pdfFileName } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check if certificate code already exists
    const existingCertificate = await Certificate.findOne({ code });
    if (existingCertificate) {
      return NextResponse.json(
        { error: 'Certificate code already exists' },
        { status: 400 }
      );
    }

    const certificate = new Certificate({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      logoUrl: logoUrl?.trim() || '',
      pdfFileUrl: pdfFileUrl?.trim() || '',
      pdfFileName: pdfFileName?.trim() || '',
    });

    await certificate.save();
    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    console.error('Error creating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to create certificate' },
      { status: 500 }
    );
  }
});
