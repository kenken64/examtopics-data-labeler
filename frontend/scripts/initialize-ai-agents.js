const { MongoClient, ObjectId } = require('mongodb');

const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/examtopics';

async function initializeAIAgentsCollection() {
  const client = new MongoClient(mongoUrl);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('ai_agents');
    
    // Create indexes for better performance
    console.log('Creating indexes for ai_agents collection...');
    
    // Index for name field (unique)
    await collection.createIndex({ name: 1 }, { unique: true });
    console.log('✅ Created unique index on name field');
    
    // Index for type field
    await collection.createIndex({ type: 1 });
    console.log('✅ Created index on type field');
    
    // Index for status field
    await collection.createIndex({ status: 1 });
    console.log('✅ Created index on status field');
    
    // Index for createdAt field
    await collection.createIndex({ createdAt: -1 });
    console.log('✅ Created index on createdAt field');
    
    // Text index for search functionality
    await collection.createIndex({ 
      name: 'text', 
      description: 'text', 
      capabilities: 'text' 
    });
    console.log('✅ Created text index for search functionality');
    
    // Check if collection has any documents
    const count = await collection.countDocuments();
    console.log(`Current ai_agents collection has ${count} documents`);
    
    // Create some sample AI agents if collection is empty
    if (count === 0) {
      console.log('Creating sample AI agents...');
      
      const sampleAgents = [
        {
          name: 'ExamBot Assistant',
          description: 'An AI assistant specialized in helping users with exam preparation and question analysis',
          type: 'assistant',
          status: 'active',
          capabilities: ['question_analysis', 'study_recommendations', 'exam_tips', 'progress_tracking'],
          model: 'gpt-4',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system'
        },
        {
          name: 'Question Analyzer',
          description: 'Advanced AI analyzer that evaluates question difficulty and provides detailed explanations',
          type: 'analyzer',
          status: 'active',
          capabilities: ['difficulty_assessment', 'topic_classification', 'explanation_generation', 'quality_scoring'],
          model: 'claude-3-sonnet',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system'
        },
        {
          name: 'Study Chatbot',
          description: 'Interactive chatbot for casual study sessions and quick Q&A',
          type: 'chatbot',
          status: 'inactive',
          capabilities: ['casual_conversation', 'quick_qa', 'motivation', 'study_reminders'],
          model: 'gpt-3.5-turbo',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system'
        },
        {
          name: 'Content Generator',
          description: 'AI generator for creating practice questions and study materials',
          type: 'generator',
          status: 'training',
          capabilities: ['question_generation', 'study_material_creation', 'summary_generation', 'flashcard_creation'],
          model: 'gemini-pro',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system'
        }
      ];
      
      const result = await collection.insertMany(sampleAgents);
      console.log(`✅ Created ${result.insertedCount} sample AI agents`);
      
      // List the created agents
      for (const agent of sampleAgents) {
        console.log(`   - ${agent.name} (${agent.type}, ${agent.status})`);
      }
    }
    
    console.log('\\n🎉 AI Agents collection initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error initializing AI agents collection:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the initialization
if (require.main === module) {
  initializeAIAgentsCollection()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeAIAgentsCollection };
