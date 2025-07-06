// Enhanced test script for AI explanation with markdown formatting
// Tests both API functionality and markdown formatting capabilities

async function testAiExplanationWithMarkdown() {
  console.log('🧪 Testing AI Explanation with React Markdown Integration');
  console.log('========================================================');
  
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
    console.log('📝 Question:', testQuestion.question.substring(0, 100) + '...');
    console.log('✅ Correct Answer:', testQuestion.options[testQuestion.correctAnswer]);
    
    const response = await fetch('http://localhost:3000/api/ai-explanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testQuestion)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ API Response: SUCCESS');
      console.log('📊 Status Code:', response.status);
      console.log('');
      console.log('🤖 AI Analysis (with Markdown Formatting):');
      console.log('=' .repeat(60));
      console.log(data.aiExplanation);
      console.log('=' .repeat(60));
      console.log('');
      
      // Check for markdown formatting in the response
      const markdown = data.aiExplanation;
      const hasMarkdownFeatures = {
        headers: /#{1,3}\s/.test(markdown),
        bold: /\*\*.*?\*\*/.test(markdown),
        lists: /^[-*+]\s|^\d+\.\s/m.test(markdown),
        code: /`[^`]+`/.test(markdown),
        emphasis: /\*[^*]+\*/.test(markdown)
      };
      
      console.log('🎨 Markdown Feature Detection:');
      console.log('  - Headers (##):', hasMarkdownFeatures.headers ? '✅' : '❌');
      console.log('  - Bold text (**text**):', hasMarkdownFeatures.bold ? '✅' : '❌');
      console.log('  - Lists (- or 1.):', hasMarkdownFeatures.lists ? '✅' : '❌');
      console.log('  - Code formatting (`code`):', hasMarkdownFeatures.code ? '✅' : '❌');
      console.log('  - Emphasis (*text*):', hasMarkdownFeatures.emphasis ? '✅' : '❌');
      console.log('');
      
      const totalFeatures = Object.values(hasMarkdownFeatures).filter(Boolean).length;
      console.log(`📈 Markdown Features Used: ${totalFeatures}/5`);
      
      if (totalFeatures >= 3) {
        console.log('🎉 EXCELLENT: AI is using rich markdown formatting!');
      } else if (totalFeatures >= 1) {
        console.log('👍 GOOD: AI is using some markdown formatting');
      } else {
        console.log('⚠️  WARNING: AI response lacks markdown formatting');
      }
      
    } else {
      console.log('❌ API Response: FAILED');
      console.log('📊 Status Code:', response.status);
      console.log('💬 Error Message:', data.message || 'Unknown error');
      
      if (response.status === 500 && data.message?.includes('API key')) {
        console.log('');
        console.log('🔧 SOLUTION: Add your OpenAI API key to .env.local:');
        console.log('   OPENAI_API_KEY=sk-your_actual_key_here');
      }
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.log('');
      console.log('🔧 SOLUTION: Start the development server first:');
      console.log('   npm run dev');
      console.log('   Then run this test again');
    }
  }

  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Start development server: npm run dev');
  console.log('2. Open browser: http://localhost:3000');
  console.log('3. Go to any saved question');
  console.log('4. Complete question and click "Show Correct Answer"');
  console.log('5. Test "AI Second Opinion" with markdown rendering');
  console.log('');
  console.log('🎯 Expected Result: Beautiful markdown-formatted AI explanations!');
}

// Run the test
testAiExplanationWithMarkdown();
