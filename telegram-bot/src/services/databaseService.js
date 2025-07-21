const { MongoClient, ObjectId } = require('mongodb');

class DatabaseService {
  constructor() {
    this.mongoClient = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
  }

  async connectToDatabase() {
    if (!this.db) {
      console.log('🔗 Attempting to connect to MongoDB...');
      
      try {
        // Add timeout for MongoDB connection
        const connectionPromise = this.mongoClient.connect();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('MongoDB connection timeout after 10 seconds')), 10000);
        });
        
        await Promise.race([connectionPromise, timeoutPromise]);
        this.db = this.mongoClient.db(process.env.MONGODB_DB_NAME);
        
        // Test the connection with a simple ping
        await this.db.admin().ping();
        console.log('✅ Connected to MongoDB successfully');
        
      } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        
        // For Railway, we might need to wait for MongoDB to be ready
        if (process.env.RAILWAY_ENVIRONMENT) {
          console.log('🔄 Retrying MongoDB connection in 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          try {
            await this.mongoClient.connect();
            this.db = this.mongoClient.db(process.env.MONGODB_DB_NAME);
            await this.db.admin().ping();
            console.log('✅ Connected to MongoDB on retry');
          } catch (retryError) {
            console.error('❌ MongoDB retry failed:', retryError.message);
            throw retryError;
          }
        } else {
          throw error;
        }
      }
    }
    return this.db;
  }

  /**
   * Retrieves AI explanation for a question, with fallback to regular explanation
   * @param {string} questionId - The MongoDB ObjectId of the question
   * @param {string} regularExplanation - The regular explanation as fallback
   * @returns {Promise<string>} The explanation to show (AI if available, otherwise regular)
   */
  async getExplanationForQuestion(questionId, regularExplanation) {
    try {
      console.log(`🔍 Getting explanation for question ID: ${questionId}`);
      const db = await this.connectToDatabase();
      
      // Try to get the question with AI explanation
      const question = await db.collection('quizzes').findOne(
        { _id: new ObjectId(questionId) },
        { projection: { aiExplanation: 1, explanation: 1 } }
      );
      
      console.log(`📋 Question found:`, {
        hasQuestion: !!question,
        hasAiExplanation: !!(question && question.aiExplanation),
        aiExplanationLength: question?.aiExplanation?.length || 0,
        hasRegularExplanation: !!(question && question.explanation),
        regularExplanationLength: question?.explanation?.length || 0
      });
      
      // Return AI explanation if it exists, otherwise return regular explanation
      if (question && question.aiExplanation) {
        console.log(`✅ Returning AI explanation (${question.aiExplanation.length} chars)`);
        return `🤖 AI Second Opinion:\n${question.aiExplanation}`;
      } else {
        console.log(`📖 Returning regular explanation (${regularExplanation?.length || 0} chars)`);
        return regularExplanation || 'No explanation available.';
      }
    } catch (error) {
      console.error('Error retrieving AI explanation:', error);
      // Return regular explanation as fallback if there's an error
      return regularExplanation || 'No explanation available.';
    }
  }

  async getCertificates() {
    const db = await this.connectToDatabase();
    return await db.collection('certificates').find({}).toArray();
  }

  async getCompanies() {
    const db = await this.connectToDatabase();
    return await db.collection('companies').find({}).sort({ name: 1 }).toArray();
  }

  async getCertificateById(certificateId) {
    const db = await this.connectToDatabase();
    return await db.collection('certificates').findOne({
      _id: new ObjectId(certificateId)
    });
  }

  async getQuestionsForAccessCode(accessCode, certificateId = null) {
    const db = await this.connectToDatabase();
    
    let matchQuery = { accessCode: accessCode };
    if (certificateId) {
      matchQuery.certificateId = new ObjectId(certificateId);
    }
    
    return await db.collection('quizzes').find(matchQuery).toArray();
  }

  async checkAccessCodeExists(accessCode) {
    const db = await this.connectToDatabase();
    const count = await db.collection('quizzes').countDocuments({ accessCode: accessCode });
    return count > 0;
  }

  async saveBookmark(userId, questionId, questionNumber, accessCode) {
    const db = await this.connectToDatabase();
    const bookmark = {
      userId: userId,
      questionId: new ObjectId(questionId),
      questionNumber: questionNumber,
      accessCode: accessCode,
      createdAt: new Date()
    };
    
    await db.collection('bookmarks').insertOne(bookmark);
  }

  async getUserBookmarks(userId) {
    const db = await this.connectToDatabase();
    return await db.collection('bookmarks').find({ userId: userId }).toArray();
  }

  async deleteBookmark(userId, questionId) {
    const db = await this.connectToDatabase();
    await db.collection('bookmarks').deleteOne({
      userId: userId,
      questionId: new ObjectId(questionId)
    });
  }

  async getQuizNotifications() {
    const db = await this.connectToDatabase();
    return await db.collection('quizNotifications').find({
      processed: { $ne: true }
    }).toArray();
  }

  async markNotificationAsProcessed(notificationId) {
    const db = await this.connectToDatabase();
    await db.collection('quizNotifications').updateOne(
      { _id: new ObjectId(notificationId) },
      { $set: { processed: true } }
    );
  }

  async close() {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}

module.exports = DatabaseService;