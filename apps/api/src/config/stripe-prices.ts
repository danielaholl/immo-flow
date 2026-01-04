/**
 * Stripe Price Configuration
 *
 * IMPORTANT: Replace these placeholder IDs with actual Stripe Price IDs
 * from your Stripe Dashboard after creating the products.
 *
 * To create products/prices in Stripe:
 * 1. Go to https://dashboard.stripe.com/products
 * 2. Create each product with the corresponding price
 * 3. Copy the price_xxx ID and update here
 */

export type PlanType =
  | 'free'
  | 'investor'
  | 'pro'
  | 'sucher'
  | 'makler_free'
  | 'makler_pro'
  | 'makler_enterprise'
  | 'verkauf_starter'
  | 'verkauf_premium';

export interface PlanConfig {
  stripePriceId: string;
  name: string;
  priceEur: number;
  interval: 'month' | 'year' | 'one_time';
  features: string[];
}

// Placeholder Price IDs - Replace with actual Stripe Price IDs
export const STRIPE_PRICES: Record<Exclude<PlanType, 'free'>, PlanConfig> = {
  // Investoren Plans (Recurring)
  investor: {
    stripePriceId: process.env.STRIPE_PRICE_INVESTOR || 'price_investor_monthly',
    name: 'Investor',
    priceEur: 29,
    interval: 'month',
    features: [
      'Unbegrenzte Favoriten',
      'Unbegrenzte KI-Analysen',
      'SWOT-Analyse',
      'Rendite-Kalkulator',
      'Finanzierungsrechner',
      'Cashflow-Projektion',
    ],
  },
  pro: {
    stripePriceId: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
    name: 'Pro',
    priceEur: 79,
    interval: 'month',
    features: [
      'Alles aus Investor',
      'Verhandlungsempfehlungen',
      'Portfolio-Übersicht',
      'Szenarien speichern',
      'PDF-Export',
      'Investoren-Club',
      'Priority Support',
    ],
  },

  // Eigennutzer Plans (Recurring)
  sucher: {
    stripePriceId: process.env.STRIPE_PRICE_SUCHER || 'price_sucher_monthly',
    name: 'Sucher',
    priceEur: 9,
    interval: 'month',
    features: [
      'Unbegrenzte Favoriten',
      'Budget-Suche',
      'KI-Preis-Check',
      'Nebenkosten-Rechner',
      'Wohn-Lage-Bewertung',
      'Email-Alerts',
    ],
  },

  // Makler Plans (Recurring)
  makler_pro: {
    stripePriceId: process.env.STRIPE_PRICE_MAKLER_PRO || 'price_makler_pro_monthly',
    name: 'Makler Pro',
    priceEur: 99,
    interval: 'month',
    features: [
      '50 Objekte verwalten',
      'KI-Chat Objekterstellung',
      '20 PDF-Imports/Monat',
      'Video-Upload',
      'Online-Exposé mit QR-Code',
      'Lead-Dashboard',
    ],
  },
  makler_enterprise: {
    stripePriceId: process.env.STRIPE_PRICE_MAKLER_ENTERPRISE || 'price_makler_enterprise_monthly',
    name: 'Makler Enterprise',
    priceEur: 249,
    interval: 'month',
    features: [
      'Unbegrenzte Objekte',
      'Unbegrenzte Imports',
      'KI-Auto-Antworten',
      'Monatliche Reports',
      '3 Team-Seats',
      'Chat Support',
    ],
  },

  // Verkäufer Plans (One-time)
  verkauf_starter: {
    stripePriceId: process.env.STRIPE_PRICE_VERKAUF_STARTER || 'price_verkauf_starter',
    name: 'Verkäufer Starter',
    priceEur: 99,
    interval: 'one_time',
    features: [
      'Immobilie inserieren',
      'KI-generierte Beschreibung',
      '3 Monate online',
      'Bis zu 20 Fotos',
    ],
  },
  verkauf_premium: {
    stripePriceId: process.env.STRIPE_PRICE_VERKAUF_PREMIUM || 'price_verkauf_premium',
    name: 'Verkäufer Premium',
    priceEur: 249,
    interval: 'one_time',
    features: [
      'Alles aus Starter',
      'KI-Preisanalyse',
      '6 Monate online',
      'Bis zu 50 Fotos',
      'Exposé-PDF Export',
      'Highlight in Suche',
    ],
  },
};

/**
 * Get plan type from Stripe Price ID
 */
export function getPlanTypeFromPriceId(priceId: string): PlanType | null {
  for (const [planType, config] of Object.entries(STRIPE_PRICES)) {
    if (config.stripePriceId === priceId) {
      return planType as PlanType;
    }
  }
  return null;
}

/**
 * Get Stripe Price ID from plan type
 */
export function getStripePriceId(planType: PlanType): string | null {
  if (planType === 'free' || planType === 'makler_free') return null;
  return STRIPE_PRICES[planType]?.stripePriceId || null;
}

/**
 * Check if a plan is a subscription (recurring) or one-time
 */
export function isSubscriptionPlan(planType: PlanType): boolean {
  if (planType === 'free' || planType === 'makler_free') return false;
  return STRIPE_PRICES[planType]?.interval !== 'one_time';
}

/**
 * Plan hierarchy for upgrade/downgrade logic
 * Higher number = higher tier
 */
export const PLAN_HIERARCHY: Record<PlanType, number> = {
  free: 0,
  sucher: 1,
  investor: 2,
  pro: 3,
  makler_free: 9, // Free provider account (invitation-only)
  makler_pro: 10,
  makler_enterprise: 11,
  verkauf_starter: 20,
  verkauf_premium: 21,
};

/**
 * Feature access map - which features require which plans
 */
export const FEATURE_ACCESS: Record<string, PlanType[]> = {
  unlimited_favorites: ['investor', 'pro', 'sucher', 'makler_free', 'makler_pro', 'makler_enterprise'],
  ai_analysis: ['investor', 'pro'],
  swot_analysis: ['investor', 'pro'],
  rendite_calculator: ['investor', 'pro'],
  financing_calculator: ['investor', 'pro'],
  cashflow_projection: ['investor', 'pro'],
  portfolio_overview: ['pro'],
  pdf_export: ['pro'],
  investor_club: ['pro'],
  priority_support: ['pro', 'makler_enterprise'],
  budget_search: ['sucher', 'investor', 'pro'],
  price_check: ['sucher', 'investor', 'pro'],
  makler_features: ['makler_free', 'makler_pro', 'makler_enterprise'],
  unlimited_properties: ['makler_enterprise'],
  team_seats: ['makler_enterprise'],
  // Provider-specific features (makler_free)
  free_property_listing_1: ['makler_free'], // 1 free property listing
  chat_with_users: ['makler_free', 'makler_pro', 'makler_enterprise'],
  free_ai_evaluations_3: ['makler_free'], // 3 free AI evaluations
  basic_analytics: ['makler_free', 'makler_pro', 'makler_enterprise'],
};

/**
 * Check if a plan has access to a feature
 */
export function hasFeatureAccess(planType: PlanType, feature: string): boolean {
  // Free plan has basic access
  if (!FEATURE_ACCESS[feature]) return true;
  return FEATURE_ACCESS[feature].includes(planType);
}
