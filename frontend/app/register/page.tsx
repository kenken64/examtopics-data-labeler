"use client";

import { useState } from 'react';
import { create } from '@github/webauthn-json';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Register() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
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

      // 2. Start registration with the browser
      const attResp = await create(options);

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
        setMessage(verificationJSON.message);
        router.push('/');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setMessage(error.message || 'An unknown error occurred during registration');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Register with Passkey</h2>
        <form onSubmit={handleRegister}>
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
            Register
          </Button>
        </form>
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="mt-4 w-full"
        >
          Back to Sign In
        </Button>
        {message && <p className="mt-4 text-center text-red-500">{message}</p>}
      </div>
    </div>
  );
}
