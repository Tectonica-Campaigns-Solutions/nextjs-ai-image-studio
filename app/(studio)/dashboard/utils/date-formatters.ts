const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats an ISO date string as "Jan 01, 2024". Returns "—" for nullish input. */
export function formatDateLong(iso?: string | null): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  const m = MONTHS[dt.getUTCMonth()] ?? "—";
  const day = String(dt.getUTCDate()).padStart(2, "0");
  const y = dt.getUTCFullYear();
  return `${m} ${day}, ${y}`;
}

/** Formats an ISO date string as a relative label like "3 hours ago" or "Yesterday". */
export function formatRelativeTime(isoDate?: string | null): string {
  if (!isoDate) return "—";
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

/** Like formatRelativeTime but uses the compact "3h ago" style for hours. */
export function formatRelativeFromNow(iso?: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}
