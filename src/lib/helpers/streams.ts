// Turns decoded FIT records into chartable series for the detail page.

import type { StreamRecord } from '@/types/streams';
import { cadenceUnit, cadenceValue } from './activity';
import { fmtDuration, isPaceSport, paceUnit, paceValue } from './format';
import type { Sport } from './sports';

export type XAxis = 'time' | 'distance';
type Values = (number | null)[];

export interface StreamSeries {
  key: 'hr' | 'pace' | 'power' | 'cadence' | 'alt';
  label: string;
  values: Values;
  reverse?: boolean; // pace: faster is up
  area?: boolean;
  fmt: (v: number) => string;
  tick?: (v: number) => string;
}

// Centered moving average that skips gaps.
export function smooth(values: Values, window = 5): Values {
  const half = Math.floor(window / 2);
  return values.map((v, i) => {
    if (v == null) return null;
    let sum = 0, count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j++) {
      const w = values[j];
      if (w != null) { sum += w; count++; }
    }
    return sum / count;
  });
}

// Pace slower than SLOWEST is standing still; faster than FASTEST is a GPS glitch.
const SLOWEST: Partial<Record<Sport, number>> = { swim: 300, run: 900 };
const FASTEST: Partial<Record<Sport, number>> = { swim: 45, run: 120 };

const hasAny = (vals: Values) => vals.some((v) => v != null && v !== 0);

export function streamSeries(records: StreamRecord[], sport: Sport, typeKey = ''): StreamSeries[] {
  const pick = (key: keyof StreamRecord) => records.map((r) => r[key]);
  const series: StreamSeries[] = [];

  const hr = pick('hr');
  if (hasAny(hr)) series.push({ key: 'hr', label: 'Heart rate', values: hr, fmt: (v) => `${Math.round(v)} bpm` });

  const speed = smooth(pick('speed'));
  if (hasAny(speed)) {
    const slowest = SLOWEST[sport], fastest = FASTEST[sport];
    const values = speed.map((v) => {
      const p = paceValue(v, sport === 'other' ? 'bike' : sport);
      if (p == null || slowest == null || fastest == null) return p;
      return p > slowest || p < fastest ? null : p;
    });
    const isPace = isPaceSport(sport);
    series.push({
      key: 'pace',
      label: isPace ? `Pace (${paceUnit(sport)})` : 'Speed (km/h)',
      values,
      reverse: isPace,
      fmt: (v) => (isPace ? `${fmtDuration(v)} ${paceUnit(sport)}` : `${v.toFixed(1)} km/h`),
      tick: isPace ? (v) => fmtDuration(v) : undefined,
    });
  }

  const power = pick('power');
  if (hasAny(power)) series.push({ key: 'power', label: 'Power (W)', values: smooth(power, 3), fmt: (v) => `${Math.round(v)} W` });

  const cadence = pick('cadence').map((v) => cadenceValue(v, sport));
  const cadUnit = cadenceUnit(sport);
  if (hasAny(cadence)) series.push({ key: 'cadence', label: `Cadence (${cadUnit})`, values: cadence, fmt: (v) => `${Math.round(v)} ${cadUnit}` });

  const alt = pick('alt');
  if (hasAny(alt) && sport !== 'swim' && typeKey !== 'virtual_ride') {
    series.push({ key: 'alt', label: 'Elevation (m)', values: alt, area: true, fmt: (v) => `${Math.round(v)} m` });
  }

  return series;
}

export const hasDistance = (records: StreamRecord[]) => records.some((r) => r.dist != null);

// One x value per record, so index i means the same moment in every chart.
// Missing distances are carried forward from the previous record.
export function xValues(records: StreamRecord[], axis: XAxis) {
  if (axis === 'time') return records.map((r) => r.t);
  let last = 0;
  return records.map((r) => (last = r.dist != null ? r.dist / 1000 : last));
}

export const fmtX = (v: number, axis: XAxis) => (axis === 'distance' ? `${v.toFixed(2)} km` : fmtDuration(v));

// Index of the x value closest to x.
export function nearestIndex(xs: number[], x: number) {
  let idx = -1, best = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const d = Math.abs(xs[i] - x);
    if (d < best) { best = d; idx = i; }
  }
  return idx;
}

export const routePoints = (records: StreamRecord[]): [number, number][] =>
  records.flatMap((r) => (r.lat != null && r.lon != null ? [[r.lat, r.lon] as [number, number]] : []));
