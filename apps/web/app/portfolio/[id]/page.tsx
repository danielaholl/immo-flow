'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { trpc } from '../../../lib/trpc';
import { useSubscription } from '../../../hooks/useSubscription';
import { Header } from '../../components/Header';
import {
  ChevronLeft,
  Building2,
  MapPin,
  Calendar,
  Wallet,
  TrendingUp,
  Landmark,
  Home,
  Store,
  Users,
  Pencil,
  Trash2,
  Lock,
} from 'lucide-react';

// Format currency in German locale
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Get property type label
const getPropertyTypeLabel = (type: string | null): string => {
  switch (type) {
    case 'apartment':
      return 'Wohnung';
    case 'house':
      return 'Haus';
    case 'commercial':
      return 'Gewerbe';
    case 'multi_family':
      return 'Mehrfamilienhaus';
    default:
      return 'Immobilie';
  }
};

// Get property type icon
const getPropertyIcon = (type: string | null) => {
  switch (type) {
    case 'house':
      return Home;
    case 'commercial':
      return Store;
    case 'multi_family':
      return Users;
    default:
      return Building2;
  }
};

// Get color based on value
const getCashflowColor = (value: number): string => {
  return value >= 0 ? 'text-green-600' : 'text-red-600';
};

const getYieldColor = (value: number): string => {
  if (value >= 4) return 'text-green-600';
  if (value >= 2) return 'text-yellow-600';
  return 'text-red-600';
};

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  const { canAccess } = useSubscription();
  const canAccessAnalytics = canAccess('portfolio_analytics');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: property, isLoading } = trpc.portfolio.getById.useQuery(
    { id: propertyId },
    { enabled: !!propertyId }
  );

  const deleteMutation = trpc.portfolio.delete.useMutation({
    onSuccess: () => {
      router.push('/portfolio');
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ id: propertyId });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-gray-200 rounded-2xl"></div>
              <div className="h-32 bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Immobilie nicht gefunden</p>
          <button
            onClick={() => router.push('/portfolio')}
            className="mt-4 text-[#FF385C] hover:underline"
          >
            Zurück zum Portfolio
          </button>
        </div>
        </div>
      </div>
    );
  }

  const PropertyIcon = getPropertyIcon(property.property_type);
  const metrics = property.metrics;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button & Title */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/portfolio')}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeft size={20} />
            Zurück zum Portfolio
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-100 rounded-xl">
                <PropertyIcon className="w-8 h-8 text-gray-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
                <div className="flex items-center gap-2 text-gray-500 mt-1">
                  <MapPin size={16} />
                  <span>{property.location}</span>
                  {property.postal_code && <span>• {property.postal_code}</span>}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                  <span>{getPropertyTypeLabel(property.property_type)}</span>
                  <span>•</span>
                  <span>{property.sqm} m²</span>
                  {property.rooms && (
                    <>
                      <span>•</span>
                      <span>{property.rooms} Zimmer</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/portfolio/${propertyId}/edit`)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Pencil size={18} />
                Bearbeiten
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">Aktueller Wert</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(metrics.currentValue)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">Rendite</p>
            <p className={`text-xl font-bold ${getYieldColor(metrics.grossYield)}`}>
              {metrics.grossYield.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">Cashflow / Monat</p>
            <p className={`text-xl font-bold ${getCashflowColor(metrics.monthlyCashflow)}`}>
              {metrics.monthlyCashflow >= 0 ? '+' : ''}
              {formatCurrency(metrics.monthlyCashflow)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">Eigenkapital</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(metrics.equity)}
            </p>
          </div>
        </div>

        {/* Details Sections */}
        <div className="space-y-6">
          {/* Purchase Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Kaufdaten</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Kaufpreis</p>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(Number(property.purchase_price))}
                </p>
              </div>
              {property.purchase_date && (
                <div>
                  <p className="text-sm text-gray-500">Kaufdatum</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(property.purchase_date).toLocaleDateString('de-DE')}
                  </p>
                </div>
              )}
              {property.purchase_costs && (
                <div>
                  <p className="text-sm text-gray-500">Kaufnebenkosten</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(Number(property.purchase_costs))}
                  </p>
                </div>
              )}
              {property.renovation_costs && Number(property.renovation_costs) > 0 && (
                <div>
                  <p className="text-sm text-gray-500">Renovierungskosten</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(Number(property.renovation_costs))}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Gesamtinvestition</p>
                <p className="font-bold text-gray-900">
                  {formatCurrency(metrics.totalInvestment)}
                </p>
              </div>
            </div>
          </div>

          {/* Financing */}
          {property.loan_amount && Number(property.loan_amount) > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <Landmark className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="font-semibold text-gray-900">Finanzierung</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Darlehensbetrag</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(Number(property.loan_amount))}
                  </p>
                </div>
                {property.interest_rate && (
                  <div>
                    <p className="text-sm text-gray-500">Zinssatz</p>
                    <p className="font-semibold text-gray-900">
                      {Number(property.interest_rate).toFixed(2)}%
                    </p>
                  </div>
                )}
                {property.amortization_rate && (
                  <div>
                    <p className="text-sm text-gray-500">Tilgung</p>
                    <p className="font-semibold text-gray-900">
                      {Number(property.amortization_rate).toFixed(1)}%
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Monatliche Rate</p>
                  <p className="font-semibold text-purple-600">
                    {formatCurrency(metrics.monthlyLoanPayment)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rental Income */}
          {(property.monthly_rent || property.monthly_fee) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="font-semibold text-gray-900">Mieteinnahmen</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {property.monthly_rent && (
                  <div>
                    <p className="text-sm text-gray-500">Kaltmiete / Monat</p>
                    <p className="font-semibold text-green-600">
                      +{formatCurrency(Number(property.monthly_rent))}
                    </p>
                  </div>
                )}
                {property.monthly_fee && (
                  <div>
                    <p className="text-sm text-gray-500">Hausgeld / Monat</p>
                    <p className="font-semibold text-red-600">
                      -{formatCurrency(Number(property.monthly_fee))}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Faktor</p>
                  <p className="font-semibold text-gray-900">
                    {metrics.rentMultiplier.toFixed(1)}x
                  </p>
                </div>
                {canAccessAnalytics && (
                  <div>
                    <p className="text-sm text-gray-500">Cash-on-Cash Return</p>
                    <p className={`font-semibold ${getCashflowColor(metrics.cashOnCash)}`}>
                      {metrics.cashOnCash.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pro Analytics Upgrade CTA */}
          {!canAccessAnalytics && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-100 p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Lock className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Erweiterte Analysen
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Erhalte detaillierte Analysen wie Cash-on-Cash Return, Wertentwicklung und mehr.
                  </p>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    Upgrade auf Pro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {property.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-3">Notizen</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{property.notes}</p>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Immobilie löschen?
              </h3>
              <p className="text-gray-500 mb-6">
                Möchtest du "{property.title}" wirklich aus deinem Portfolio entfernen?
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Löschen...' : 'Löschen'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
