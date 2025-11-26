/**
 * Formatting utilities for ImmoFlow
 * Handles price, date, area, and other number formatting for German locale
 */

/**
 * Format price in EUR with German locale
 * @example formatPrice(350000) => "350.000 €"
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Format price in compact form (K/M)
 * @example formatPriceCompact(350000) => "350K €"
 */
export function formatPriceCompact(price: number): string {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M €`;
  }
  if (price >= 1000) {
    return `${(price / 1000).toFixed(0)}K €`;
  }
  return `${price} €`;
}

/**
 * Format area in square meters
 * @example formatArea(85.5) => "85,5 m²"
 */
export function formatArea(sqm: number): string {
  return `${sqm.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} m²`;
}

/**
 * Format yield/return percentage
 * @example formatYield(4.5) => "4,5%"
 */
export function formatYield(yieldPercent: number): string {
  return `${yieldPercent.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
}

/**
 * Format date in German format
 * @example formatDate(new Date('2024-03-15')) => "15.03.2024"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('de-DE').format(d);
}

/**
 * Format relative time (e.g., "vor 2 Tagen")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'gerade eben';
  if (diffInSeconds < 3600) return `vor ${Math.floor(diffInSeconds / 60)} Min.`;
  if (diffInSeconds < 86400) return `vor ${Math.floor(diffInSeconds / 3600)} Std.`;
  if (diffInSeconds < 604800) return `vor ${Math.floor(diffInSeconds / 86400)} Tagen`;
  if (diffInSeconds < 2592000) return `vor ${Math.floor(diffInSeconds / 604800)} Wochen`;
  return formatDate(d);
}

/**
 * Format phone number (German format)
 * @example formatPhone("01234567890") => "+49 123 456 7890"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return `+49 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Format rooms (handle half rooms)
 * @example formatRooms(3.5) => "3,5 Zimmer"
 */
export function formatRooms(rooms: number): string {
  const formatted = rooms.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  return rooms === 1 ? `${formatted} Zimmer` : `${formatted} Zimmer`;
}
