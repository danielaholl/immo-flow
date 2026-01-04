'use client';

import { ReactNode } from 'react';
import {
  Calculator,
  Euro,
  Home,
  MapPin,
  Calendar,
  Percent,
  Loader2,
  Sparkles,
  Wrench,
  Building2,
} from 'lucide-react';

export interface PropertyFormData {
  // Basic fields (AI-Score)
  price: string;
  sqm: string;
  location: string;
  monthlyRent: string;
  yearBuilt: string;
  condition?: string;
  // Extended fields (Calculator)
  equityPercentage?: string;
  interestRate?: string;
  amortizationRate?: string;
  commissionRate?: string;
  monthlyFee?: string;
  renovationCosts?: string;
}

export interface PropertyInputFormProps {
  mode: 'basic' | 'extended';
  data: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  isValid?: boolean;
  submitLabel?: string;
  submitIcon?: ReactNode;
  error?: string;
  title?: string;
  className?: string;
  hideSubmit?: boolean;
}

interface FormFieldProps {
  label: string;
  icon: ReactNode;
  type: 'text' | 'number';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  suffix?: string;
  step?: string;
}

function FormField({
  label,
  icon,
  type,
  value,
  onChange,
  placeholder,
  required,
  suffix,
  step,
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
        {label}{required && ' *'}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          step={step}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function PropertyInputForm({
  mode,
  data,
  onChange,
  onSubmit,
  isLoading = false,
  isValid = true,
  submitLabel = 'Berechnen',
  submitIcon,
  error,
  title = 'Immobiliendaten',
  className = '',
  hideSubmit = false,
}: PropertyInputFormProps) {
  const defaultIcon = mode === 'basic' ? <Sparkles size={20} /> : <Calculator size={20} />;
  const icon = submitIcon ?? defaultIcon;

  return (
    <div className={`lg:w-72 flex-shrink-0 ${className}`}>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sticky top-24">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          {mode === 'basic' ? <Calculator size={20} /> : <Building2 size={20} />}
          {title}
        </h2>

        <div className="space-y-3">
          {/* Basic Fields */}
          <FormField
            label="Kaufpreis"
            icon={<Euro size={16} />}
            type="number"
            value={data.price}
            onChange={(v) => onChange('price', v)}
            placeholder="350000"
            required
          />

          <FormField
            label="Wohnfläche m²"
            icon={<Home size={16} />}
            type="number"
            value={data.sqm}
            onChange={(v) => onChange('sqm', v)}
            placeholder="75"
            required
          />

          <FormField
            label="Standort"
            icon={<MapPin size={16} />}
            type="text"
            value={data.location}
            onChange={(v) => onChange('location', v)}
            placeholder="München"
            required
          />

          <FormField
            label="Miete/Monat"
            icon={<Euro size={16} />}
            type="number"
            value={data.monthlyRent}
            onChange={(v) => onChange('monthlyRent', v)}
            placeholder="1200"
          />

          <FormField
            label="Baujahr"
            icon={<Calendar size={16} />}
            type="number"
            value={data.yearBuilt}
            onChange={(v) => onChange('yearBuilt', v)}
            placeholder="1995"
          />

          {/* Extended Fields (Calculator Mode) */}
          {mode === 'extended' && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Finanzierung
                </p>
              </div>

              <FormField
                label="Eigenkapital"
                icon={<Percent size={16} />}
                type="number"
                value={data.equityPercentage || ''}
                onChange={(v) => onChange('equityPercentage', v)}
                placeholder="20"
                suffix="%"
                step="0.1"
              />

              <FormField
                label="Zinssatz"
                icon={<Percent size={16} />}
                type="number"
                value={data.interestRate || ''}
                onChange={(v) => onChange('interestRate', v)}
                placeholder="3.8"
                suffix="%"
                step="0.1"
              />

              <FormField
                label="Tilgung"
                icon={<Percent size={16} />}
                type="number"
                value={data.amortizationRate || ''}
                onChange={(v) => onChange('amortizationRate', v)}
                placeholder="2.0"
                suffix="%"
                step="0.1"
              />

              <FormField
                label="Makler"
                icon={<Percent size={16} />}
                type="number"
                value={data.commissionRate || ''}
                onChange={(v) => onChange('commissionRate', v)}
                placeholder="3.57"
                suffix="%"
                step="0.01"
              />

              <FormField
                label="Hausgeld"
                icon={<Euro size={16} />}
                type="number"
                value={data.monthlyFee || ''}
                onChange={(v) => onChange('monthlyFee', v)}
                placeholder="auto"
              />

              <FormField
                label="Renovierung"
                icon={<Wrench size={16} />}
                type="number"
                value={data.renovationCosts || ''}
                onChange={(v) => onChange('renovationCosts', v)}
                placeholder="0"
              />
            </>
          )}

          {!hideSubmit && (
            <button
              onClick={onSubmit}
              disabled={!isValid || isLoading}
              className={`w-full py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                isValid && !isLoading
                  ? 'bg-gradient-to-r from-[#E31C5F] to-[#FF9500] text-white hover:opacity-90'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
              )}
              {isLoading ? 'Analysiere...' : submitLabel}
            </button>
          )}

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PropertyInputForm;
