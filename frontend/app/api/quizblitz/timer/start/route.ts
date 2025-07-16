// API endpoint to start quiz timer service
import { NextRequest, NextResponse } from 'next/server';
import { getQuizTimerService } from '@/lib/quiz-timer-service';

export async function POST(request: NextRequest) {
  try {
    const { quizCode } = await request.json();

    if (!quizCode) {
      return NextResponse.json(
        { error: 'Quiz code is required' },
        { status: 400 }
      );
    }

    const timerService = getQuizTimerService();
    await timerService.startQuizTimer(quizCode);

    return NextResponse.json({
      success: true,
      message: 'Quiz timer started successfully'
    });
  } catch (error) {
    console.error('❌ Failed to start quiz timer:', error);
    return NextResponse.json(
      { error: 'Failed to start quiz timer' },
      { status: 500 }
    );
  }
}
