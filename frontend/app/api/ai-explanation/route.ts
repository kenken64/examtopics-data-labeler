import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createOpenAI } from '@ai-sdk/openai';
import { MongoClient, ObjectId } from 'mongodb';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function connectToDatabase() {
  const client = new MongoClient(uri);
  await client.connect();
  return client.db('awscert');
}

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { question, options, correctAnswer, explanation, questionId } = body;

    if (!question || !options || correctAnswer === undefined || !questionId) {
      return NextResponse.json({
        success: false,
        message: 'Question, options, correct answer, and question ID are required'
      }, { status: 400 });
    }

    // Connect to database
    const db = await connectToDatabase();

    // First, check if AI explanation already exists for this question
    const existingQuestion = await db.collection('quizzes').findOne({
      _id: new ObjectId(questionId)
    });

    if (!existingQuestion) {
      return NextResponse.json({
        success: false,
        message: 'Question not found'
      }, { status: 404 });
    }

    // If AI explanation already exists, return it immediately
    if (existingQuestion.aiExplanation) {
      return NextResponse.json({
        success: true,
        aiExplanation: existingQuestion.aiExplanation,
        cached: true
      });
    }

    // Check for API keys (support both Vercel AI and OpenAI)
    const vercelApiKey = process.env.VERCEL_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!vercelApiKey && !openaiApiKey) {
      return NextResponse.json({
        success: false,
        message: 'AI API key not configured. Please add either VERCEL_API_KEY or OPENAI_API_KEY to your environment variables.'
      }, { status: 500 });
    }

    // Configure the AI provider
    let aiModel;
    const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV;
    
    if (vercelApiKey && isProduction) {
      // Use Vercel AI provider only in production/deployed environment
      const vercelOpenAI = createOpenAI({
        baseURL: 'https://api.vercel.com/v1/ai',
        apiKey: vercelApiKey,
      });
      aiModel = vercelOpenAI('gpt-4o');
    } else if (openaiApiKey) {
      // Use direct OpenAI for local development or as fallback
      aiModel = openai('gpt-4o');
    } else {
      return NextResponse.json({
        success: false,
        message: 'For local development, please add OPENAI_API_KEY to your environment variables. VERCEL_API_KEY only works in deployed environments.'
      }, { status: 500 });
    }

    // Format the options for the prompt
    const formattedOptions = options.map((option: string, index: number) => {
      const letter = String.fromCharCode(65 + index); // A, B, C, D, etc.
      return `${letter}. ${option}`;
    }).join('\n');

    const correctLetter = String.fromCharCode(65 + correctAnswer);
    const correctAnswerText = options[correctAnswer];

    // Create the prompt for AI analysis
    const prompt = `As an AWS certification expert, please provide a second opinion explanation for this AWS certification question. 

Question: ${question}

Answer Options:
${formattedOptions}

Correct Answer: ${correctLetter}. ${correctAnswerText}

Original Explanation: ${explanation || 'No explanation provided'}

Please provide:
1. A clear explanation of why the correct answer is right
2. Brief explanations of why the other options are incorrect
3. Any additional context or AWS best practices that would help understanding
4. If you disagree with the provided answer, explain why and provide your reasoning

Keep your response focused, educational, and specific to AWS services and concepts. 

**Important**: Format your response using markdown for better readability:
- Use **bold** for emphasis on key concepts
- Use bullet points or numbered lists for structured information
- Use headers (##) to organize different sections
- Use backticks for AWS service names and technical terms
- Keep paragraphs concise and well-structured`;

    // Use Vercel AI SDK with configured model
    const { text } = await generateText({
      model: aiModel,
      prompt: prompt,
      maxTokens: 1000,
      temperature: 0.3,
    });

    // Save the AI explanation to the database
    await db.collection('quizzes').updateOne(
      { _id: new ObjectId(questionId) },
      { 
        $set: { 
          aiExplanation: text,
          aiExplanationGeneratedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      aiExplanation: text,
      cached: false
    });

  } catch (error) {
    console.error('Error generating AI explanation:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to generate AI explanation'
    }, { status: 500 });
  }
});
