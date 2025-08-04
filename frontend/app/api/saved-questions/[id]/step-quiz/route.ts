import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';

interface RouteParams {
  params: { id: string };
}

export const POST = withAuth(async (request: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid question ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { answers, timeSpent } = body;

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { error: 'Answers are required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const questionsCollection = db.collection('saved_questions');

    // Get the question
    const question = await questionsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check if question has step data (either in answers field or step1, step2, etc. fields)
    const hasStepData = question.answers || 
                       question.step1 || 
                       Object.keys(question).some(key => key.startsWith('step'));

    if (!hasStepData) {
      return NextResponse.json(
        { error: 'This question is not a step-based question' },
        { status: 400 }
      );
    }

    console.log('📋 Found question for step quiz:', {
      id: question._id,
      hasAnswers: !!question.answers,
      hasStepFields: Object.keys(question).filter(key => key.startsWith('step')).length > 0,
      questionType: question.type,
      answersType: typeof question.answers
    });

    // Parse step data from the question
    let stepData: any = {};
    let stepKeys: string[] = [];

    if (question.answers && typeof question.answers === 'string') {
      try {
        stepData = JSON.parse(question.answers);
        stepKeys = Object.keys(stepData).filter(key => key.startsWith('step')).sort();
      } catch (error) {
        console.error('Failed to parse question.answers:', error);
      }
    } else if (question.answers && typeof question.answers === 'object') {
      stepData = question.answers;
      stepKeys = Object.keys(stepData).filter(key => key.startsWith('step')).sort();
    } else {
      // Check for direct step fields on question object
      stepKeys = Object.keys(question).filter(key => key.startsWith('step')).sort();
      stepData = question;
    }

    if (stepKeys.length === 0) {
      return NextResponse.json(
        { error: 'No step data found in question' },
        { status: 400 }
      );
    }

    console.log('📋 Step data parsed:', {
      stepKeys,
      stepCount: stepKeys.length,
      hasCorrectAnswer: !!question.correctAnswer
    });

    // Parse correct answers from correctAnswer field
    let correctAnswers: Record<string, string> = {};
    if (question.correctAnswer && typeof question.correctAnswer === 'string') {
      try {
        correctAnswers = JSON.parse(question.correctAnswer);
        console.log('📋 Parsed correct answers:', correctAnswers);
      } catch (error) {
        console.error('Failed to parse correctAnswer JSON:', error);
        return NextResponse.json(
          { error: 'Invalid correctAnswer format' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'No correct answers found' },
        { status: 400 }
      );
    }

    // Validate all steps are answered
    const allStepsAnswered = stepKeys.every(stepKey => {
      const stepNumber = parseInt(stepKey.replace('step', ''));
      return answers[stepNumber] !== undefined;
    });

    if (!allStepsAnswered) {
      return NextResponse.json(
        { error: 'All steps must be completed' },
        { status: 400 }
      );
    }

    // Check if all answers are correct
    const stepResults = stepKeys.map(stepKey => {
      const stepNumber = parseInt(stepKey.replace('step', ''));
      const userAnswer = answers[stepNumber];
      const correctAnswer = correctAnswers[stepKey];
      
      // Normalize both strings for comparison
      const normalizeString = (str: string) => str?.trim().normalize('NFKC') || '';
      const isCorrect = normalizeString(userAnswer) === normalizeString(correctAnswer);
      
      console.log(`📊 Step ${stepNumber} validation:`, {
        userAnswer: userAnswer?.substring(0, 50) + '...',
        correctAnswer: correctAnswer?.substring(0, 50) + '...',
        isCorrect
      });
      
      return {
        stepNumber,
        userAnswer,
        correctAnswer,
        isCorrect
      };
    });

    const allCorrect = stepResults.every((result: any) => result.isCorrect);
    const correctSteps = stepResults.filter((result: any) => result.isCorrect).length;
    const totalSteps = stepResults.length;

    // Save the attempt
    const attempt = {
      questionId: id,
      userId: request.user.userId,
      userEmail: request.user.email,
      questionType: 'steps',
      stepAnswers: answers,
      stepResults,
      isCompletelyCorrect: allCorrect,
      correctStepsCount: correctSteps,
      totalStepsCount: totalSteps,
      score: allCorrect ? 100 : Math.round((correctSteps / totalSteps) * 100),
      submittedAt: new Date(),
      timeSpent: timeSpent || 0
    };

    await db.collection('quiz_attempts').insertOne(attempt);

    // Update question statistics
    await questionsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: {
          'stats.totalAttempts': 1,
          'stats.correctAttempts': allCorrect ? 1 : 0,
          'stats.totalStepsAttempted': totalSteps,
          'stats.totalStepsCorrect': correctSteps
        },
        $set: {
          'stats.lastAttempted': new Date()
        }
      }
    );

    console.log(`📊 Step quiz submitted: Question ${id}, User ${request.user.email}, Score: ${attempt.score}%`);

    return NextResponse.json({
      success: true,
      results: {
        allCorrect,
        stepResults,
        score: attempt.score,
        correctSteps: correctSteps,
        totalSteps: totalSteps,
        message: allCorrect ? 'Perfect! All steps completed correctly!' : `${correctSteps} of ${totalSteps} steps correct`
      }
    });

  } catch (error) {
    console.error('❌ Error submitting step quiz:', error);
    return NextResponse.json(
      { error: 'Failed to submit step quiz' },
      { status: 500 }
    );
  }
});
