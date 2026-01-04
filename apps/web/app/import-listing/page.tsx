'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '../components/Header';
import { PropertyListingManager } from '../components/PropertyListingManager';
import { Loader2 } from 'lucide-react';

function ImportListingContent() {
  const searchParams = useSearchParams();

  // Property-ID aus URL lesen (für Edit-Modus)
  const propertyId = searchParams.get('id') || undefined;

  // Calculator-Daten aus URL lesen (für Import von Calculator)
  const calculatorData = {
    price: searchParams.get('price') ? Number(searchParams.get('price')) : undefined,
    sqm: searchParams.get('sqm') ? Number(searchParams.get('sqm')) : undefined,
    location: searchParams.get('location') || undefined,
    yearBuilt: searchParams.get('yearBuilt') ? Number(searchParams.get('yearBuilt')) : undefined,
    monthlyRent: searchParams.get('monthlyRent') ? Number(searchParams.get('monthlyRent')) : undefined,
    monthlyFee: searchParams.get('monthlyFee') ? Number(searchParams.get('monthlyFee')) : undefined,
    commissionRate: searchParams.get('commissionRate') ? Number(searchParams.get('commissionRate')) : undefined,
    equityPercentage: searchParams.get('equityPercentage') ? Number(searchParams.get('equityPercentage')) : undefined,
    interestRate: searchParams.get('interestRate') ? Number(searchParams.get('interestRate')) : undefined,
    amortizationRate: searchParams.get('amortizationRate') ? Number(searchParams.get('amortizationRate')) : undefined,
    renovationCosts: searchParams.get('renovationCosts') ? Number(searchParams.get('renovationCosts')) : undefined,
  };

  // Nur wenn mindestens Preis, Fläche und Standort vorhanden sind
  const hasCalculatorData = !!(calculatorData.price && calculatorData.sqm && calculatorData.location);

  // Auf /import-listing ist der Mode immer "import"
  // - Ohne ID: Neue importierte Property erstellen
  // - Mit ID: Importierte Property bearbeiten
  return (
    <PropertyListingManager
      propertyId={propertyId}
      mode="import"
      initialCalculatorData={hasCalculatorData ? calculatorData : undefined}
    />
  );
}

export default function ImportListingPage() {
  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <Header />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }>
        <ImportListingContent />
      </Suspense>
    </div>
  );
}
