'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@immoflow/database';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.hash);

      if (error) {
        console.error('Auth callback error:', error);
        router.push('/auth/login?error=callback');
      } else {
        // Successful authentication, redirect to home
        router.push('/');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-600">Authentifizierung wird verarbeitet...</p>
      </div>
    </main>
  );
}
