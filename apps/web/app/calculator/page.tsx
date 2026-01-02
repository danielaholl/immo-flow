'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Header } from '../components/Header';
import { PropertyFormData } from '../components/PropertyInputForm';
import { CalculatorCards, SavedParams, SimilarPropertiesSidebar, EditState } from '../components/calculator';
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

type TabType = 'investor' | 'eigennutzer';

const DEFAULT_FORM_DATA: PropertyFormData = {
  price: '350000',
  sqm: '75',
  location: 'München',
  monthlyRent: '1200',
  yearBuilt: '1995',
  equityPercentage: '20',
  interestRate: '3.8',
  amortizationRate: '2.0',
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
  const [activeTab, setActiveTab] = useState<TabType>('investor');
  const [formData, setFormData] = useState<PropertyFormData>(DEFAULT_FORM_DATA);
  const [isLookingUpPLZ, setIsLookingUpPLZ] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [calculatorEditState, setCalculatorEditState] = useState<Partial<EditState>>({});
  const [initialEditState, setInitialEditState] = useState<Partial<EditState> | undefined>(undefined);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hash-basierte Tab-Auswahl (für "Kaufen vs. Mieten" Menü)
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#eigennutzer') {
        setActiveTab('eigennutzer');
        // Hash nach kurzer Verzögerung entfernen (für saubere URL)
        requestAnimationFrame(() => {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        });
      }
    };

    // Initial prüfen
    handleHashChange();

    // Auf Hash-Änderungen reagieren (für Soft Navigation)
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
    let mieteinnahmen = 0;
    if (propertyId && property) {
      const rentPerSqm = property.buyer_evaluation?.rental_income?.rent_per_sqm;
      const calculatedRent = rentPerSqm && sqm ? Number(rentPerSqm) * Number(sqm) : property.actual_monthly_rent;
      mieteinnahmen = parseNum(userPropertyParams?.monthly_rent ?? calculatedRent, 0);
    } else {
      mieteinnahmen = parseNum(formData.monthlyRent, 0);
    }

    // Financing parameters
    let eigenkapitalRate: number;
    let zinssatz: number;
    let tilgung: number;
    let maklerRate: number;
    let renovierungskosten: number;

    if (propertyId && property) {
      const financingTerms = property.buyer_evaluation?.financing_terms;
      const defaultEKRate = financingTerms?.loan_to_value ? (100 - Number(financingTerms.loan_to_value)) : 20;
      eigenkapitalRate = parseEKRate(userPropertyParams?.equity_percentage, defaultEKRate);
      zinssatz = parseNum(userPropertyParams?.interest_rate, parseNum(financingTerms?.interest_rate, 3.8));
      tilgung = parseNum(userPropertyParams?.amortization_rate, parseNum(financingTerms?.amortization_rate, 2.0));
      maklerRate = parseNum(userPropertyParams?.broker_commission, parseNum(property.commission_rate, 0));
      renovierungskosten = parseNum(userPropertyParams?.renovation_costs, 0);
    } else {
      eigenkapitalRate = parseNum(formData.equityPercentage, 20);
      zinssatz = parseNum(formData.interestRate, 3.8);
      tilgung = parseNum(formData.amortizationRate, 2.0);
      maklerRate = parseNum(formData.commissionRate, 3.57);
      renovierungskosten = parseNum(formData.renovationCosts, 0);
    }

    // Hausgeld
    const calculateHausgeld = (): number => {
      if (propertyId && property) {
        if (property.monthly_fee && Number(property.monthly_fee) > 0) return Number(property.monthly_fee);
        if (sqm) {
          const hausgeldProQm = yearBuilt && Number(yearBuilt) >= 1980 ? 2.50 : 3.50;
          return Number(sqm) * hausgeldProQm;
        }
      } else {
        if (formData.monthlyFee && parseNum(formData.monthlyFee, 0) > 0) {
          return parseNum(formData.monthlyFee, 0);
        }
        if (sqm > 0) {
          const hausgeldProQm = yearBuilt && yearBuilt >= 1980 ? 2.50 : 3.50;
          return sqm * hausgeldProQm;
        }
      }
      return 0;
    };

    const hausgeld = propertyId && property
      ? parseNum(userPropertyParams?.monthly_fee, calculateHausgeld())
      : calculateHausgeld();

    if (purchasePrice <= 0) return null;

    // Calculate costs
    const detectedState = detectStateFromLocation(location);
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

    // Tax effect
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
      purchasePrice,
      sqm,
      mieteinnahmen,
      eigenkapitalRate,
      zinssatz,
      tilgung,
      maklerRate,
      renovierungskosten,
      hausgeld,
      gesamtinvestition,
      eigenkapital,
      darlehensbetrag,
      monatlicheRate,
      instandhaltungskosten,
      monthlyCashflow,
      grossYield,
      rentMultiplier,
      steuereffekt,
    };
  }, [property, propertyId, userPropertyParams, taxProfile, formData]);

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
      monthlyRent = parseNum(formData.monthlyRent, 0);
    }

    // Financing parameters
    let equityPercentage: number;
    let interestRate: number;
    let amortizationRate: number;
    let commissionRate: number;
    let renovierungskosten: number;

    if (propertyId && property) {
      const financingTerms = property.buyer_evaluation?.financing_terms;
      const defaultEKRate = financingTerms?.loan_to_value ? (100 - Number(financingTerms.loan_to_value)) : 20;
      equityPercentage = parseEKRate(userPropertyParams?.equity_percentage, defaultEKRate);
      interestRate = parseNum(userPropertyParams?.interest_rate, parseNum(financingTerms?.interest_rate, 3.5));
      amortizationRate = parseNum(userPropertyParams?.amortization_rate, parseNum(financingTerms?.amortization_rate, 2.0));
      commissionRate = parseNum(userPropertyParams?.broker_commission, parseNum(property.commission_rate, 0));
      renovierungskosten = parseNum(userPropertyParams?.renovation_costs, 0);
    } else {
      equityPercentage = parseNum(formData.equityPercentage, 20);
      interestRate = parseNum(formData.interestRate, 3.5);
      amortizationRate = parseNum(formData.amortizationRate, 2.0);
      commissionRate = parseNum(formData.commissionRate, 3.57);
      renovierungskosten = parseNum(formData.renovationCosts, 0);
    }

    // Hausgeld
    const calculateHausgeld = (): number => {
      if (propertyId && property) {
        if (property.monthly_fee && Number(property.monthly_fee) > 0) return Number(property.monthly_fee);
        if (sqm) {
          const hausgeldProQm = yearBuilt && Number(yearBuilt) >= 1980 ? 2.50 : 3.50;
          return Number(sqm) * hausgeldProQm;
        }
      } else {
        if (formData.monthlyFee && parseNum(formData.monthlyFee, 0) > 0) {
          return parseNum(formData.monthlyFee, 0);
        }
        if (sqm > 0) {
          const hausgeldProQm = yearBuilt && yearBuilt >= 1980 ? 2.50 : 3.50;
          return sqm * hausgeldProQm;
        }
      }
      return 0;
    };

    const hausgeld = propertyId && property
      ? parseNum(userPropertyParams?.monthly_fee, calculateHausgeld())
      : calculateHausgeld();

    if (monthlyRent <= 0 || purchasePrice <= 0) return null;

    const detectedState = detectStateFromLocation(location);
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

    // Break-Even calculation
    const jaehrlicheZinsen = loanAmount * (interestRate / 100);
    const jaehrlicheInstandhaltung = monthlyMaintenance * 12;
    const jaehrlichesHausgeld = hausgeld * 12;
    const jaehrlicheKaeuferKosten = jaehrlicheZinsen + jaehrlicheInstandhaltung + jaehrlichesHausgeld;
    const jaehrlicheMiete = monthlyRent * 12;
    const jaehrlicheErsparnis = jaehrlicheMiete - jaehrlicheKaeuferKosten;

    let breakEvenYears: number;
    if (jaehrlicheErsparnis <= 0) {
      breakEvenYears = 99;
    } else {
      breakEvenYears = Math.min(Math.ceil(kaufnebenkosten / jaehrlicheErsparnis), 99);
    }

    return {
      purchasePrice,
      monthlyRent,
      equityPercentage,
      interestRate,
      amortizationRate,
      commissionRate,
      hausgeld,
      totalInvestment,
      equityAmount,
      loanAmount,
      monthlyMortgage,
      monthlyMaintenance,
      totalMonthlyCostBuying,
      breakEvenYears,
      isBuyingBetter: breakEvenYears <= 10,
    };
  }, [property, propertyId, userPropertyParams, formData]);

  // Loading state (property mode)
  if (propertyId && propertyLoading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
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
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
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
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button (property mode only) */}
        {propertyId && (
          <>
            <button
              onClick={() => router.back()}
              className="absolute left-0 top-6 sm:top-8 -translate-x-1/2 hidden lg:flex w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 items-center justify-center hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all z-10 text-gray-700 dark:text-gray-300"
              title="Zurück"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={() => router.back()}
              className="lg:hidden inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 group"
            >
              <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-gray-300 dark:group-hover:border-gray-600 group-hover:shadow-sm transition-all">
                <ArrowLeft size={16} />
              </div>
              <span className="text-sm font-medium">Zurück</span>
            </button>
          </>
        )}

        <div className="max-w-5xl mx-auto">
          {/* Property Header */}
          {propertyId && property && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-4 mb-6 flex gap-4 items-center">
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
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-4 mb-6">
              <div className="flex items-center justify-center h-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            </div>
          )}

          {/* Manual Mode Header with editable fields */}
          {!propertyId && isHydrated && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-4 mb-6">
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

              {/* Formular-Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {/* Kaufpreis */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Kaufpreis *
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Euro size={16} />
                    </div>
                    <input
                      type="text"
                      value={formData.price ? new Intl.NumberFormat('de-DE').format(Number(formData.price)) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^\d]/g, '');
                        handleInputChange('price', rawValue);
                      }}
                      placeholder="350.000"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent font-semibold"
                    />
                  </div>
                </div>

                {/* Wohnfläche */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Wohnfläche *
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">
                      <Square size={16} />
                    </div>
                    <input
                      type="number"
                      value={formData.sqm}
                      onChange={(e) => handleInputChange('sqm', e.target.value)}
                      placeholder="75"
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">m²</span>
                  </div>
                </div>

                {/* PLZ/Ort */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    PLZ/Ort *
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <MapPin size={16} />
                    </div>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="München"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent font-semibold"
                    />
                    {isLookingUpPLZ && (
                      <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                    )}
                  </div>
                  {resolvedLocation && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{resolvedLocation}</p>
                  )}
                </div>

                {/* Mieteinnahmen */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Miete/Monat
                    {isLoadingMarketData && (
                      <span className="text-gray-400 ml-1 animate-pulse">...</span>
                    )}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500">
                      <Wallet size={16} />
                    </div>
                    <input
                      type="text"
                      value={formData.monthlyRent ? new Intl.NumberFormat('de-DE').format(Number(formData.monthlyRent)) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^\d]/g, '');
                        handleInputChange('monthlyRent', rawValue);
                      }}
                      placeholder={plzMarketRent ? new Intl.NumberFormat('de-DE').format(plzMarketRent) : '1.200'}
                      className="w-full pl-9 pr-8 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent font-semibold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                  </div>
                  {/* Market rent hint - always shown when available */}
                  {plzMarketRent && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Ø Marktmiete: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(plzMarketRent)}/Mo
                    </p>
                  )}
                </div>

                {/* Baujahr */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Baujahr
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500">
                      <Calendar size={16} />
                    </div>
                    <input
                      type="number"
                      value={formData.yearBuilt}
                      onChange={(e) => handleInputChange('yearBuilt', e.target.value)}
                      placeholder="1995"
                      min="1800"
                      max="2030"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Calculator Cards */}
          {activeTab === 'investor' && investorMetrics && isHydrated && (
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
                purchasePrice={displayPrice}
                location={displayLocation}
                commissionRate={propertyId && property ? property.commission_rate : parseNum(formData.commissionRate, 3.57)}
                equityPercentage={propertyId && property
                  ? (property.buyer_evaluation?.financing_terms?.loan_to_value
                    ? (100 - property.buyer_evaluation.financing_terms.loan_to_value)
                    : 20)
                  : parseNum(formData.equityPercentage, 20)}
                interestRate={propertyId && property
                  ? property.buyer_evaluation?.financing_terms?.interest_rate
                  : parseNum(formData.interestRate, 3.8)}
                amortizationRate={propertyId && property
                  ? property.buyer_evaluation?.financing_terms?.amortization_rate
                  : parseNum(formData.amortizationRate, 2.0)}
                monthlyFee={propertyId && property ? property.monthly_fee : (formData.monthlyFee ? Number(formData.monthlyFee) : undefined)}
                sqm={displaySqm}
                yearBuilt={displayYearBuilt}
                monthlyRent={propertyId && property
                  ? (property.buyer_evaluation?.rental_income?.rent_per_sqm && property.sqm
                    ? Number(property.buyer_evaluation.rental_income.rent_per_sqm) * Number(property.sqm)
                    : property.actual_monthly_rent)
                  : parseNum(formData.monthlyRent, 0)}
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
                    : 20)
                  : parseNum(formData.equityPercentage, 20)}
                interestRate={propertyId && property
                  ? (property.buyer_evaluation?.financing_terms?.interest_rate ?? 3.5)
                  : parseNum(formData.interestRate, 3.5)}
                amortizationRate={propertyId && property
                  ? (property.buyer_evaluation?.financing_terms?.amortization_rate ?? 2.0)
                  : parseNum(formData.amortizationRate, 2.0)}
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
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <TrendingUp size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Gib Immobiliendaten ein, um die Investment-Analyse zu sehen</p>
              </div>
            )}

            {activeTab === 'eigennutzer' && !eigennutzerMetrics && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Home size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Gib Immobiliendaten ein, um die Kaufen vs. Mieten Analyse zu sehen</p>
              </div>
            )}
        </div>
      </div>

      {/* Horizontale Trennlinie - volle Breite */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-8" />

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
              : 20)
            : parseNum(formData.equityPercentage, 20)}
          interestRate={propertyId && property
            ? (property.buyer_evaluation?.financing_terms?.interest_rate ?? 3.8)
            : parseNum(formData.interestRate, 3.8)}
        />
      </div>
    </main>
  );
}
