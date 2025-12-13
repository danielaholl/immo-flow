export type PropertyType =
  | 'apartment'      // Wohnung
  | 'house'          // Haus
  | 'villa'          // Villa
  | 'commercial'     // Gewerbe
  | 'land'           // Grundstück
  | 'office'         // Büro
  | 'retail'         // Einzelhandel
  | 'industrial'     // Industrie
  | 'parking'        // Stellplatz/Garage
  | 'multi_family';  // Mehrfamilienhaus

export interface Property {
  id: string;
  title: string;
  location: string;
  address?: string;
  price: number;
  sqm: number;
  rooms: number;
  images: string[];
  propertyType?: PropertyType;
  aiScore?: number;
  ai_investment_score?: number;
  score_color?: 'green' | 'yellow' | 'red';
  yield?: number;
  features?: string[];
  energyClass?: string;
}

export interface PropertyCardProps {
  property: Property;
  onPress?: () => void;
  onFavorite?: (e?: any) => void;
  onDismiss?: (e?: any) => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact' | 'story';
  isActive?: boolean;
  onSlideshowComplete?: () => void;
  slideshowDuration?: number;
  /** Whether to show the full address (requires user consent) */
  showAddress?: boolean;
  /** Whether the current user is the owner of this property */
  isOwner?: boolean;
}

export interface BadgeInfo {
  label: string;
  color: string;
  dotColor: string;
}
