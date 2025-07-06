"use client";

import { useState, useEffect } from 'react';
import { get } from '@github/webauthn-json';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login with Passkey</h2>
        <form onSubmit={handleLogin}>
          <div className="grid gap-2 mb-4">
            <Label htmlFor="username">Username</Label>
            <Input
              type="text"
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
        <Button
          variant="outline"
          onClick={() => router.push('/register')}
          className="mt-4 w-full"
        >
          Register
        </Button>
        {message && (
          <p className={`mt-4 text-center ${
            message.includes('successful') ? 'text-green-600' : 'text-red-500'
          }`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
