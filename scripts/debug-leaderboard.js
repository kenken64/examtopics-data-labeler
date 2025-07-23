const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugLeaderboard() {
  try {
    console.log('🔍 DEBUG: Checking leaderboard data...');
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('awscert');
    
    // Check total users
    const totalUsers = await db.collection('users').countDocuments();
    console.log(`📊 Total users in database: ${totalUsers}`);
    
    // Check users with quiz data
    const usersWithQuizzes = await db.collection('users').countDocuments({
      quizzesTaken: { $gt: 0 }
    });
    console.log(`📊 Users with quizzes taken > 0: ${usersWithQuizzes}`);
    
    // Check users with totalPoints
    const usersWithPoints = await db.collection('users').countDocuments({
      totalPoints: { $gt: 0 }
    });
    console.log(`📊 Users with totalPoints > 0: ${usersWithPoints}`);
    
    // Get sample users with scoring fields
    const sampleUsers = await db.collection('users')
      .find({})
      .project({
        username: 1,
        firstName: 1,
        lastName: 1,
        totalPoints: 1,
        quizzesTaken: 1,
        correctAnswers: 1,
        totalQuestions: 1,
        averageScore: 1,
        bestScore: 1,
        currentStreak: 1,
        bestStreak: 1,
        lastQuizDate: 1
      })
      .limit(10)
      .toArray();
    
    console.log('\n📋 Sample users with scoring fields:');
    sampleUsers.forEach(user => {
      console.log(`👤 ${user.username} (${user.firstName} ${user.lastName}):`);
      console.log(`   - totalPoints: ${user.totalPoints || 0}`);
      console.log(`   - quizzesTaken: ${user.quizzesTaken || 0}`);
      console.log(`   - correctAnswers: ${user.correctAnswers || 0}`);
      console.log(`   - totalQuestions: ${user.totalQuestions || 0}`);
      console.log(`   - averageScore: ${user.averageScore || 0}`);
      console.log(`   - bestScore: ${user.bestScore || 0}`);
      console.log(`   - currentStreak: ${user.currentStreak || 0}`);
      console.log(`   - bestStreak: ${user.bestStreak || 0}`);
      console.log(`   - lastQuizDate: ${user.lastQuizDate || 'never'}`);
      console.log('');
    });
    
    // Check quiz attempts collection
    const totalQuizAttempts = await db.collection('quiz-attempts').countDocuments();
    console.log(`📊 Total quiz attempts in database: ${totalQuizAttempts}`);
    
    // Check recent quiz attempts
    const recentAttempts = await db.collection('quiz-attempts')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log('\n📋 Recent quiz attempts:');
    recentAttempts.forEach(attempt => {
      console.log(`📝 ${attempt.userId} - ${attempt.certificateName}`);
      console.log(`   - Score: ${attempt.correctAnswers}/${attempt.totalQuestions} (${attempt.percentage}%)`);
      console.log(`   - Date: ${attempt.createdAt}`);
      console.log('');
    });
    
    // Check QuizBlitz sessions and player scoring
    const totalQuizSessions = await db.collection('quizSessions').countDocuments();
    console.log(`📊 Total QuizBlitz sessions: ${totalQuizSessions}`);
    
    const recentSessions = await db.collection('quizSessions')
      .find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();
    
    console.log('\n📋 Recent QuizBlitz sessions:');
    recentSessions.forEach(session => {
      console.log(`🎮 Quiz Code: ${session.quizCode} - Status: ${session.status}`);
      console.log(`   - Created: ${session.createdAt}`);
      console.log(`   - Player count: ${Object.keys(session.playerAnswers || {}).length}`);
      console.log('');
    });
    
    await client.close();
    console.log('✅ Debug complete');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugLeaderboard();
