"use client";

import { useState } from 'react';
import { create } from '@github/webauthn-json';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { z } from 'zod';

// Email validation schema
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

export default function Register() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setEmailError('');

    // Validate email with Zod
    const validation = emailSchema.safeParse({ email: username });
    if (!validation.success) {
      setEmailError(validation.error.errors[0].message);
      return;
    }

    try {
      setMessage('Starting registration...');

      // 1. Get registration options from the server
      const resp = await fetch('/api/auth/passkey/register-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      const options = await resp.json();

      if (options.error) {
        setMessage(options.error);
        return;
      }

      setMessage('Please create your passkey...');

      // 2. Start registration with the browser
      const attResp = await create(options);

      setMessage('Verifying registration...');

      // 3. Send the registration response to the server for verification
      const verificationResp = await fetch('/api/auth/passkey/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, attestationResponse: attResp }),
      });

      const verificationJSON = await verificationResp.json();

      if (verificationJSON.error) {
        setMessage(verificationJSON.error);
      } else {
        setMessage('Registration successful! Redirecting to login...');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setMessage(error.message || 'An unknown error occurred during registration');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo/Brand */}
          <div className="text-center">
            <div className="mx-auto mb-6">
              <Image
                src="/Applogo.png"
                alt="Exam CertBot Logo"
                width={150}
                height={150}
                className="mx-auto"
                priority
              />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Create your Exam CertBot account</h1>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-6" noValidate>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                id="username"
                type="email"
                placeholder="Enter your email"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setEmailError(''); // Clear error on change
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  emailError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-500">{emailError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Create Account with Passkey
            </Button>
          </form>

          {/* Sign in link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/')}
                className="text-blue-500 hover:text-blue-600 font-medium"
              >
                Sign in
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
        <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-green-400 via-blue-500 to-purple-600">
          {/* Fallback gradient background if image is not available */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 opacity-90"></div>
          
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
          
          {/* Overlay content - intentionally empty for clean design */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              {/* Clean design without text overlay */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
