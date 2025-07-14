import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { quizCode, questionIndex, answer, playerId, timestamp } = await request.json();

    if (!quizCode || questionIndex === undefined || !answer || !playerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Find quiz session
    const quizSession = await db.collection('quizSessions').findOne({ 
      quizCode: quizCode.toUpperCase()
    });

    if (!quizSession) {
      return NextResponse.json(
        { error: 'Quiz session not found' },
        { status: 404 }
      );
    }

    const question = quizSession.questions[questionIndex];
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Calculate score based on correctness and response time
    const isCorrect = answer === question.correctAnswer;
    const basePoints = 1000;
    const responseTime = Date.now() - timestamp;
    const maxTime = quizSession.timerDuration * 1000; // Convert to milliseconds
    const timeBonus = Math.max(0, (maxTime - responseTime) / maxTime * 200);
    const score = isCorrect ? Math.floor(basePoints + timeBonus) : 0;

    // Store player answer
    const answerData = {
      playerId,
      questionIndex,
      answer,
      isCorrect,
      score,
      timestamp: new Date(),
      responseTime
    };

    // Update quiz session with player answer
    await db.collection('quizSessions').updateOne(
      { quizCode: quizCode.toUpperCase() },
      { 
        $set: { 
          [`playerAnswers.${playerId}.q${questionIndex}`]: answerData
        }
      }
    );

    return NextResponse.json({
      success: true,
      isCorrect,
      score,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    });

  } catch (error) {
    console.error('Answer submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
