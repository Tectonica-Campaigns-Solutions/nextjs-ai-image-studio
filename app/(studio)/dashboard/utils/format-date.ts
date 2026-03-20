const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

/**
 * Formats a date string as "Jan 1, 2024" (en-US short format).
 * Used in list cards across the dashboard.
 */
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", SHORT_DATE_OPTIONS);
}
