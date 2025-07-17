const { MongoClient } = require('mongodb');
require('dotenv').config();

class BotTester {
  constructor() {
    this.mongoClient = new MongoClient(process.env.MONGODB_URI);
  }

  async connectToDatabase() {
    await this.mongoClient.connect();
    return this.mongoClient.db('awscert');
  }

  parseAnswersToOptions(answersString) {
    if (!answersString) return { A: '', B: '', C: '', D: '' };

    const options = { A: '', B: '', C: '', D: '' };

    // Split by lines and process each line
    const lines = answersString.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Match patterns like "- A. Option text" or "A. Option text"
      const match = trimmedLine.match(/^[-\s]*([A-D])\.\s*(.+)$/);
      if (match) {
        const [, letter, text] = match;
        options[letter] = text.trim();
      }
    }

    return options;
  }

  async testQuestionParsing() {
    try {
      const db = await this.connectToDatabase();

      // Get a sample question
      const sampleQuestion = await db.collection('quizzes').findOne({});

      if (!sampleQuestion) {
        console.log('No questions found in database');
        return;
      }

      console.log('Sample question from database:');
      console.log('Question:', sampleQuestion.question);
      console.log('Raw answers:', sampleQuestion.answers);
      console.log('Correct answer:', sampleQuestion.correctAnswer);

      // Test parsing
      const parsedOptions = this.parseAnswersToOptions(sampleQuestion.answers);
      console.log('\nParsed options:');
      console.log('A:', parsedOptions.A);
      console.log('B:', parsedOptions.B);
      console.log('C:', parsedOptions.C);
      console.log('D:', parsedOptions.D);

    } catch (error) {
      console.error('Error testing question parsing:', error);
    } finally {
      await this.mongoClient.close();
    }
  }

  async testAccessCodeQuestions(accessCode) {
    try {
      const db = await this.connectToDatabase();

      // Test access code query
      const pipeline = [
        { $match: { generatedAccessCode: accessCode, isEnabled: true } },
        {
          $lookup: {
            from: 'quizzes',
            localField: 'questionId',
            foreignField: '_id',
            as: 'questionDetails'
          }
        },
        { $unwind: '$questionDetails' },
        { $sort: { sortOrder: 1, assignedQuestionNo: 1 } },
        {
          $project: {
            _id: 1,
            assignedQuestionNo: 1,
            question: '$questionDetails.question',
            answers: '$questionDetails.answers',
            correctAnswer: '$questionDetails.correctAnswer',
            explanation: '$questionDetails.explanation'
          }
        }
      ];

      const questions = await db.collection('access-code-questions').aggregate(pipeline).toArray();

      console.log(`\nFound ${questions.length} questions for access code: ${accessCode}`);

      if (questions.length > 0) {
        const firstQuestion = questions[0];
        console.log('\nFirst question:');
        console.log('Question:', firstQuestion.question);
        console.log('Raw answers:', firstQuestion.answers);

        const parsedOptions = this.parseAnswersToOptions(firstQuestion.answers);
        console.log('\nParsed options:');
        console.log('A:', parsedOptions.A);
        console.log('B:', parsedOptions.B);
        console.log('C:', parsedOptions.C);
        console.log('D:', parsedOptions.D);
        console.log('Correct answer:', firstQuestion.correctAnswer);
      }

    } catch (error) {
      console.error('Error testing access code questions:', error);
    } finally {
      await this.mongoClient.close();
    }
  }

  async listAccessCodes() {
    try {
      const db = await this.connectToDatabase();

      const accessCodes = await db.collection('access-code-questions').distinct('generatedAccessCode');
      console.log('Available access codes:', accessCodes);

      return accessCodes;
    } catch (error) {
      console.error('Error listing access codes:', error);
      return [];
    } finally {
      await this.mongoClient.close();
    }
  }
}

async function main() {
  const tester = new BotTester();

  console.log('Testing bot functionality...\n');

  // Test question parsing
  await tester.testQuestionParsing();

  // List available access codes
  const accessCodes = await tester.listAccessCodes();

  // Test with first access code if available
  if (accessCodes.length > 0) {
    await tester.testAccessCodeQuestions(accessCodes[0]);
  }
}

main().catch(console.error);