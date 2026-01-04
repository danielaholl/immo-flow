'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export default function ProviderInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    first_name: '',
    last_name: '',
    company: '',
  });

  const createAccountMutation = trpc.auth.createProviderAccount.useMutation({
    onSuccess: (data) => {
      // Save auth token
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      // Redirect to dashboard with welcome message
      router.push('/dashboard?welcome=provider');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    createAccountMutation.mutate({
      invitation_token: token,
      ...formData,
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ungültiger Link</h1>
          <p className="text-gray-600">
            Dieser Einladungslink ist ungültig oder abgelaufen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏡 Willkommen bei Rendito
          </h1>
          <p className="text-gray-600">
            Erstellen Sie Ihr kostenloses Anbieter-Konto
          </p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-purple-900 mb-2">
            ✨ Ihre Willkommensgeschenke:
          </h3>
          <ul className="space-y-2 text-sm text-purple-800">
            <li className="flex items-start">
              <span className="mr-2">🏠</span>
              <span><strong>1 kostenloses Objekt inserieren</strong> - Präsentieren Sie Ihre Immobilie ohne Kosten</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🤖</span>
              <span><strong>3 kostenlose KI-Bewertungen</strong> (Wert: 150€)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">💬</span>
              <span><strong>Unbegrenzter Chat</strong> mit Interessenten</span>
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
              Vorname
            </label>
            <input
              id="first_name"
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nachname
            </label>
            <input
              id="last_name"
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              Firma (optional)
            </label>
            <input
              id="company"
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort *
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
            />
            <p className="text-xs text-gray-500 mt-1">Mindestens 8 Zeichen</p>
          </div>

          <button
            type="submit"
            disabled={createAccountMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createAccountMutation.isPending ? 'Wird erstellt...' : 'Kostenloses Konto erstellen'}
          </button>
        </form>

        {createAccountMutation.error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {createAccountMutation.error.message}
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-6">
          Mit der Registrierung akzeptieren Sie unsere AGB und Datenschutzerklärung.
        </p>
      </div>
    </div>
  );
}
