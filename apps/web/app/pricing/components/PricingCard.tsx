'use client';

import { Check } from 'lucide-react';
import { PricingPlan } from '../data';

interface PricingCardProps extends PricingPlan {
  onSelect: () => void;
}

export default function PricingCard({
  name,
  price,
  period,
  description,
  features,
  isPopular,
  ctaText,
  onSelect,
}: PricingCardProps) {
  return (
    <div
      className={`
        relative bg-white rounded-2xl p-6 flex flex-col h-full
        ${isPopular ? 'ring-2 ring-primary shadow-lg scale-105' : 'shadow-md hover:shadow-lg'}
        transition-all duration-200
      `}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-white text-sm font-medium px-4 py-1 rounded-full whitespace-nowrap">
            Beliebt
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900">{name}</h3>
        <p className="text-gray-500 text-sm mt-1">{description}</p>
      </div>

      <div className="mb-6">
        {price === 0 && period !== 'Monat' ? (
          <>
            <span className="text-2xl font-bold text-gray-900">{period}</span>
          </>
        ) : (
          <>
            <span className="text-4xl font-bold text-gray-900">{price}€</span>
            <span className="text-gray-500 ml-1">/{period}</span>
          </>
        )}
      </div>

      <button
        onClick={onSelect}
        className={`
          w-full py-3 px-4 rounded-xl font-semibold transition-colors duration-200
          ${
            isPopular
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }
        `}
      >
        {ctaText}
      </button>

      <ul className="mt-6 space-y-3 flex-grow">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-gray-600 text-sm">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
