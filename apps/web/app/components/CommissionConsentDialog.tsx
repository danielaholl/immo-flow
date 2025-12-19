'use client';

import { X } from 'lucide-react';

interface CommissionConsentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  commissionRate?: number;
  propertyPrice?: number;
  propertyTitle?: string;
}

export function CommissionConsentDialog({
  isOpen,
  onClose,
  onAccept,
  commissionRate,
}: CommissionConsentDialogProps) {
  if (!isOpen) return null;

  const hasCommission = commissionRate && commissionRate > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Unterlagen freischalten</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed">
            Mit Ihrer Zustimmung werden Ihre Kontaktdaten an den Anbieter weitergegeben.
            {hasCommission && (
              <> Im Falle eines Kaufs fällt eine Maklerprovision von <strong>{commissionRate}%</strong> an.</>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Zustimmen
          </button>
        </div>
      </div>
    </div>
  );
}
