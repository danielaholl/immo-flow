/**
 * Format count for display (Instagram/TikTok style)
 *
 * Examples:
 * - 0: '' (empty string, nothing shown)
 * - 42: '42'
 * - 999: '999'
 * - 1234: '1.2K'
 * - 9876: '9.9K'
 * - 10000: '10K'
 * - 123456: '123K'
 * - 1234567: '1.2M'
 *
 * @param count - The number to format
 * @returns Formatted string or empty string if count is 0/null/undefined
 */
export function formatCount(count: number | undefined | null): string {
  // Return empty string for falsy values or zero
  if (!count || count === 0) {
    return '';
  }

  // Less than 1000: show exact number
  if (count < 1000) {
    return count.toString();
  }

  // 1000-9999: show as "1.2K" with one decimal
  if (count < 10000) {
    const formatted = (count / 1000).toFixed(1);
    // Remove trailing .0 (e.g., "5.0K" becomes "5K")
    return formatted.replace('.0', '') + 'K';
  }

  // 10000-999999: show as "10K" without decimals
  if (count < 1000000) {
    return Math.floor(count / 1000) + 'K';
  }

  // 1M+: show as "1.2M" with one decimal
  const formatted = (count / 1000000).toFixed(1);
  return formatted.replace('.0', '') + 'M';
}
