'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, MessageCircle, Mail, Link2, FileText, MapPin, Phone, AlertTriangle, Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { trpc } from '@/lib/trpc';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  documentsCount?: number;
}

type ShareTab = 'basic' | 'full';

export function ShareLinkModal({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
  documentsCount = 0,
}: ShareLinkModalProps) {
  const [activeTab, setActiveTab] = useState<ShareTab>('basic');
  const [copiedBasic, setCopiedBasic] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [fullAccessToken, setFullAccessToken] = useState<string | null>(null);

  // Generate full access token mutation
  const generateTokenMutation = trpc.properties.generateFullAccessToken.useMutation({
    onSuccess: (data) => {
      setFullAccessToken(data.token);
    },
  });

  // Revoke full access token mutation
  const revokeTokenMutation = trpc.properties.revokeFullAccessToken.useMutation({
    onSuccess: () => {
      setFullAccessToken(null);
    },
  });

  // Generate token when switching to full access tab
  useEffect(() => {
    if (activeTab === 'full' && !fullAccessToken && !generateTokenMutation.isLoading) {
      generateTokenMutation.mutate({ propertyId });
    }
  }, [activeTab, fullAccessToken, propertyId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCopiedBasic(false);
      setCopiedFull(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const basicUrl = `${baseUrl}/property/${propertyId}`;
  const fullAccessUrl = fullAccessToken ? `${baseUrl}/s/${fullAccessToken}` : '';

  const handleCopyBasic = async () => {
    await navigator.clipboard.writeText(basicUrl);
    setCopiedBasic(true);
    setTimeout(() => setCopiedBasic(false), 2000);
  };

  const handleCopyFull = async () => {
    if (!fullAccessUrl) return;
    await navigator.clipboard.writeText(fullAccessUrl);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const handleWhatsAppShare = (url: string) => {
    const text = `Schau dir diese Immobilie an: ${propertyTitle}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
  };

  const handleEmailShare = (url: string) => {
    const subject = `Immobilie: ${propertyTitle}`;
    const body = `Ich möchte dir diese Immobilie zeigen:\n\n${propertyTitle}\n\n${url}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const handleDownloadQR = (canvasId: string, filename: string) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${filename}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleRevokeToken = () => {
    if (confirm('Möchten Sie den Vollzugriff-Link wirklich widerrufen? Bestehende Links werden ungültig.')) {
      revokeTokenMutation.mutate({ propertyId });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Immobilie teilen</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Schließen"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'basic'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Teilen
          </button>
          <button
            onClick={() => setActiveTab('full')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'full'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mit Unterlagen teilen
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'basic' ? (
            /* Basic Share Tab */
            <div className="space-y-4">
              {/* URL Input */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Link2 size={18} className="text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={basicUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none truncate"
                />
                <button
                  onClick={handleCopyBasic}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors"
                >
                  {copiedBasic ? (
                    <>
                      <Check size={16} />
                      Kopiert!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Kopieren
                    </>
                  )}
                </button>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center py-4">
                <div className="p-3 bg-white rounded-xl border border-gray-200">
                  <QRCodeCanvas id="qr-basic" value={basicUrl} size={150} />
                </div>
                <button
                  onClick={() => handleDownloadQR('qr-basic', propertyTitle || 'immobilie')}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Download size={16} />
                  QR-Code herunterladen
                </button>
              </div>

              {/* Share Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleWhatsAppShare(basicUrl)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
                >
                  <MessageCircle size={20} />
                  WhatsApp
                </button>
                <button
                  onClick={() => handleEmailShare(basicUrl)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  <Mail size={20} />
                  E-Mail
                </button>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
                <div className="text-blue-500 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-blue-700">
                  Empfänger sehen die öffentliche Ansicht der Immobilie.
                </p>
              </div>
            </div>
          ) : (
            /* Full Access Share Tab */
            <div className="space-y-4">
              {generateTokenMutation.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* URL Input */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                    <Link2 size={18} className="text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={fullAccessUrl}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-gray-700 outline-none truncate"
                    />
                    <button
                      onClick={handleCopyFull}
                      disabled={!fullAccessUrl}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                    >
                      {copiedFull ? (
                        <>
                          <Check size={16} />
                          Kopiert!
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Kopieren
                        </>
                      )}
                    </button>
                  </div>

                  {/* QR Code */}
                  {fullAccessUrl && (
                    <div className="flex flex-col items-center py-4">
                      <div className="p-3 bg-white rounded-xl border border-gray-200">
                        <QRCodeCanvas id="qr-full" value={fullAccessUrl} size={150} />
                      </div>
                      <button
                        onClick={() => handleDownloadQR('qr-full', `${propertyTitle || 'immobilie'}-vollzugriff`)}
                        className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Download size={16} />
                        QR-Code herunterladen
                      </button>
                    </div>
                  )}

                  {/* Share Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleWhatsAppShare(fullAccessUrl)}
                      disabled={!fullAccessUrl}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      <MessageCircle size={20} />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleEmailShare(fullAccessUrl)}
                      disabled={!fullAccessUrl}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      <Mail size={20} />
                      E-Mail
                    </button>
                  </div>

                  {/* What's included */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Wird geteilt:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                          <Check size={12} className="text-green-600" />
                        </div>
                        <MapPin size={16} className="text-gray-400" />
                        Vollständige Adresse
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                          <Check size={12} className="text-green-600" />
                        </div>
                        <FileText size={16} className="text-gray-400" />
                        Alle Dokumente ({documentsCount})
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                          <Check size={12} className="text-green-600" />
                        </div>
                        <Phone size={16} className="text-gray-400" />
                        Kontaktdaten
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
                    <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">
                      Jeder mit diesem Link hat Vollzugriff auf alle Informationen.
                    </p>
                  </div>

                  {/* Revoke Button */}
                  {fullAccessToken && (
                    <button
                      onClick={handleRevokeToken}
                      disabled={revokeTokenMutation.isLoading}
                      className="w-full py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {revokeTokenMutation.isLoading ? 'Wird widerrufen...' : 'Link widerrufen'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
