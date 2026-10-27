// Date helpers. Garmin's local timestamps look like "2026-10-27 06:30:00".

const pad = (n: number) => String(n).padStart(2, '0');

// YYYY-MM-DD in local time.
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// YYYY-MM-DD in UTC, for server-side defaults.
export const isoDateUtc = (d: Date) => d.toISOString().slice(0, 10);

export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export const parseLocal = (local: string) => new Date(local.replace(' ', 'T'));

// Monday of the week containing d.
export function weekStart(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

// Mondays of the last n weeks, oldest first, ending with the current week.
export function rangeWeeks(n: number) {
  const last = weekStart(new Date());
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(last);
    d.setDate(d.getDate() - (n - 1 - i) * 7);
    return d;
  });
}
