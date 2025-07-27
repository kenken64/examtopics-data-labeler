import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { buildUserFilter, isAdmin } from '@/lib/role-filter';

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
  companyId: {
    type: String,
    trim: true,
    default: '',
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
  userId: {
    type: mongoose.Schema.Types.ObjectId,  // Use ObjectId for consistency
    required: true,    // Track who created this certificate
    index: true,       // Index for efficient ownership queries
  },
}, {
  timestamps: true,    // Automatically add createdAt and updatedAt fields
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
    
    // Validate certificate ID parameter format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid certificate ID format' },
        { status: 400 }
      );
    }

    // Build user-specific filter based on role permissions
    const userFilter = buildUserFilter(request);
    
    // Find certificate with role-based filtering
    const certificate = await Certificate.findOne({
      _id: id,
      ...userFilter  // Apply role-based filtering to ensure user can only access their own certificates (or admin sees all)
    });
    
    if (!certificate) {
      return NextResponse.json(
        { 
          error: 'Certificate not found or access denied',
          details: 'Certificate may not exist or you may not have permission to view it'
        },
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
    const { name, code, companyId, logoUrl, pdfFileUrl, pdfFileName } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Validate certificate ID parameter format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid certificate ID format' },
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

    // Build user-specific filter based on role permissions
    const userFilter = buildUserFilter(request);
    
    // Find and update only certificates the user has permission to modify
    const certificate = await Certificate.findOneAndUpdate(
      {
        _id: id,
        ...userFilter  // Apply role-based filtering to ensure user can only update their own certificates (or admin sees all)
      },
      {
        name: name.trim(),                    // Sanitize certificate name
        code: code.trim().toUpperCase(),      // Normalize certificate code
        companyId: companyId?.trim() || '',   // Update company reference
        logoUrl: logoUrl?.trim() || '',       // Update logo URL
        pdfFileUrl: pdfFileUrl?.trim() || '', // Update PDF file URL
        pdfFileName: pdfFileName?.trim() || '',// Update PDF filename
        updatedAt: new Date(),                // Update timestamp
      },
      { new: true } // Return the updated document
    );

    // Handle case where certificate not found or user lacks permission
    if (!certificate) {
      return NextResponse.json(
        { 
          error: 'Certificate not found or access denied',
          details: 'Certificate may not exist or you may not have permission to modify it'
        },
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
    
    // Validate certificate ID parameter format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid certificate ID format' },
        { status: 400 }
      );
    }

    // Build user-specific filter based on role permissions
    const userFilter = buildUserFilter(request);
    
    // Find and delete only certificates the user has permission to remove
    const certificate = await Certificate.findOneAndDelete({
      _id: id,
      ...userFilter  // Apply role-based filtering to ensure user can only delete their own certificates (or admin sees all)
    });

    // Handle case where certificate not found or user lacks permission
    if (!certificate) {
      return NextResponse.json(
        { 
          error: 'Certificate not found or access denied',
          details: 'Certificate may not exist or you may not have permission to delete it'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: 'Certificate deleted successfully',
      deletedCertificate: {
        id: certificate._id,
        name: certificate.name,
        code: certificate.code
      }
    });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    return NextResponse.json(
      { error: 'Failed to delete certificate' },
      { status: 500 }
    );
  }
});
