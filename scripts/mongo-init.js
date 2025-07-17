// MongoDB Initialization Script for AWS Certification App
// This script runs when the MongoDB container starts for the first time

// Switch to the awscert database
db = db.getSiblingDB('awscert');

// Create collections with initial indexes
print('Creating collections and indexes for AWS Certification App...');

// Users collection
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });

// Questions collection
db.createCollection('questions');
db.questions.createIndex({ questionNo: 1 });
db.questions.createIndex({ category: 1 });
db.questions.createIndex({ difficulty: 1 });
db.questions.createIndex({ tags: 1 });
db.questions.createIndex({ isEnabled: 1 });
db.questions.createIndex({ sortOrder: 1 });

// Quiz sessions collection
db.createCollection('quizSessions');
db.quizSessions.createIndex({ quizCode: 1 }, { unique: true });
db.quizSessions.createIndex({ createdAt: 1 });
db.quizSessions.createIndex({ status: 1 });
db.quizSessions.createIndex({ hostId: 1 });

// Quiz rooms collection
db.createCollection('quizRooms');
db.quizRooms.createIndex({ quizCode: 1 }, { unique: true });
db.quizRooms.createIndex({ createdAt: 1 });
db.quizRooms.createIndex({ status: 1 });

// Quiz events collection (for pubsub)
db.createCollection('quizEvents');
db.quizEvents.createIndex({ quizCode: 1 });
db.quizEvents.createIndex({ type: 1 });
db.quizEvents.createIndex({ timestamp: 1 });
db.quizEvents.createIndex({ lastUpdated: 1 });

// User progress collection
db.createCollection('userProgress');
db.userProgress.createIndex({ userId: 1 });
db.userProgress.createIndex({ questionId: 1 });
db.userProgress.createIndex({ userId: 1, questionId: 1 }, { unique: true });

// Certificates collection
db.createCollection('certificates');
db.certificates.createIndex({ userId: 1 });
db.certificates.createIndex({ certificateType: 1 });
db.certificates.createIndex({ issuedAt: 1 });

// Create a development user for testing
print('Creating development user...');
db.users.insertOne({
  _id: ObjectId(),
  username: 'developer',
  email: 'dev@awscert.local',
  passwordHash: '$2b$10$example.hash.for.development.only',
  role: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
  profile: {
    firstName: 'Developer',
    lastName: 'User',
    timezone: 'UTC'
  },
  preferences: {
    emailNotifications: false,
    difficulty: 'intermediate'
  }
});

// Insert sample question for testing
print('Creating sample question...');
db.questions.insertOne({
  _id: ObjectId(),
  questionNo: 1,
  question: 'Which AWS service provides a managed NoSQL database?',
  options: {
    A: 'Amazon RDS',
    B: 'Amazon DynamoDB',
    C: 'Amazon Redshift',
    D: 'Amazon Aurora'
  },
  correctAnswer: 'B',
  explanation: 'Amazon DynamoDB is a fully managed NoSQL database service that provides fast and predictable performance with seamless scalability.',
  category: 'Database',
  difficulty: 'beginner',
  tags: ['nosql', 'database', 'dynamodb'],
  isEnabled: true,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: {
    source: 'AWS Documentation',
    lastReviewed: new Date()
  }
});

print('MongoDB initialization completed successfully!');
print('Database: awscert');
print('Collections created: users, questions, quizSessions, quizRooms, quizEvents, userProgress, certificates');
print('Sample data: 1 user, 1 question');
print('Development user: developer / dev@awscert.local');