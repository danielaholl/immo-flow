'use client';

import { useState } from 'react';

export interface FinancingCalculatorProps {
  purchasePrice: number;
  sqm?: number;
  rooms?: number;
  yearBuilt?: number;
  floor?: string;
  estimatedRent?: number;
  estimatedOperatingCosts?: number;
  estimatedMaintenanceCosts?: number;
}

export function FinancingCalculator({
  purchasePrice,
  sqm,
  rooms,
  yearBuilt,
  floor,
  estimatedRent = 0,
  estimatedOperatingCosts = 0,
  estimatedMaintenanceCosts = 0,
}: FinancingCalculatorProps) {
  // Default values
  const [equityPercentage, setEquityPercentage] = useState(20); // 20% Eigenkapital
  const [interestRate, setInterestRate] = useState(3.5); // 3.5% Zinssatz
  const [repaymentRate, setRepaymentRate] = useState(2.0); // 2% Tilgung

  // Calculations
  const equity = (purchasePrice * equityPercentage) / 100;
  const loanAmount = purchasePrice - equity;

  // Purchase costs (Nebenkosten beim Kauf: ca. 10-15%)
  const purchaseCosts = purchasePrice * 0.12; // 12% (Grunderwerbsteuer, Notar, Makler)
  const totalInvestment = equity + purchaseCosts;

  // Monthly loan payment details
  const monthlyInterestRate = interestRate / 100 / 12;
  const monthlyRepaymentRate = repaymentRate / 100 / 12;
  const monthlyInterestAmount = loanAmount * monthlyInterestRate;
  const monthlyRepaymentAmount = loanAmount * monthlyRepaymentRate;
  const monthlyRate = monthlyInterestAmount + monthlyRepaymentAmount;

  // Annual capital service
  const annualInterest = monthlyInterestAmount * 12;
  const annualRepayment = monthlyRepaymentAmount * 12;
  const annualCapitalService = monthlyRate * 12;

  // Loan term calculation (years until fully repaid)
  const monthlyTotalRate = monthlyInterestRate + monthlyRepaymentRate;
  let loanTermYears = 0;
  let remainingDebtAfter10Years = loanAmount;
  let remainingDebtAfter20Years = loanAmount;

  if (monthlyTotalRate > 0) {
    const monthlyPaymentTotal = loanAmount * monthlyTotalRate;

    // After 10 years (120 months)
    if (monthlyInterestRate > 0) {
      const factor10 = Math.pow(1 + monthlyInterestRate, 120);
      remainingDebtAfter10Years = loanAmount * factor10 - monthlyPaymentTotal * ((factor10 - 1) / monthlyInterestRate);
      remainingDebtAfter10Years = Math.max(0, remainingDebtAfter10Years);
    }

    // After 20 years (240 months)
    if (monthlyInterestRate > 0) {
      const factor20 = Math.pow(1 + monthlyInterestRate, 240);
      remainingDebtAfter20Years = loanAmount * factor20 - monthlyPaymentTotal * ((factor20 - 1) / monthlyInterestRate);
      remainingDebtAfter20Years = Math.max(0, remainingDebtAfter20Years);
    }

    // Calculate full loan term
    if (monthlyInterestRate > 0 && monthlyPaymentTotal > loanAmount * monthlyInterestRate) {
      const months = -Math.log(1 - (loanAmount * monthlyInterestRate) / monthlyPaymentTotal) / Math.log(1 + monthlyInterestRate);
      loanTermYears = months / 12;
    }
  }

  // Total interest paid over full term
  const totalInterestPaid = loanTermYears > 0 ? (monthlyRate * loanTermYears * 12) - loanAmount : 0;

  // Vacancy rate (Mietausfall) - 2% of monthly rent
  const vacancyRate = 0.02;
  const monthlyVacancyCost = estimatedRent * vacancyRate;

  // Monthly cashflow
  const monthlyCashflow = estimatedRent - estimatedOperatingCosts - estimatedMaintenanceCosts - monthlyVacancyCost - monthlyRate;

  // Annual cashflow and return
  const annualCashflow = monthlyCashflow * 12;

  // Gross rental yield (Bruttomietrendite)
  const grossYield = estimatedRent > 0 ? ((estimatedRent * 12) / purchasePrice) * 100 : 0;

  // Net rental yield (Nettorendite) - after operating costs but before financing
  const annualNetIncome = (estimatedRent * 12) - ((estimatedOperatingCosts + estimatedMaintenanceCosts + monthlyVacancyCost) * 12);
  const netYield = purchasePrice > 0 ? (annualNetIncome / purchasePrice) * 100 : 0;

  // Purchase price multiplier (Faktor) - how many years of rent to recover purchase price
  const priceFactor = estimatedRent > 0 ? purchasePrice / (estimatedRent * 12) : 0;

  // Cash-on-Cash Return - annual cashflow / total cash invested (including purchase costs)
  const cashOnCash = totalInvestment > 0 ? (annualCashflow / totalInvestment) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Rendite-Kennzahlen Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">📊 Rendite-Kennzahlen</h2>

        <div className="grid grid-cols-2 gap-6">
          {/* Bruttorendite */}
          <div>
            <div className="text-sm text-gray-600 mb-2">Bruttorendite</div>
            <div className="text-4xl font-bold text-green-600">{grossYield.toFixed(1)}%</div>
          </div>

          {/* Nettorendite */}
          <div>
            <div className="text-sm text-gray-600 mb-2">Nettorendite</div>
            <div className="text-4xl font-bold text-green-600">{netYield.toFixed(1)}%</div>
          </div>

          {/* Faktor */}
          <div>
            <div className="text-sm text-gray-600 mb-2">Faktor</div>
            <div className="text-4xl font-bold text-gray-900">{priceFactor > 0 ? `${priceFactor.toFixed(1)}x` : 'N/A'}</div>
          </div>

          {/* Cash-on-Cash */}
          <div>
            <div className="text-sm text-gray-600 mb-2">Cash-on-Cash</div>
            <div className={`text-4xl font-bold ${cashOnCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {cashOnCash.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Monatlicher Cashflow Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">💶 Monatlicher Cashflow</h2>

        <div className="space-y-4">
          {/* Kaltmiete */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Kaltmiete</span>
            <span className="text-xl font-semibold text-green-600">
              +€{estimatedRent.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Hausgeld */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Hausgeld (nicht umlagefähig)</span>
            <span className="text-xl font-semibold text-red-600">
              -€{estimatedOperatingCosts.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Instandhaltung */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Instandhaltung (€1/m²)</span>
            <span className="text-xl font-semibold text-red-600">
              -€{estimatedMaintenanceCosts.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Mietausfall */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Mietausfall (2%)</span>
            <span className="text-xl font-semibold text-red-600">
              -€{monthlyVacancyCost.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Zins + Tilgung */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Zins + Tilgung ({interestRate.toFixed(1)}% + {repaymentRate.toFixed(1)}%)</span>
            <span className="text-xl font-semibold text-red-600">
              -€{monthlyRate.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-900">Cashflow/Monat</span>
              <span className={`text-4xl font-bold ${monthlyCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {monthlyCashflow >= 0 ? '+' : ''}€{Math.abs(monthlyCashflow).toLocaleString('de-DE', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Finanzierungsrechner with Sliders */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Finanzierungs-Einstellungen</h2>

        {/* Input Controls */}
        <div className="space-y-4">
          {/* Eigenkapital */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Eigenkapital</label>
              <span className="text-sm font-bold text-primary">
                {equityPercentage}% ({equity.toLocaleString('de-DE')} €)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={equityPercentage}
              onChange={(e) => setEquityPercentage(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Zinssatz */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Zinssatz</label>
              <span className="text-sm font-bold text-primary">{interestRate.toFixed(2)}% p.a.</span>
            </div>
            <input
              type="range"
              min="1"
              max="7"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1%</span>
              <span>4%</span>
              <span>7%</span>
            </div>
          </div>

          {/* Tilgung */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Tilgung</label>
              <span className="text-sm font-bold text-primary">{repaymentRate.toFixed(2)}% p.a.</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={repaymentRate}
              onChange={(e) => setRepaymentRate(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1%</span>
              <span>3%</span>
              <span>5%</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Darlehensbetrag</div>
            <div className="text-2xl font-bold text-gray-900">{loanAmount.toLocaleString('de-DE')} €</div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Kaufnebenkosten</div>
            <div className="text-2xl font-bold text-gray-900">{purchaseCosts.toLocaleString('de-DE')} €</div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Gesamtinvestition</div>
            <div className="text-2xl font-bold text-gray-900">{totalInvestment.toLocaleString('de-DE')} €</div>
          </div>
        </div>

        {/* Capital Service Section */}
        <div className="border-t pt-4 mt-6">
          <h3 className="text-lg font-semibold mb-3">📊 Kapitaldienst & Finanzierungskosten</h3>

          {/* Monthly Rate Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">Monatliche Rate: {monthlyRate.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Zinsanteil</span>
                <span className="font-semibold text-red-600">{monthlyInterestAmount.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tilgungsanteil</span>
                <span className="font-semibold text-blue-600">{monthlyRepaymentAmount.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
              </div>
            </div>
          </div>

          {/* Annual Capital Service */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 mb-1">Jährliche Zinsen</div>
              <div className="text-lg font-bold text-red-600">{annualInterest.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 mb-1">Jährliche Tilgung</div>
              <div className="text-lg font-bold text-blue-600">{annualRepayment.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 mb-1">Kapitaldienst p.a.</div>
              <div className="text-lg font-bold text-purple-600">{annualCapitalService.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</div>
            </div>
          </div>

          {/* Loan Term and Remaining Debt */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 mb-1">Laufzeit bis Volltilgung</div>
              <div className="text-lg font-bold text-indigo-600">
                {loanTermYears > 0 && loanTermYears < 100 ? `${loanTermYears.toFixed(1)} Jahre` : '> 100 Jahre'}
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 mb-1">Restschuld nach 10 Jahren</div>
              <div className="text-lg font-bold text-amber-600">
                {remainingDebtAfter10Years.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 mb-1">Restschuld nach 20 Jahren</div>
              <div className="text-lg font-bold text-orange-600">
                {remainingDebtAfter20Years.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €
              </div>
            </div>
          </div>

          {/* Total Interest */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600 mb-1">Gesamte Zinskosten bis Volltilgung</div>
                <div className="text-xs text-gray-500">Summe aller Zinszahlungen über die Laufzeit</div>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {totalInterestPaid > 0 ? `${totalInterestPaid.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €` : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex gap-2">
            <div className="text-blue-600 text-xl">ℹ️</div>
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Hinweise zur Berechnung:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Kaufnebenkosten: ~12% (Grunderwerbsteuer, Notar, Makler)</li>
                <li>Mietausfall: 2% der Kaltmiete (Leerstand & Mietausfälle)</li>
                <li>Die Mieteinnahmen und Kosten sind Schätzungen der KI</li>
                <li>Werte sollten mit einem Finanzberater überprüft werden</li>
                <li>Steuerliche Effekte sind nicht berücksichtigt</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
