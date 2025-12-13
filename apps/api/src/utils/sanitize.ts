/**
 * Input Sanitization Utilities
 * Protection against XSS and injection attacks
 */
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - Potentially unsafe HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitizes plain text - strips all HTML tags
 * Use for user input that should never contain HTML
 * @param text - Potentially unsafe text
 * @returns Text with all HTML tags removed
 */
export function sanitizePlainText(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitizes rich text content - allows more HTML tags
 * Use for user-generated content that should support formatting
 * @param html - Rich HTML content
 * @returns Sanitized HTML with safe tags preserved
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'b', 'i', 'em', 'strong', 'u', 's', 'strike',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * SQL Injection protection - validates field names
 * Only allows alphanumeric characters and underscores
 * @param fieldName - Field name to validate
 * @returns True if safe, false otherwise
 */
export function isSafeFieldName(fieldName: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName);
}

/**
 * Whitelisted fields for property updates
 * Prevents SQL injection via dynamic field names
 */
export const ALLOWED_PROPERTY_UPDATE_FIELDS = [
  'title',
  'description',
  'price',
  'location',
  'sqm',
  'rooms',
  'property_type',
  'year_built',
  'floor',
  'total_floors',
  'parking',
  'balcony',
  'garden',
  'elevator',
  'furnished',
  'available_from',
  'heating_type',
  'energy_efficiency',
  'condition',
  'rental_income',
  'running_costs',
  'modernization_year',
  'commission',
  'contact_name',
  'contact_email',
  'contact_phone',
  'status',
] as const;

export type AllowedPropertyField = typeof ALLOWED_PROPERTY_UPDATE_FIELDS[number];

/**
 * Validates if a field is allowed for property updates
 * @param field - Field name to check
 * @returns True if field is in whitelist
 */
export function isAllowedPropertyField(field: string): field is AllowedPropertyField {
  return ALLOWED_PROPERTY_UPDATE_FIELDS.includes(field as any);
}
