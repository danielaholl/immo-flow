'use client';

import React from 'react';
import { Building2, Plus, TrendingUp, Wallet, PiggyBank } from 'lucide-react';

interface PortfolioEmptyStateProps {
  onAddProperty: () => void;
}

export function PortfolioEmptyState({ onAddProperty }: PortfolioEmptyStateProps) {
  const features = [
    {
      icon: Building2,
      title: 'Immobilien tracken',
      description: 'Füge deine Bestandsimmobilien hinzu und behalte den Überblick.',
    },
    {
      icon: TrendingUp,
      title: 'Performance messen',
      description: 'Verfolge Rendite, Cashflow und Wertentwicklung über Zeit.',
    },
    {
      icon: Wallet,
      title: 'Cashflow optimieren',
      description: 'Erkenne Optimierungspotenziale in deinem Portfolio.',
    },
    {
      icon: PiggyBank,
      title: 'Vermögen aufbauen',
      description: 'Beobachte wie dein Eigenkapital durch Tilgung wächst.',
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 sm:p-12 text-center">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold mb-3">
          Starte dein Portfolio
        </h2>
        <p className="text-gray-300 max-w-lg mx-auto mb-8">
          Verwalte deine Bestandsimmobilien an einem Ort. Tracke Kaufpreis, Finanzierung,
          Mieteinnahmen und behalte wichtige Kennzahlen immer im Blick.
        </p>

        <button
          onClick={onAddProperty}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF385C] text-white rounded-xl font-medium hover:bg-[#E31C5F] transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus size={20} />
          Erste Immobilie hinzufügen
        </button>
      </div>

      {/* Features Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
        {features.map((feature, index) => (
          <div key={index} className="p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <feature.icon className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-sm text-gray-500">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
