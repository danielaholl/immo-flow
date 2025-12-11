/**
 * Property Scraper Types
 * Types for web scraping functionality
 */

export interface RateLimitCheck {
  allowed: boolean;
  waitTime?: number;
}

export interface BrowserConfig {
  userAgent: string;
  locale: string;
  viewport: { width: number; height: number };
  javaScriptEnabled: boolean;
  acceptDownloads: boolean;
  hasTouch: boolean;
  isMobile: boolean;
  extraHTTPHeaders: Record<string, string>;
}

export interface MockPropertyType {
  title: string;
  description: string;
  price: number;
  location: string;
  sqm: number;
  rooms: number;
  bathrooms: number;
  yearBuilt: number;
  monthlyFee: number;
  features: string[];
}
