'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import PricingCard from './components/PricingCard';
import PricingToggle from './components/PricingToggle';
import PricingFAQ from './components/PricingFAQ';
import { investorPlans, maklerPlans, verkaufPlans, sucherPlans, PricingPlan } from './data';

type UserType = 'sucher' | 'investor' | 'verkaeufer' | 'makler';

export default function PricingPage() {
  const [userType, setUserType] = useState<UserType>('sucher');
  const router = useRouter();

  const plans: PricingPlan[] =
    userType === 'sucher'
      ? sucherPlans
      : userType === 'investor'
        ? investorPlans
        : userType === 'verkaeufer'
          ? verkaufPlans
          : maklerPlans;

  const handleSelectPlan = (plan: PricingPlan) => {
    // Teaser-Karte: Wechsle zum entsprechenden Tab
    if (plan.isTeaser && plan.teaserLink) {
      setUserType(plan.teaserLink as UserType);
      return;
    }

    // TODO: Implement Stripe checkout or signup flow
    if (plan.name === 'Free') {
      router.push('/auth/signup');
    } else if (plan.name === 'Agentur') {
      // Contact form for enterprise
      window.location.href = 'mailto:kontakt@nestando.de?subject=Agentur-Plan%20Anfrage';
    } else {
      // For now, redirect to signup with plan parameter
      router.push(`/auth/signup?plan=${plan.name.toLowerCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 text-center px-4">
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          Wähle deinen Plan
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Starte kostenlos und upgrade jederzeit. Keine versteckten Kosten.
        </p>
      </section>

      {/* Toggle: Investor / Makler */}
      <PricingToggle value={userType} onChange={setUserType} />

      {/* Pricing Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${plans.length === 3 ? 'lg:grid-cols-3 max-w-5xl' : 'lg:grid-cols-4 max-w-7xl'} mx-auto gap-6 lg:gap-4`}>
          {plans.map((plan) => (
            <PricingCard
              key={plan.name}
              {...plan}
              onSelect={() => handleSelectPlan(plan)}
            />
          ))}
        </div>
      </section>

      {/* Trust badges */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>SSL-verschlüsselt</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
            <span>14 Tage Geld-zurück</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Jederzeit kündbar</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <span>DSGVO-konform</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <PricingFAQ userType={userType} />

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Bereit für smarteres Investieren?
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Starte heute kostenlos und entdecke, wie ImmoFlow deine
            Immobilien-Investments auf das nächste Level bringt.
          </p>
          <button
            onClick={() => router.push('/auth/signup')}
            className="bg-primary text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Kostenlos starten
          </button>
        </div>
      </section>
    </div>
  );
}
