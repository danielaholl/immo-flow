'use client';

import React from 'react';
import {
  Building2,
  Wallet,
  Landmark,
  Home,
  AlertCircle,
} from 'lucide-react';

type PropertyType = 'apartment' | 'house' | 'commercial' | 'multi_family';
type PropertyCondition = 'new' | 'renovated' | 'good' | 'needs_work';

export interface PropertyFormData {
  // Basics
  title: string;
  propertyType: PropertyType | '';
  condition: PropertyCondition | '';
  location: string;
  postalCode: string;
  sqm: string;
  rooms: string;
  yearBuilt: string;

  // Purchase
  purchaseDate: string;
  purchasePrice: string;
  purchaseCosts: string;
  renovationCosts: string;
  currentValue: string;

  // Financing
  loanAmount: string;
  interestRate: string;
  amortizationRate: string;
  repaymentFreeYears: string;
  loanStartDate: string;

  // Rental
  monthlyRent: string;
  monthlyFee: string;
}

export const initialPropertyFormData: PropertyFormData = {
  title: '',
  propertyType: '',
  condition: '',
  location: '',
  postalCode: '',
  sqm: '',
  rooms: '',
  yearBuilt: '',
  purchaseDate: '',
  purchasePrice: '',
  purchaseCosts: '',
  renovationCosts: '',
  currentValue: '',
  loanAmount: '',
  interestRate: '',
  amortizationRate: '',
  repaymentFreeYears: '',
  loanStartDate: '',
  monthlyRent: '',
  monthlyFee: '',
};

export const FORM_STEPS = [
  { id: 'basics', label: 'Basisdaten', icon: Building2 },
  { id: 'purchase', label: 'Kaufdaten', icon: Wallet },
  { id: 'financing', label: 'Finanzierung', icon: Landmark },
  { id: 'rental', label: 'Mieteinnahmen', icon: Home },
];

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Wohnung' },
  { value: 'house', label: 'Haus' },
  { value: 'commercial', label: 'Gewerbe' },
  { value: 'multi_family', label: 'Mehrfamilienhaus' },
];

const conditionOptions: { value: PropertyCondition; label: string; description: string }[] = [
  { value: 'new', label: 'Neubau', description: 'Erstbezug oder < 5 Jahre alt' },
  { value: 'renovated', label: 'Saniert', description: 'Kürzlich renoviert' },
  { value: 'good', label: 'Guter Zustand', description: 'Gepflegt, keine größeren Mängel' },
  { value: 'needs_work', label: 'Sanierungsbedarf', description: 'Renovierung erforderlich' },
];

interface PropertyFormStepProps {
  step: number;
  formData: PropertyFormData;
  errors: Partial<Record<keyof PropertyFormData, string>>;
  updateField: (field: keyof PropertyFormData, value: string) => void;
  isEdit?: boolean;
}

export function PropertyFormStep({
  step,
  formData,
  errors,
  updateField,
  isEdit = false,
}: PropertyFormStepProps) {
  switch (step) {
    case 0:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Basisdaten</h2>
          <p className="text-gray-500">
            {isEdit
              ? 'Bearbeite die grundlegenden Informationen zu deiner Immobilie.'
              : 'Gib die grundlegenden Informationen zu deiner Immobilie ein.'}
          </p>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Titel / Bezeichnung *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="z.B. 2-Zimmer Wohnung München"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all ${
                  errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.title && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Immobilientyp
              </label>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {propertyTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => updateField('propertyType', type.value)}
                    className={`px-4 py-2.5 sm:py-3 border rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      formData.propertyType === type.value
                        ? 'border-[#FF385C] bg-red-50 text-[#FF385C]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Zustand der Immobilie
              </label>
              <div className="grid grid-cols-2 gap-2">
                {conditionOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('condition', option.value)}
                    className={`p-3 border rounded-xl text-left transition-all ${
                      formData.condition === option.value
                        ? 'border-[#FF385C] bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      formData.condition === option.value ? 'text-[#FF385C]' : 'text-gray-700'
                    }`}>
                      {option.label}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Ort / Stadt *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="z.B. München"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all ${
                  errors.location ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.location && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.location}
                </p>
              )}
            </div>

            {/* PLZ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Postleitzahl
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => updateField('postalCode', e.target.value)}
                placeholder="z.B. 80331"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
              />
            </div>

            {/* Size & Rooms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Wohnfläche (m²) *
                </label>
                <input
                  type="number"
                  value={formData.sqm}
                  onChange={(e) => updateField('sqm', e.target.value)}
                  placeholder="z.B. 65"
                  min="1"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all ${
                    errors.sqm ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {errors.sqm && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.sqm}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Zimmer
                </label>
                <input
                  type="number"
                  value={formData.rooms}
                  onChange={(e) => updateField('rooms', e.target.value)}
                  placeholder="z.B. 2"
                  min="1"
                  step="0.5"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
                />
              </div>
            </div>

            {/* Year Built */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Baujahr
              </label>
              <input
                type="number"
                value={formData.yearBuilt}
                onChange={(e) => updateField('yearBuilt', e.target.value)}
                placeholder="z.B. 1985"
                min="1800"
                max="2030"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
              />
            </div>
          </div>
        </div>
      );

    case 1:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Kaufdaten</h2>
          <p className="text-gray-500">Informationen zum Kauf und aktuellen Wert.</p>

          <div className="space-y-4">
            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kaufdatum
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => updateField('purchaseDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
              />
            </div>

            {/* Purchase Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kaufpreis (EUR) *
              </label>
              <input
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => updateField('purchasePrice', e.target.value)}
                placeholder="z.B. 250000"
                min="0"
                step="1000"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all ${
                  errors.purchasePrice ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.purchasePrice && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.purchasePrice}
                </p>
              )}
            </div>

            {/* Purchase Costs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kaufnebenkosten (EUR)
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Grunderwerbsteuer, Notar, Grundbuch, Makler
              </p>
              <input
                type="number"
                value={formData.purchaseCosts}
                onChange={(e) => updateField('purchaseCosts', e.target.value)}
                placeholder="z.B. 25000"
                min="0"
                step="1000"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
              />
            </div>

            {/* Renovation Costs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Renovierungskosten (EUR)
              </label>
              <input
                type="number"
                value={formData.renovationCosts}
                onChange={(e) => updateField('renovationCosts', e.target.value)}
                placeholder="z.B. 15000"
                min="0"
                step="1000"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
              />
            </div>

            {/* Current Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Aktueller Marktwert (EUR)
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Deine Schätzung des aktuellen Wertes
              </p>
              <input
                type="number"
                value={formData.currentValue}
                onChange={(e) => updateField('currentValue', e.target.value)}
                placeholder="z.B. 280000"
                min="0"
                step="1000"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
              />
            </div>
          </div>
        </div>
      );

    case 2:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Finanzierung</h2>
          <p className="text-gray-500">Details zu deiner Immobilienfinanzierung.</p>

          <div className="space-y-4">
            {/* Loan Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Darlehensbetrag (EUR)
              </label>
              <input
                type="number"
                value={formData.loanAmount}
                onChange={(e) => updateField('loanAmount', e.target.value)}
                placeholder="z.B. 200000"
                min="0"
                step="1000"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
              />
            </div>

            {/* Interest Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Zinssatz (% p.a.)
              </label>
              <input
                type="number"
                value={formData.interestRate}
                onChange={(e) => updateField('interestRate', e.target.value)}
                placeholder="z.B. 3.5"
                min="0"
                max="20"
                step="0.1"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
              />
            </div>

            {/* Amortization Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tilgung (% p.a.)
              </label>
              <input
                type="number"
                value={formData.amortizationRate}
                onChange={(e) => updateField('amortizationRate', e.target.value)}
                placeholder="z.B. 2.0"
                min="0"
                max="20"
                step="0.1"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
              />
            </div>

            {/* Loan Start Date & Repayment Free Years */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Darlehensstart
                </label>
                <input
                  type="date"
                  value={formData.loanStartDate}
                  onChange={(e) => updateField('loanStartDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tilgungsfreie Jahre
                </label>
                <input
                  type="number"
                  value={formData.repaymentFreeYears}
                  onChange={(e) => updateField('repaymentFreeYears', e.target.value)}
                  placeholder="z.B. 2"
                  min="0"
                  max="10"
                  step="1"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
                />
              </div>
            </div>

            {/* Calculated monthly payment */}
            {formData.loanAmount && formData.interestRate && formData.amortizationRate && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-1">
                {formData.repaymentFreeYears && parseInt(formData.repaymentFreeYears) > 0 && (
                  <p className="text-sm text-blue-700">
                    Tilgungsfreie Phase:{' '}
                    <span className="font-medium">
                      {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(
                        Math.ceil(
                          (parseFloat(formData.loanAmount) * parseFloat(formData.interestRate)) / 100 / 12
                        )
                      )}
                    </span>
                    <span className="text-blue-500"> (nur Zinsen)</span>
                  </p>
                )}
                <p className="text-sm text-blue-700">
                  {formData.repaymentFreeYears && parseInt(formData.repaymentFreeYears) > 0 ? 'Danach: ' : 'Monatliche Rate: '}
                  <span className="font-medium">
                    {new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(
                      Math.ceil(
                        (parseFloat(formData.loanAmount) *
                          (parseFloat(formData.interestRate) +
                            parseFloat(formData.amortizationRate))) /
                          100 /
                          12
                      )
                    )}
                  </span>
                  <span className="text-blue-500"> (Zins + Tilgung)</span>
                </p>
              </div>
            )}
          </div>
        </div>
      );

    case 3:
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Mieteinnahmen</h2>
          <p className="text-gray-500">Monatliche Einnahmen und Ausgaben.</p>

          <div className="space-y-4">
            {/* Monthly Rent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kaltmiete (EUR / Monat)
              </label>
              <input
                type="number"
                value={formData.monthlyRent}
                onChange={(e) => updateField('monthlyRent', e.target.value)}
                placeholder="z.B. 850"
                min="0"
                step="10"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
              />
            </div>

            {/* Monthly Fee (Hausgeld) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Hausgeld (EUR / Monat)
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Nicht umlagefähige Nebenkosten (Instandhaltungsrücklage, Verwaltung)
              </p>
              <input
                type="number"
                value={formData.monthlyFee}
                onChange={(e) => updateField('monthlyFee', e.target.value)}
                placeholder="z.B. 250"
                min="0"
                step="10"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF385C] focus:border-[#FF385C] outline-none transition-all"
              />
            </div>

            {/* Calculated cashflow preview */}
            {formData.monthlyRent && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                <p className="text-sm font-medium text-gray-700">Vorschau</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Kaltmiete</span>
                  <span className="text-green-600">
                    +{parseFloat(formData.monthlyRent).toLocaleString('de-DE')} EUR
                  </span>
                </div>
                {formData.monthlyFee && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Hausgeld</span>
                    <span className="text-red-600">
                      -{parseFloat(formData.monthlyFee).toLocaleString('de-DE')} EUR
                    </span>
                  </div>
                )}
                {formData.loanAmount && formData.interestRate && formData.amortizationRate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Kreditrate</span>
                    <span className="text-red-600">
                      -
                      {Math.ceil(
                        (parseFloat(formData.loanAmount) *
                          (parseFloat(formData.interestRate) +
                            parseFloat(formData.amortizationRate))) /
                          100 /
                          12
                      ).toLocaleString('de-DE')}{' '}
                      EUR
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200 font-medium">
                  <span className="text-gray-700">Cashflow</span>
                  {(() => {
                    const rent = parseFloat(formData.monthlyRent) || 0;
                    const fee = parseFloat(formData.monthlyFee) || 0;
                    const loanPayment =
                      formData.loanAmount && formData.interestRate && formData.amortizationRate
                        ? Math.ceil(
                            (parseFloat(formData.loanAmount) *
                              (parseFloat(formData.interestRate) +
                                parseFloat(formData.amortizationRate))) /
                              100 /
                              12
                          )
                        : 0;
                    const cashflow = rent - fee - loanPayment;
                    const isPositive = cashflow >= 0;
                    return (
                      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                        {isPositive ? '+' : ''}
                        {cashflow.toLocaleString('de-DE')} EUR
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
}

// Validation helper
export function validatePropertyFormStep(
  step: number,
  formData: PropertyFormData
): Partial<Record<keyof PropertyFormData, string>> {
  const errors: Partial<Record<keyof PropertyFormData, string>> = {};

  switch (step) {
    case 0: // Basics
      if (!formData.title.trim()) errors.title = 'Titel ist erforderlich';
      if (!formData.location.trim()) errors.location = 'Ort ist erforderlich';
      if (!formData.sqm || parseFloat(formData.sqm) <= 0) {
        errors.sqm = 'Gültige Wohnfläche ist erforderlich';
      }
      break;
    case 1: // Purchase
      if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
        errors.purchasePrice = 'Kaufpreis ist erforderlich';
      }
      break;
  }

  return errors;
}

// Convert form data to API input
export function formDataToApiInput(formData: PropertyFormData) {
  return {
    title: formData.title,
    propertyType: formData.propertyType || undefined,
    condition: formData.condition || undefined,
    location: formData.location,
    postalCode: formData.postalCode || undefined,
    sqm: parseFloat(formData.sqm),
    rooms: formData.rooms ? parseFloat(formData.rooms) : undefined,
    yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt, 10) : undefined,
    purchaseDate: formData.purchaseDate || undefined,
    purchasePrice: parseFloat(formData.purchasePrice),
    purchaseCosts: formData.purchaseCosts ? parseFloat(formData.purchaseCosts) : undefined,
    renovationCosts: formData.renovationCosts ? parseFloat(formData.renovationCosts) : undefined,
    currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
    loanAmount: formData.loanAmount ? parseFloat(formData.loanAmount) : undefined,
    interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
    amortizationRate: formData.amortizationRate ? parseFloat(formData.amortizationRate) : undefined,
    repaymentFreeYears: formData.repaymentFreeYears ? parseInt(formData.repaymentFreeYears, 10) : undefined,
    loanStartDate: formData.loanStartDate || undefined,
    monthlyRent: formData.monthlyRent ? parseFloat(formData.monthlyRent) : undefined,
    monthlyFee: formData.monthlyFee ? parseFloat(formData.monthlyFee) : undefined,
  };
}

// Convert API property to form data
export function propertyToFormData(property: any): PropertyFormData {
  return {
    title: property.title || '',
    propertyType: property.property_type || '',
    condition: property.condition || '',
    location: property.location || '',
    postalCode: property.postal_code || '',
    sqm: property.sqm ? String(property.sqm) : '',
    rooms: property.rooms ? String(property.rooms) : '',
    yearBuilt: property.year_built ? String(property.year_built) : '',
    purchaseDate: property.purchase_date
      ? new Date(property.purchase_date).toISOString().split('T')[0]
      : '',
    purchasePrice: property.purchase_price ? String(property.purchase_price) : '',
    purchaseCosts: property.purchase_costs ? String(property.purchase_costs) : '',
    renovationCosts: property.renovation_costs ? String(property.renovation_costs) : '',
    currentValue: property.current_value ? String(property.current_value) : '',
    loanAmount: property.loan_amount ? String(property.loan_amount) : '',
    interestRate: property.interest_rate ? String(property.interest_rate) : '',
    amortizationRate: property.amortization_rate ? String(property.amortization_rate) : '',
    repaymentFreeYears: property.repayment_free_years ? String(property.repayment_free_years) : '',
    loanStartDate: property.loan_start_date
      ? new Date(property.loan_start_date).toISOString().split('T')[0]
      : '',
    monthlyRent: property.monthly_rent ? String(property.monthly_rent) : '',
    monthlyFee: property.monthly_fee ? String(property.monthly_fee) : '',
  };
}
