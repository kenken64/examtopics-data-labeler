const { MongoClient } = require('mongodb');

async function testManagementUISave() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('examtopics');
    const collection = db.collection('access-code-questions');
    
    // First, let's see the current state
    console.log('\n=== Current state of access-code-questions ===');
    const allQuestions = await collection.find({}).toArray();
    allQuestions.forEach(q => {
      console.log(`Question ${q.questionId}: isEnabled = ${q.isEnabled}`);
    });
    
    // Now let's simulate what the API endpoint should do
    console.log('\n=== Simulating API save operation ===');
    
    // Let's try to disable Q1 and enable Q4 (which was previously disabled)
    const updates = [
      { questionId: 'Q1', isEnabled: false },
      { questionId: 'Q4', isEnabled: true }
    ];
    
    console.log('Applying updates:', updates);
    
    for (const update of updates) {
      const result = await collection.updateOne(
        { questionId: update.questionId },
        { $set: { isEnabled: update.isEnabled } }
      );
      console.log(`Updated ${update.questionId}: ${result.modifiedCount} document(s) modified`);
    }
    
    // Check the state after updates
    console.log('\n=== State after simulated save ===');
    const updatedQuestions = await collection.find({}).toArray();
    updatedQuestions.forEach(q => {
      console.log(`Question ${q.questionId}: isEnabled = ${q.isEnabled}`);
    });
    
    // Revert the changes for cleanup
    console.log('\n=== Reverting changes for cleanup ===');
    await collection.updateOne({ questionId: 'Q1' }, { $set: { isEnabled: true } });
    await collection.updateOne({ questionId: 'Q4' }, { $set: { isEnabled: false } });
    console.log('Changes reverted');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testManagementUISave();
