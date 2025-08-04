const { MongoClient } = require('mongodb');

const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/examtopics';

async function checkAIAgents() {
  const client = new MongoClient(mongoUrl);
  
  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('ai_agents');
    
    // Check if collection exists
    const collections = await db.listCollections({ name: 'ai_agents' }).toArray();
    if (collections.length === 0) {
      console.log('❌ ai_agents collection does not exist');
      return;
    }
    
    console.log('✅ ai_agents collection exists');
    
    // Get collection stats
    const stats = await db.command({ collStats: 'ai_agents' });
    console.log(`📊 Collection stats:`);
    console.log(`   - Document count: ${stats.count}`);
    console.log(`   - Average document size: ${Math.round(stats.avgObjSize)} bytes`);
    console.log(`   - Total size: ${Math.round(stats.size / 1024)} KB`);
    
    // Check indexes
    const indexes = await collection.indexes();
    console.log(`\\n🔍 Indexes (${indexes.length}):`);
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) console.log(`      (unique)`);
    });
    
    // Get all agents with summary
    const agents = await collection.find({}).sort({ createdAt: -1 }).toArray();
    
    console.log(`\\n🤖 AI Agents (${agents.length}):`);
    if (agents.length === 0) {
      console.log('   No agents found');
    } else {
      agents.forEach((agent, i) => {
        console.log(`   ${i + 1}. ${agent.name}`);
        console.log(`      Type: ${agent.type}`);
        console.log(`      Status: ${agent.status}`);
        console.log(`      Model: ${agent.model}`);
        console.log(`      Capabilities: ${agent.capabilities ? agent.capabilities.length : 0}`);
        console.log(`      Created: ${agent.createdAt ? agent.createdAt.toISOString().split('T')[0] : 'Unknown'}`);
        console.log(`      Created by: ${agent.createdBy || 'Unknown'}`);
        console.log('');
      });
    }
    
    // Group by status
    const statusCounts = await collection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log(`📈 Agents by status:`);
    statusCounts.forEach(status => {
      console.log(`   - ${status._id}: ${status.count}`);
    });
    
    // Group by type
    const typeCounts = await collection.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log(`\\n📋 Agents by type:`);
    typeCounts.forEach(type => {
      console.log(`   - ${type._id}: ${type.count}`);
    });
    
    // Test search functionality
    console.log(`\\n🔍 Testing search functionality...`);
    const searchResults = await collection.find({
      $text: { $search: 'exam question' }
    }).toArray();
    console.log(`   Found ${searchResults.length} agents matching 'exam question'`);
    
  } catch (error) {
    console.error('❌ Error checking AI agents:', error);
  } finally {
    await client.close();
    console.log('\\n🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkAIAgents()
  .then(() => {
    console.log('\\n✅ AI Agents check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\\n❌ Check failed:', error);
    process.exit(1);
  });
