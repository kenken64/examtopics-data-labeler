const { MongoClient } = require('./frontend/node_modules/mongodb');

async function checkCitiesCollection() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('awscert');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Available collections:');
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });
    
    // Check if cities collection exists
    const citiesExists = collections.some(col => col.name === 'cities');
    
    if (citiesExists) {
      console.log('\n🏙️ Cities collection found!');
      
      // Get sample documents
      const sampleCities = await db.collection('cities').find({}).limit(5).toArray();
      console.log('\n📄 Sample cities documents:');
      sampleCities.forEach((city, index) => {
        console.log(`   ${index + 1}. ${JSON.stringify(city, null, 2)}`);
      });
      
      // Get total count
      const totalCities = await db.collection('cities').countDocuments();
      console.log(`\n📊 Total cities: ${totalCities}`);
      
      // Check for state_name field
      const cityWithState = await db.collection('cities').findOne({ state_name: { $exists: true } });
      if (cityWithState) {
        console.log('\n✅ state_name field found in cities collection');
        console.log('Sample city with state:', JSON.stringify(cityWithState, null, 2));
      } else {
        console.log('\n❌ state_name field not found in cities collection');
        // Check what fields exist
        const sampleCity = await db.collection('cities').findOne({});
        if (sampleCity) {
          console.log('Available fields:', Object.keys(sampleCity));
        }
      }
    } else {
      console.log('\n❌ Cities collection not found');
      console.log('Need to create cities collection with state_name field');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

checkCitiesCollection();