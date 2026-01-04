'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Edit2, Save, X, User, Mail, Phone, Building2 } from 'lucide-react';

interface ProviderContactData {
  provider_name?: string | null;
  provider_email?: string | null;
  provider_phone?: string | null;
  provider_company?: string | null;
}

interface ProviderContactEditorProps {
  propertyId: string;
  providerContact?: ProviderContactData | null;
  onUpdate?: () => void;
  readOnly?: boolean; // If true, only show data without edit controls
}

export function ProviderContactEditor({ propertyId, providerContact, onUpdate, readOnly = false }: ProviderContactEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProviderContactData>({
    provider_name: providerContact?.provider_name || '',
    provider_email: providerContact?.provider_email || '',
    provider_phone: providerContact?.provider_phone || '',
    provider_company: providerContact?.provider_company || '',
  });

  const saveProviderContactMutation = trpc.properties.saveProviderContact.useMutation();

  const handleSave = async () => {
    if (!formData.provider_email) {
      alert('Bitte geben Sie mindestens eine E-Mail-Adresse ein.');
      return;
    }

    try {
      await saveProviderContactMutation.mutateAsync({
        property_id: propertyId,
        provider_name: formData.provider_name || undefined,
        provider_email: formData.provider_email,
        provider_phone: formData.provider_phone || undefined,
        provider_company: formData.provider_company || undefined,
      });

      setIsEditing(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Error saving provider contact:', error);
      alert(error.message || 'Fehler beim Speichern der Anbieter-Informationen');
    }
  };

  const handleCancel = () => {
    setFormData({
      provider_name: providerContact?.provider_name || '',
      provider_email: providerContact?.provider_email || '',
      provider_phone: providerContact?.provider_phone || '',
      provider_company: providerContact?.provider_company || '',
    });
    setIsEditing(false);
  };

  // No provider contact and not editing → show empty state (unless readOnly mode)
  // Check if providerContact is null/undefined OR an empty object with no meaningful data
  const hasProviderData = providerContact && (
    providerContact.provider_name ||
    providerContact.provider_email ||
    providerContact.provider_phone ||
    providerContact.provider_company
  );

  // In readOnly mode, don't show anything if no data
  if (!hasProviderData && readOnly) {
    return null;
  }

  if (!hasProviderData && !isEditing) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Keine Anbieter-Informationen vorhanden
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Edit2 size={16} />
            Anbieter hinzufügen
          </button>
        </div>
      </div>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <User size={16} className="text-gray-400" />
                Name
              </div>
            </label>
            <input
              type="text"
              value={formData.provider_name || ''}
              onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
              placeholder="z.B. Max Mustermann"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                E-Mail <span className="text-red-500">*</span>
              </div>
            </label>
            <input
              type="email"
              required
              value={formData.provider_email || ''}
              onChange={(e) => setFormData({ ...formData, provider_email: e.target.value })}
              placeholder="z.B. anbieter@beispiel.de"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                Telefon
              </div>
            </label>
            <input
              type="tel"
              value={formData.provider_phone || ''}
              onChange={(e) => setFormData({ ...formData, provider_phone: e.target.value })}
              placeholder="z.B. +49 123 456789"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-gray-400" />
                Firma
              </div>
            </label>
            <input
              type="text"
              value={formData.provider_company || ''}
              onChange={(e) => setFormData({ ...formData, provider_company: e.target.value })}
              placeholder="z.B. Immobilien GmbH"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saveProviderContactMutation.isPending || !formData.provider_email}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Save size={16} />
              {saveProviderContactMutation.isPending ? 'Speichern...' : 'Speichern'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saveProviderContactMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <X size={16} />
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Read-only display mode
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Anbieter-Informationen
      </h3>

      <div className="space-y-4">
        {/* Name */}
        {providerContact?.provider_name && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 mb-1">Name</p>
              <p className="text-base font-medium text-gray-900 break-words">
                {providerContact.provider_name}
              </p>
            </div>
          </div>
        )}

        {/* Email */}
        {providerContact?.provider_email && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail size={18} className="text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 mb-1">E-Mail</p>
              <a
                href={`mailto:${providerContact.provider_email}`}
                className="text-base font-medium text-primary hover:underline break-words"
              >
                {providerContact.provider_email}
              </a>
            </div>
          </div>
        )}

        {/* Phone */}
        {providerContact?.provider_phone && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Phone size={18} className="text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 mb-1">Telefon</p>
              <a
                href={`tel:${providerContact.provider_phone}`}
                className="text-base font-medium text-primary hover:underline break-words"
              >
                {providerContact.provider_phone}
              </a>
            </div>
          </div>
        )}

        {/* Company */}
        {providerContact?.provider_company && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 size={18} className="text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 mb-1">Firma</p>
              <p className="text-base font-medium text-gray-900 break-words">
                {providerContact.provider_company}
              </p>
            </div>
          </div>
        )}

        {/* Edit Button - only show if not readOnly */}
        {!readOnly && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
            <Edit2 size={16} />
            Bearbeiten
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
