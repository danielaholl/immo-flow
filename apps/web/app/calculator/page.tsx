'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Header } from '../components/Header';
import { PropertyFormData } from '../components/PropertyInputForm';
import { CalculatorCards, MetricsCards, SavedParams, SimilarPropertiesSidebar, EditState } from '../components/calculator';
import { PropertyImagePlaceholder } from '@rendito/ui';
import { trpc } from '@/lib/trpc';
import { useAuthContext } from '@/app/providers/AuthProvider';
import {
  TrendingUp,
  Home,
  Loader2,
  Building2,
  ArrowLeft,
  MapPin,
  Plus,
  Save,
  Check,
  Euro,
  Square,
  Calendar,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import {
  GRUNDERWERBSTEUER_SAETZE,
  detectStateFromLocation,
  formatCurrency,
  parseNum,
  parseEKRate,
  getAfaRate,
  getBuildingRatio,
  extractPLZFromLocation,
} from '../property/[id]/utils/calculator-utils';
import { calculateMetrics } from '../components/calculator/calculations';

type TabType = 'investor' | 'eigennutzer';

const DEFAULT_FORM_DATA: PropertyFormData = {
  price: '500000',
  sqm: '50',
  location: '80333',
  monthlyRent: '1500',
  yearBuilt: '2000',
  condition: '',
  commissionRate: '3.57',
  monthlyFee: '',
  renovationCosts: '0',
};

const STORAGE_KEY = 'calculator-form-data';

export default function CalculatorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const utils = trpc.useUtils();

  const propertyId = searchParams.get('propertyId');

  // Read mode from URL (reactive - updates on searchParams change)
  const modeParam = searchParams.get('mode') as TabType | null;
  const activeTab: TabType = modeParam === 'eigennutzer' ? 'eigennutzer' : 'investor';

  const [formData, setFormData] = useState<PropertyFormData>(DEFAULT_FORM_DATA);
  const [isLookingUpPLZ, setIsLookingUpPLZ] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [calculatorEditState, setCalculatorEditState] = useState<Partial<EditState>>({});
  const [initialEditState, setInitialEditState] = useState<Partial<EditState> | undefined>(undefined);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved data from localStorage after hydration (client-side only)
  useEffect(() => {
    if (propertyId) {
      setIsHydrated(true);
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Load form data
        if (parsed.formData) {
          setFormData(prev => ({ ...prev, ...parsed.formData }));
        } else {
          // Legacy: old format without nested structure
          setFormData(prev => ({ ...prev, ...parsed }));
        }
        // Load extended calculator state
        if (parsed.editState) {
          setInitialEditState(parsed.editState);
          setCalculatorEditState(parsed.editState);
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    setIsHydrated(true);
  }, [propertyId]);

  // Handle edit state changes from CalculatorCards
  const handleEditStateChange = (state: EditState) => {
    setCalculatorEditState(state);
  };

  // Save form data and calculator state to localStorage
  const handleSaveFormData = () => {
    try {
      const dataToSave = {
        formData,
        editState: calculatorEditState,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  // PLZ lookup - detect 5-digit German postal codes and resolve to location
  useEffect(() => {
    const value = formData.location.trim();
    const plzMatch = value.match(/^(\d{5})$/);

    if (plzMatch) {
      const plz = plzMatch[1];
      setIsLookingUpPLZ(true);
      setResolvedLocation(null);

      // Use Nominatim API to lookup PLZ
      fetch(`https://nominatim.openstreetmap.org/search?postalcode=${plz}&country=Germany&format=json&addressdetails=1&limit=1`, {
        headers: { 'Accept-Language': 'de' }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const result = data[0];
            const address = result.address;
            // Build location string: city + suburb/district if available
            const city = address.city || address.town || address.village || address.municipality || '';
            const suburb = address.suburb || address.city_district || '';
            const locationStr = suburb && city ? `${city} ${suburb}` : city;
            if (locationStr) {
              setResolvedLocation(locationStr);
            }
          }
        })
        .catch(() => {
          // Silently fail - keep the PLZ as location
        })
        .finally(() => {
          setIsLookingUpPLZ(false);
        });
    } else {
      // Clear resolved location when not a PLZ
      setResolvedLocation(null);
    }
  }, [formData.location]);

  // PLZ-based market rent data
  const extractedPLZ = useMemo(() => extractPLZFromLocation(formData.location), [formData.location]);
  const { data: plzMarketData, isLoading: isLoadingMarketData } = trpc.marketData.getByPLZ.useQuery(
    { plz: extractedPLZ! },
    {
      enabled: !!extractedPLZ && extractedPLZ.length === 5 && !propertyId,
      staleTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  // Calculate PLZ-based market rent
  const plzMarketRent = useMemo(() => {
    if (!plzMarketData?.avg_rent_sqm || !formData.sqm) return null;
    return Math.ceil(Number(plzMarketData.avg_rent_sqm) * parseNum(formData.sqm, 0));
  }, [plzMarketData, formData.sqm]);

  // Auto-populate monthly rent when PLZ market data is available and rent is empty
  useEffect(() => {
    if (plzMarketRent && !formData.monthlyRent && !propertyId) {
      setFormData(prev => ({ ...prev, monthlyRent: String(plzMarketRent) }));
    }
  }, [plzMarketRent, propertyId]);

  // Check if user has overridden market rent
  const isRentOverridden = useMemo(() => {
    if (!plzMarketRent || !formData.monthlyRent) return false;
    const userRent = parseNum(formData.monthlyRent, 0);
    return Math.abs(userRent - plzMarketRent) / plzMarketRent > 0.05;
  }, [plzMarketRent, formData.monthlyRent]);

  // ============= API Queries (Property Mode) =============
  const { data: property, isLoading: propertyLoading } = trpc.properties.getByIdWithOwner.useQuery(
    { id: propertyId! },
    { enabled: !!propertyId }
  );

  const { data: userPropertyParams } = trpc.userPropertyParameters.get.useQuery(
    { propertyId: propertyId! },
    { enabled: !!propertyId && !!user }
  );

  const { data: taxProfile } = trpc.taxOptimizer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Calculator defaults from database
  const { data: calculatorDefaults } = trpc.calculatorDefaults.getDefaults.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // Save mutation (only for property mode)
  const saveUserPropertyParamsMutation = trpc.userPropertyParameters.upsert.useMutation({
    onSuccess: () => {
      if (propertyId) {
        utils.userPropertyParameters.get.invalidate({ propertyId });
      }
    },
  });

  const handleSaveUserPropertyParams = (params: SavedParams) => {
    if (propertyId) {
      saveUserPropertyParamsMutation.mutate({ propertyId, ...params });
    }
  };

  // Form handlers
  const handleInputChange = (field: keyof PropertyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = !!(formData.price && formData.sqm && formData.location);

  // ============= Calculate Metrics =============

  // Investor Metrics
  const investorMetrics = useMemo(() => {
    // Get values from property (property mode) or form (manual mode)
    const purchasePrice = propertyId && property
      ? parseNum(userPropertyParams?.purchase_price ?? property.price, 0)
      : parseNum(formData.price, 0);

    if (purchasePrice <= 0) return null;

    const sqm = propertyId && property
      ? (property.sqm ?? 0)
      : parseNum(formData.sqm, 0);

    const location = propertyId && property
      ? property.location
      : formData.location;

    const yearBuilt = propertyId && property
      ? property.year_built
      : (formData.yearBuilt ? Number(formData.yearBuilt) : undefined);

    // Monthly rent
    let monthlyRent = 0;
    if (propertyId && property) {
      const rentPerSqm = property.buyer_evaluation?.rental_income?.rent_per_sqm;
      const calculatedRent = rentPerSqm && sqm ? Number(rentPerSqm) * Number(sqm) : property.actual_monthly_rent;
      monthlyRent = parseNum(userPropertyParams?.monthly_rent ?? calculatedRent, 0);
    } else {
      monthlyRent = parseNum(formData.monthlyRent, plzMarketRent || 0);
    }

    // Financing parameters
    let equityPercentage: number;
    let interestRate: number;
    let amortizationRate: number;
    let commissionRate: number;
    let renovationCosts: number;
    let monthlyFee: number | undefined;

    if (propertyId && property) {
      const financingTerms = property.buyer_evaluation?.financing_terms;
      const defaultEKRate = financingTerms?.loan_to_value ? (100 - Number(financingTerms.loan_to_value)) : 10;
      equityPercentage = parseEKRate(userPropertyParams?.equity_percentage, defaultEKRate);
      interestRate = parseNum(userPropertyParams?.interest_rate, parseNum(financingTerms?.interest_rate, 4.25));
      amortizationRate = parseNum(userPropertyParams?.amortization_rate, parseNum(financingTerms?.amortization_rate, 2.0));
      commissionRate = parseNum(userPropertyParams?.broker_commission, parseNum(property.commission_rate, 0));
      renovationCosts = parseNum(userPropertyParams?.renovation_costs, 0);
      monthlyFee = property.monthly_fee ? Number(property.monthly_fee) : undefined;
    } else {
      // Use calculator defaults from database, with fallbacks
      equityPercentage = parseNum(formData.equityPercentage, calculatorDefaults?.equityPercentage ?? 10);
      interestRate = parseNum(formData.interestRate, 4.25); // From market rates, not from calculatorDefaults
      amortizationRate = parseNum(formData.amortizationRate, calculatorDefaults?.amortizationRate ?? 2.0);
      commissionRate = parseNum(formData.commissionRate, 3.57);
      renovationCosts = parseNum(formData.renovationCosts, 0);
      monthlyFee = formData.monthlyFee ? parseNum(formData.monthlyFee, 0) : undefined;
    }

    // Calculate using central function
    const calculated = calculateMetrics({
      mode: 'investor',
      purchasePrice,
      location,
      sqm,
      yearBuilt,
      monthlyRent,
      monthlyFee,
      equityPercentage,
      interestRate,
      amortizationRate,
      commissionRate,
      renovationCosts,
      marginalTaxRate: taxProfile?.marginal_tax_rate ? Number(taxProfile.marginal_tax_rate) : 0.42,
      // Use calculator defaults from database
      hausgeldPerSqmModern: calculatorDefaults?.hausgeldPerSqmModern,
      hausgeldPerSqmOld: calculatorDefaults?.hausgeldPerSqmOld,
      maintenanceCostPerSqm: calculatorDefaults?.maintenanceCostPerSqm,
      nonAllocableHausgeldRatio: calculatorDefaults?.nonAllocableHausgeldRatio,
    });

    // Return in expected format
    return {
      purchasePrice,
      sqm,
      mieteinnahmen: calculated.mieteinnahmen!,
      eigenkapitalRate: equityPercentage,
      zinssatz: interestRate,
      tilgung: amortizationRate,
      maklerRate: commissionRate,
      renovierungskosten: renovationCosts,
      hausgeld: calculated.hausgeld!,
      gesamtinvestition: calculated.gesamtinvestition!,
      eigenkapital: calculated.eigenkapital!,
      darlehensbetrag: calculated.darlehensbetrag!,
      monatlicheRate: calculated.monatlicheRate!,
      instandhaltungskosten: calculated.instandhaltungskosten!,
      monthlyCashflow: calculated.calculatedCashflow!,
      grossYield: calculated.grossYield,
      rentMultiplier: calculated.rentMultiplier,
      steuereffekt: calculated.steuereffekt ? {
        monatlich: calculated.steuereffekt.monatlich,
        jaehrlich: calculated.steuereffekt.jaehrlich,
      } : undefined,
    };
  }, [property, propertyId, userPropertyParams, taxProfile, formData, calculatorDefaults, plzMarketRent]);

  // Eigennutzer Metrics
  const eigennutzerMetrics = useMemo(() => {
    const purchasePrice = propertyId && property
      ? parseNum(userPropertyParams?.purchase_price ?? property.price, 0)
      : parseNum(formData.price, 0);

    const sqm = propertyId && property
      ? (property.sqm ?? 0)
      : parseNum(formData.sqm, 0);

    const location = propertyId && property
      ? property.location
      : formData.location;

    const yearBuilt = propertyId && property
      ? property.year_built
      : (formData.yearBuilt ? Number(formData.yearBuilt) : undefined);

    // Monthly rent
    let monthlyRent = 0;
    if (propertyId && property) {
      const rentPerSqm = property.buyer_evaluation?.rental_income?.rent_per_sqm;
      const calculatedRent = rentPerSqm && sqm ? Number(rentPerSqm) * Number(sqm) : property.actual_monthly_rent;
      monthlyRent = parseNum(userPropertyParams?.monthly_rent ?? calculatedRent, 0);
    } else {
      monthlyRent = parseNum(formData.monthlyRent, plzMarketRent || 0);
    }

    // Financing parameters
    let equityPercentage: number;
    let interestRate: number;
    let amortizationRate: number;
    let commissionRate: number;
    let renovationCosts: number;
    let monthlyFee: number | undefined;

    if (propertyId && property) {
      const financingTerms = property.buyer_evaluation?.financing_terms;
      const defaultEKRate = financingTerms?.loan_to_value ? (100 - Number(financingTerms.loan_to_value)) : 10;
      equityPercentage = parseEKRate(userPropertyParams?.equity_percentage, defaultEKRate);
      interestRate = parseNum(userPropertyParams?.interest_rate, parseNum(financingTerms?.interest_rate, 4.25));
      amortizationRate = parseNum(userPropertyParams?.amortization_rate, parseNum(financingTerms?.amortization_rate, 2.0));
      commissionRate = parseNum(userPropertyParams?.broker_commission, parseNum(property.commission_rate, 0));
      renovationCosts = parseNum(userPropertyParams?.renovation_costs, 0);
      monthlyFee = property.monthly_fee ? Number(property.monthly_fee) : undefined;
    } else {
      // Use calculator defaults from database, with fallbacks
      equityPercentage = parseNum(formData.equityPercentage, calculatorDefaults?.equityPercentage ?? 10);
      interestRate = parseNum(formData.interestRate, 4.25); // From market rates, not from calculatorDefaults
      amortizationRate = parseNum(formData.amortizationRate, calculatorDefaults?.amortizationRate ?? 2.0);
      commissionRate = parseNum(formData.commissionRate, 3.57);
      renovationCosts = parseNum(formData.renovationCosts, 0);
      monthlyFee = formData.monthlyFee ? parseNum(formData.monthlyFee, 0) : undefined;
    }

    if (monthlyRent <= 0 || purchasePrice <= 0) return null;

    // Calculate using central function
    const calculated = calculateMetrics({
      mode: 'eigennutzer',
      purchasePrice,
      location,
      sqm,
      yearBuilt,
      monthlyRent,
      monthlyFee,
      equityPercentage,
      interestRate,
      amortizationRate,
      commissionRate,
      renovationCosts,
      // Use calculator defaults from database
      hausgeldPerSqmModern: calculatorDefaults?.hausgeldPerSqmModern,
      hausgeldPerSqmOld: calculatorDefaults?.hausgeldPerSqmOld,
      maintenanceCostPerSqm: calculatorDefaults?.maintenanceCostPerSqm,
      nonAllocableHausgeldRatio: calculatorDefaults?.nonAllocableHausgeldRatio,
    });

    // Break-Even calculation (specific to Eigennutzer mode)
    const jaehrlicheZinsen = calculated.darlehensbetrag! * (interestRate / 100);
    const jaehrlicheInstandhaltung = calculated.instandhaltungskosten! * 12;
    const jaehrlichesHausgeld = calculated.hausgeld! * 12;
    const jaehrlicheKaeuferKosten = jaehrlicheZinsen + jaehrlicheInstandhaltung + jaehrlichesHausgeld;
    const jaehrlicheMiete = monthlyRent * 12;
    const jaehrlicheErsparnis = jaehrlicheMiete - jaehrlicheKaeuferKosten;

    let breakEvenYears: number;
    if (jaehrlicheErsparnis <= 0) {
      breakEvenYears = 99;
    } else {
      breakEvenYears = Math.min(Math.ceil(calculated.kaufnebenkosten! / jaehrlicheErsparnis), 99);
    }

    return {
      purchasePrice,
      monthlyRent,
      equityPercentage,
      interestRate,
      amortizationRate,
      commissionRate,
      hausgeld: calculated.hausgeld!,
      totalInvestment: calculated.gesamtinvestition!,
      equityAmount: calculated.eigenkapital!,
      loanAmount: calculated.darlehensbetrag!,
      monthlyMortgage: calculated.monatlicheRate!,
      monthlyMaintenance: calculated.instandhaltungskosten!,
      totalMonthlyCostBuying: calculated.monatlicheRate! + calculated.hausgeld! + calculated.instandhaltungskosten!,
      breakEvenYears,
      isBuyingBetter: breakEvenYears <= 10,
    };
  }, [property, propertyId, userPropertyParams, formData, calculatorDefaults, plzMarketRent]);

  // Loading state (property mode)
  if (propertyId && propertyLoading) {
    return (
      <main className="min-h-screen bg-white dark:bg-[#030712]">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      </main>
    );
  }

  // Not found (property mode)
  if (propertyId && !property && !propertyLoading) {
    return (
      <main className="min-h-screen bg-white dark:bg-[#030712]">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-gray-500 dark:text-gray-400">Immobilie nicht gefunden</p>
        </div>
      </main>
    );
  }

  // Get current values for display
  const displayPrice = propertyId && property ? (property.price ?? 0) : parseNum(formData.price, 0);
  const displayLocation = propertyId && property ? property.location : formData.location;
  const displaySqm = propertyId && property ? (property.sqm ?? 0) : parseNum(formData.sqm, 0);
  const displayYearBuilt = propertyId && property ? property.year_built : (formData.yearBuilt ? Number(formData.yearBuilt) : undefined);

  return (
    <main className="min-h-screen bg-white dark:bg-[#030712]">
      <Header />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button (property mode only) */}
        {propertyId && (
          <>
            <button
              onClick={() => router.back()}
              className="absolute left-0 top-6 sm:top-8 -translate-x-1/2 hidden lg:flex w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 items-center justify-center hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all z-10 text-gray-700 dark:text-gray-300"
              title="Zurück"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={() => router.back()}
              className="lg:hidden inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 group"
            >
              <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center justify-center group-hover:border-gray-300 dark:group-hover:border-gray-600 group-hover:shadow-sm transition-all">
                <ArrowLeft size={16} />
              </div>
              <span className="text-sm font-medium">Zurück</span>
            </button>
          </>
        )}

        <div className="max-w-7xl mx-auto">
          {/* Property Header */}
          {propertyId && property && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 flex gap-4 items-center">
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
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(property.price ?? 0)}
                </p>
              </div>
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
          )}

          {/* Loading state for manual mode during hydration */}
          {!propertyId && !isHydrated && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <div className="flex items-center justify-center h-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            </div>
          )}

          {/* Manual Mode Header with editable fields */}
          {!propertyId && isHydrated && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
              {/* Header-Zeile */}
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-[#E31C5F] to-[#FF9500] flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formData.price ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(formData.price)) : '– €'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Immobilien-Rechner
                  </p>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={handleSaveFormData}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isSaved
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isSaved ? <Check size={16} /> : <Save size={16} />}
                    <span>{isSaved ? 'Gespeichert' : 'Speichern'}</span>
                  </button>
                  <Link href={`/import-listing?price=${formData.price}&sqm=${formData.sqm}&location=${encodeURIComponent(resolvedLocation || formData.location)}&yearBuilt=${formData.yearBuilt || ''}&monthlyRent=${formData.monthlyRent || ''}&monthlyFee=${formData.monthlyFee || ''}&commissionRate=${formData.commissionRate || ''}&equityPercentage=${formData.equityPercentage || ''}&interestRate=${formData.interestRate || ''}&amortizationRate=${formData.amortizationRate || ''}&renovationCosts=${formData.renovationCosts || ''}`}>
                    <button
                      className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Plus size={16} />
                      <span>Zu Favoriten hinzufügen</span>
                    </button>
                  </Link>
                </div>
              </div>

              {/* Formular-Grid: Desktop 1×6, Tablet 2×3, Mobile 3×2 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {/* Standort */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Standort *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="München"
                      className="input-gradient-border w-full px-3 py-2 text-sm rounded-lg text-gray-900 dark:text-white"
                    />
                    {isLookingUpPLZ && (
                      <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                    )}
                  </div>
                  {resolvedLocation && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{resolvedLocation}</p>
                  )}
                </div>

                {/* Wohnfläche */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Wohnfläche *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.sqm}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^\d]/g, '');
                        handleInputChange('sqm', rawValue);
                      }}
                      placeholder="75"
                      className="input-gradient-border w-full pl-3 pr-10 py-2 text-sm rounded-lg text-gray-900 dark:text-white text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">m²</span>
                  </div>
                </div>

                {/* Kaufpreis */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Kaufpreis *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.price ? new Intl.NumberFormat('de-DE').format(Number(formData.price)) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^\d]/g, '');
                        handleInputChange('price', rawValue);
                      }}
                      placeholder="350.000"
                      className="input-gradient-border w-full pl-3 pr-8 py-2 text-sm rounded-lg text-gray-900 dark:text-white font-semibold text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
                  </div>
                </div>

                {/* Miete */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Miete/Monat
                    {isLoadingMarketData && (
                      <span className="text-gray-400 ml-1 animate-pulse">...</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.monthlyRent ? new Intl.NumberFormat('de-DE').format(Number(formData.monthlyRent)) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^\d]/g, '');
                        handleInputChange('monthlyRent', rawValue);
                      }}
                      placeholder={plzMarketRent ? new Intl.NumberFormat('de-DE').format(plzMarketRent) : '1.200'}
                      className="input-gradient-border w-full pl-3 pr-8 py-2 text-sm rounded-lg text-gray-900 dark:text-white text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
                  </div>
                  {plzMarketRent && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Ø: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(plzMarketRent)}/Mo
                    </p>
                  )}
                </div>

                {/* Baujahr */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Baujahr
                  </label>
                  <input
                    type="text"
                    value={formData.yearBuilt}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^\d]/g, '');
                      handleInputChange('yearBuilt', rawValue);
                    }}
                    placeholder="1995"
                    className="input-gradient-border w-full px-3 py-2 text-sm rounded-lg text-gray-900 dark:text-white text-right"
                  />
                </div>

                {/* Zustand */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Zustand
                  </label>
                  <select
                    value={formData.condition || ''}
                    onChange={(e) => handleInputChange('condition', e.target.value)}
                    className="input-gradient-border w-full px-3 py-2 text-sm rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="">Bitte wählen</option>
                    <option value="neuwertig">Neuwertig</option>
                    <option value="saniert">Saniert</option>
                    <option value="gepflegt">Gepflegt</option>
                    <option value="renovierungsbedürftig">Renovierungsbedürftig</option>
                    <option value="abbruchreif">Abbruchreif</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Calculator Cards */}
          {activeTab === 'investor' && investorMetrics && isHydrated && (
            <CalculatorCards
                metricsElement={<MetricsCards />}
                mode="investor"
                purchasePrice={displayPrice}
                location={displayLocation}
                commissionRate={propertyId && property ? property.commission_rate : parseNum(formData.commissionRate, 3.57)}
                equityPercentage={propertyId && property
                  ? (property.buyer_evaluation?.financing_terms?.loan_to_value
                    ? (100 - property.buyer_evaluation.financing_terms.loan_to_value)
                    : 10)
                  : parseNum(formData.equityPercentage, calculatorDefaults?.equityPercentage ?? 10)}
                interestRate={propertyId && property
                  ? property.buyer_evaluation?.financing_terms?.interest_rate
                  : parseNum(formData.interestRate, 4.25)}
                amortizationRate={propertyId && property
                  ? property.buyer_evaluation?.financing_terms?.amortization_rate
                  : parseNum(formData.amortizationRate, calculatorDefaults?.amortizationRate ?? 2.0)}
                monthlyFee={propertyId && property ? property.monthly_fee : (formData.monthlyFee ? Number(formData.monthlyFee) : undefined)}
                sqm={displaySqm}
                yearBuilt={displayYearBuilt}
                monthlyRent={propertyId && property
                  ? (property.buyer_evaluation?.rental_income?.rent_per_sqm && property.sqm
                    ? Number(property.buyer_evaluation.rental_income.rent_per_sqm) * Number(property.sqm)
                    : property.actual_monthly_rent)
                  : parseNum(formData.monthlyRent, plzMarketRent || 0)}
                estimatedRentPerSqm={propertyId && property ? property.buyer_evaluation?.rental_income?.rent_per_sqm : undefined}
                renovationCosts={propertyId ? 0 : parseNum(formData.renovationCosts, 0)}
                userParams={userPropertyParams}
                onSaveParams={propertyId ? handleSaveUserPropertyParams : undefined}
                isSavingParams={saveUserPropertyParamsMutation.isPending}
                canEdit={true}
                startInEditMode={!propertyId}
                onEditStateChange={!propertyId ? handleEditStateChange : undefined}
                initialEditState={!propertyId ? initialEditState : undefined}
              />
            )}

            {activeTab === 'eigennutzer' && eigennutzerMetrics && isHydrated && (
              <CalculatorCards
                mode="eigennutzer"
                purchasePrice={displayPrice}
                location={displayLocation}
                commissionRate={propertyId && property ? property.commission_rate : parseNum(formData.commissionRate, 3.57)}
                equityPercentage={propertyId && property
                  ? (property.buyer_evaluation?.financing_terms?.loan_to_value
                    ? (100 - property.buyer_evaluation.financing_terms.loan_to_value)
                    : 10)
                  : parseNum(formData.equityPercentage, calculatorDefaults?.equityPercentage ?? 10)}
                interestRate={propertyId && property
                  ? (property.buyer_evaluation?.financing_terms?.interest_rate ?? 4.25)
                  : parseNum(formData.interestRate, 4.25)}
                amortizationRate={propertyId && property
                  ? (property.buyer_evaluation?.financing_terms?.amortization_rate ?? 2.0)
                  : parseNum(formData.amortizationRate, calculatorDefaults?.amortizationRate ?? 2.0)}
                monthlyFee={propertyId && property ? property.monthly_fee : (formData.monthlyFee ? Number(formData.monthlyFee) : undefined)}
                sqm={displaySqm}
                yearBuilt={displayYearBuilt}
                marketRent={eigennutzerMetrics.monthlyRent}
                userParams={userPropertyParams}
                onSaveParams={propertyId ? handleSaveUserPropertyParams : undefined}
                isSavingParams={saveUserPropertyParamsMutation.isPending}
                canEdit={true}
                startInEditMode={!propertyId}
                onEditStateChange={!propertyId ? handleEditStateChange : undefined}
                initialEditState={!propertyId ? initialEditState : undefined}
              />
            )}

            {/* Empty states */}
            {activeTab === 'investor' && !investorMetrics && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-12 text-center">
                <TrendingUp size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Gib Immobiliendaten ein, um die Investment-Analyse zu sehen</p>
              </div>
            )}

            {activeTab === 'eigennutzer' && !eigennutzerMetrics && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-12 text-center">
                <Home size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Gib Immobiliendaten ein, um die Kaufen vs. Mieten Analyse zu sehen</p>
              </div>
            )}
        </div>
      </div>

      {/* Horizontale Trennlinie - volle Breite */}
      <div className="border-t border-gray-200 dark:border-gray-600 my-8" />

      {/* Ähnliche Objekte - volle Breite */}
      <div className="px-4 sm:px-6 pb-8">
        <SimilarPropertiesSidebar
          mode={activeTab}
          currentSqm={Number(displaySqm) || undefined}
          currentLocation={resolvedLocation || displayLocation}
          currentPrice={Number(displayPrice) || undefined}
          excludePropertyId={propertyId || undefined}
          equityPercentage={propertyId && property
            ? (property.buyer_evaluation?.financing_terms?.loan_to_value
              ? (100 - property.buyer_evaluation.financing_terms.loan_to_value)
              : 10)
            : parseNum(formData.equityPercentage, calculatorDefaults?.equityPercentage ?? 10)}
          interestRate={propertyId && property
            ? (property.buyer_evaluation?.financing_terms?.interest_rate ?? 4.25)
            : parseNum(formData.interestRate, 4.25)}
        />
      </div>
    </main>
  );
}
