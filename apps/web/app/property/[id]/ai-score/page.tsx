'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Header } from '@/app/components/Header';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, Sparkles, Loader2, ChevronDown, Lightbulb, Check, AlertTriangle, Calculator } from 'lucide-react';
import Image from 'next/image';
import { AIScoreCard } from '@/app/components/AIScoreCard';
import { MarketComparisonBar } from '@/app/components/MarketComparisonBar';
import { SimilarProperties, SimilarProperty } from '@/app/components/SimilarProperties';
import {
  formatCurrency,
  calculateFactorScores,
  parseNum,
  parseEKRate,
  getAfaRate,
  getBuildingRatio,
} from '../utils/calculator-utils';

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export default function AIScorePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext();

  const propertyId = params.id as string;
  const isValidPropertyId = Boolean(propertyId && isValidUUID(propertyId));

  // Redirect to home if ID is not a valid UUID
  useEffect(() => {
    if (propertyId && !isValidUUID(propertyId)) {
      router.push('/');
    }
  }, [propertyId, router]);
  const [isKiFazitExpanded, setIsKiFazitExpanded] = useState(false);
  const [showClaudeFazit, setShowClaudeFazit] = useState(false);
  const [isSmartCheckExpanded, setIsSmartCheckExpanded] = useState(true);
  const [simulatedPrice, setSimulatedPrice] = useState<number | null>(null);

  // Fetch property data
  const { data: property, isLoading } = trpc.properties.getByIdWithOwner.useQuery(
    { id: propertyId },
    {
      enabled: isValidPropertyId,
      onError: () => {
        router.push('/');
      },
    }
  );

  // Fetch user property parameters
  const { data: userPropertyParams } = trpc.userPropertyParameters.get.useQuery(
    { propertyId },
    { enabled: isValidPropertyId && !!user }
  );

  // Fetch tax profile for steuereffekt calculation
  const { data: taxProfile } = trpc.taxOptimizer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Fetch market comparison data
  const { data: marketData, isLoading: isLoadingMarketData } = trpc.properties.getMarketComparison.useQuery(
    { propertyId },
    {
      enabled: !!property && isValidPropertyId,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch AI Score Analysis (Claude Haiku)
  const { data: aiScoreAnalysis, isLoading: isLoadingAIScore } = trpc.evaluations.getAIScoreAnalysis.useQuery(
    { propertyId },
    {
      enabled: isValidPropertyId && !!property?.ai_investment_score,
      staleTime: Infinity,
    }
  );

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

  const generateAiFazitMutation = trpc.evaluations.generateAiFazit.useMutation({
    onSuccess: (data) => {
      setAiFazit(data as typeof aiFazit);
    },
    onError: () => {
      setAiFazitError(true);
    },
  });

  // Top-rated properties by AI score
  const { data: topRatedProperties, isLoading: isLoadingTopRated } = trpc.properties.getTopRatedByAIScore.useQuery(
    { excludePropertyId: propertyId, limit: 3 },
    { enabled: isValidPropertyId, refetchOnWindowFocus: false }
  );

  // Calculate investor metrics for AI Fazit generation
  const investorMetrics = useMemo(() => {
    if (!property) return null;

    const purchasePrice = parseNum(userPropertyParams?.purchase_price ?? property.price, 0);
    const sqm = property.sqm ?? 0;
    const rentPerSqm = property.buyer_evaluation?.rental_income?.rent_per_sqm;
    const calculatedRent = rentPerSqm && sqm ? Number(rentPerSqm) * Number(sqm) : property.actual_monthly_rent;
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
        const hausgeldProQm = property.year_built && Number(property.year_built) >= 1980 ? 2.50 : 3.50;
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
      const afaRate = getAfaRate(property.year_built ? Number(property.year_built) : undefined);
      const buildingRatio = getBuildingRatio(property.year_built ? Number(property.year_built) : undefined);
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
  }, [property, userPropertyParams, taxProfile]);

  // Generate AI Fazit
  useEffect(() => {
    if (!fazitRequested && !aiFazit && !generateAiFazitMutation.isPending && !aiFazitError && propertyId) {
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
          location: property?.location,
          sqm: property?.sqm ? Number(property.sqm) : undefined,
          yearBuilt: property?.year_built ? Number(property.year_built) : undefined,
        });
      }
    }
  }, [fazitRequested, aiFazit, aiFazitError, investorMetrics, propertyId, property]);

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
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button - links außerhalb des Inhaltsbereichs */}
        <button
          onClick={() => router.push(`/property/${propertyId}`)}
          className="absolute left-0 top-6 sm:top-8 -translate-x-1/2 hidden lg:flex w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 items-center justify-center hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all z-10 text-gray-700 dark:text-gray-300"
          title="Zurück"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Mobile Back Button - oben links im Inhaltsbereich */}
        <button
          onClick={() => router.push(`/property/${propertyId}`)}
          className="lg:hidden inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 group"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-gray-300 dark:group-hover:border-gray-600 group-hover:shadow-sm transition-all">
            <ArrowLeft size={16} />
          </div>
          <span className="text-sm font-medium">Zurück</span>
        </button>

        {/* Property Mini Header - volle Breite */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 flex gap-4 items-center">
          {property.images && property.images.length > 0 && (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 relative">
              <Image
                src={property.images[0]}
                alt={property.title || 'Immobilie'}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-900 dark:text-white truncate">{property.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{property.location}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {formatCurrency(property.price ?? 0)}
            </p>
          </div>
          {/* Days Online Badge - Glass Style */}
          {property.days_online !== undefined && (
            <span className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium backdrop-blur-sm bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50 flex-shrink-0">
              {property.days_online === 0 ? 'Neu' : `Seit ${property.days_online} ${property.days_online === 1 ? 'Tag' : 'Tagen'} online`}
            </span>
          )}
        </div>

        {/* Marktvergleich Card - Expandable */}
        {property.ai_investment_score !== undefined && property.ai_investment_score !== null && (
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
                  <div>
                    <MarketComparisonBar
                      deviationPercent={marketData.deviationPercent ?? 0}
                      pricePosition={(marketData.pricePosition as 'sehr_guenstig' | 'guenstig' | 'marktgerecht' | 'teuer' | 'sehr_teuer') ?? 'marktgerecht'}
                      currentPricePerSqm={simulatedPrice && property.sqm
                        ? Math.round(simulatedPrice / Number(property.sqm))
                        : marketData.currentPricePerSqm ?? 0}
                      currentTotalPrice={simulatedPrice ?? property.price ?? 0}
                      marketAvgPricePerSqm={marketData.marketAvgPricePerSqm ?? 0}
                      minPricePerSqm={marketData.minPricePerSqm}
                      maxPricePerSqm={marketData.maxPricePerSqm}
                      sqm={property.sqm ? Number(property.sqm) : 0}
                      rooms={property.rooms ? Number(property.rooms) : 0}
                      location={property.location ?? ''}
                      isInteractive={true}
                      viewType="buyer_investor"
                      aiScore={property.ai_investment_score ? Number(property.ai_investment_score) : null}
                      onPriceChange={(newPrice) => setSimulatedPrice(newPrice)}
                    />
                  </div>
                ) : (
                  <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Keine Marktdaten für diese Region verfügbar</p>
                  </div>
                )}

                {!marketData && !isLoadingMarketData && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                    Keine Marktdaten verfügbar
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Score Card */}
        {property.ai_investment_score !== undefined && property.ai_investment_score !== null && (
          isLoadingAIScore ? (
            <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">KI-Analyse wird geladen...</span>
            </div>
          ) : (
            <AIScoreCard
              score={Math.round(Number(property.ai_investment_score))}
              propertyTitle={property.title || 'Immobilie'}
              description={aiScoreAnalysis?.summary || property.buyer_evaluation?.buyer_investor?.summary}
              factors={aiScoreAnalysis?.factors || calculateFactorScores(
                property.buyer_evaluation,
                property.price ?? undefined,
                property.sqm,
                Number(property.ai_investment_score)
              )}
            />
          )
        )}

        {/* Stärken & Risiken Cards */}
        {((property.highlights && property.highlights.length > 0) || (property.red_flags && property.red_flags.length > 0)) && (
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Stärken Card */}
            {property.highlights && property.highlights.length > 0 && (
              <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-200 dark:border-emerald-700 p-4">
                <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                  <Check size={16} className="text-emerald-600 dark:text-emerald-500" />
                  Stärken
                </h4>
                <ul className="space-y-1.5">
                  {property.highlights.map((highlight: string, index: number) => (
                    <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risiken Card */}
            {property.red_flags && property.red_flags.length > 0 && (
              <div className="flex-1 bg-rose-50 dark:bg-rose-900/30 rounded-xl border border-rose-200 dark:border-rose-700 p-4">
                <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-600 dark:text-rose-500" />
                  Risiken
                </h4>
                <ul className="space-y-1.5">
                  {property.red_flags.map((flag: string, index: number) => {
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
            onClick={() => router.push(`/property/${propertyId}/calculator`)}
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
