"use client";

import { useState } from 'react';
import { get } from '@github/webauthn-json';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

export default function Login() {
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
        
        // Simple redirect with delay to ensure cookie is processed
        setTimeout(() => {
          console.log('🚀 Redirecting to:', redirectTo);
          window.location.href = redirectTo;
        }, 1500); // Longer delay to ensure cookie is fully processed
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setMessage(error.message || 'An unknown error occurred during login');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo/Brand */}
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-black rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-white rounded-sm"></div>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Sign in to Exam CertBot</h1>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                id="username"
                type="text"
                placeholder="capy@scrapybara.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Sign in with Passkey
            </Button>
          </form>

          {/* Sign up link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-blue-500 hover:text-blue-600 font-medium"
              >
                Sign up
              </button>
            </p>
          </div>

          {/* Error/Success Message */}
          {message && (
            <div className={`text-center text-sm ${
              message.includes('successful') ? 'text-green-600' : 'text-red-500'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:flex lg:flex-1 relative">
        <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
          {/* Fallback gradient background if image is not available */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 opacity-90"></div>
          
          {/* Try to load the image, fall back to gradient if not available */}
          <Image
            src="/auth-bg.png"
            alt="Authentication background"
            fill
            className="object-cover"
            priority
            onError={(e) => {
              // Hide image if it fails to load, keeping the gradient background
              e.currentTarget.style.display = 'none';
            }}
          />
          
          {/* Overlay content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <h2 className="text-3xl font-bold mb-2">Welcome to Exam CertBot</h2>
              <p className="text-lg opacity-90">Your secure certification platform</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
