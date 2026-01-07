'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Header } from '../components/Header';
import { AIScoreCard } from '../components/AIScoreCard';
import { MarketComparisonBar } from '../components/MarketComparisonBar';
import { SimilarProperties, SimilarProperty } from '../components/SimilarProperties';
import { trpc } from '@/lib/trpc';
import { useAuthContext } from '@/app/providers/AuthProvider';
import {
  Sparkles,
  Loader2,
  ChevronDown,
  Lightbulb,
  Check,
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Euro,
  MapPin,
  Calendar,
  Square,
  Building2,
} from 'lucide-react';
import { PropertyFormData } from '../components/PropertyInputForm';
import {
  formatCurrency,
  calculateFactorScores,
  parseNum,
  parseEKRate,
  getAfaRate,
  getBuildingRatio,
} from '../property/[id]/utils/calculator-utils';

// Using PropertyFormData from PropertyInputForm component

// LocalStorage key for saving calculator state
const AI_SCORE_STORAGE_KEY = 'ai-score-calculator';

export default function AIScorePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const propertyId = searchParams.get('propertyId');

  // Form state for manual mode - mit Default-Werten
  const [formData, setFormData] = useState<PropertyFormData>({
    price: '350000',
    sqm: '75',
    monthlyRent: '1200',
    yearBuilt: '1995',
    location: 'München',
  });

  // Track if we've loaded from localStorage to avoid overwriting
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  const [result, setResult] = useState<{
    score: number;
    summary: string;
    factors: {
      location: number;
      pricePerformance: number;
      appreciation: number;
      rentability: number;
    };
    grossYield?: number;
  } | null>(null);

  // Property mode states
  const [isKiFazitExpanded, setIsKiFazitExpanded] = useState(false);
  const [showClaudeFazit, setShowClaudeFazit] = useState(false);
  const [isSmartCheckExpanded, setIsSmartCheckExpanded] = useState(true);
  const [simulatedPrice, setSimulatedPrice] = useState<number | null>(null);

  // AI Fazit state
  const [aiFazit, setAiFazit] = useState<{
    text?: string;
    suggestions?: string[];
    verdict: 'positive' | 'neutral' | 'negative';
    color: string;
    cached?: boolean;
    claude?: { text: string; suggestions: string[] };
    openai?: { text?: string; suggestions?: string[] };
  } | null>(null);
  const [fazitRequested, setFazitRequested] = useState(false);
  const [aiFazitError, setAiFazitError] = useState(false);

  // ============= LocalStorage Persistence =============

  // Load saved data from localStorage on mount (only for manual mode)
  useEffect(() => {
    if (propertyId) return; // Skip for property mode

    try {
      const saved = localStorage.getItem(AI_SCORE_STORAGE_KEY);
      if (saved) {
        const { formData: savedForm, result: savedResult } = JSON.parse(saved);
        if (savedForm) setFormData(savedForm);
        if (savedResult) setResult(savedResult);
      }
    } catch (e) {
      console.error('Error loading from localStorage:', e);
    }
    setHasLoadedFromStorage(true);
  }, [propertyId]);

  // Save data to localStorage when formData or result changes
  useEffect(() => {
    if (propertyId) return; // Skip for property mode
    if (!hasLoadedFromStorage) return; // Wait until initial load is complete

    try {
      localStorage.setItem(AI_SCORE_STORAGE_KEY, JSON.stringify({ formData, result }));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, [formData, result, propertyId, hasLoadedFromStorage]);

  // ============= API Queries =============

  // For manual mode (simple query)
  const { data: simpleProperty, isLoading: simplePropertyLoading } = trpc.properties.getById.useQuery(
    { id: propertyId! },
    { enabled: !!propertyId && !user }
  );

  // For property mode (full query with owner)
  const { data: property, isLoading: propertyLoading } = trpc.properties.getByIdWithOwner.useQuery(
    { id: propertyId! },
    { enabled: !!propertyId && !!user }
  );

  // Use the appropriate property data
  const propertyData = user ? property : simpleProperty;
  const isLoading = user ? propertyLoading : simplePropertyLoading;

  // User property parameters
  const { data: userPropertyParams } = trpc.userPropertyParameters.get.useQuery(
    { propertyId: propertyId! },
    { enabled: !!propertyId && !!user }
  );

  // Tax profile for steuereffekt
  const { data: taxProfile } = trpc.taxOptimizer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  // Calculator defaults from database
  const { data: calculatorDefaults } = trpc.calculatorDefaults.getDefaults.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // Market comparison data - Property Mode
  const { data: marketData, isLoading: isLoadingMarketData } = trpc.properties.getMarketComparison.useQuery(
    { propertyId: propertyId! },
    { enabled: !!propertyData && !!propertyId, staleTime: 5 * 60 * 1000 }
  );

  // Market comparison data - Manual Mode (basierend auf Location)
  const manualPrice = parseFloat(formData.price) || 0;
  const manualSqm = parseFloat(formData.sqm) || 0;
  const { data: manualMarketData, isLoading: isLoadingManualMarketData } = trpc.properties.getMarketComparison.useQuery(
    { price: manualPrice, sqm: manualSqm, location: formData.location },
    { enabled: !propertyId && manualPrice > 0 && manualSqm > 0 && !!formData.location, staleTime: 5 * 60 * 1000 }
  );

  // AI Score Analysis
  const { data: aiScoreAnalysis, isLoading: isLoadingAIScore } = trpc.evaluations.getAIScoreAnalysis.useQuery(
    { propertyId: propertyId! },
    { enabled: !!propertyId && !!propertyData?.ai_investment_score, staleTime: Infinity }
  );

  // AI Fazit mutation
  const generateAiFazitMutation = trpc.evaluations.generateAiFazit.useMutation({
    onSuccess: (data) => {
      setAiFazit(data as typeof aiFazit);
    },
    onError: () => {
      setAiFazitError(true);
    },
  });

  // Manual AI score calculation mutation
  const calculateScore = trpc.evaluations.calculateManualAIScore.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
  });

  // Top-rated properties by AI score
  const { data: topRatedProperties, isLoading: isLoadingTopRated } = trpc.properties.getTopRatedByAIScore.useQuery(
    { excludePropertyId: propertyId ?? undefined, limit: 3 },
    { refetchOnWindowFocus: false }
  );

  // ============= Investor Metrics =============
  const investorMetrics = useMemo(() => {
    if (!propertyData) return null;

    const purchasePrice = parseNum(userPropertyParams?.purchase_price ?? propertyData.price, 0);
    const sqm = propertyData.sqm ?? 0;
    const rentPerSqm = propertyData.buyer_evaluation?.rental_income?.rent_per_sqm;
    const calculatedRent = rentPerSqm && sqm ? Number(rentPerSqm) * Number(sqm) : propertyData.actual_monthly_rent;
    const mieteinnahmen = parseNum(userPropertyParams?.monthly_rent ?? calculatedRent, 0);

    const financingTerms = propertyData.buyer_evaluation?.financing_terms;
    const defaultEKRate = financingTerms?.loan_to_value ? (100 - Number(financingTerms.loan_to_value)) : 20;
    const eigenkapitalRate = parseEKRate(userPropertyParams?.equity_percentage, defaultEKRate);
    const zinssatz = parseNum(userPropertyParams?.interest_rate, parseNum(financingTerms?.interest_rate, 3.8));
    const tilgung = parseNum(userPropertyParams?.amortization_rate, parseNum(financingTerms?.amortization_rate, 2.0));
    const maklerRate = parseNum(userPropertyParams?.broker_commission, parseNum(propertyData.commission_rate, 0));
    const renovierungskosten = parseNum(userPropertyParams?.renovation_costs, 0);

    const calculateHausgeld = (): number => {
      if (propertyData.monthly_fee && Number(propertyData.monthly_fee) > 0) return Number(propertyData.monthly_fee);
      if (sqm) {
        // Use calculator defaults from database, with fallback values
        const hausgeldModern = calculatorDefaults?.hausgeldPerSqmModern ?? 2.50;
        const hausgeldOld = calculatorDefaults?.hausgeldPerSqmOld ?? 3.50;
        const hausgeldProQm = propertyData.year_built && Number(propertyData.year_built) >= 1980 ? hausgeldModern : hausgeldOld;
        return Number(sqm) * hausgeldProQm;
      }
      return 0;
    };
    const hausgeld = parseNum(userPropertyParams?.monthly_fee, calculateHausgeld());

    const kaufnebenkosten = purchasePrice * 0.10 + renovierungskosten + (purchasePrice * maklerRate / 100);
    const gesamtinvestition = purchasePrice + kaufnebenkosten;
    const eigenkapital = gesamtinvestition * (eigenkapitalRate / 100);
    const darlehensbetrag = gesamtinvestition - eigenkapital;

    const monatlicheZinsen = darlehensbetrag * (zinssatz / 100 / 12);
    const monatlicheTilgung = darlehensbetrag * (tilgung / 100 / 12);
    const monatlicheRate = Math.ceil(monatlicheZinsen + monatlicheTilgung);
    const instandhaltungskosten = Math.ceil(purchasePrice * 0.01 / 12);
    const hausgeldNichtUmlegbar = Math.ceil(hausgeld * 0.30);
    const monatlicheAusgaben = monatlicheRate + hausgeldNichtUmlegbar + instandhaltungskosten;

    const monthlyCashflow = mieteinnahmen > 0 ? mieteinnahmen - monatlicheAusgaben : undefined;
    const grossYield = mieteinnahmen > 0 && purchasePrice > 0 ? (mieteinnahmen * 12 / purchasePrice) * 100 : undefined;
    const rentMultiplier = mieteinnahmen > 0 && purchasePrice > 0 ? purchasePrice / (mieteinnahmen * 12) : undefined;

    let steuereffekt: { monatlich: number; jaehrlich: number } | undefined;
    if (monthlyCashflow !== undefined && purchasePrice > 0) {
      const afaRate = getAfaRate(propertyData.year_built ? Number(propertyData.year_built) : undefined);
      const buildingRatio = getBuildingRatio(propertyData.year_built ? Number(propertyData.year_built) : undefined);
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
  }, [propertyData, userPropertyParams, taxProfile]);

  // ============= Effects =============

  // Generate AI Fazit
  useEffect(() => {
    if (!fazitRequested && !aiFazit && !generateAiFazitMutation.isPending && !aiFazitError && propertyId && propertyData) {
      if (investorMetrics && investorMetrics.grossYield !== undefined) {
        setFazitRequested(true);
        generateAiFazitMutation.mutate({
          mode: 'investor',
          propertyId,
          forceRegenerate: false,
          purchasePrice: investorMetrics.purchasePrice,
          monthlyRent: investorMetrics.mieteinnahmen || undefined,
          grossYield: investorMetrics.grossYield,
          rentMultiplier: investorMetrics.rentMultiplier,
          monthlyCashflow: investorMetrics.monthlyCashflow,
          cashOnCash: investorMetrics.monthlyCashflow !== undefined && investorMetrics.eigenkapital > 0
            ? (investorMetrics.monthlyCashflow * 12 / investorMetrics.eigenkapital) * 100
            : undefined,
          equityPercentage: investorMetrics.eigenkapitalRate,
          interestRate: investorMetrics.zinssatz,
          loanAmount: investorMetrics.darlehensbetrag,
          amortizationRate: investorMetrics.tilgung,
          monthlyMortgage: investorMetrics.monatlicheRate,
          totalInvestment: investorMetrics.gesamtinvestition,
          monthlyFee: investorMetrics.hausgeld,
          monthlyMaintenance: investorMetrics.instandhaltungskosten,
          equityAmount: investorMetrics.eigenkapital,
          location: propertyData?.location,
          sqm: propertyData?.sqm ? Number(propertyData.sqm) : undefined,
          yearBuilt: propertyData?.year_built ? Number(propertyData.year_built) : undefined,
        });
      }
    }
  }, [fazitRequested, aiFazit, aiFazitError, investorMetrics, propertyId, propertyData, generateAiFazitMutation]);

  // ============= Form handlers =============
  const handleInputChange = (field: keyof PropertyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculate = () => {
    const price = parseFloat(formData.price);
    const sqm = parseFloat(formData.sqm);
    const monthlyRent = formData.monthlyRent ? parseFloat(formData.monthlyRent) : undefined;
    const yearBuilt = formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined;

    if (!price || !sqm || !formData.location) {
      alert('Bitte füllen Sie mindestens Kaufpreis, Wohnfläche und Standort aus.');
      return;
    }

    calculateScore.mutate({
      price,
      sqm,
      location: formData.location,
      monthlyRent,
      yearBuilt,
    });
  };

  const isFormValid = formData.price && formData.sqm && formData.location;

  // ============= Loading state =============
  if (propertyId && isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#030712]">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // ============= PROPERTY MODE =============
  if (propertyId && propertyData) {
    return (
      <main className="min-h-screen bg-white dark:bg-[#030712]">
        <Header />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Back Button - Desktop */}
          <button
            onClick={() => router.back()}
            className="absolute left-0 top-6 sm:top-8 -translate-x-1/2 hidden lg:flex w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 items-center justify-center hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all z-10 text-gray-700 dark:text-gray-300"
            title="Zurück"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Back Button - Mobile */}
          <button
            onClick={() => router.back()}
            className="lg:hidden inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 group"
          >
            <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-gray-300 dark:group-hover:border-gray-600 group-hover:shadow-sm transition-all">
              <ArrowLeft size={16} />
            </div>
            <span className="text-sm font-medium">Zurück</span>
          </button>

          {/* Property Mini Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 flex gap-4 items-center">
            {propertyData.images && propertyData.images.length > 0 && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 relative">
                <Image
                  src={propertyData.images[0]}
                  alt={propertyData.title || 'Immobilie'}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 dark:text-white truncate">{propertyData.title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{propertyData.location}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {formatCurrency(propertyData.price ?? 0)}
              </p>
            </div>
            {propertyData.days_online !== undefined && (
              <span className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium backdrop-blur-sm bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50 flex-shrink-0">
                {propertyData.days_online === 0 ? 'Neu' : `Seit ${propertyData.days_online} ${propertyData.days_online === 1 ? 'Tag' : 'Tagen'} online`}
              </span>
            )}
          </div>

          {/* Marktvergleich Card */}
          <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
            <div
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => setIsSmartCheckExpanded(!isSmartCheckExpanded)}
            >
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">Marktvergleich</h3>
              <ChevronDown
                size={20}
                className={`text-gray-400 transition-transform duration-200 ${isSmartCheckExpanded ? 'rotate-180' : ''}`}
              />
            </div>

            {isSmartCheckExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {isLoadingMarketData ? (
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Marktdaten werden geladen...</span>
                  </div>
                ) : marketData && marketData.marketAvgPricePerSqm > 0 ? (
                  <MarketComparisonBar
                    deviationPercent={marketData.deviationPercent ?? 0}
                    pricePosition={(marketData.pricePosition as 'sehr_guenstig' | 'guenstig' | 'marktgerecht' | 'teuer' | 'sehr_teuer') ?? 'marktgerecht'}
                    currentPricePerSqm={simulatedPrice && propertyData.sqm
                      ? Math.round(simulatedPrice / Number(propertyData.sqm))
                      : marketData.currentPricePerSqm ?? 0}
                    currentTotalPrice={simulatedPrice ?? propertyData.price ?? 0}
                    marketAvgPricePerSqm={marketData.marketAvgPricePerSqm ?? 0}
                    minPricePerSqm={marketData.minPricePerSqm}
                    maxPricePerSqm={marketData.maxPricePerSqm}
                    sqm={propertyData.sqm ? Number(propertyData.sqm) : 0}
                    rooms={propertyData.rooms ? Number(propertyData.rooms) : 0}
                    location={propertyData.location ?? ''}
                    isInteractive={true}
                    viewType="buyer_investor"
                    aiScore={propertyData.ai_investment_score ? Number(propertyData.ai_investment_score) : null}
                    onPriceChange={(newPrice) => setSimulatedPrice(newPrice)}
                  />
                ) : (
                  <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Keine Marktdaten für diese Region verfügbar</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Score Card */}
          {propertyData.ai_investment_score !== undefined && propertyData.ai_investment_score !== null && (
            isLoadingAIScore ? (
              <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">KI-Analyse wird geladen...</span>
              </div>
            ) : (
              <AIScoreCard
                score={Math.round(Number(propertyData.ai_investment_score))}
                propertyTitle={propertyData.title || 'Immobilie'}
                description={aiScoreAnalysis?.summary || propertyData.buyer_evaluation?.buyer_investor?.summary}
                factors={aiScoreAnalysis?.factors || calculateFactorScores(
                  propertyData.buyer_evaluation,
                  propertyData.price ?? undefined,
                  propertyData.sqm,
                  Number(propertyData.ai_investment_score)
                )}
              />
            )
          )}

          {/* Stärken & Risiken Cards */}
          {((propertyData.highlights && propertyData.highlights.length > 0) || (propertyData.red_flags && propertyData.red_flags.length > 0)) && (
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              {/* Stärken Card */}
              {propertyData.highlights && propertyData.highlights.length > 0 && (
                <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-200 dark:border-emerald-700 p-4">
                  <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                    <Check size={16} className="text-emerald-600 dark:text-emerald-500" />
                    Stärken
                  </h4>
                  <ul className="space-y-1.5">
                    {propertyData.highlights.map((highlight: string, index: number) => (
                      <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risiken Card */}
              {propertyData.red_flags && propertyData.red_flags.length > 0 && (
                <div className="flex-1 bg-rose-50 dark:bg-rose-900/30 rounded-xl border border-rose-200 dark:border-rose-700 p-4">
                  <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-600 dark:text-rose-500" />
                    Risiken
                  </h4>
                  <ul className="space-y-1.5">
                    {propertyData.red_flags.map((flag: string, index: number) => {
                      const shortFlag = flag.length > 60 ? flag.substring(0, 57) + '...' : flag;
                      return (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="text-rose-500 mt-0.5">•</span>
                          <span title={flag}>{shortFlag}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* KI-Fazit Section */}
          {generateAiFazitMutation.isPending ? (
            <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
              <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-400">KI-Analyse läuft...</p>
            </div>
          ) : aiFazit && aiFazit.text ? (
            <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              <div
                className="cursor-pointer"
                onClick={() => setIsKiFazitExpanded(!isKiFazitExpanded)}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: aiFazit.color + '20' }}>
                      <Sparkles className="w-4 h-4" style={{ color: aiFazit.color }} />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">KI-Fazit</span>
                  </div>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ${isKiFazitExpanded ? 'rotate-180' : ''}`} />
                </div>

                {isKiFazitExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    {aiFazit.claude && aiFazit.openai && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowClaudeFazit(false); }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            !showClaudeFazit ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          GPT-4o
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowClaudeFazit(true); }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            showClaudeFazit ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          Claude
                        </button>
                      </div>
                    )}

                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {showClaudeFazit && aiFazit.claude ? aiFazit.claude.text : aiFazit.text}
                    </p>

                    {(() => {
                      const suggestions = showClaudeFazit && aiFazit.claude ? aiFazit.claude.suggestions : aiFazit.suggestions;
                      return suggestions && suggestions.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <Lightbulb size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1.5">
                              {suggestions.map((tip, i) => (
                                <p key={i} className="text-xs text-gray-600 dark:text-gray-400">{tip}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Link zur Calculator-Seite */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => router.push(`/property/${propertyId}/calculator?mode=investor`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              <Calculator size={18} />
              <span>Zur Detail-Berechnung</span>
            </button>
          </div>

        </div>

        {/* Top-rated Properties - Full Width */}
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-12 pb-8">
          <SimilarProperties
            title="Top bewertete Objekte"
            subtitle="Nach KI-Score sortiert"
            properties={(topRatedProperties || []) as SimilarProperty[]}
            badgeContext="ai-score"
            isLoading={isLoadingTopRated}
            linkBuilder={(id) => `/property/${id}/ai-score`}
            fullWidth
          />
        </div>
      </main>
    );
  }

  // ============= MANUAL/FORM MODE =============
  // Berechne Metriken für die Anzeige
  const manualMetrics = (() => {
    const price = parseFloat(formData.price) || 0;
    const sqm = parseFloat(formData.sqm) || 0;
    const monthlyRent = formData.monthlyRent ? parseFloat(formData.monthlyRent) : 0;
    const yearBuilt = formData.yearBuilt ? parseInt(formData.yearBuilt) : 0;
    const pricePerSqm = sqm > 0 ? price / sqm : 0;
    const grossYield = monthlyRent > 0 && price > 0 ? (monthlyRent * 12 / price) * 100 : 0;
    const rentMultiplier = monthlyRent > 0 ? price / (monthlyRent * 12) : 0;

    // Durchschnittliche Marktpreise - verwende API-Daten wenn verfügbar
    const avgPricePerSqm = manualMarketData?.marketAvgPricePerSqm ?? (
      formData.location.toLowerCase().includes('münchen') ? 8500 :
      formData.location.toLowerCase().includes('berlin') ? 5500 :
      formData.location.toLowerCase().includes('hamburg') ? 6000 :
      formData.location.toLowerCase().includes('frankfurt') ? 6500 :
      formData.location.toLowerCase().includes('köln') ? 4500 :
      formData.location.toLowerCase().includes('düsseldorf') ? 4800 : 4000
    );
    const deviation = manualMarketData?.deviationPercent ?? (avgPricePerSqm > 0 ? ((pricePerSqm - avgPricePerSqm) / avgPricePerSqm) * 100 : 0);

    // Stärken & Risiken
    const highlights: string[] = [];
    const risks: string[] = [];

    if (result) {
      if (grossYield >= 5) highlights.push(`Attraktive Bruttorendite von ${grossYield.toFixed(1)}%`);
      if (grossYield >= 4 && grossYield < 5) highlights.push(`Solide Bruttorendite von ${grossYield.toFixed(1)}%`);
      if (rentMultiplier > 0 && rentMultiplier <= 20) highlights.push(`Guter Mietmultiplikator von ${rentMultiplier.toFixed(1)}x`);
      if (pricePerSqm < 4000) highlights.push('Günstiger Quadratmeterpreis');
      if (yearBuilt >= 2000) highlights.push('Modernes Baujahr, geringe Instandhaltung');
      if (yearBuilt >= 2020) highlights.push('Neuwertige Immobilie');
      if (result.score >= 70) highlights.push('Überdurchschnittliches Investment-Potential');

      if (grossYield > 0 && grossYield < 3) risks.push(`Niedrige Bruttorendite von nur ${grossYield.toFixed(1)}%`);
      if (rentMultiplier > 25) risks.push(`Hoher Mietmultiplikator von ${rentMultiplier.toFixed(1)}x`);
      if (pricePerSqm > 7000) risks.push('Hoher Quadratmeterpreis');
      if (yearBuilt > 0 && yearBuilt < 1970) risks.push('Älteres Gebäude, mögliche Sanierungskosten');
      if (yearBuilt > 0 && yearBuilt < 1950) risks.push('Vor 1950 gebaut - Substanz prüfen');
      if (result.score < 50) risks.push('Unterdurchschnittliches Investment-Potential');

      if (highlights.length === 0 && grossYield > 0) highlights.push('Vermietete Immobilie mit laufenden Einnahmen');
      if (risks.length === 0) risks.push('Keine wesentlichen Risikofaktoren erkannt');
    }

    return { price, sqm, monthlyRent, yearBuilt, pricePerSqm, grossYield, rentMultiplier, avgPricePerSqm, deviation, highlights, risks };
  })();

  // Berechne Preis-Position für MarketComparisonBar
  const getPricePosition = (deviation: number): 'sehr_guenstig' | 'guenstig' | 'marktgerecht' | 'teuer' | 'sehr_teuer' => {
    if (deviation < -15) return 'sehr_guenstig';
    if (deviation < -5) return 'guenstig';
    if (deviation < 5) return 'marktgerecht';
    if (deviation < 15) return 'teuer';
    return 'sehr_teuer';
  };

  return (
    <main className="min-h-screen bg-white dark:bg-[#030712]">
      <Header />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Property Card mit integrierten Formularfeldern */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
            {/* Header-Zeile */}
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-[#E31C5F] to-[#FF9500] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {manualMetrics.price > 0 ? formatCurrency(manualMetrics.price) : '– €'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Immobilien-Analyse
                </p>
              </div>
              {result && (
                <span className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium backdrop-blur-sm bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/50 flex-shrink-0">
                  Score: {result.score}
                </span>
              )}
            </div>

            {/* Formular-Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="350000"
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
                    className="w-full pl-9 pr-12 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">m²</span>
                </div>
              </div>

              {/* Standort */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Standort *
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
                </div>
              </div>

              {/* Miete/Monat */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Miete/Monat
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Euro size={16} />
                  </div>
                  <input
                    type="number"
                    value={formData.monthlyRent}
                    onChange={(e) => handleInputChange('monthlyRent', e.target.value)}
                    placeholder="1200"
                    className="w-full pl-9 pr-8 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                </div>
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
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent font-semibold"
                  />
                </div>
              </div>

              {/* Berechnen-Button */}
              <div className="flex items-end">
                <button
                  onClick={handleCalculate}
                  disabled={!isFormValid || calculateScore.isPending}
                  className={`w-full py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    isFormValid && !calculateScore.isPending
                      ? 'bg-gradient-to-r from-[#E31C5F] to-[#FF9500] text-white hover:opacity-90'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {calculateScore.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  {calculateScore.isPending ? 'Analysiere...' : 'Berechnen'}
                </button>
              </div>
            </div>

            {calculateScore.isError && (
              <p className="text-xs text-red-500 text-center mt-3">Fehler bei der Berechnung</p>
            )}
          </div>

            {/* Kennzahlen - oberhalb von Marktvergleich */}
            {result && result.grossYield && (
              <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Kennzahlen</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Bruttorendite</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{result.grossYield.toFixed(2)}%</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Preis pro m²</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{manualMetrics.pricePerSqm.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</p>
                  </div>
                  {manualMetrics.rentMultiplier > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Mietmultiplikator</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{manualMetrics.rentMultiplier.toFixed(1)}x</p>
                    </div>
                  )}
                  {manualMetrics.yearBuilt > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Gebäudealter</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{new Date().getFullYear() - manualMetrics.yearBuilt} Jahre</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Marktvergleich Card mit MarketComparisonBar */}
            <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setIsSmartCheckExpanded(!isSmartCheckExpanded)}
              >
                <h3 className="font-semibold text-gray-900 dark:text-white text-base">Marktvergleich</h3>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 transition-transform duration-200 ${isSmartCheckExpanded ? 'rotate-180' : ''}`}
                />
              </div>

              {isSmartCheckExpanded && (
                <div className="px-4 pb-4">
                  {isLoadingManualMarketData ? (
                    <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Marktdaten werden geladen...</span>
                    </div>
                  ) : manualMetrics.pricePerSqm > 0 ? (
                    <MarketComparisonBar
                      deviationPercent={manualMetrics.deviation}
                      pricePosition={manualMarketData?.pricePosition as 'sehr_guenstig' | 'guenstig' | 'marktgerecht' | 'teuer' | 'sehr_teuer' ?? getPricePosition(manualMetrics.deviation)}
                      currentPricePerSqm={Math.round(manualMetrics.pricePerSqm)}
                      currentTotalPrice={manualMetrics.price}
                      marketAvgPricePerSqm={manualMetrics.avgPricePerSqm}
                      minPricePerSqm={manualMarketData?.minPricePerSqm ?? Math.round(manualMetrics.avgPricePerSqm * 0.85)}
                      maxPricePerSqm={manualMarketData?.maxPricePerSqm ?? Math.round(manualMetrics.avgPricePerSqm * 1.15)}
                      sqm={manualMetrics.sqm}
                      rooms={3}
                      location={formData.location || 'Deutschland'}
                      isInteractive={false}
                      viewType="buyer_investor"
                      aiScore={result?.score ?? null}
                    />
                  ) : (
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Geben Sie Kaufpreis und Wohnfläche ein</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Score Card */}
            {result ? (
              <AIScoreCard
                score={result.score}
                propertyTitle={formData.location || 'Ihre Immobilie'}
                description={result.summary}
                factors={result.factors}
              />
            ) : (
              <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center gap-3">
                <Sparkles className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Klicken Sie auf &quot;Berechnen&quot; für die KI-Analyse</span>
              </div>
            )}

            {/* Stärken & Risiken Cards */}
            {result && (manualMetrics.highlights.length > 0 || manualMetrics.risks.length > 0) && (
              <div className="flex flex-col sm:flex-row gap-4 mb-4 mt-4">
                {manualMetrics.highlights.length > 0 && (
                  <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-200 dark:border-emerald-700 p-4">
                    <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                      <Check size={16} className="text-emerald-600 dark:text-emerald-500" />
                      Stärken
                    </h4>
                    <ul className="space-y-1.5">
                      {manualMetrics.highlights.map((highlight: string, index: number) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {manualMetrics.risks.length > 0 && (
                  <div className="flex-1 bg-rose-50 dark:bg-rose-900/30 rounded-xl border border-rose-200 dark:border-rose-700 p-4">
                    <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-rose-600 dark:text-rose-500" />
                      Risiken
                    </h4>
                    <ul className="space-y-1.5">
                      {manualMetrics.risks.map((risk: string, index: number) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="text-rose-500 mt-0.5">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

      </div>

      {/* Top-rated Properties - Full Width */}
      <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-12 pb-8">
        <SimilarProperties
          title="Top bewertete Objekte"
          subtitle="Nach KI-Score sortiert"
          properties={(topRatedProperties || []) as SimilarProperty[]}
          badgeContext="ai-score"
          isLoading={isLoadingTopRated}
          linkBuilder={(id) => `/property/${id}/ai-score`}
          fullWidth
        />
      </div>
    </main>
  );
}
