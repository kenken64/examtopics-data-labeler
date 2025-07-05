// Seed script for payees collection
// Run this script using: node seed-payees.js

const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017/awscert';

// Function to generate random access codes
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'AC-';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const samplePayees = [
  {
    certificateId: null, // Will be populated with actual certificate IDs
    payeeName: 'John Smith',
    creditCardNumber: '4532123456789012',
    expiryDate: '12/25',
    accessCode: 'AWS-CLF-001',
    generatedAccessCode: generateAccessCode(),
    amountPaid: 150.00,
    status: 'paid',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    certificateId: null, // Will be populated with actual certificate IDs
    payeeName: 'Sarah Johnson',
    creditCardNumber: '5555444433332222',
    expiryDate: '03/26',
    accessCode: 'AWS-SAA-002',
    generatedAccessCode: generateAccessCode(),
    amountPaid: 300.00,
    status: 'pending',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    certificateId: null, // Will be populated with actual certificate IDs
    payeeName: 'Michael Davis',
    creditCardNumber: '4111111111111111',
    expiryDate: '08/24',
    accessCode: 'AWS-DVA-003',
    amountPaid: 200.00,
    status: 'failed',
    createdAt: new Date('2024-01-28'),
    updatedAt: new Date('2024-01-28'),
  },
  {
    certificateId: null, // Will be populated with actual certificate IDs
    payeeName: 'Emily Chen',
    creditCardNumber: '3782822463100005',
    expiryDate: '11/25',
    accessCode: 'AWS-SOA-004',
    amountPaid: 250.00,
    status: 'refunded',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    certificateId: null, // Will be populated with actual certificate IDs
    payeeName: 'Robert Wilson',
    creditCardNumber: '6011000990139424',
    expiryDate: '07/26',
    accessCode: 'AWS-CLF-005',
    amountPaid: 150.00,
    status: 'paid',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-02-20'),
  },
  {
    certificateId: null,
    payeeName: 'Lisa Anderson',
    creditCardNumber: '4000000000000002',
    expiryDate: '05/27',
    accessCode: 'AWS-DOP-006',
    amountPaid: 350.00,
    status: 'paid',
    createdAt: new Date('2024-03-12'),
    updatedAt: new Date('2024-03-12'),
  },
  {
    certificateId: null,
    payeeName: 'David Brown',
    creditCardNumber: '5105105105105100',
    expiryDate: '09/25',
    accessCode: 'AWS-ANS-007',
    amountPaid: 275.00,
    status: 'pending',
    createdAt: new Date('2024-03-18'),
    updatedAt: new Date('2024-03-18'),
  },
  {
    certificateId: null,
    payeeName: 'Jennifer Garcia',
    creditCardNumber: '4012888888881881',
    expiryDate: '01/26',
    accessCode: 'AWS-SCS-008',
    amountPaid: 320.00,
    status: 'paid',
    createdAt: new Date('2024-04-02'),
    updatedAt: new Date('2024-04-02'),
  },
  {
    certificateId: null,
    payeeName: 'Thomas Miller',
    creditCardNumber: '6011111111111117',
    expiryDate: '06/25',
    accessCode: 'AWS-MLS-009',
    amountPaid: 400.00,
    status: 'failed',
    createdAt: new Date('2024-04-08'),
    updatedAt: new Date('2024-04-08'),
  },
  {
    certificateId: null,
    payeeName: 'Amanda Taylor',
    creditCardNumber: '3530111333300000',
    expiryDate: '04/27',
    accessCode: 'AWS-DAS-010',
    amountPaid: 290.00,
    status: 'paid',
    createdAt: new Date('2024-04-15'),
    updatedAt: new Date('2024-04-15'),
  },
  {
    certificateId: null,
    payeeName: 'Christopher Lee',
    creditCardNumber: '4485000000000050',
    expiryDate: '10/26',
    accessCode: 'AWS-SAP-011',
    amountPaid: 450.00,
    status: 'pending',
    createdAt: new Date('2024-04-22'),
    updatedAt: new Date('2024-04-22'),
  },
  {
    certificateId: null,
    payeeName: 'Michelle White',
    creditCardNumber: '5200828282828210',
    expiryDate: '02/28',
    accessCode: 'AWS-PAS-012',
    amountPaid: 380.00,
    status: 'refunded',
    createdAt: new Date('2024-05-01'),
    updatedAt: new Date('2024-05-01'),
  },
  {
    certificateId: null,
    payeeName: 'Kevin Martinez',
    creditCardNumber: '4000000000000044',
    expiryDate: '08/27',
    accessCode: 'AWS-CLF-013',
    amountPaid: 150.00,
    status: 'paid',
    createdAt: new Date('2024-05-10'),
    updatedAt: new Date('2024-05-10'),
  },
  {
    certificateId: null,
    payeeName: 'Rachel Rodriguez',
    creditCardNumber: '5555555555554444',
    expiryDate: '12/26',
    accessCode: 'AWS-SAA-014',
    amountPaid: 300.00,
    status: 'paid',
    createdAt: new Date('2024-05-18'),
    updatedAt: new Date('2024-05-18'),
  },
  {
    certificateId: null,
    payeeName: 'Brian Thompson',
    creditCardNumber: '378282246310005',
    expiryDate: '03/27',
    accessCode: 'AWS-DVA-015',
    amountPaid: 200.00,
    status: 'pending',
    createdAt: new Date('2024-05-25'),
    updatedAt: new Date('2024-05-25'),
  },
  {
    certificateId: null,
    payeeName: 'Stephanie Clark',
    creditCardNumber: '4111111111111111',
    expiryDate: '07/25',
    accessCode: 'AWS-SOA-016',
    amountPaid: 250.00,
    status: 'failed',
    createdAt: new Date('2024-06-02'),
    updatedAt: new Date('2024-06-02'),
  },
  {
    certificateId: null,
    payeeName: 'Daniel Lewis',
    creditCardNumber: '6011000990139424',
    expiryDate: '11/27',
    accessCode: 'AWS-DOP-017',
    amountPaid: 350.00,
    status: 'paid',
    createdAt: new Date('2024-06-10'),
    updatedAt: new Date('2024-06-10'),
  },
  {
    certificateId: null,
    payeeName: 'Nicole Walker',
    creditCardNumber: '5105105105105100',
    expiryDate: '05/26',
    accessCode: 'AWS-ANS-018',
    amountPaid: 275.00,
    status: 'pending',
    createdAt: new Date('2024-06-18'),
    updatedAt: new Date('2024-06-18'),
  },
  {
    certificateId: null,
    payeeName: 'Jason Hall',
    creditCardNumber: '4012888888881881',
    expiryDate: '09/27',
    accessCode: 'AWS-SCS-019',
    amountPaid: 320.00,
    status: 'refunded',
    createdAt: new Date('2024-06-25'),
    updatedAt: new Date('2024-06-25'),
  },
  {
    certificateId: null,
    payeeName: 'Ashley Young',
    creditCardNumber: '3714496353984312',
    expiryDate: '01/28',
    accessCode: 'AWS-MLS-020',
    amountPaid: 400.00,
    status: 'paid',
    createdAt: new Date('2024-07-02'),
    updatedAt: new Date('2024-07-02'),
  },
  {
    certificateId: null,
    payeeName: 'Ryan King',
    creditCardNumber: '4532015112830366',
    expiryDate: '04/26',
    accessCode: 'AWS-DAS-021',
    amountPaid: 290.00,
    status: 'paid',
    createdAt: new Date('2024-07-08'),
    updatedAt: new Date('2024-07-08'),
  },
  {
    certificateId: null,
    payeeName: 'Megan Wright',
    creditCardNumber: '5425233430109903',
    expiryDate: '08/26',
    accessCode: 'AWS-SAP-022',
    amountPaid: 450.00,
    status: 'pending',
    createdAt: new Date('2024-07-15'),
    updatedAt: new Date('2024-07-15'),
  },
  {
    certificateId: null,
    payeeName: 'Gregory Scott',
    creditCardNumber: '4716461583322103',
    expiryDate: '12/27',
    accessCode: 'AWS-PAS-023',
    amountPaid: 380.00,
    status: 'failed',
    createdAt: new Date('2024-07-22'),
    updatedAt: new Date('2024-07-22'),
  },
  {
    certificateId: null,
    payeeName: 'Laura Green',
    creditCardNumber: '5473071234567890',
    expiryDate: '06/27',
    accessCode: 'AWS-CLF-024',
    amountPaid: 150.00,
    status: 'paid',
    createdAt: new Date('2024-07-29'),
    updatedAt: new Date('2024-07-29'),
  },
  {
    certificateId: null,
    payeeName: 'Matthew Adams',
    creditCardNumber: '4532117080573047',
    expiryDate: '10/25',
    accessCode: 'AWS-SAA-025',
    amountPaid: 300.00,
    status: 'pending',
    createdAt: new Date('2024-08-05'),
    updatedAt: new Date('2024-08-05'),
  },
];

async function seedPayees() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('awscert');
    
    // First, get all certificates to assign random ones to payees
    console.log('Fetching certificates...');
    const certificates = await db.collection('certificates').find({}).toArray();
    
    if (certificates.length === 0) {
      console.log('No certificates found. Please run seed-certificates.js first.');
      return;
    }
    
    console.log(`Found ${certificates.length} certificates`);
    
    // Assign random certificates and generated access codes to payees
    const payeesWithCerts = samplePayees.map(payee => ({
      ...payee,
      certificateId: certificates[Math.floor(Math.random() * certificates.length)]._id,
      generatedAccessCode: payee.generatedAccessCode || generateAccessCode(), // Add generated access code if not already set
    }));
    
    // Check if payees collection exists and has data
    const existingPayees = await db.collection('payees').countDocuments();
    
    if (existingPayees > 0) {
      console.log(`Found ${existingPayees} existing payees. Clearing collection...`);
      await db.collection('payees').deleteMany({});
    }
    
    console.log('Inserting sample payees...');
    const result = await db.collection('payees').insertMany(payeesWithCerts);
    
    console.log(`Successfully inserted ${result.insertedCount} payees`);
    console.log('Sample payees created:');
    
    payeesWithCerts.forEach((payee, index) => {
      const cert = certificates.find(c => c._id.equals(payee.certificateId));
      console.log(`${index + 1}. ${payee.payeeName} - ${cert ? cert.name : 'Unknown'} - $${payee.amountPaid} - ${payee.status} - Generated Code: ${payee.generatedAccessCode}`);
    });
    
  } catch (error) {
    console.error('Error seeding payees:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Database connection closed.');
    }
  }
}

// Run the seed function
seedPayees();
