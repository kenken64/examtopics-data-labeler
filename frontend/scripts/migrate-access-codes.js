const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function migrateAccessCodeQuestions() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🚀 Migrating access-code-questions to add userId...');

    // Get all access-code-questions without userId
    const questionsWithoutUserId = await db.collection('access-code-questions').find({
      userId: { $exists: false }
    }).toArray();

    console.log(`📊 Found ${questionsWithoutUserId.length} access-code-questions without userId`);

    if (questionsWithoutUserId.length === 0) {
      console.log('✅ All access-code-questions already have userId');
      return;
    }

    let migratedCount = 0;

    // For each access-code-question, find the corresponding payee and get their userId
    for (const question of questionsWithoutUserId) {
      try {
        // Find the payee with this generated access code
        const payee = await db.collection('payees').findOne({
          generatedAccessCode: question.generatedAccessCode
        });

        if (payee && payee.userId) {
          // Update the access-code-question with the payee's userId
          await db.collection('access-code-questions').updateOne(
            { _id: question._id },
            { $set: { userId: payee.userId } }
          );
          migratedCount++;
          console.log(`   ✅ Updated question ${question._id} with userId ${payee.userId}`);
        } else {
          console.log(`   ⚠️ No payee found for access code ${question.generatedAccessCode}`);
        }
      } catch (error) {
        console.error(`   ❌ Error updating question ${question._id}:`, error);
      }
    }

    console.log(`\n✅ Migration completed: ${migratedCount}/${questionsWithoutUserId.length} questions updated`);

    // Verify the migration
    const questionsWithUserId = await db.collection('access-code-questions').countDocuments({ 
      userId: { $exists: true } 
    });
    const totalQuestions = await db.collection('access-code-questions').countDocuments({});
    
    console.log(`📊 After migration: ${questionsWithUserId}/${totalQuestions} access-code-questions have userId`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
  }
}

migrateAccessCodeQuestions();
