/**
 * Add the exact MLA-C01 question structure for testing
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examtopics-labeler';

async function addMLA_C01Question() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('saved_questions');
    
    // The exact question structure as provided by the user
    const mlaQuestion = {
      question_no: 5,
      certificateId: "688ebb355ac8971d57f813fc",
      type: "steps",
      question: "++HOTSPOT++\n\nA company stores historical data in .csv files in Amazon S3. Only some of the data is relevant for analysis. The relevant data must be available for an Amazon SageMaker workflow.\n- Create an Amazon SageMaker batch transform job for data cleaning and feature engineering.\n- Store the resulting data back in Amazon S3.\n- Use Amazon Athena to infer the schemas and available columns.\n- Use AWS Glue crawlers to infer the schemas and available columns.\n- Use AWS Glue DataBrew for data cleaning and feature engineering.",
      answers: {
        "step1": [
          "Create an Amazon SageMaker batch transform job for data cleaning and feature engineering.",
          "Store the resulting data back in Amazon S3.",
          "Use Amazon Athena to infer the schemas and available columns.",
          "Use AWS Glue crawlers to infer the schemas and available columns.",
          "Use AWS Glue DataBrew for data cleaning and feature engineering."
        ],
        "step2": [
          "Create an Amazon SageMaker batch transform job for data cleaning and feature engineering.",
          "Store the resulting data back in Amazon S3.",
          "Use Amazon Athena to infer the schemas and available columns.",
          "Use AWS Glue crawlers to infer the schemas and available columns.",
          "Use AWS Glue DataBrew for data cleaning and feature engineering."
        ],
        "step3": [
          "Create an Amazon SageMaker batch transform job for data cleaning and feature engineering.",
          "Store the resulting data back in Amazon S3.",
          "Use Amazon Athena to infer the schemas and available columns.",
          "Use AWS Glue crawlers to infer the schemas and available columns.",
          "Use AWS Glue DataBrew for data cleaning and feature engineering."
        ]
      },
      correctAnswer: {
        "Step 1": "D", // Use AWS Glue crawlers to infer the schemas and available columns.
        "Step 2": "E", // Use AWS Glue DataBrew for data cleaning and feature engineering.
        "Step 3": "B"  // Store the resulting data back in Amazon S3.
      },
      explanation: "The correct steps, in order, are:\n1. **Use AWS Glue crawlers to infer the schemas and available columns** - AWS Glue crawlers can automatically scan the .csv files in Amazon S3 and determine their schemas and available columns.\n2. **Use AWS Glue DataBrew for data cleaning and feature engineering** - AWS Glue DataBrew provides tools for cleaning, transforming, and preparing data for analysis.\n3. **Store the resulting data back in Amazon S3** - After cleaning and preparing the data, the resulting dataset can be stored back in Amazon S3.**",
      difficulty: "medium",
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check if question already exists
    const existingQuestion = await collection.findOne({
      question_no: 5,
      certificateId: "688ebb355ac8971d57f813fc"
    });
    
    if (existingQuestion) {
      console.log('Question already exists, updating...');
      const result = await collection.updateOne(
        { _id: existingQuestion._id },
        { $set: mlaQuestion }
      );
      console.log('✅ Updated existing question');
    } else {
      console.log('Creating new question...');
      const result = await collection.insertOne(mlaQuestion);
      console.log('✅ Created new question with ID:', result.insertedId);
    }
    
    // Verify the question was saved correctly
    const savedQuestion = await collection.findOne({
      question_no: 5,
      certificateId: "688ebb355ac8971d57f813fc"
    });
    
    if (savedQuestion) {
      console.log('\n📋 Question verification:');
      console.log('- Question Number:', savedQuestion.question_no);
      console.log('- Certificate ID:', savedQuestion.certificateId);
      console.log('- Type:', savedQuestion.type);
      console.log('- Step keys:', Object.keys(savedQuestion.answers));
      console.log('- Options per step:', savedQuestion.answers.step1.length);
      console.log('- Correct answers:', Object.keys(savedQuestion.correctAnswer));
      
      console.log('\n🎯 You can now test at:');
      console.log(`http://localhost:3001/saved-questions/question/5?certificateCode=${savedQuestion.certificateId}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

addMLA_C01Question().catch(console.error);
