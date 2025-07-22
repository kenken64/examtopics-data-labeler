'use client';

import { TimerObservableDemo } from '@/components/timer-observable-demo';

export default function TimerDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 py-8">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            🚀 Observable Timer System Demo
          </h1>
          <p className="text-xl text-muted-foreground">
            Reactive timer implementation using RxJS observables
          </p>
        </div>
        
        <TimerObservableDemo />
      </div>
    </div>
  );
}
