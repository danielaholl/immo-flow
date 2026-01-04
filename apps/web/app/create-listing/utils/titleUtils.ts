/**
 * Title generation utility for property listings
 * Generates structured, German-language titles in the format:
 * "{Zimmer}-Zi.{Typ} {Straße} {Ort}"
 *
 * Example: "3-Zi.Wohnung Rottenbucherstr-19 Gräfelfing"
 */

export interface PropertyTitleData {
  rooms?: number;
  property_type?: string;
  street_address?: string;
  location?: string;
  title?: string;
}

/**
 * Generates a property title from available data
 * @param data - Property data to generate title from
 * @returns Generated title string (max 100 characters)
 */
export function generatePropertyTitle(data: PropertyTitleData): string {
  // Priority 1: Keep existing title if it's not a placeholder
  if (data.title && data.title !== 'Deine Immobilie') {
    return data.title;
  }

  // Property type mapping: English → German
  const typeMap: Record<string, string> = {
    'apartment': 'Wohnung',
    'house': 'Haus',
    'villa': 'Villa',
    'commercial': 'Gewerbe',
    'land': 'Grundstück',
  };

  const parts: string[] = [];

  // Add rooms (e.g., "3-Zi.")
  if (data.rooms && data.rooms > 0) {
    parts.push(`${data.rooms}-Zi.`);
  }

  // Add property type (German label)
  const typeLabel = typeMap[data.property_type || ''] || 'Immobilie';
  parts.push(typeLabel);

  // Add street address (sanitized: replace spaces with dashes, remove special chars)
  if (data.street_address) {
    const sanitized = data.street_address
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9äöüÄÖÜß-]/g, '');
    parts.push(sanitized);
  }

  // Add location
  if (data.location) {
    parts.push(data.location);
  }

  // Build title
  let title = parts.join(' ');

  // Enforce length limit (max 100 characters)
  if (title.length > 100) {
    // If too long, try removing street address
    if (data.street_address) {
      const partsWithoutStreet = parts.filter(
        (part) => !part.includes(data.street_address!.replace(/\s+/g, '-'))
      );
      title = partsWithoutStreet.join(' ');
    }
    // If still too long, truncate
    if (title.length > 100) {
      title = title.slice(0, 100);
    }
  }

  // Fallback to minimal format if nothing was generated
  return title || `${typeLabel} ${data.location || ''}`.trim();
}
