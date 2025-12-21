'use client';

import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { Header } from '../../components/Header';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Zahlung abgebrochen
          </h1>

          <p className="text-gray-600 mb-6">
            Der Zahlungsvorgang wurde abgebrochen. Es wurde nichts berechnet.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/pricing')}
              className="w-full bg-primary text-white py-3 px-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              Zurück zur Preisübersicht
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Zur Startseite
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Hast du Fragen? Kontaktiere uns unter{' '}
            <a href="mailto:support@nestando.de" className="text-primary hover:underline">
              support@nestando.de
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
