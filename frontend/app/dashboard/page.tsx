"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      const res = await fetch('/api/auth/verify'); // You'll create this endpoint
      if (res.status !== 200) {
        router.push('/');
      } else {
        setMessage('Welcome to your protected dashboard!');
      }
    };
    verifyAuth();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }); // You'll create this endpoint
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
        <p className="text-gray-700">{message}</p>
        <Button
          onClick={handleLogout}
          className="mt-6"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
