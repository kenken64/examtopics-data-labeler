/**
 * Script to add sample step-based questions for testing the step quiz functionality
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examtopics-labeler';

async function addStepQuizSamples() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('saved_questions');
    
    // Sample step-based questions
    const stepQuestions = [
      {
        question_no: 999901,
        question: "You are configuring a multi-step security process for an AWS application. Follow these steps to implement proper access control:",
        type: 'steps',
        steps: [
          {
            stepNumber: 1,
            instruction: "First, set up an IAM role for the application service",
            options: ["Create a new IAM role", "Use root credentials", "Skip IAM configuration", "Use hardcoded keys"],
            correctAnswer: "A"
          },
          {
            stepNumber: 2,
            instruction: "Next, configure the security group for the EC2 instance",
            options: ["Allow all traffic (0.0.0.0/0)", "Allow only specific ports and IPs", "Disable security groups", "Use default settings"],
            correctAnswer: "B"
          },
          {
            stepNumber: 3,
            instruction: "Finally, enable CloudTrail for auditing",
            options: ["Skip logging", "Enable CloudTrail for the region", "Use local logging only", "Disable all monitoring"],
            correctAnswer: "B"
          }
        ],
        explanation: "This multi-step process ensures proper security implementation: 1) IAM roles provide secure credential management, 2) Security groups should follow least privilege principle, 3) CloudTrail provides audit trails for compliance.",
        isMultipleAnswer: false,
        access_code: "TEST-STEP-001",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question_no: 999902,
        question: "Configure a complete CI/CD pipeline following these sequential steps:",
        type: 'steps',
        steps: [
          {
            stepNumber: 1,
            instruction: "Set up source code repository integration",
            options: ["Connect to GitHub/GitLab", "Use local files only", "Skip version control", "Manual uploads"],
            correctAnswer: "A"
          },
          {
            stepNumber: 2,
            instruction: "Configure the build environment",
            options: ["Use random build tools", "Set up automated build with proper dependencies", "Manual compilation", "Skip build phase"],
            correctAnswer: "B"
          },
          {
            stepNumber: 3,
            instruction: "Set up automated testing",
            options: ["Skip all tests", "Configure unit and integration tests", "Manual testing only", "Test in production"],
            correctAnswer: "B"
          },
          {
            stepNumber: 4,
            instruction: "Configure deployment automation",
            options: ["Manual deployment", "Automated deployment with rollback capability", "Direct production push", "Skip deployment"],
            correctAnswer: "B"
          }
        ],
        explanation: "A proper CI/CD pipeline requires: 1) Version control integration for tracking changes, 2) Automated builds for consistency, 3) Automated testing for quality assurance, 4) Automated deployment with rollback for reliability.",
        isMultipleAnswer: false,
        access_code: "TEST-STEP-002",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question_no: 999903,
        question: "Design a scalable database architecture by following these steps in order:",
        type: 'steps',
        steps: [
          {
            stepNumber: 1,
            instruction: "Choose the appropriate database type for your workload",
            options: ["Always use NoSQL", "Select based on data structure and access patterns", "Use any available database", "Avoid databases entirely"],
            correctAnswer: "B"
          },
          {
            stepNumber: 2,
            instruction: "Implement database replication strategy",
            options: ["No replication needed", "Set up master-slave replication", "Use single instance only", "Replicate everything everywhere"],
            correctAnswer: "B"
          },
          {
            stepNumber: 3,
            instruction: "Configure database monitoring and alerting",
            options: ["Monitor performance metrics and set up alerts", "No monitoring required", "Check manually once a week", "Monitor only during failures"],
            correctAnswer: "A"
          }
        ],
        explanation: "Scalable database architecture requires: 1) Proper database selection based on use case (SQL vs NoSQL), 2) Replication for high availability and read scaling, 3) Comprehensive monitoring for proactive issue detection.",
        isMultipleAnswer: false,
        access_code: "TEST-STEP-003",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert the step questions
    const result = await collection.insertMany(stepQuestions);
    console.log(`✅ Successfully inserted ${result.insertedCount} step-based questions`);
    
    // Verify the questions were inserted
    const insertedQuestions = await collection.find({ type: 'steps' }).toArray();
    console.log(`📊 Total step-based questions in database: ${insertedQuestions.length}`);
    
    console.log('\n📝 Sample questions added:');
    insertedQuestions.forEach(q => {
      console.log(`- Question ${q.question_no}: ${q.steps.length} steps (Access Code: ${q.access_code})`);
    });
    
  } catch (error) {
    console.error('❌ Error adding step quiz samples:', error);
  } finally {
    await client.close();
  }
}

// Run the script
addStepQuizSamples().catch(console.error);
