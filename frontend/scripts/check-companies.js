const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkCompaniesStructure() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🏢 Checking companies collection structure...');

    // Check companies collection
    const companies = await db.collection('companies').find({}).limit(3).toArray();
    console.log(`\n📝 companies collection (${companies.length} samples):`);
    if (companies.length > 0) {
      console.log('   Fields:', Object.keys(companies[0]));
      console.log('   Has userId?', companies[0].userId ? 'Yes' : 'No');
      console.log('   Has createdBy?', companies[0].createdBy ? 'Yes' : 'No');
      console.log('   Sample:', {
        _id: companies[0]._id,
        name: companies[0].name,
        code: companies[0].code,
        createdBy: companies[0].createdBy || 'missing',
        userId: companies[0].userId || 'missing'
      });
    }

    // Count documents
    const totalCompanies = await db.collection('companies').countDocuments({});
    const companiesWithUserId = await db.collection('companies').countDocuments({ 
      userId: { $exists: true } 
    });
    const companiesWithCreatedBy = await db.collection('companies').countDocuments({ 
      createdBy: { $exists: true } 
    });
    
    console.log(`\n📊 Companies ownership status:`);
    console.log(`   Total companies: ${totalCompanies}`);
    console.log(`   With userId: ${companiesWithUserId}/${totalCompanies}`);
    console.log(`   With createdBy: ${companiesWithCreatedBy}/${totalCompanies}`);

    // Get users for reference
    const users = await db.collection('users').find({}).toArray();
    console.log('\n👥 Users in database:');
    users.forEach(user => {
      console.log(`   ${user.username}: ${user.role} (ID: ${user._id})`);
    });

    // Show specific company details
    if (companies.length > 0) {
      console.log('\n🏢 Company Details:');
      companies.forEach((company, index) => {
        console.log(`   Company ${index + 1}:`);
        console.log(`     Name: ${company.name}`);
        console.log(`     Code: ${company.code}`);
        console.log(`     Created By: ${company.createdBy || 'Unknown'}`);
        console.log(`     User ID: ${company.userId || 'Not set'}`);
        console.log(`     Created: ${company.createdAt}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkCompaniesStructure();
