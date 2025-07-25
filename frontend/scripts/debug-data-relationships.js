#!/usr/bin/env node

// Debug script to check the data relationships
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function debugDataRelationships() {
  console.log('🔍 Debugging Data Relationships');
  console.log('=' .repeat(50));

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    // Check certificates
    console.log('📜 Certificates in database:');
    const certificates = await db.collection('certificates').find({}).toArray();
    certificates.forEach(cert => {
      console.log(`  ${cert._id} - ${cert.name} (${cert.code})`);
    });
    
    // Check questions
    console.log('\n📋 Sample questions:');
    const questions = await db.collection('quizzes').find({}).limit(3).toArray();
    questions.forEach(q => {
      console.log(`  ${q._id} - Q${q.question_no} - certificateId: "${q.certificateId}" (${typeof q.certificateId})`);
    });
    
    // Check if certificateId matches
    if (certificates.length > 0 && questions.length > 0) {
      const cert = certificates[0];
      console.log(`\n🔗 Looking for questions with certificateId matching: "${cert._id}"`);
      
      // Try different matching strategies
      const matchingQuestions1 = await db.collection('quizzes')
        .find({ certificateId: cert._id.toString() })
        .limit(3)
        .toArray();
      
      const matchingQuestions2 = await db.collection('quizzes')
        .find({ certificateId: cert._id })
        .limit(3)
        .toArray();
        
      const matchingQuestions3 = await db.collection('quizzes')
        .find({ certificateId: new ObjectId(cert._id) })
        .limit(3)
        .toArray();
      
      console.log(`  String match: ${matchingQuestions1.length} questions`);
      console.log(`  ObjectId match: ${matchingQuestions2.length} questions`);
      console.log(`  New ObjectId match: ${matchingQuestions3.length} questions`);
      
      // Check what certificate IDs exist in questions
      const uniqueCertIds = await db.collection('quizzes').distinct('certificateId');
      console.log('\n📊 Unique certificateId values in questions:');
      uniqueCertIds.forEach(id => {
        console.log(`  "${id}" (${typeof id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

debugDataRelationships().catch(console.error);
