const { MongoClient, ObjectId } = require('mongodb');

const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/examtopics';

async function createStepBasedQuestions() {
  const client = new MongoClient(mongoUrl);
  
  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('saved_questions');
    
    // Create indexes for step-based questions
    await collection.createIndex({ type: 1 });
    await collection.createIndex({ 'steps.stepNumber': 1 });
    console.log('✅ Created indexes for step-based questions');
    
    // Sample step-based questions
    const stepQuestions = [
      {
        question: "Complete the software development lifecycle phases in the correct order",
        type: "steps",
        category: "Software Development",
        difficulty: "intermediate",
        steps: [
          {
            stepNumber: 1,
            title: "Choose Primary Phase",
            description: "Select the first phase of the software development lifecycle",
            options: [
              { id: "1a", label: "A. Planning and Requirements Analysis", value: "planning" },
              { id: "1b", label: "B. Implementation and Coding", value: "implementation" },
              { id: "1c", label: "C. Testing and Quality Assurance", value: "testing" },
              { id: "1d", label: "D. Deployment and Maintenance", value: "deployment" }
            ],
            correctAnswer: "planning"
          },
          {
            stepNumber: 2,
            title: "Choose Secondary Phase", 
            description: "Select the design and architecture phase",
            options: [
              { id: "2a", label: "A. Planning and Requirements Analysis", value: "planning" },
              { id: "2b", label: "B. System Design and Architecture", value: "design" },
              { id: "2c", label: "C. Testing and Quality Assurance", value: "testing" },
              { id: "2d", label: "D. Deployment and Maintenance", value: "deployment" }
            ],
            correctAnswer: "design"
          },
          {
            stepNumber: 3,
            title: "Choose Final Phase",
            description: "Select the implementation phase",
            options: [
              { id: "3a", label: "A. System Design and Architecture", value: "design" },
              { id: "3b", label: "B. Implementation and Coding", value: "implementation" },
              { id: "3c", label: "C. Testing and Quality Assurance", value: "testing" },
              { id: "3d", label: "D. Deployment and Maintenance", value: "deployment" }
            ],
            correctAnswer: "implementation"
          }
        ],
        explanation: "The correct software development lifecycle follows: 1) Planning and Requirements Analysis, 2) System Design and Architecture, 3) Implementation and Coding. This systematic approach ensures proper foundation before moving to technical implementation.",
        tags: ["software development", "SDLC", "process", "methodology"],
        stats: {
          totalAttempts: 0,
          correctAttempts: 0,
          totalStepsAttempted: 0,
          totalStepsCorrect: 0,
          lastAttempted: null
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "system"
      },
      {
        question: "Configure network security layers in the correct hierarchical order",
        type: "steps", 
        category: "Network Security",
        difficulty: "advanced",
        steps: [
          {
            stepNumber: 1,
            title: "Choose Primary Security Layer",
            description: "Select the outermost network security layer",
            options: [
              { id: "1a", label: "A. Firewall Protection", value: "firewall" },
              { id: "1b", label: "B. Application Layer Security", value: "application" },
              { id: "1c", label: "C. Database Encryption", value: "database" },
              { id: "1d", label: "D. User Authentication", value: "authentication" }
            ],
            correctAnswer: "firewall"
          },
          {
            stepNumber: 2,
            title: "Choose Secondary Security Layer",
            description: "Select the application-level security layer",
            options: [
              { id: "2a", label: "A. Firewall Protection", value: "firewall" },
              { id: "2b", label: "B. Application Layer Security", value: "application" },
              { id: "2c", label: "C. Database Encryption", value: "database" },
              { id: "2d", label: "D. User Authentication", value: "authentication" }
            ],
            correctAnswer: "application"
          },
          {
            stepNumber: 3,
            title: "Choose Final Security Layer",
            description: "Select the data protection layer",
            options: [
              { id: "3a", label: "A. Application Layer Security", value: "application" },
              { id: "3b", label: "B. Database Encryption", value: "database" },
              { id: "3c", label: "C. User Authentication", value: "authentication" },
              { id: "3d", label: "D. Network Monitoring", value: "monitoring" }
            ],
            correctAnswer: "database"
          }
        ],
        explanation: "Network security follows a layered approach: 1) Firewall Protection (perimeter defense), 2) Application Layer Security (application-specific controls), 3) Database Encryption (data protection). This defense-in-depth strategy provides multiple security barriers.",
        tags: ["network security", "cybersecurity", "defense in depth", "security layers"],
        stats: {
          totalAttempts: 0,
          correctAttempts: 0,
          totalStepsAttempted: 0,
          totalStepsCorrect: 0,
          lastAttempted: null
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "system"
      },
      {
        question: "Execute database optimization steps in the correct sequence",
        type: "steps",
        category: "Database Management", 
        difficulty: "intermediate",
        steps: [
          {
            stepNumber: 1,
            title: "Choose Primary Optimization",
            description: "Select the first database optimization step",
            options: [
              { id: "1a", label: "A. Analyze Query Performance", value: "analyze" },
              { id: "1b", label: "B. Create Database Indexes", value: "indexes" },
              { id: "1c", label: "C. Optimize Table Structure", value: "structure" },
              { id: "1d", label: "D. Monitor System Resources", value: "monitor" }
            ],
            correctAnswer: "analyze"
          },
          {
            stepNumber: 2,
            title: "Choose Secondary Optimization",
            description: "Select the indexing optimization step",
            options: [
              { id: "2a", label: "A. Analyze Query Performance", value: "analyze" },
              { id: "2b", label: "B. Create Database Indexes", value: "indexes" },
              { id: "2c", label: "C. Optimize Table Structure", value: "structure" },
              { id: "2d", label: "D. Monitor System Resources", value: "monitor" }
            ],
            correctAnswer: "indexes"
          },
          {
            stepNumber: 3,
            title: "Choose Final Optimization",
            description: "Select the ongoing monitoring step",
            options: [
              { id: "3a", label: "A. Create Database Indexes", value: "indexes" },
              { id: "3b", label: "B. Optimize Table Structure", value: "structure" },
              { id: "3c", label: "C. Monitor System Resources", value: "monitor" },
              { id: "3d", label: "D. Backup Database", value: "backup" }
            ],
            correctAnswer: "monitor"
          }
        ],
        explanation: "Database optimization follows: 1) Analyze Query Performance (identify bottlenecks), 2) Create Database Indexes (improve query speed), 3) Monitor System Resources (ongoing performance tracking). This systematic approach ensures effective optimization.",
        tags: ["database", "optimization", "performance", "indexing"],
        stats: {
          totalAttempts: 0,
          correctAttempts: 0,
          totalStepsAttempted: 0,
          totalStepsCorrect: 0,
          lastAttempted: null
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "system"
      }
    ];
    
    // Insert step-based questions
    const result = await collection.insertMany(stepQuestions);
    console.log(`✅ Created ${result.insertedCount} step-based questions`);
    
    // List the created questions
    stepQuestions.forEach((question, index) => {
      console.log(`   ${index + 1}. ${question.question} (${question.steps.length} steps)`);
    });
    
    // Create collection for quiz attempts if it doesn't exist
    const attemptsCollection = db.collection('quiz_attempts');
    await attemptsCollection.createIndex({ questionId: 1, userId: 1 });
    await attemptsCollection.createIndex({ submittedAt: -1 });
    await attemptsCollection.createIndex({ questionType: 1 });
    console.log('✅ Created indexes for quiz attempts collection');
    
    console.log('\\n🎉 Step-based questions setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating step-based questions:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the setup
if (require.main === module) {
  createStepBasedQuestions()
    .then(() => {
      console.log('\\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createStepBasedQuestions };
