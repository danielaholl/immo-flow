'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Header } from '@/app/components/Header';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, TrendingUp, Home, Loader2, Brain, Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { CalculatorCards, SavedParams, SimilarPropertiesSidebar } from '@/app/components/calculator';
import { PropertyImagePlaceholder } from '@rendito/ui';
import {
  GRUNDERWERBSTEUER_SAETZE,
  detectStateFromLocation,
  formatCurrency,
  parseNum,
  parseEKRate,
  getAfaRate,
  getBuildingRatio,
} from '../utils/calculator-utils';

type TabType = 'investor' | 'eigennutzer';

export default function CalculatorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const utils = trpc.useUtils();

  const propertyId = params.id as string;
  const initialTab = (searchParams.get('tab') as TabType) || 'investor';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Editable property values for calculations
  const [editableSqm, setEditableSqm] = useState<string>('');
  const [editableYearBuilt, setEditableYearBuilt] = useState<string>('');
  const [editablePurchasePrice, setEditablePurchasePrice] = useState<string>('');

  // Fetch property data
  const { data: property, isLoading } = trpc.properties.getByIdWithOwner.useQuery(
    { id: propertyId },
    {
      enabled: !!propertyId,
      onError: () => {
        router.push('/');
      },
    }
  );

  // Fetch user property parameters
  const { data: userPropertyParams } = trpc.userPropertyParameters.get.useQuery(
    { propertyId },
    { enabled: !!propertyId && !!user }
  );

  // Fetch tax profile
  const { data: taxProfile } = trpc.taxOptimizer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Save mutation
  const saveUserPropertyParamsMutation = trpc.userPropertyParameters.upsert.useMutation({
    onSuccess: () => {
      utils.userPropertyParameters.get.invalidate({ propertyId });
    },
  });

  const handleSaveUserPropertyParams = (params: SavedParams) => {
    saveUserPropertyParamsMutation.mutate({ propertyId, ...params });
  };

  // Initialize editable values when property data loads
  useEffect(() => {
    if (property) {
      setEditableSqm(property.sqm ? String(Math.ceil(property.sqm)) : '');
      setEditableYearBuilt(property.year_built ? String(property.year_built) : '');
      // Initialize purchase price from userParams or property
      const savedPrice = userPropertyParams?.purchase_price;
      if (savedPrice) {
        setEditablePurchasePrice(String(savedPrice));
      } else if (property.price) {
        setEditablePurchasePrice(String(property.price));
      }
    }
  }, [property, userPropertyParams]);

  // Parsed editable values for calculations
  const effectiveSqm = editableSqm ? parseFloat(editableSqm) : (property?.sqm ?? 0);
  const effectiveYearBuilt = editableYearBuilt ? parseInt(editableYearBuilt) : property?.year_built;
  const effectivePurchasePrice = editablePurchasePrice ? parseFloat(editablePurchasePrice) : (property?.price ?? 0);

  // Calculate investor metrics
  const investorMetrics = useMemo(() => {
    if (!property) return null;

    const purchasePrice = effectivePurchasePrice;
    const sqm = effectiveSqm;
    const yearBuilt = effectiveYearBuilt;

    // Geschätzte Mieteinnahmen: Priorität 1) userParams, 2) rent_per_sqm * sqm, 3) actual_monthly_rent, 4) Schätzung basierend auf Standort
    const rentPerSqm = property.buyer_evaluation?.rental_income?.rent_per_sqm;
    const estimatedRentFromEval = rentPerSqm && sqm ? Number(rentPerSqm) * Number(sqm) : 0;
    const actualRent = property.actual_monthly_rent ? Number(property.actual_monthly_rent) : 0;
    // Fallback: Wenn keine Miete bekannt ist, schätze ~10€/qm als Durchschnitt
    const fallbackRent = sqm ? sqm * 10 : 0;
    const calculatedRent = estimatedRentFromEval || actualRent || fallbackRent;
    const mieteinnahmen = parseNum(userPropertyParams?.monthly_rent ?? calculatedRent, 0);

    const financingTerms = property.buyer_evaluation?.financing_terms;
    const defaultEKRate = financingTerms?.loan_to_value ? (100 - Number(financingTerms.loan_to_value)) : 20;
    const eigenkapitalRate = parseEKRate(userPropertyParams?.equity_percentage, defaultEKRate);
    const zinssatz = parseNum(userPropertyParams?.interest_rate, parseNum(financingTerms?.interest_rate, 3.8));
    const tilgung = parseNum(userPropertyParams?.amortization_rate, parseNum(financingTerms?.amortization_rate, 2.0));
    const maklerRate = parseNum(userPropertyParams?.broker_commission, parseNum(property.commission_rate, 0));
    const renovierungskosten = parseNum(userPropertyParams?.renovation_costs, 0);

    const calculateHausgeld = (): number => {
      if (property.monthly_fee && Number(property.monthly_fee) > 0) return Number(property.monthly_fee);
      if (sqm) {
        const hausgeldProQm = yearBuilt && Number(yearBuilt) >= 1980 ? 2.50 : 3.50;
        return Number(sqm) * hausgeldProQm;
      }
      return 0;
    };
    const hausgeld = parseNum(userPropertyParams?.monthly_fee, calculateHausgeld());

    const detectedState = detectStateFromLocation(property.location);
    const grunderwerbsteuerRate = detectedState ? GRUNDERWERBSTEUER_SAETZE[detectedState] : 5.0;
    const grunderwerbsteuer = purchasePrice * (grunderwerbsteuerRate / 100);
    const notarkosten = purchasePrice * 0.015;
    const grundbuchkosten = purchasePrice * 0.005;
    const maklergebuehren = purchasePrice * (maklerRate / 100);
    const kaufnebenkosten = grunderwerbsteuer + notarkosten + grundbuchkosten + maklergebuehren + renovierungskosten;
    const gesamtinvestition = purchasePrice + kaufnebenkosten;
    const eigenkapital = gesamtinvestition * (eigenkapitalRate / 100);
    const darlehensbetrag = gesamtinvestition - eigenkapital;

    const monatlicheZinsen = Math.round(darlehensbetrag * (zinssatz / 100 / 12));
    const monatlicheTilgung = Math.round(darlehensbetrag * (tilgung / 100 / 12));
    const monatlicheRate = monatlicheZinsen + monatlicheTilgung;
    const instandhaltungskosten = Math.ceil(purchasePrice * 0.01 / 12);
    const hausgeldNichtUmlegbar = Math.ceil(hausgeld * 0.30);
    const monatlicheAusgaben = monatlicheRate + hausgeldNichtUmlegbar + instandhaltungskosten;

    const monthlyCashflow = mieteinnahmen > 0 ? mieteinnahmen - monatlicheAusgaben : undefined;
    const grossYield = mieteinnahmen > 0 && purchasePrice > 0 ? (mieteinnahmen * 12 / purchasePrice) * 100 : undefined;
    const rentMultiplier = mieteinnahmen > 0 && purchasePrice > 0 ? purchasePrice / (mieteinnahmen * 12) : undefined;

    let steuereffekt: { monatlich: number; jaehrlich: number } | undefined;
    if (monthlyCashflow !== undefined && purchasePrice > 0) {
      const afaRate = getAfaRate(yearBuilt ? Number(yearBuilt) : undefined);
      const buildingRatio = getBuildingRatio(yearBuilt ? Number(yearBuilt) : undefined);
      const afaJaehrlich = purchasePrice * buildingRatio * afaRate;
      const cashflowJaehrlich = monthlyCashflow * 12;
      const steuerlichesErgebnis = cashflowJaehrlich - afaJaehrlich;
      const grenzsteuersatz = taxProfile?.marginal_tax_rate ? Number(taxProfile.marginal_tax_rate) : 0.42;
      const jaehrlich = steuerlichesErgebnis * grenzsteuersatz;
      steuereffekt = { monatlich: Math.round(jaehrlich / 12), jaehrlich: Math.round(jaehrlich) };
    }

    return {
      purchasePrice, mieteinnahmen, eigenkapitalRate, zinssatz, tilgung, maklerRate,
      renovierungskosten, hausgeld, gesamtinvestition, eigenkapital, darlehensbetrag,
      monatlicheRate, instandhaltungskosten, monthlyCashflow, grossYield, rentMultiplier, steuereffekt,
    };
  }, [property, userPropertyParams, taxProfile, effectiveSqm, effectiveYearBuilt, effectivePurchasePrice]);

  // Calculate eigennutzer metrics
  const eigennutzerMetrics = useMemo(() => {
    if (!property) return null;

    const purchasePrice = effectivePurchasePrice;
    const sqm = effectiveSqm;
    const yearBuilt = effectiveYearBuilt;

    // Geschätzte Mieteinnahmen: Priorität 1) userParams, 2) rent_per_sqm * sqm, 3) actual_monthly_rent, 4) Schätzung
    const rentPerSqm = property.buyer_evaluation?.rental_income?.rent_per_sqm;
    const estimatedRentFromEval = rentPerSqm && sqm ? Number(rentPerSqm) * Number(sqm) : 0;
    const actualRent = property.actual_monthly_rent ? Number(property.actual_monthly_rent) : 0;
    const fallbackRent = sqm ? sqm * 10 : 0;
    const calculatedRent = estimatedRentFromEval || actualRent || fallbackRent;
    const monthlyRent = parseNum(userPropertyParams?.monthly_rent ?? calculatedRent, 0);

    const financingTerms = property.buyer_evaluation?.financing_terms;
    const defaultEKRate = financingTerms?.loan_to_value ? (100 - Number(financingTerms.loan_to_value)) : 20;
    const equityPercentage = parseEKRate(userPropertyParams?.equity_percentage, defaultEKRate);
    const interestRate = parseNum(userPropertyParams?.interest_rate, parseNum(financingTerms?.interest_rate, 3.5));
    const amortizationRate = parseNum(userPropertyParams?.amortization_rate, parseNum(financingTerms?.amortization_rate, 2.0));
    const commissionRate = parseNum(userPropertyParams?.broker_commission, parseNum(property.commission_rate, 0));
    const renovierungskosten = parseNum(userPropertyParams?.renovation_costs, 0);

    const calculateHausgeld = (): number => {
      if (property.monthly_fee && Number(property.monthly_fee) > 0) return Number(property.monthly_fee);
      if (sqm) {
        const hausgeldProQm = yearBuilt && Number(yearBuilt) >= 1980 ? 2.50 : 3.50;
        return Number(sqm) * hausgeldProQm;
      }
      return 0;
    };
    const hausgeld = parseNum(userPropertyParams?.monthly_fee, calculateHausgeld());

    if (monthlyRent <= 0 || purchasePrice <= 0) return null;

    const detectedState = detectStateFromLocation(property.location);
    const grunderwerbsteuerRate = detectedState ? GRUNDERWERBSTEUER_SAETZE[detectedState] : 5.0;

    const grunderwerbsteuer = purchasePrice * (grunderwerbsteuerRate / 100);
    const notarkosten = purchasePrice * 0.015;
    const grundbuchkosten = purchasePrice * 0.005;
    const maklergebuehren = purchasePrice * (commissionRate / 100);
    const kaufnebenkosten = grunderwerbsteuer + notarkosten + grundbuchkosten + maklergebuehren + renovierungskosten;
    const totalInvestment = purchasePrice + kaufnebenkosten;

    const equityAmount = totalInvestment * (equityPercentage / 100);
    const loanAmount = totalInvestment - equityAmount;
    const monatlicheZinsen = Math.round(loanAmount * (interestRate / 100 / 12));
    const monatlicheTilgung = Math.round(loanAmount * (amortizationRate / 100 / 12));
    const monthlyMortgage = monatlicheZinsen + monatlicheTilgung;

    const monthlyMaintenance = Math.ceil(purchasePrice * 0.01 / 12);
    const totalMonthlyCostBuying = monthlyMortgage + hausgeld + monthlyMaintenance;

    // Break-Even ohne Wertsteigerung - reiner Kostenvergleich
    // Jährliche Kosten Käufer (ohne Tilgung, da Tilgung Vermögensaufbau ist)
    const jaehrlicheZinsen = loanAmount * (interestRate / 100);
    const jaehrlicheInstandhaltung = monthlyMaintenance * 12;
    const jaehrlichesHausgeld = hausgeld * 12;
    const jaehrlicheKaeuferKosten = jaehrlicheZinsen + jaehrlicheInstandhaltung + jaehrlichesHausgeld;

    // Jährliche Kosten Mieter
    const jaehrlicheMiete = monthlyRent * 12;

    // Jährliche Ersparnis durch Kaufen
    const jaehrlicheErsparnis = jaehrlicheMiete - jaehrlicheKaeuferKosten;

    let breakEvenYears: number;
    if (jaehrlicheErsparnis <= 0) {
      breakEvenYears = 99; // Kaufen lohnt sich nie (ohne Wertsteigerung)
    } else {
      breakEvenYears = Math.min(Math.ceil(kaufnebenkosten / jaehrlicheErsparnis), 99);
    }

    return {
      purchasePrice, monthlyRent, equityPercentage, interestRate, amortizationRate,
      commissionRate, hausgeld, totalInvestment, equityAmount, loanAmount,
      monthlyMortgage, monthlyMaintenance, totalMonthlyCostBuying, breakEvenYears,
      isBuyingBetter: breakEvenYears <= 10,
    };
  }, [property, userPropertyParams, effectiveSqm, effectiveYearBuilt, effectivePurchasePrice]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-gray-500 dark:text-gray-400">Immobilie nicht gefunden</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      {/* Wrapper für Zurück-Button außerhalb des Inhaltsbereichs */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button - links außerhalb des Inhaltsbereichs */}
        <button
          onClick={() => router.back()}
          className="absolute left-0 top-6 sm:top-8 -translate-x-1/2 hidden lg:flex w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 items-center justify-center hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all z-10 text-gray-700 dark:text-gray-300"
          title="Zurück"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Mobile Back Button - oben links im Inhaltsbereich */}
        <button
          onClick={() => router.back()}
          className="lg:hidden inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 group"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-gray-300 dark:group-hover:border-gray-600 group-hover:shadow-sm transition-all">
            <ArrowLeft size={16} />
          </div>
          <span className="text-sm font-medium">Zurück</span>
        </button>

        <div className="max-w-5xl mx-auto">
        {/* Property Mini Header - volle Breite */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-4 mb-6">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 relative">
              {property.images && property.images.length > 0 ? (
                <Image
                  src={property.images[0]}
                  alt={property.title || 'Immobilie'}
                  fill
                  className="object-cover"
                />
              ) : (
                <PropertyImagePlaceholder
                  className="w-full h-full"
                  propertyType={property.property_type}
                  iconSize={24}
                  showLabel={false}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 dark:text-white truncate">{property.title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{property.location}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">Kaufpreis:</span>
                <div className="relative inline-flex items-center">
                  <input
                    type="text"
                    value={editablePurchasePrice ? new Intl.NumberFormat('de-DE').format(Number(editablePurchasePrice)) : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^\d]/g, '');
                      setEditablePurchasePrice(rawValue);
                    }}
                    placeholder={new Intl.NumberFormat('de-DE').format(property.price ?? 0)}
                    className="w-32 sm:w-40 pl-3 pr-8 py-1.5 border-2 border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg text-base font-semibold text-gray-900 dark:text-white focus:ring-[3px] focus:ring-primary/30 focus:border-primary outline-none text-right"
                  />
                  <span className="absolute right-3 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">€</span>
                </div>
              </div>
            </div>
            {/* Days Online Badge - Glass Style */}
            {property.days_online !== undefined && (
              <span className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium backdrop-blur-sm bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50 flex-shrink-0">
                {property.days_online === 0 ? 'Neu' : `Seit ${property.days_online} ${property.days_online === 1 ? 'Tag' : 'Tagen'} online`}
              </span>
            )}
            {/* Import Button */}
            <Link href="/import-listing">
              <button className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex-shrink-0">
                <Plus size={16} />
                <span>Zu Favoriten hinzufügen</span>
              </button>
            </Link>
          </div>

        </div>

        {/* Content */}
        {activeTab === 'investor' && investorMetrics && (
          <>
            {/* Calculator Cards */}
            <CalculatorCards
                metricsElement={
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Rendite Card */}
                    <div className={`rounded-xl border p-4 text-center ${
                      investorMetrics.grossYield !== undefined && investorMetrics.grossYield >= 4
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
                        : investorMetrics.grossYield !== undefined && investorMetrics.grossYield >= 2
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
                          : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50'
                    }`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rendite</p>
                      <p className={`text-xl font-semibold ${
                        investorMetrics.grossYield !== undefined && investorMetrics.grossYield >= 4
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : investorMetrics.grossYield !== undefined && investorMetrics.grossYield >= 2
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {investorMetrics.grossYield?.toFixed(1) ?? '—'}%
                      </p>
                    </div>
                    {/* Cashflow Card */}
                    <div className={`rounded-xl border p-4 text-center ${
                      investorMetrics.monthlyCashflow !== undefined && investorMetrics.monthlyCashflow > 50
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
                        : investorMetrics.monthlyCashflow !== undefined && investorMetrics.monthlyCashflow >= -50
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
                          : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50'
                    }`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cashflow</p>
                      <p className={`text-xl font-semibold ${
                        investorMetrics.monthlyCashflow !== undefined && investorMetrics.monthlyCashflow > 50
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : investorMetrics.monthlyCashflow !== undefined && investorMetrics.monthlyCashflow >= -50
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {investorMetrics.monthlyCashflow !== undefined
                          ? `${investorMetrics.monthlyCashflow >= 0 ? '+' : ''}${investorMetrics.monthlyCashflow.toLocaleString('de-DE')}€`
                          : '—'}
                      </p>
                    </div>
                    {/* Steuereffekt Card */}
                    <div className={`rounded-xl border p-4 text-center ${
                      investorMetrics.steuereffekt && investorMetrics.steuereffekt.monatlich < -20
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
                        : investorMetrics.steuereffekt && Math.abs(investorMetrics.steuereffekt.monatlich) <= 20
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
                          : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50'
                    }`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Steuereffekt</p>
                      <p className={`text-xl font-semibold ${
                        investorMetrics.steuereffekt && investorMetrics.steuereffekt.monatlich < -20
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : investorMetrics.steuereffekt && Math.abs(investorMetrics.steuereffekt.monatlich) <= 20
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {investorMetrics.steuereffekt
                          ? `${investorMetrics.steuereffekt.monatlich < 0 ? '+' : ''}${Math.abs(investorMetrics.steuereffekt.monatlich).toLocaleString('de-DE')}€`
                          : '—'}
                      </p>
                    </div>
                    {/* Cash on Cash Card */}
                    {(() => {
                      const cashOnCash = investorMetrics.monthlyCashflow !== undefined && investorMetrics.eigenkapital > 0
                        ? (investorMetrics.monthlyCashflow * 12 / investorMetrics.eigenkapital) * 100
                        : undefined;
                      return (
                        <div className={`rounded-xl border p-4 text-center ${
                          cashOnCash !== undefined && cashOnCash > 0
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
                            : cashOnCash !== undefined && cashOnCash >= -2
                              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
                              : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50'
                        }`}>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cash on Cash</p>
                          <p className={`text-xl font-semibold ${
                            cashOnCash !== undefined && cashOnCash > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : cashOnCash !== undefined && cashOnCash >= -2
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-rose-700 dark:text-rose-400'
                          }`}>
                            {cashOnCash !== undefined ? `${cashOnCash.toFixed(1)}%` : '—'}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                }
                mode="investor"
                purchasePrice={property.price ?? 0}
                location={property.location}
                commissionRate={property.commission_rate}
                equityPercentage={property.buyer_evaluation?.financing_terms?.loan_to_value
                  ? (100 - property.buyer_evaluation.financing_terms.loan_to_value)
                  : 20}
                interestRate={property.buyer_evaluation?.financing_terms?.interest_rate}
                amortizationRate={property.buyer_evaluation?.financing_terms?.amortization_rate}
                monthlyFee={property.monthly_fee}
                sqm={property.sqm}
                yearBuilt={property.year_built}
                monthlyRent={property.buyer_evaluation?.rental_income?.rent_per_sqm && property.sqm
                  ? Number(property.buyer_evaluation.rental_income.rent_per_sqm) * Number(property.sqm)
                  : property.actual_monthly_rent}
                estimatedRentPerSqm={property.buyer_evaluation?.rental_income?.rent_per_sqm}
                renovationCosts={0}
                userParams={userPropertyParams}
                onSaveParams={handleSaveUserPropertyParams}
                isSavingParams={saveUserPropertyParamsMutation.isPending}
                canEdit={true}
              />
          </>
        )}

        {activeTab === 'eigennutzer' && eigennutzerMetrics && (
          <>
            {/* Calculator Cards */}
            <CalculatorCards
                metricsElement={
                  <div className="grid grid-cols-3 gap-3">
                    {/* Break-Even Card */}
                    <div className={`rounded-xl border p-4 text-center ${
                      eigennutzerMetrics.breakEvenYears <= 10
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
                        : eigennutzerMetrics.breakEvenYears <= 20
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
                          : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50'
                    }`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Break-Even</p>
                      <p className={`text-xl font-semibold ${
                        eigennutzerMetrics.breakEvenYears <= 10
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : eigennutzerMetrics.breakEvenYears <= 20
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {eigennutzerMetrics.breakEvenYears} J.
                      </p>
                    </div>
                    {/* Miete/Monat Card - neutral (reference value) */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Miete/Monat</p>
                      <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                        {formatCurrency(eigennutzerMetrics.monthlyRent)}
                      </p>
                    </div>
                    {/* Kauf/Monat Card */}
                    <div className={`rounded-xl border p-4 text-center ${
                      eigennutzerMetrics.totalMonthlyCostBuying < eigennutzerMetrics.monthlyRent
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
                        : eigennutzerMetrics.totalMonthlyCostBuying <= eigennutzerMetrics.monthlyRent * 1.1
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
                          : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50'
                    }`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Kauf/Monat</p>
                      <p className={`text-xl font-semibold ${
                        eigennutzerMetrics.totalMonthlyCostBuying < eigennutzerMetrics.monthlyRent
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : eigennutzerMetrics.totalMonthlyCostBuying <= eigennutzerMetrics.monthlyRent * 1.1
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {formatCurrency(eigennutzerMetrics.totalMonthlyCostBuying)}
                      </p>
                    </div>
                  </div>
                }
                mode="eigennutzer"
                purchasePrice={property.price ?? 0}
                location={property.location}
                commissionRate={property.commission_rate}
                equityPercentage={property.buyer_evaluation?.financing_terms?.loan_to_value
                  ? (100 - property.buyer_evaluation.financing_terms.loan_to_value)
                  : 20}
                interestRate={property.buyer_evaluation?.financing_terms?.interest_rate ?? 3.5}
                amortizationRate={property.buyer_evaluation?.financing_terms?.amortization_rate ?? 2.0}
                monthlyFee={property.monthly_fee}
                sqm={property.sqm}
                yearBuilt={property.year_built}
                marketRent={eigennutzerMetrics.monthlyRent}
                userParams={userPropertyParams}
                onSaveParams={handleSaveUserPropertyParams}
                isSavingParams={saveUserPropertyParamsMutation.isPending}
                canEdit={true}
              />
          </>
        )}

        {/* Empty states */}
        {activeTab === 'investor' && !investorMetrics && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <TrendingUp size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Keine Daten für Investment-Analyse verfügbar</p>
          </div>
        )}

        {activeTab === 'eigennutzer' && !eigennutzerMetrics && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Home size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Keine Daten für Kaufen vs. Mieten Analyse verfügbar</p>
          </div>
        )}
        </div>
      </div>

      {/* Horizontale Trennlinie - volle Breite */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-8" />

      {/* Ähnliche Objekte - volle Breite */}
      <div className="pb-8">
        <SimilarPropertiesSidebar
          mode={activeTab}
          currentSqm={effectiveSqm}
          currentLocation={property.location}
          currentPrice={property.price}
          excludePropertyId={propertyId}
          equityPercentage={property.buyer_evaluation?.financing_terms?.loan_to_value
            ? (100 - property.buyer_evaluation.financing_terms.loan_to_value)
            : 20}
          interestRate={property.buyer_evaluation?.financing_terms?.interest_rate ?? 3.8}
        />
      </div>
    </main>
  );
}
