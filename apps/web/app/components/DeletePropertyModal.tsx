'use client';

import React, { useState } from 'react';
import { X, TrendingUp, Sparkles } from 'lucide-react';

interface DeletePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, soldPrice?: number) => void;
  isDeleting: boolean;
  propertyTitle: string;
  originalPrice: number;
  mode?: 'delete' | 'deactivate';
}

export function DeletePropertyModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  propertyTitle,
  originalPrice,
  mode = 'delete',
}: DeletePropertyModalProps) {
  const [reason, setReason] = useState<string>('');
  const [soldPrice, setSoldPrice] = useState<string>('');
  const [motivationalMessage, setMotivationalMessage] = useState<string>('');

  const isDeleteMode = mode === 'delete';
  const title = isDeleteMode ? 'Inserat löschen' : 'Inserat deaktivieren';
  const confirmText = isDeleteMode ? 'Endgültig löschen' : 'Deaktivieren';
  const loadingText = isDeleteMode ? 'Lösche...' : 'Deaktiviere...';
  const warningText = isDeleteMode
    ? 'Diese Aktion kann nicht rückgängig gemacht werden. Das Inserat wird dauerhaft gelöscht.'
    : 'Das Inserat wird deaktiviert und ist nicht mehr öffentlich sichtbar. Sie können es jederzeit wieder aktivieren.';

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!reason) {
      alert('Bitte wählen Sie einen Grund aus.');
      return;
    }

    if (reason === 'sold' && soldPrice) {
      const price = parseInt(soldPrice.replace(/\./g, ''), 10);
      onConfirm(reason, price);
    } else {
      onConfirm(reason);
    }
  };

  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPrice(e.target.value);
    setSoldPrice(formatted);
    // Reset motivational message when price changes
    setMotivationalMessage('');
  };

  const getMotivationalMessage = (soldPriceValue: number, listingPrice: number): string => {
    const difference = soldPriceValue - listingPrice;
    const percentDiff = ((difference / listingPrice) * 100).toFixed(1);

    if (difference > 0) {
      // Sold for MORE than listing price - Congratulations!
      return `🎉 Herzlichen Glückwunsch! Sie haben ${Math.abs(difference).toLocaleString('de-DE')} € (${percentDiff}%) mehr als den Listenpreis erzielt! Das ist ein hervorragendes Ergebnis, das Ihre kluge Verhandlungsführung und die Attraktivität der Immobilie unterstreicht.`;
    } else if (difference < 0) {
      // Sold for LESS than listing price - Encouraging message
      const priceDiffFormatted = Math.abs(difference).toLocaleString('de-DE');

      // Different messages based on how much less
      if (Math.abs(difference / listingPrice) < 0.05) {
        // Less than 5% difference
        return `✅ Gut gemacht! Der Verkaufspreis liegt nur ${priceDiffFormatted} € unter dem Listenpreis. Das ist ein marktgerechter Abschluss, der die aktuellen Finanzierungsbedingungen und Marktdynamik berücksichtigt. Sie haben eine kluge Entscheidung getroffen!`;
      } else if (Math.abs(difference / listingPrice) < 0.10) {
        // 5-10% difference
        return `👍 Eine solide Entscheidung! In der aktuellen Marktlage mit gestiegenen Zinsen ist ein schneller Verkauf oft vorteilhafter als langes Warten. Sie haben ${priceDiffFormatted} € weniger erzielt, aber dafür Planungssicherheit gewonnen und weitere Kosten vermieden.`;
      } else {
        // More than 10% difference
        return `💪 Sie haben die richtige Entscheidung getroffen! Der Verkaufspreis spiegelt die realistische Marktbewertung unter Berücksichtigung von Objektzustand, Lage und aktueller Nachfrage wider. Lieber ein sicherer Verkauf als ein langwieriges Warten mit ungewissem Ausgang.`;
      }
    } else {
      // Exactly the listing price
      return `🎯 Perfekt! Sie haben exakt den Listenpreis erzielt. Das zeigt, dass Ihre Preiseinschätzung von Anfang an marktgerecht war. Ein ausgezeichnetes Ergebnis!`;
    }
  };

  const handleKIEvaluation = () => {
    if (!soldPrice) {
      setMotivationalMessage('⚠️ Bitte geben Sie zuerst einen Verkaufspreis ein.');
      return;
    }

    const price = parseInt(soldPrice.replace(/\./g, ''), 10);
    const message = getMotivationalMessage(price, originalPrice);
    setMotivationalMessage(message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isDeleting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Sie sind dabei, das Inserat <strong>"{propertyTitle}"</strong> zu {isDeleteMode ? 'löschen' : 'deaktivieren'}.
          </p>

          {/* Reason Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Warum möchten Sie das Inserat {isDeleteMode ? 'löschen' : 'deaktivieren'}?
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="reason"
                  value="sold"
                  checked={reason === 'sold'}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-gray-900 font-medium">Verkauft</span>
              </label>

              {!isDeleteMode && (
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="reason"
                    value="temporarily_offline"
                    checked={reason === 'temporarily_offline'}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-gray-900 font-medium">Temporär offline</span>
                </label>
              )}

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="reason"
                  value="not_relevant"
                  checked={reason === 'not_relevant'}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-gray-900 font-medium">Nicht mehr relevant</span>
              </label>
            </div>
          </div>

          {/* Sold Price Input - Only show if "Verkauft" is selected */}
          {reason === 'sold' && (
            <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Helfen Sie der Community! 🎯
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Teilen Sie anonym Ihren Verkaufspreis und helfen Sie anderen, realistische Marktpreise einzuschätzen.
                    Ihre Angabe wird vollständig anonymisiert und kann nicht zurückverfolgt werden.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Verkaufspreis (optional)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={soldPrice}
                      onChange={handlePriceChange}
                      placeholder={`z.B. ${new Intl.NumberFormat('de-DE').format(originalPrice)}`}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      €
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleKIEvaluation}
                    disabled={!soldPrice}
                    className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap flex items-center gap-2"
                  >
                    <Sparkles size={18} />
                    KI-Bewertung
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Listenpreis war: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(originalPrice)}
                </p>
              </div>

              {/* Motivational Message */}
              {motivationalMessage && (
                <div className={`mt-4 p-4 rounded-lg border-2 ${
                  motivationalMessage.startsWith('🎉')
                    ? 'bg-green-50 border-green-200'
                    : motivationalMessage.startsWith('⚠️')
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className="text-sm font-medium text-gray-900 leading-relaxed">
                    {motivationalMessage}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className={`${isDeleteMode ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3 flex items-start gap-2`}>
            <span className={`${isDeleteMode ? 'text-amber-600' : 'text-blue-600'} text-lg`}>
              {isDeleteMode ? '⚠️' : 'ℹ️'}
            </span>
            <p className={`text-sm ${isDeleteMode ? 'text-amber-800' : 'text-blue-800'}`}>
              <strong>{isDeleteMode ? 'Achtung:' : 'Hinweis:'}</strong> {warningText}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting || !reason}
            className={`flex-1 px-6 py-3 ${isDeleteMode ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'} text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isDeleting ? loadingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
