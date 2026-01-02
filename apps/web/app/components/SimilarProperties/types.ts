export type BadgeContext = 'investor' | 'eigennutzer' | 'steuer' | 'ai-score';

export interface SimilarProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  sqm: number;
  rooms: number;
  images: string[];
  ai_investment_score?: number;
  // Calculator metrics
  grossYield?: number;
  breakEvenYears?: number;
  monthlyDifference?: number;
  estimatedMonthlyRent?: number;
  // Tax metrics
  taxSavings?: number;
}

export interface PropertyBadgeProps {
  context: BadgeContext;
  property: SimilarProperty;
  className?: string;
}

export interface SimilarPropertyCardProps {
  property: SimilarProperty;
  badgeContext: BadgeContext;
  onClick?: () => void;
  href?: string;
}

export interface SimilarPropertiesProps {
  title: string;
  subtitle?: string;
  properties?: SimilarProperty[];
  badgeContext: BadgeContext;
  columns?: 1 | 2 | 3;
  isLoading?: boolean;
  emptyMessage?: string;
  onPropertyClick?: (propertyId: string) => void;
  linkBuilder?: (propertyId: string) => string;
  /** Volle Breite wie auf der Startseite (max-w-[1800px]) */
  fullWidth?: boolean;
}
