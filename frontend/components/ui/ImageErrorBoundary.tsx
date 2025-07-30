// Error boundary component for handling Next.js image domain errors
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ImageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a Next.js image domain configuration error
    const isImageDomainError = error.message.includes('hostname') && 
                              error.message.includes('not configured');
    
    if (isImageDomainError) {
      console.log('🚨 ImageErrorBoundary: Caught Next.js image domain error:', error.message);
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 ImageErrorBoundary: Error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      // Check if it's a domain configuration error
      const isImageDomainError = this.state.error?.message.includes('hostname') && 
                                this.state.error?.message.includes('not configured');

      if (isImageDomainError) {
        console.log('🔧 ImageErrorBoundary: Rendering fallback for domain config error');
        
        return this.props.fallback || (
          <div className="flex items-center justify-center bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
            <div className="text-center">
              <svg
                className="w-8 h-8 text-amber-500 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <p className="text-sm text-amber-700">Image configuration issue</p>
              <p className="text-xs text-amber-600 mt-1">Please check domain settings</p>
            </div>
          </div>
        );
      }
      
      // Generic error fallback
      return this.props.fallback || (
        <div className="flex items-center justify-center bg-gray-100 border-2 border-gray-300 rounded-lg p-4">
          <div className="text-center">
            <svg
              className="w-8 h-8 text-gray-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-gray-600">Failed to load image</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
