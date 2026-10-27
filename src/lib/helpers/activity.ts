// Activity-level calculations shared by the overview and detail pages.

import type { ActivityListEntry, ActivitySummary, HeartRateZones } from '@/types/garmin';
import { sportOf, type Sport } from './sports';

export interface Activity extends ActivityListEntry {
  sport: Sport;
}

export const withSport = (a: ActivityListEntry): Activity => ({ ...a, sport: sportOf(a.activityType?.typeKey) });

// Returns a number, or null when the value is missing or zero.
export const nonZero = (v: unknown): number | null =>
  typeof v === 'number' && v !== 0 && !Number.isNaN(v) ? v : null;

export const roundNonZero = (v: unknown) => {
  const x = nonZero(v);
  return x == null ? null : Math.round(x);
};

export const movingTime = (a: { movingDuration?: number; duration?: number }) => a.movingDuration ?? a.duration ?? 0;

export const powerOf = (a: ActivityListEntry) => a.normPower ?? a.avgPower ?? null;

// Multisport parents duplicate their legs, so totals count only the legs.
export const countsTowardTotals = (a: ActivityListEntry) => !a.isParent && a.activityType?.typeKey !== 'multi_sport';

// Seconds in each zone from the list entry's numbered fields, or null if all are zero.
export function zoneTimes(entry: ActivityListEntry | null, prefix: 'hrTimeInZone_' | 'powerTimeInZone_') {
  if (!entry) return null;
  const times: number[] = [];
  for (let i = 1; entry[`${prefix}${i}`] !== undefined; i++) times.push(nonZero(entry[`${prefix}${i}`]) ?? 0);
  return times.some((t) => t > 0) ? times : null;
}

// "120–139 bpm" style labels from the user's default heart-rate zone floors.
export function hrZoneLabels(zones: HeartRateZones[]) {
  const z = zones.find((x) => x.sport === 'DEFAULT') ?? zones[0];
  if (!z) return null;
  const floors = [z.zone1Floor, z.zone2Floor, z.zone3Floor, z.zone4Floor, z.zone5Floor];
  return floors.map((f, i) => (i < 4 ? `${f}–${floors[i + 1] - 1} bpm` : `${f}+ bpm`));
}

const PEAK_DURATIONS = [1, 2, 5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600, 7200, 18000];

export const durationLabel = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${s / 60}m` : `${s / 3600}h`);

// Best average power for each duration Garmin reports.
export function peakPower(entry: ActivityListEntry | null) {
  if (!entry) return [];
  return PEAK_DURATIONS.flatMap((d) => {
    const w = nonZero(entry[`maxAvgPower_${d}`]);
    return w == null ? [] : [{ duration: d, watts: Math.round(w) }];
  });
}

// Running cadence in FIT records is per leg; double it to steps per minute.
export const cadenceValue = (v: number | null, sport: Sport) => (v == null ? null : sport === 'run' ? v * 2 : v);

export const cadenceUnit = (sport: Sport, { short = false } = {}) =>
  sport === 'run' ? 'spm' : sport === 'swim' ? (short ? 'spm' : 'strokes/min') : 'rpm';

export function poolLengthMeters(s: ActivitySummary) {
  const length = nonZero(s.poolLength);
  return length == null ? null : length * ((s.unitOfPoolLength?.factor ?? 100) / 100);
}

export const activityHref = (id: number) => `/activity?id=${id}`;
