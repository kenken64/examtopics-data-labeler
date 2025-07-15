import { useEffect, useRef } from 'react';

export interface QuizEvent {
  type: string;
  quizCode: string;
  data: any;
  timestamp: string;
}

export function useQuizEvents(quizCode: string, handlers: {
  onQuestionStarted?: (data: any) => void;
  onTimerUpdate?: (data: any) => void;
  onQuestionEnded?: (data: any) => void;
  onQuizEnded?: (data: any) => void;
}) {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!quizCode) return;
    const url = `/api/quizblitz/events/${quizCode}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const evt: QuizEvent = JSON.parse(event.data);
        switch (evt.type) {
          case 'question_started':
            handlers.onQuestionStarted?.(evt.data.question);
            break;
          case 'timer_update':
            handlers.onTimerUpdate?.(evt.data);
            break;
          case 'question_ended':
            handlers.onQuestionEnded?.(evt.data);
            break;
          case 'quiz_ended':
            handlers.onQuizEnded?.(evt.data);
            break;
        }
      } catch (err) {
        // Ignore parse errors
      }
    };
    es.onerror = () => {
      // Optionally handle errors
    };
    return () => {
      es.close();
    };
  }, [quizCode]);
}
