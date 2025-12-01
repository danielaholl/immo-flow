'use client';

import { useState } from 'react';
import { X, AlertCircle, Shield, Euro } from 'lucide-react';

interface CommissionConsentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  commissionRate?: number;
  propertyPrice: number;
  propertyTitle: string;
}

export function CommissionConsentDialog({
  isOpen,
  onClose,
  onAccept,
  commissionRate,
  propertyPrice,
  propertyTitle,
}: CommissionConsentDialogProps) {
  const [commissionAccepted, setCommissionAccepted] = useState(false);
  const [dataSharingAccepted, setDataSharingAccepted] = useState(false);

  if (!isOpen) return null;

  const hasCommission = commissionRate && commissionRate > 0;
  const commissionAmount = hasCommission ? (propertyPrice * commissionRate) / 100 : 0;

  const handleAccept = () => {
    if (hasCommission && !commissionAccepted) {
      alert('Bitte bestätigen Sie die Provisionsgebühren.');
      return;
    }
    if (!dataSharingAccepted) {
      alert('Bitte bestätigen Sie die Datenweitergabe.');
      return;
    }
    onAccept();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Adresse anzeigen</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Property Info */}
          <div className="bg-gray-50 p-4 rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-1">{propertyTitle}</h3>
            <p className="text-gray-600">
              Um die vollständige Adresse dieser Immobilie zu sehen, benötigen wir Ihre Zustimmung.
            </p>
          </div>

          {/* Commission Section - Only show if there's a commission */}
          {hasCommission && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Euro size={24} className="text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Maklerprovision</h3>
                  <p className="text-gray-600 mb-3">
                    Diese Immobilie wird von einem Makler angeboten. Es fällt eine Provision an:
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">Provisionssatz:</span>
                      <span className="text-lg font-bold text-primary">{commissionRate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">Provisionskosten:</span>
                      <span className="text-lg font-bold text-primary">
                        {new Intl.NumberFormat('de-DE', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(commissionAmount)}
                      </span>
                    </div>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={commissionAccepted}
                      onChange={(e) => setCommissionAccepted(e.target.checked)}
                      className="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">
                      Ich bin mir bewusst, dass bei diesem Inserat eine Maklerprovision in Höhe von{' '}
                      <strong>{commissionRate}%</strong> ({' '}
                      {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(commissionAmount)}
                      ) anfällt und <strong>akzeptiere diese Provisionsgebühr</strong> im Falle eines
                      erfolgreichen Kaufabschlusses.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Data Sharing Section */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Shield size={24} className="text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Datenweitergabe</h3>
                <p className="text-gray-600 mb-4">
                  Um Ihnen die Adresse anzeigen zu können, werden Ihre Kontaktdaten (Name, E-Mail,
                  Telefonnummer) an den Eigentümer/Makler weitergegeben.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-900">
                      Der Eigentümer/Makler kann Sie kontaktieren, um einen Besichtigungstermin zu
                      vereinbaren oder weitere Informationen bereitzustellen.
                    </p>
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dataSharingAccepted}
                    onChange={(e) => setDataSharingAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">
                    Ich stimme zu, dass meine Kontaktdaten an den Eigentümer/Makler weitergegeben
                    werden.
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleAccept}
            disabled={hasCommission ? !commissionAccepted || !dataSharingAccepted : !dataSharingAccepted}
            className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zustimmen und Adresse anzeigen
          </button>
        </div>
      </div>
    </div>
  );
}
