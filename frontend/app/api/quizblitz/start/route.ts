import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { getQuizPubSub } from '@/lib/quiz-pubsub';
import { getQuizTimerService } from '@/lib/quiz-timer-service';

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    console.log('🚀 Quiz start endpoint called');
    console.log('✅ User authenticated:', request.user?.username);
    
    const { quizCode, accessCode, timerDuration, players } = await request.json();

    if (!quizCode || !accessCode || !timerDuration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Find quiz room
    const quizRoom = await db.collection('quizRooms').findOne({ 
      quizCode: quizCode.toUpperCase()
    });

    if (!quizRoom) {
      return NextResponse.json(
        { error: 'Quiz room not found' },
        { status: 404 }
      );
    }

    // Check if quiz is already started or finished
    if (quizRoom.status === 'active' || quizRoom.status === 'finished') {
      return NextResponse.json(
        { error: 'Quiz has already been started' },
        { status: 409 }
      );
    }

    // Check if room is ready to start
    if (quizRoom.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Quiz room not ready to start' },
        { status: 400 }
      );
    }

    // Check if user is the quiz host
    if (quizRoom.hostUserId !== request.user?.userId) {
      return NextResponse.json(
        { error: 'Only the quiz host can start the quiz' },
        { status: 403 }
      );
    }

    // Get questions for this access code via access-code-questions collection
    const questionAssignments = await db.collection('access-code-questions').find({
      generatedAccessCode: accessCode.toUpperCase(),
      isEnabled: true  // Only include enabled questions
    }).sort({ sortOrder: 1, assignedQuestionNo: 1 }).toArray();

    if (questionAssignments.length === 0) {
      return NextResponse.json(
        { error: 'No questions found for this access code' },
        { status: 404 }
      );
    }

    // Get the actual question data from quizzes collection
    const questionIds = questionAssignments.map(assignment => assignment.questionId);
    const questionsData = await db.collection('quizzes').find({
      _id: { $in: questionIds }
    }).toArray();

    // Create a map for quick lookup
    const questionsMap = new Map(questionsData.map(q => [q._id.toString(), q]));

    // Build final questions array in the correct order
    const questions = questionAssignments.map(assignment => {
      const questionData = questionsMap.get(assignment.questionId.toString());
      if (!questionData) return null;
      
      // Handle both options (new format) and answers (old format)
      let options = questionData.options;
      if (!options && questionData.answers) {
        // Convert answers string to options object
        // Format: "- A. Option A\n- B. Option B\n- C. Option C\n- D. Option D"
        options = {};
        const lines = questionData.answers.split('\n').filter((line: string) => line.trim());
        lines.forEach((line: string) => {
          const match = line.match(/^-?\s*([A-D])\.\s*(.+)$/);
          if (match) {
            options[match[1]] = match[2].trim();
          }
        });
      }
      
      return {
        _id: questionData._id,
        question: questionData.question,
        options: options || {},
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation,
        difficulty: questionData.difficulty || 'medium',
        assignedQuestionNo: assignment.assignedQuestionNo,
        originalQuestionNo: assignment.originalQuestionNo
      };
    }).filter(q => q !== null); // Filter out any missing questions

    console.log(`✅ Successfully processed ${questions.length} questions`);

    // Check if quiz session already exists (prevent duplicates)
    const existingSession = await db.collection('quizSessions').findOne({
      quizCode: quizCode.toUpperCase(),
      status: 'active'
    });

    if (existingSession) {
      return NextResponse.json(
        { error: 'Quiz session already exists and is active' },
        { status: 409 }
      );
    }

    // Create quiz session (this is what the live quiz page expects)
    const quizSession = {
      quizCode: quizCode.toUpperCase(),
      accessCode: accessCode.toUpperCase(),
      questions: questions,
      players: players || [],
      timerDuration: timerDuration,
      status: 'active', // Status should be 'active' for live quiz
      startedAt: new Date(),
      currentQuestionIndex: 0,
      playerAnswers: {},
      isQuizCompleted: false,
      lastNotifiedQuestionIndex: -1 // Initialize Telegram notification tracking
    };

    // Insert quiz session into quizSessions collection
    const sessionResult = await db.collection('quizSessions').insertOne(quizSession);

    if (!sessionResult.insertedId) {
      return NextResponse.json(
        { error: 'Failed to create quiz session' },
        { status: 500 }
      );
    }

    // Update quiz room status to indicate quiz has started (atomic update with condition)
    const updateResult = await db.collection('quizRooms').updateOne(
      { 
        quizCode: quizCode.toUpperCase(),
        status: 'waiting' // Only update if still waiting (prevent race conditions)
      },
      {
        $set: {
          status: 'active', // Update room status to active
          startedAt: new Date(),
          sessionId: sessionResult.insertedId
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      // If update failed, cleanup the session we just created and return error
      await db.collection('quizSessions').deleteOne({ _id: sessionResult.insertedId });
      return NextResponse.json(
        { error: 'Quiz room was already started by another process' },
        { status: 409 }
      );
    }

    console.log('✅ Quiz started successfully');

    // Initialize PubSub for real-time sync between frontend and Telegram bot
    try {
      console.log('🔧 DEBUG: Initializing PubSub for quiz:', quizCode.toUpperCase());
      const pubsub = await getQuizPubSub();
      
      // Publish quiz started event with first question
      const firstQuestion = {
        questionIndex: 0,
        question: questions[0].question,
        options: questions[0].options,
        correctAnswer: questions[0].correctAnswer, // CRITICAL: Include correctAnswer for multiple choice detection
        timeLimit: timerDuration
      };
      
      console.log('🔧 DEBUG: Publishing quiz started event with first question:', {
        quizCode: quizCode.toUpperCase(),
        questionIndex: firstQuestion.questionIndex,
        question: firstQuestion.question.substring(0, 100) + '...',
        optionsCount: Object.keys(firstQuestion.options).length,
        timeLimit: firstQuestion.timeLimit
      });
      
      await pubsub.publishQuizStarted(quizCode.toUpperCase(), firstQuestion);
      console.log('📡 Published quiz started event for real-time sync');

      // Start the quiz timer service for automatic question progression
      console.log('🔧 DEBUG: Starting quiz timer service for:', quizCode.toUpperCase());
      const timerService = getQuizTimerService();
      await timerService.startQuizTimer(quizCode.toUpperCase());
      console.log('⏱️ Started quiz timer service for automatic progression');
    } catch (pubsubError) {
      console.error('⚠️ PubSub or Timer service initialization failed (using fallback):', pubsubError);
      
      // Fallback: Mark quiz session for Telegram bot processing without Change Streams
      try {
        await db.collection('quizSessions').updateOne(
          { quizCode: quizCode.toUpperCase() },
          { 
            $set: { 
              telegramPlayersNotified: false,
              needsTelegramSync: true,
              lastTelegramSync: new Date()
            } 
          }
        );
        console.log('📡 Marked quiz session for Telegram bot polling');
      } catch (fallbackError) {
        console.error('❌ Fallback notification failed:', fallbackError);
      }
    }
    
    return NextResponse.json({
      success: true,
      questionsCount: questions.length,
      sessionId: sessionResult.insertedId,
      message: 'Quiz started successfully'
    });

  } catch (error) {
    console.error('❌ Error starting quiz:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
