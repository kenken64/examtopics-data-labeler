// Test script to verify AI explanation functionality  
// For LOCAL DEVELOPMENT: Add OPENAI_API_KEY to .env.local first
// For PRODUCTION: VERCEL_API_KEY will be used automatically

async function testAiExplanation() {
  console.log('🧪 Testing AI Explanation Integration');
  console.log('=====================================');
  
  // Sample question data (using the AIF-C01 question from database)
  const testQuestion = {
    question: "A company has built a solution by using generative AI. The solution uses large language models (LLMs) to translate training manuals from English into other languages. The company wants to evaluate the accuracy of the solution by examining the text generated for the manuals.\n\nWhich model evaluation strategy meets these requirements?",
    options: [
      "Bilingual Evaluation Understudy (BLEU)",
      "Root mean squared error (RMSE)", 
      "Recall-Oriented Understudy for Gisting Evaluation (ROUGE)",
      "F1 score"
    ],
    correctAnswer: 0,
    explanation: "BLEU (Bilingual Evaluation Understudy) is a metric used to evaluate the accuracy of machine-generated translations by comparing them against reference translations. It is commonly used for translation tasks to measure how close the generated output is to professional human translations."
  };

  try {
    console.log('📤 Sending request to AI explanation API...');
    
    const response = await fetch('http://localhost:3000/api/ai-explanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testQuestion)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.message}`);
    }

    const data = await response.json();
    
    console.log('✅ AI Explanation Generated Successfully!');
    console.log('==========================================');
    console.log(data.aiExplanation);
    console.log('==========================================');
    console.log('🎯 Test completed! AI explanation feature is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('invalid_api_key') || error.message.includes('Vercel AI API key')) {
      console.log('\n💡 Solution: Add your Vercel AI API key to .env.local');
      console.log('   VERCEL_AI_API_KEY=your_vercel_ai_api_key_here');
      console.log('   Get your API key from: https://vercel.com/dashboard/ai');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Solution: Make sure the development server is running');
      console.log('   npm run dev');
    }
  }
}

// Run the test
testAiExplanation().catch(console.error);
