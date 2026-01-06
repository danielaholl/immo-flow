import type { PropertyType } from '../PropertyCard/PropertyCard.types';

export interface PropertyInfoOverlayProps {
  /** Property type */
  propertyType?: PropertyType;
  /** Property title */
  title: string;
  /** City/Location */
  location?: string;
  /** Street address */
  address?: string | null;
  /** Postal code */
  postalCode?: string | null;
  /** Whether to show the address */
  showAddress?: boolean;
  /** Formatted price string */
  formattedPrice: string;
  /** Number of rooms */
  rooms?: number;
  /** Square meters */
  sqm?: number;
  /** Formatted price per sqm */
  formattedPricePerSqm?: string;
  /** Year built */
  yearBuilt?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the gradient background */
  showGradient?: boolean;
  /** Custom style for the container */
  style?: React.CSSProperties;
}
