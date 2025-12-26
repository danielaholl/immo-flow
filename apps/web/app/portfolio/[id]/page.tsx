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
  PiggyBank,
  Info,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

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

  const { data: taxEffectsData } = trpc.portfolio.getTaxEffects.useQuery();

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
          {/* Purchase Info - Deal-Insights Style */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="font-semibold text-gray-900">Gesamtinvestitionskosten</h2>
              </div>
              {property.purchase_date && (
                <span className="text-sm text-gray-500">
                  {new Date(property.purchase_date).toLocaleDateString('de-DE')}
                </span>
              )}
            </div>

            {(() => {
              const purchasePrice = Number(property.purchase_price) || 0;
              const purchaseCosts = Number(property.purchase_costs) || 0;
              const renovationCosts = Number(property.renovation_costs) || 0;

              // Wenn Kaufnebenkosten gespeichert sind, zeige diese
              // Sonst berechne mit Standardwerten (~10%)
              const hasStoredCosts = purchaseCosts > 0;

              // Standardberechnung für Aufschlüsselung
              const grunderwerbsteuerRate = 5.0; // Default
              const grunderwerbsteuer = purchasePrice * (grunderwerbsteuerRate / 100);
              const notarkosten = purchasePrice * 0.015;
              const grundbuchkosten = purchasePrice * 0.005;

              // Wenn gespeicherte Kosten vorhanden, berechne "Sonstige" als Differenz
              const calculatedBaseCosts = grunderwerbsteuer + notarkosten + grundbuchkosten;
              const sonstigeKosten = hasStoredCosts
                ? Math.max(0, purchaseCosts - calculatedBaseCosts)
                : 0;

              return (
                <div className="space-y-3 text-sm">
                  {/* Kaufpreis */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Kaufpreis</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(purchasePrice)}</span>
                  </div>

                  {/* Grunderwerbsteuer */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">+ Grunderwerbsteuer ({grunderwerbsteuerRate.toFixed(1)}%)</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(grunderwerbsteuer)}</span>
                  </div>

                  {/* Notar */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">+ Notar (~1,5%)</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(notarkosten)}</span>
                  </div>

                  {/* Grundbuch */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">+ Grundbuch (~0,5%)</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(grundbuchkosten)}</span>
                  </div>

                  {/* Sonstige/Makler (wenn vorhanden) */}
                  {sonstigeKosten > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">+ Sonstige (Makler etc.)</span>
                      <span className="font-semibold text-gray-700">{formatCurrency(sonstigeKosten)}</span>
                    </div>
                  )}

                  {/* Renovierung (wenn vorhanden) */}
                  {renovationCosts > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">+ Renovierung</span>
                      <span className="font-semibold text-gray-700">{formatCurrency(renovationCosts)}</span>
                    </div>
                  )}

                  {/* Gesamtinvestition */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-gray-900 font-bold">Gesamtinvestition</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(metrics.totalInvestment)}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Financing - Deal-Insights Style */}
          {property.loan_amount && Number(property.loan_amount) > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <Landmark className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="font-semibold text-gray-900">Monatliche Rate</h2>
              </div>

              {(() => {
                const loanAmount = Number(property.loan_amount) || 0;
                const interestRate = Number(property.interest_rate) || 3.5;
                const amortizationRate = Number(property.amortization_rate) || 2.0;
                const eigenkapital = metrics.totalInvestment - loanAmount;
                const eigenkapitalRate = metrics.totalInvestment > 0
                  ? (eigenkapital / metrics.totalInvestment) * 100
                  : 0;

                // Monatliche Beträge berechnen
                const monatlicheZinsen = Math.round(loanAmount * (interestRate / 100 / 12));
                const monatlicheTilgung = Math.round(loanAmount * (amortizationRate / 100 / 12));

                return (
                  <div className="space-y-3 text-sm">
                    {/* Eigenkapital */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Eigenkapital ({eigenkapitalRate.toFixed(0)}%)</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(eigenkapital)}</span>
                    </div>

                    {/* Darlehensbetrag */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Darlehensbetrag</span>
                      <span className="font-semibold text-gray-700">{formatCurrency(loanAmount)}</span>
                    </div>

                    {/* Zinsen */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Zinsen ({interestRate.toFixed(2)}%)</span>
                      <span className="font-semibold text-gray-700">{formatCurrency(monatlicheZinsen)}/Monat</span>
                    </div>

                    {/* Tilgung */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Tilgung ({amortizationRate.toFixed(1)}%)</span>
                      <span className="font-semibold text-gray-700">{formatCurrency(monatlicheTilgung)}/Monat</span>
                    </div>

                    {/* Monatliche Rate */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-gray-900 font-bold">Monatliche Rate</span>
                      <span className="text-lg font-bold text-purple-600">-{formatCurrency(metrics.monthlyLoanPayment)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Rental Income - Deal-Insights Style (Cashflow) */}
          {(property.monthly_rent || property.monthly_fee) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="font-semibold text-gray-900">Monatlicher Cashflow</h2>
              </div>

              {(() => {
                const monthlyRent = Number(property.monthly_rent) || 0;
                const monthlyFee = Number(property.monthly_fee) || 0;
                const purchasePrice = Number(property.purchase_price) || 0;

                // Nicht-umlegbarer Anteil des Hausgelds (30%)
                const hausgeldNichtUmlegbar = Math.round(monthlyFee * 0.30);

                // Instandhaltung (1% p.a. / 12)
                const instandhaltung = Math.round(purchasePrice * 0.01 / 12);

                // Monatliche Kreditrate
                const monthlyLoanPayment = metrics.monthlyLoanPayment || 0;

                // Ausgaben gesamt (für Cashflow-Berechnung)
                const ausgabenEffektiv = monthlyLoanPayment + hausgeldNichtUmlegbar + instandhaltung;

                return (
                  <div className="space-y-3 text-sm">
                    {/* Mieteinnahmen */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Mieteinnahmen (Kaltmiete)</span>
                      <span className="font-semibold text-green-600">+{formatCurrency(monthlyRent)}</span>
                    </div>

                    {/* Kreditrate */}
                    {monthlyLoanPayment > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">− Kreditrate</span>
                        <span className="font-semibold text-gray-700">-{formatCurrency(monthlyLoanPayment)}</span>
                      </div>
                    )}

                    {/* Hausgeld (nicht umlegbar) */}
                    {monthlyFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">− Hausgeld (30% nicht umlegbar)</span>
                        <span className="font-semibold text-gray-700">-{formatCurrency(hausgeldNichtUmlegbar)}</span>
                      </div>
                    )}

                    {/* Instandhaltung */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">− Instandhaltung (1% p.a.)</span>
                      <span className="font-semibold text-gray-700">-{formatCurrency(instandhaltung)}</span>
                    </div>

                    {/* Cashflow */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-gray-900 font-bold">Cashflow / Monat</span>
                      <span className={`text-lg font-bold ${getCashflowColor(metrics.monthlyCashflow)}`}>
                        {metrics.monthlyCashflow >= 0 ? '+' : ''}{formatCurrency(metrics.monthlyCashflow)}
                      </span>
                    </div>

                    {/* Zusätzliche Kennzahlen */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <span className="text-gray-500">Faktor</span>
                      <span className="font-semibold text-gray-700">{metrics.rentMultiplier.toFixed(1)}x</span>
                    </div>

                    {canAccessAnalytics && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Cash-on-Cash Return</span>
                        <span className={`font-semibold ${getCashflowColor(metrics.cashOnCash)}`}>
                          {metrics.cashOnCash.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
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

          {/* Tax Effect Card - Deal-Insights Style */}
          {taxEffectsData?.taxEffects?.[propertyId] && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <PiggyBank className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="font-semibold text-gray-900">Steuereffekt</h2>
              </div>

              {(() => {
                const taxEffect = taxEffectsData.taxEffects[propertyId];
                const taxRate = taxEffectsData.marginalTaxRate;

                // AfA monatlich berechnen
                const monthlyAfa = Math.round(taxEffect.breakdown.annualAfa / 12);

                // Steuerliches Ergebnis = Cashflow - AfA (wie in Deal-Insights)
                const steuerlichesErgebnisMonatlich = metrics.monthlyCashflow - monthlyAfa;

                // Steuereffekt = Steuerliches Ergebnis × Steuersatz
                const steuereffektMonatlich = Math.round(steuerlichesErgebnisMonatlich * taxRate);
                const isSaving = steuereffektMonatlich < 0; // Negativ = Ersparnis

                // Cashflow nach Steuern
                const cashflowNachSteuern = metrics.monthlyCashflow - steuereffektMonatlich;

                const AFA_LABELS: Record<string, string> = {
                  altbau: 'Altbau 2,5%',
                  bestand: 'Bestand 2%',
                  neubau: 'Neubau 4%',
                  denkmal: 'Denkmal 9%',
                };

                return (
                  <div className="space-y-3 text-sm">
                    {/* Cashflow */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Cashflow / Monat</span>
                      <span className={`font-semibold ${getCashflowColor(metrics.monthlyCashflow)}`}>
                        {metrics.monthlyCashflow >= 0 ? '+' : ''}{formatCurrency(metrics.monthlyCashflow)}
                      </span>
                    </div>

                    {/* AfA */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        − AfA / Monat
                        <span className="text-xs text-gray-400 ml-1">({AFA_LABELS[taxEffect.afaStrategy] || taxEffect.afaStrategy})</span>
                      </span>
                      <span className="font-semibold text-green-600">−{formatCurrency(monthlyAfa)}</span>
                    </div>

                    {/* Steuerliches Ergebnis */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-gray-900 font-medium">Steuerliches Ergebnis</span>
                      <span className={`font-semibold ${steuerlichesErgebnisMonatlich < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(steuerlichesErgebnisMonatlich)}
                      </span>
                    </div>

                    {/* Grenzsteuersatz */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        × Grenzsteuersatz
                        {taxEffectsData.hasTaxProfile && (
                          <span className="text-xs text-primary ml-1">(aus Profil)</span>
                        )}
                      </span>
                      <span className="font-semibold text-gray-700">{Math.round(taxRate * 100)}%</span>
                    </div>

                    {/* Steuerersparnis / Steuerlast */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-gray-900 font-medium">
                        {isSaving ? 'Steuerersparnis / Monat' : 'Steuerlast / Monat'}
                      </span>
                      <span className={`font-semibold ${isSaving ? 'text-green-600' : 'text-red-600'}`}>
                        {isSaving ? '+' : ''}{formatCurrency(Math.abs(steuereffektMonatlich))}
                      </span>
                    </div>

                    {/* Cashflow nach Steuern */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-gray-900 font-bold">Cashflow nach Steuern</span>
                      <span className={`text-lg font-bold ${getCashflowColor(cashflowNachSteuern)}`}>
                        {cashflowNachSteuern >= 0 ? '+' : ''}{formatCurrency(cashflowNachSteuern)}
                      </span>
                    </div>

                    {/* Hinweis */}
                    <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                      {steuerlichesErgebnisMonatlich < 0
                        ? '💡 Die AfA übersteigt den Cashflow → steuerlicher Verlust mindert Ihre Einkommensteuer.'
                        : '💡 Der Cashflow übersteigt die AfA → Sie zahlen zusätzliche Einkommensteuer.'}
                    </p>

                    {/* Tax Profile Hint */}
                    {!taxEffectsData.hasTaxProfile && (
                      <Link
                        href="/steuer-optimierer"
                        className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2 hover:bg-amber-100 transition-colors"
                      >
                        <Settings size={16} className="text-amber-600" />
                        <span className="text-xs text-amber-700">
                          Steuersatz anpassen im Steuer-Optimierer (aktuell: 42% Standard)
                        </span>
                      </Link>
                    )}
                  </div>
                );
              })()}
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
