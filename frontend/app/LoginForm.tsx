"use client";

import { useState } from 'react';
import { get } from '@github/webauthn-json';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get redirect URL from query params
  const redirectTo = searchParams.get('redirect') || '/home';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      setMessage('Starting authentication...');
      
      // 1. Get authentication options from the server
      const resp = await fetch('/api/auth/passkey/login-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      console.log('Login Challenge Response Status:', resp.status);
      const options = await resp.json();
      console.log('Login Challenge Options:', options);

      if (options.error) {
        setMessage(options.error);
        return;
      }

      setMessage('Please use your passkey...');

      // 2. Start authentication with the browser
      const authResp = await get(options);

      setMessage('Verifying credentials...');

      // 3. Send the authentication response to the server for verification
      const verificationResp = await fetch('/api/auth/passkey/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, authenticationResponse: authResp }),
      });

      console.log('Verification Response Status:', verificationResp.status);
      const verificationJSON = await verificationResp.json();
      console.log('Verification Response:', verificationJSON);

      if (verificationJSON.error) {
        setMessage(verificationJSON.error);
      } else {
        setMessage('Login successful! Redirecting...');
        
        // Debug: Log all available information
        console.log('🎯 Login successful, checking cookies...');
        console.log('Response data:', verificationJSON);
        
        // Check if we have a valid token/session
        const checkAuth = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include'
        });
        
        console.log('Auth check status:', checkAuth.status);
        if (checkAuth.ok) {
          const authData = await checkAuth.json();
          console.log('Auth check data:', authData);
        }
        
        // Redirect after a short delay to let the user see the success message
        setTimeout(() => {
          console.log('🚀 Redirecting to:', redirectTo);
          router.push(redirectTo);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      setMessage(`Error: ${error.message || 'Authentication failed'}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Logo"
              width={80}
              height={80}
              className="rounded-lg"
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            AWS Certification Quiz
          </h2>
          <p className="text-sm text-gray-600">
            Sign in to access your practice exams
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="username" className="sr-only">
              Username
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={!username.trim()}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign in with Passkey
            </Button>
          </div>

          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              message.includes('Error') || message.includes('failed')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : message.includes('successful')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {message}
            </div>
          )}

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Register here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
