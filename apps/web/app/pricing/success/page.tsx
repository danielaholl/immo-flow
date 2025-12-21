'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Header } from '../../components/Header';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Redirect to home after 5 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Zahlung erfolgreich!
          </h1>

          <p className="text-gray-600 mb-6">
            Vielen Dank für dein Upgrade. Dein neuer Plan ist ab sofort aktiv.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-primary text-white py-3 px-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              Zur Startseite
            </button>

            <button
              onClick={() => router.push('/profile')}
              className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Mein Profil ansehen
            </button>
          </div>

          <p className="text-sm text-gray-400 mt-6">
            Du wirst in 5 Sekunden automatisch weitergeleitet...
          </p>
        </div>
      </div>
    </div>
  );
}
