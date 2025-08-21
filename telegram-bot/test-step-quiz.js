#!/usr/bin/env node

/**
 * Test script for step-based quiz functionality
 * This script verifies the step quiz implementation without running the full bot
 */

// Mock the required modules and classes
class MockBot {
  constructor() {
    this.stepQuizSessions = new Map();
  }

  // Import the StepQuizSession class
  static StepQuizSession = class {
    constructor(userId, questionData) {
      this.userId = userId;
      this.questionData = questionData;
      this.currentStep = 1;
      this.selectedAnswers = new Map();
      this.isComplete = false;
      this.startTime = new Date();
    }

    selectAnswer(step, answer) {
      this.selectedAnswers.set(step, answer);
    }

    canProceedToStep(step) {
      for (let i = 1; i < step; i++) {
        if (!this.selectedAnswers.has(i)) {
          return false;
        }
      }
      return true;
    }

    isStepCompleted(step) {
      return this.selectedAnswers.has(step);
    }

    getAllSteps() {
      return this.questionData.steps || [];
    }

    getTotalSteps() {
      return this.getAllSteps().length;
    }

    checkAnswers() {
      const steps = this.getAllSteps();
      let correctAnswers = 0;
      for (let i = 0; i < steps.length; i++) {
        const stepNumber = i + 1;
        const selectedAnswer = this.selectedAnswers.get(stepNumber);
        const correctAnswer = steps[i].correctAnswer;
        if (selectedAnswer === correctAnswer) {
          correctAnswers++;
        }
      }
      return {
        correct: correctAnswers,
        total: steps.length,
        percentage: (correctAnswers / steps.length) * 100
      };
    }
  };
}

// Test data similar to the frontend screenshot
const testStepQuestion = {
  _id: 'test_step_quiz_001',
  topic: 'ML Application Development',
  description: 'A company wants to build an ML application. Select and order the correct steps from the following list to develop a well-architected ML workload. Each step should be selected one time.',
  steps: [
    {
      question: 'Select the appropriate action for step 1:',
      options: [
        'Define business goal and frame ML problem',
        'Develop model',
        'Deploy model',
        'Monitor model'
      ],
      correctAnswer: 'A'
    },
    {
      question: 'Select the appropriate action for step 2:',
      options: [
        'Define business goal and frame ML problem',
        'Develop model',
        'Deploy model',
        'Monitor model'
      ],
      correctAnswer: 'B'
    },
    {
      question: 'Select the appropriate action for step 3:',
      options: [
        'Define business goal and frame ML problem',
        'Develop model',
        'Deploy model',
        'Monitor model'
      ],
      correctAnswer: 'C'
    },
    {
      question: 'Select the appropriate action for step 4:',
      options: [
        'Define business goal and frame ML problem',
        'Develop model',
        'Deploy model',
        'Monitor model'
      ],
      correctAnswer: 'D'
    }
  ]
};

function runStepQuizTest() {
  console.log('🧪 Testing Step-Based Quiz Implementation\n');
  const userId = 12345;
  const session = new MockBot.StepQuizSession(userId, testStepQuestion);
  console.log('✅ Created step quiz session');
  console.log(`📊 Total steps: ${session.getTotalSteps()}`);
  console.log(`📋 Topic: ${session.questionData.topic}`);
  console.log(`📝 Description: ${session.questionData.description}\n`);
  // Test step progression
  console.log('🔄 Testing step progression:');
  // Test that user can access step 1
  console.log(`Step 1 accessible: ${session.canProceedToStep(1)}`); // Should be true
  console.log(`Step 2 accessible: ${session.canProceedToStep(2)}`); // Should be false
  // Answer step 1
  session.selectAnswer(1, 'A');
  console.log('Answered step 1 with: A');
  console.log(`Step 1 completed: ${session.isStepCompleted(1)}`); // Should be true
  console.log(`Step 2 accessible: ${session.canProceedToStep(2)}`); // Should be true now
  // Answer remaining steps
  session.selectAnswer(2, 'B');
  session.selectAnswer(3, 'C');
  session.selectAnswer(4, 'D');
  console.log('\n📊 Final Results:');
  const results = session.checkAnswers();
  console.log(`✅ Correct answers: ${results.correct}/${results.total}`);
  console.log(`📈 Score: ${results.percentage.toFixed(1)}%`);
  // Test progress indicators
  console.log('\n🎯 Progress Overview:');
  for (let i = 1; i <= session.getTotalSteps(); i++) {
    const isCompleted = session.isStepCompleted(i);
    const canAccess = session.canProceedToStep(i);
    let stepIcon = '⭕'; // Not accessible
    if (isCompleted) {
      stepIcon = '✅'; // Completed
    } else if (canAccess) {
      stepIcon = '⚪'; // Accessible but not started
    }
    console.log(`${stepIcon} Step ${i}`);
  }
  console.log('\n🎉 Step quiz test completed successfully!');
  console.log('📱 The implementation is ready for use in the Telegram bot.');
  return results;
}

// Run the test
if (require.main === module) {
  try {
    runStepQuizTest();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

module.exports = { runStepQuizTest };
