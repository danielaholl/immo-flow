'use client';

import { useState } from 'react';
import { Lock, Unlock, Info, Loader2, CheckCircle, Clock } from 'lucide-react';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { trpc } from '@/lib/trpc';

interface DocumentAccessRequestFormProps {
  propertyId: string;
  onAccessGranted?: () => void;
}

export function DocumentAccessRequestForm({
  propertyId,
  onAccessGranted
}: DocumentAccessRequestFormProps) {
  const { user } = useAuthContext();
  const [confirmed, setConfirmed] = useState(false);

  const utils = trpc.useUtils();

  const { data: accessStatus, isLoading: isLoadingStatus } = trpc.documentAccess.getAccessStatus.useQuery(
    { propertyId },
    { enabled: !!user }
  );

  const requestMutation = trpc.documentAccess.requestAccess.useMutation({
    onSuccess: (data) => {
      utils.documentAccess.getAccessStatus.invalidate({ propertyId });
      if (data.isAutoApproved) {
        onAccessGranted?.();
      }
    }
  });

  // Loading state
  if (isLoadingStatus && user) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          <span>Lade...</span>
        </div>
      </div>
    );
  }

  // Owner doesn't need this form
  if (accessStatus?.isOwner) {
    return null;
  }

  // Already has access
  if (accessStatus?.hasAccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle size={20} />
          <span className="font-medium">Unterlagen freigeschaltet</span>
        </div>
        <p className="text-sm text-green-600 mt-1">
          Sie haben Zugriff auf alle geschützten Dokumente.
        </p>
      </div>
    );
  }

  // Pending status
  if (accessStatus?.status === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-amber-700">
          <Clock size={20} />
          <span className="font-medium">Anfrage wird bearbeitet</span>
        </div>
        <p className="text-sm text-amber-600 mt-1">
          Der Makler prüft Ihre Anfrage. Sie werden benachrichtigt, sobald die Unterlagen freigeschaltet werden.
        </p>
      </div>
    );
  }

  // Denied status
  if (accessStatus?.status === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-red-700">
          <Lock size={20} />
          <span className="font-medium">Anfrage abgelehnt</span>
        </div>
        <p className="text-sm text-red-600 mt-1">
          {accessStatus.request?.broker_response_message || 'Ihre Anfrage wurde vom Makler abgelehnt.'}
        </p>
        <button
          onClick={() => {
            setConfirmed(true);
            requestMutation.mutate({ propertyId });
          }}
          disabled={requestMutation.isPending}
          className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
        >
          Erneut anfragen
        </button>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-700 mb-3">
          <Lock size={20} />
          <span className="font-semibold">Geschützte Unterlagen</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Melden Sie sich an, um alle Unterlagen anzufordern. Der Makler wird über Ihr Interesse informiert.
        </p>
        <a
          href={`/auth/signup?redirectTo=/property/${propertyId}`}
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors"
        >
          <Unlock size={18} />
          Registrieren / Anmelden
        </a>
      </div>
    );
  }

  // Default: Show request form
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-900 mb-3">
        <Lock size={20} />
        <h4 className="font-semibold">Alle Unterlagen mit einem Klick anfordern</h4>
      </div>

      <label className="flex items-start gap-3 cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 w-5 h-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
        />
        <span className="text-sm text-gray-700">
          Ich bestätige mein ernsthaftes Kaufinteresse
        </span>
      </label>

      <button
        onClick={() => requestMutation.mutate({ propertyId })}
        disabled={!confirmed || requestMutation.isPending}
        className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {requestMutation.isPending ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Unlock size={20} />
        )}
        Unterlagen freischalten
      </button>

      <p className="text-xs text-gray-500 mt-3 flex items-start gap-1.5">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          Der Makler wird über Ihre Anfrage informiert und erhält Ihre Kontaktdaten (Name, E-Mail, Telefon).
        </span>
      </p>
    </div>
  );
}
