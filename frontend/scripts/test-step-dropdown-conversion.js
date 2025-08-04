/**
 * Test the step quiz conversion with the actual data structure provided by the user
 */

// Mock data structure based on user's input
const mockQuestion = {
  _id: "688ec8f933c233036e2ad64b",
  certificateId: "688ebb355ac8971d57f813fc", 
  question_no: 5,
  type: "steps",
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
  }
};

// Helper function to convert old step format to new format (same as in component)
const convertAnswersToSteps = (question) => {
  if (!question.answers || typeof question.answers !== 'object') {
    return null;
  }
  
  const steps = [];
  const answers = question.answers;
  
  // Extract step keys and sort them
  const stepKeys = Object.keys(answers).filter(key => key.startsWith('step')).sort();
  
  for (const stepKey of stepKeys) {
    const stepData = answers[stepKey];
    const stepNumber = parseInt(stepKey.replace('step', ''));
    
    if (stepData && Array.isArray(stepData) && stepData.length > 0) {
      // All items in the array are the available options for this step
      const options = stepData.map((optionText, index) => ({
        id: String.fromCharCode(65 + index), // A, B, C, D, E...
        label: `${String.fromCharCode(65 + index)}. ${optionText}`,
        value: optionText
      }));
      
      // Get correct answer from correctAnswer field
      const correctAnswerKey = `Step ${stepNumber}`;
      let correctAnswer = 'A'; // Default
      
      if (question.correctAnswer && typeof question.correctAnswer === 'object') {
        const correctAnswerLetter = question.correctAnswer[correctAnswerKey];
        if (correctAnswerLetter) {
          // Find the corresponding option text based on the letter
          const correctIndex = correctAnswerLetter.charCodeAt(0) - 65; // A=0, B=1, C=2, etc.
          if (correctIndex >= 0 && correctIndex < stepData.length) {
            correctAnswer = stepData[correctIndex];
          }
        }
      }
      
      steps.push({
        stepNumber,
        title: `Step ${stepNumber}`,
        description: `Select the appropriate action for step ${stepNumber}:`,
        options,
        correctAnswer
      });
    }
  }
  
  return steps.length > 0 ? steps : null;
};

function testConversion() {
  console.log('=== Testing Step Quiz Conversion ===');
  console.log('Input question structure:');
  console.log('- Certificate ID:', mockQuestion.certificateId);
  console.log('- Question Number:', mockQuestion.question_no);
  console.log('- Type:', mockQuestion.type);
  console.log('- Step keys:', Object.keys(mockQuestion.answers));
  console.log('- Options per step:', mockQuestion.answers.step1.length);
  
  console.log('\nCorrect Answer mapping:');
  Object.entries(mockQuestion.correctAnswer).forEach(([key, value]) => {
    const stepNum = key.replace('Step ', '');
    const answerIndex = value.charCodeAt(0) - 65;
    const answerText = mockQuestion.answers[`step${stepNum}`][answerIndex];
    console.log(`${key}: ${value} -> "${answerText?.substring(0, 50)}..."`);
  });
  
  console.log('\n=== Conversion Results ===');
  const convertedSteps = convertAnswersToSteps(mockQuestion);
  
  if (convertedSteps) {
    console.log('✅ Conversion successful!');
    console.log(`Generated ${convertedSteps.length} steps:`);
    
    convertedSteps.forEach(step => {
      console.log(`\n📋 ${step.title}:`);
      console.log(`   Description: ${step.description}`);
      console.log(`   Options (${step.options.length}):`);
      step.options.forEach(option => {
        const isCorrect = option.value === step.correctAnswer;
        console.log(`     ${option.label} ${isCorrect ? '✅ (CORRECT)' : ''}`);
      });
      console.log(`   Correct Answer: "${step.correctAnswer?.substring(0, 50)}..."`);
    });
    
    console.log('\n=== UI Rendering Simulation ===');
    console.log('This would render as:');
    convertedSteps.forEach(step => {
      console.log(`\n${step.title} Dropdown:`);
      console.log('- Placeholder: "Select the appropriate action for step X:"');
      console.log('- Options:');
      step.options.forEach(option => {
        console.log(`  ▶ ${option.label}`);
      });
    });
    
    console.log('\n✅ The user can now select from dropdown menus for each step!');
    
  } else {
    console.log('❌ Conversion failed');
  }
}

testConversion();
