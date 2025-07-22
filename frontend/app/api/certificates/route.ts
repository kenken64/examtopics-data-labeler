// Next.js server components for API route handling
import { NextResponse } from 'next/server';
// Mongoose ODM for MongoDB operations and schema definitions
import mongoose from 'mongoose';
// Authentication middleware for protecting API endpoints
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
// Standard MongoDB connection utility
import { connectToDatabase } from '@/lib/mongodb';

/**
 * MongoDB Connection Manager for Certificates API
 * 
 * Uses the standard MongoDB connection from lib/mongodb.ts to ensure consistency.
 * This prevents connection URI conflicts and namespace issues.
 * 
 * @throws {Error} If database connection fails
 */
const connectDB = async () => {
  try {
    // Use the standard MongoDB connection utility
    const db = await connectToDatabase();
    
    // Ensure mongoose is also connected for the Certificate model
    if (!mongoose.connections[0].readyState) {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error('MONGODB_URI environment variable is not defined');
      }
      await mongoose.connect(uri);
    }
    
    return db;
  } catch (error) {
    // Log connection errors for debugging and monitoring
    console.error('MongoDB connection error:', error);
    throw error; // Re-throw to be handled by calling functions
  }
};

/**
 * Certificate Schema Definition
 * 
 * Defines the data structure for AWS certification information stored in MongoDB.
 * Each certificate represents a distinct AWS certification exam with associated metadata.
 * 
 * Schema Features:
 * - Required fields: name and unique code for identification
 * - Optional fields: logo, PDF file references for certification materials
 * - Automatic timestamps for creation and modification tracking
 * - Data validation and trimming for consistency
 * 
 * Business Logic:
 * - Code field is unique to prevent duplicate certifications
 * - PDF references allow linking to study materials
 * - Logo URL enables visual representation in UI
 * - Timestamps support audit trails and sorting
 */
const certificateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,    // Certificate name is mandatory (e.g., "AWS Solutions Architect")
    trim: true,        // Remove leading/trailing whitespace
  },
  code: {
    type: String,
    required: true,    // Certificate code is mandatory (e.g., "SAA-C03")
    trim: true,        // Remove leading/trailing whitespace
    unique: true,      // Prevent duplicate certificate codes
  },
  companyId: {
    type: String,
    trim: true,        // Company ID reference
    default: '',       // Default to empty string if not provided
  },
  logoUrl: {
    type: String,
    trim: true,        // Remove leading/trailing whitespace
    default: '',       // Default to empty string if not provided
  },
  pdfFileUrl: {
    type: String,
    trim: true,        // Remove leading/trailing whitespace
    default: '',       // Default to empty string if not provided
  },
  pdfFileName: {
    type: String,
    trim: true,        // Remove leading/trailing whitespace
    default: '',       // Default to empty string if not provided
  },
  userId: {
    type: String,
    required: true,    // Track who created this certificate
    index: true,       // Index for efficient ownership queries
  },
}, {
  timestamps: true,    // Automatically add createdAt and updatedAt fields
});

// Create or reuse the Certificate model
// Using mongoose.models check prevents re-compilation errors in serverless environments
const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);

/**
 * GET /api/certificates - Retrieve All Certificates
 * 
 * This endpoint fetches all AWS certifications from the database.
 * Protected by authentication middleware to ensure only authorized users can access.
 * 
 * Key Features:
 * - Returns all certificates sorted by creation date (newest first)
 * - Includes all certificate metadata (name, code, URLs, timestamps)
 * - Protected route requiring valid JWT authentication
 * - Comprehensive error handling with appropriate HTTP status codes
 * 
 * Response Format:
 * Success (200): Array of certificate objects
 * Error (500): { error: "Failed to fetch certificates" }
 * 
 * Use Cases:
 * - Certificate selection in quiz creation
 * - Administrative certificate management
 * - Dashboard certificate listing
 * - User certificate browsing
 * 
 * @param request - Authenticated HTTP request
 * @returns JSON response with certificates array or error message
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Establish database connection
    const db = await connectDB();
    
    // Implement role-based data filtering
    let query = {};
    if (request.user?.role === 'admin') {
      // Admins can see all certificates
      query = {};
    } else {
      // Regular users only see their own certificates
      query = { userId: request.user?.userId };
    }
    
    // Fetch certificates based on user role, sorted by creation date (newest first)
    const certificates = await Certificate.find(query).sort({ createdAt: -1 });
    
    // Populate company names for certificates that have companyId
    const certificatesWithCompany = await Promise.all(
      certificates.map(async (cert) => {
        const certObj = cert.toObject();
        if (certObj.companyId) {
          try {
            const company = await db.collection('companies').findOne({ 
              _id: new mongoose.Types.ObjectId(certObj.companyId) 
            });
            certObj.companyName = company?.name || '';
          } catch (error) {
            console.warn(`Failed to fetch company for certificate ${certObj._id}:`, error);
            certObj.companyName = '';
          }
        } else {
          certObj.companyName = '';
        }
        return certObj;
      })
    );
    
    // Return the certificates array with company names
    return NextResponse.json(certificatesWithCompany);
  } catch (error) {
    // Log error for debugging and monitoring purposes
    console.error('Error fetching certificates:', error);
    
    // Return generic error message to client (don't expose internal details)
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/certificates - Create New Certificate
 * 
 * This endpoint creates a new AWS certification record in the database.
 * Protected by authentication middleware and includes comprehensive validation.
 * 
 * Request Body Requirements:
 * - name (required): Human-readable certificate name
 * - code (required): Unique certificate identifier (will be uppercase)
 * - logoUrl (optional): URL to certificate logo image
 * - pdfFileUrl (optional): URL to certificate study materials
 * - pdfFileName (optional): Name of the PDF file
 * 
 * Validation Features:
 * - Required field validation (name and code)
 * - Duplicate code prevention with database check
 * - Input sanitization (trimming whitespace)
 * - Automatic code normalization (uppercase conversion)
 * 
 * Success Response (201): Created certificate object with timestamps
 * Error Responses:
 * - 400: Missing required fields or duplicate code
 * - 500: Database operation failure
 * 
 * @param request - Authenticated HTTP request with certificate data
 * @returns JSON response with created certificate or error message
 */
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Establish database connection
    await connectDB();
    
    // Parse JSON request body containing certificate data
    const body = await request.json();
    const { name, code, companyId, logoUrl, pdfFileUrl, pdfFileName } = body;

    // Validate required fields
    // Both name and code are essential for certificate identification
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check for duplicate certificate codes
    // Certificate codes must be unique across the system
    const existingCertificate = await Certificate.findOne({ code });
    if (existingCertificate) {
      return NextResponse.json(
        { error: 'Certificate code already exists' },
        { status: 400 }
      );
    }

    // Create new certificate instance with validated and sanitized data
    const certificate = new Certificate({
      name: name.trim(),                    // Remove whitespace from name
      code: code.trim().toUpperCase(),      // Normalize code to uppercase
      companyId: companyId?.trim() || '',   // Optional company ID reference
      logoUrl: logoUrl?.trim() || '',       // Optional field with fallback
      pdfFileUrl: pdfFileUrl?.trim() || '', // Optional field with fallback
      pdfFileName: pdfFileName?.trim() || '',// Optional field with fallback
      userId: request.user?.userId,         // Associate certificate with creator
    });

    // Save certificate to database
    // Mongoose will automatically add timestamps and validate schema
    await certificate.save();
    
    // Return created certificate with 201 Created status
    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    // Log error for debugging and monitoring purposes
    console.error('Error creating certificate:', error);
    
    // Return generic error message to client (don't expose internal details)
    return NextResponse.json(
      { error: 'Failed to create certificate' },
      { status: 500 }
    );
  }
});
