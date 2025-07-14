import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// MongoDB connection setup
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

// Certificate schema
const certificateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, unique: true },
  logoUrl: { type: String, trim: true, default: '' },
  pdfFileUrl: { type: String, trim: true, default: '' },
  pdfFileName: { type: String, trim: true, default: '' },
}, { timestamps: true });

const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);

export async function POST(request: NextRequest) {
  try {
    console.log('=== Seeding Certificates ===');
    
    await connectDB();
    
    // Sample certificates data
    const sampleCertificates = [
      {
        name: 'AWS Certified Solutions Architect - Associate',
        code: 'SAA-C03',
        logoUrl: 'https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-Solutions-Architect-Associate_badge.3419559c682629072f1eb968d59dea0741772c0f.png',
        pdfFileUrl: '',
        pdfFileName: ''
      },
      {
        name: 'AWS Certified Developer - Associate',
        code: 'DVA-C02',
        logoUrl: 'https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-Developer-Associate_badge.5c083fa855fe82c1cf2d0c8b883c265ec72a17c0.png',
        pdfFileUrl: '',
        pdfFileName: ''
      },
      {
        name: 'AWS Certified SysOps Administrator - Associate',
        code: 'SOA-C02',
        logoUrl: 'https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-SysOps-Administrator-Associate_badge.2d9e10a9ecfa71b6c3fc6e6f52e9b77d75195c45.png',
        pdfFileUrl: '',
        pdfFileName: ''
      },
      {
        name: 'AWS Certified Cloud Practitioner',
        code: 'CLF-C02',
        logoUrl: 'https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-Cloud-Practitioner_badge.634f8a21af2e0e956ed8905a72366146ba22b74c.png',
        pdfFileUrl: '',
        pdfFileName: ''
      }
    ];
    
    // Check if certificates already exist
    const existingCount = await Certificate.countDocuments();
    console.log('Existing certificates count:', existingCount);
    
    if (existingCount > 0) {
      return NextResponse.json({
        success: false,
        message: 'Certificates already exist in database',
        existingCount,
        suggestion: 'Use DELETE method to clear existing certificates first'
      });
    }
    
    // Insert sample certificates
    const result = await Certificate.insertMany(sampleCertificates);
    console.log('Inserted certificates:', result.length);
    
    return NextResponse.json({
      success: true,
      message: `Successfully created ${result.length} sample certificates`,
      certificates: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Seed certificates error:', error);
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({
        success: false,
        error: 'Duplicate certificate codes detected',
        message: 'Some certificates already exist with the same codes',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('=== Clearing Certificates ===');
    
    await connectDB();
    
    const result = await Certificate.deleteMany({});
    console.log('Deleted certificates count:', result.deletedCount);
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} certificates`,
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Clear certificates error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}