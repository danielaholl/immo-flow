/**
 * Application-wide constants
 */

// Property types
export const PROPERTY_TYPES = [
  'Wohnung',
  'Haus',
  'Grundstück',
  'Gewerbe',
  'Mehrfamilienhaus',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

// Property status
export const PROPERTY_STATUS = ['active', 'pending', 'sold', 'archived'] as const;

export type PropertyStatus = (typeof PROPERTY_STATUS)[number];

// Energy classes
export const ENERGY_CLASSES = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export type EnergyClass = (typeof ENERGY_CLASSES)[number];

// Booking status
export const BOOKING_STATUS = ['pending', 'confirmed', 'cancelled', 'completed'] as const;

export type BookingStatus = (typeof BOOKING_STATUS)[number];

// Property features
export const PROPERTY_FEATURES = [
  'Balkon',
  'Terrasse',
  'Garten',
  'Garage',
  'Stellplatz',
  'Keller',
  'Aufzug',
  'Einbauküche',
  'Fußbodenheizung',
  'Klimaanlage',
  'Barrierefrei',
  'Neubau',
  'Saniert',
  'Denkmalschutz',
] as const;

export type PropertyFeature = (typeof PROPERTY_FEATURES)[number];

// German cities (major)
export const MAJOR_CITIES = [
  'Berlin',
  'Hamburg',
  'München',
  'Köln',
  'Frankfurt',
  'Stuttgart',
  'Düsseldorf',
  'Dortmund',
  'Essen',
  'Leipzig',
  'Bremen',
  'Dresden',
  'Hannover',
  'Nürnberg',
  'Duisburg',
] as const;

// Price ranges for filters
export const PRICE_RANGES = [
  { label: 'Bis 100.000 €', max: 100000 },
  { label: '100.000 - 200.000 €', min: 100000, max: 200000 },
  { label: '200.000 - 300.000 €', min: 200000, max: 300000 },
  { label: '300.000 - 500.000 €', min: 300000, max: 500000 },
  { label: '500.000 - 1.000.000 €', min: 500000, max: 1000000 },
  { label: 'Ab 1.000.000 €', min: 1000000 },
] as const;

// Area ranges (sqm)
export const AREA_RANGES = [
  { label: 'Bis 50 m²', max: 50 },
  { label: '50 - 80 m²', min: 50, max: 80 },
  { label: '80 - 120 m²', min: 80, max: 120 },
  { label: '120 - 200 m²', min: 120, max: 200 },
  { label: 'Ab 200 m²', min: 200 },
] as const;

// AI Score thresholds
export const AI_SCORE_THRESHOLDS = {
  excellent: 85,
  good: 70,
  average: 50,
  poor: 0,
} as const;

// App config
export const APP_CONFIG = {
  name: 'ImmoFlow',
  description: 'TikTok-style Immobilien Investment App',
  version: '1.0.0',
  defaultLanguage: 'de',
  supportEmail: 'support@immoflow.de',
  maxImageUploads: 10,
  maxImageSizeMB: 5,
} as const;

// API endpoints (relative paths)
export const API_ENDPOINTS = {
  properties: '/api/properties',
  bookings: '/api/bookings',
  favorites: '/api/favorites',
  agents: '/api/agents',
  messages: '/api/messages',
  search: '/api/search',
} as const;

// Pagination
export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;
