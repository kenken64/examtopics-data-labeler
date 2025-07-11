// Next.js server components for API route handling
import { NextRequest, NextResponse } from 'next/server';
// Mongoose ODM for MongoDB operations and schema definitions
import mongoose from 'mongoose';
// Authentication middleware for protecting API endpoints
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';

/**
 * MongoDB Connection Manager for Certificates API
 * 
 * Establishes connection to MongoDB database with connection state checking.
 * This function ensures we don't create multiple connections in serverless environments.
 * 
 * Connection Strategy:
 * - Check existing connection state before attempting new connection
 * - Use environment variable for connection string with fallback
 * - Handle connection errors gracefully with proper error logging
 * 
 * @throws {Error} If database connection fails
 */
const connectDB = async () => {
  try {
    // Check if we already have an active connection
    // readyState 1 means connected, 0 means disconnected
    if (mongoose.connections[0].readyState) {
      return; // Connection already established, no action needed
    }
    
    // Establish new connection using environment variable or fallback
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aws-cert-web');
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
    await connectDB();
    
    // Fetch all certificates, sorted by creation date (newest first)
    // This ordering ensures recently added certificates appear at the top
    const certificates = await Certificate.find({}).sort({ createdAt: -1 });
    
    // Return the certificates array as JSON response
    return NextResponse.json(certificates);
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
    const { name, code, logoUrl, pdfFileUrl, pdfFileName } = body;

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
      logoUrl: logoUrl?.trim() || '',       // Optional field with fallback
      pdfFileUrl: pdfFileUrl?.trim() || '', // Optional field with fallback
      pdfFileName: pdfFileName?.trim() || '',// Optional field with fallback
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
