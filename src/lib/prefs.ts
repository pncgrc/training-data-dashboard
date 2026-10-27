// Per-viewer preferences, kept in cookies so the server can render with them.

export const WEEK_OPTIONS = [4, 12, 26, 52];
export const WEEKS_COOKIE = 'weeks';
const DEFAULT_WEEKS = 12;

export function parseWeeks(value: string | undefined) {
  const weeks = Number(value);
  return WEEK_OPTIONS.includes(weeks) ? weeks : DEFAULT_WEEKS;
}

// Browser-only.
export function saveWeeks(weeks: number) {
  document.cookie = `${WEEKS_COOKIE}=${weeks}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
}
