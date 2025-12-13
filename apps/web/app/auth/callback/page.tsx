'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Auth Callback Page (Legacy)
 * This page was used for Supabase OAuth callbacks.
 * Now authentication uses JWT via tRPC - redirecting to home.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home - auth is now handled via JWT/tRPC
    router.push('/');
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-600">Weiterleitung...</p>
      </div>
    </main>
  );
}
