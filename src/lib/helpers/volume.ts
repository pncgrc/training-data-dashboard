// Weekly training volume per sport, for the overview chart and its table.

import { countsTowardTotals, movingTime, type Activity } from './activity';
import { isoDate, parseLocal, rangeWeeks, weekStart } from './dates';
import { fmtHours } from './format';
import { SPORT_LABEL, SPORTS, type Sport } from './sports';

export type VolumeMetric = 'hours' | 'swim' | 'bike' | 'run';

export function weeklyVolume(activities: Activity[], weeks: number, metric: VolumeMetric) {
  const starts = rangeWeeks(weeks);
  const index = new Map(starts.map((d, i) => [isoDate(d), i]));
  const series = Object.fromEntries(SPORTS.map((s) => [s, starts.map(() => 0)])) as Record<Sport, number[]>;

  for (const a of activities.filter(countsTowardTotals)) {
    const i = index.get(isoDate(weekStart(parseLocal(a.startTimeLocal))));
    if (i === undefined) continue;
    if (metric === 'hours') series[a.sport][i] += movingTime(a) / 3600;
    else if (a.sport === metric) series[a.sport][i] += (a.distance || 0) / (a.sport === 'swim' ? 1 : 1000);
  }

  const labels = starts.map((d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }));
  const sports: Sport[] = metric === 'hours' ? SPORTS.filter((s) => series[s].some((v) => v > 0)) : [metric];
  return { labels, sports, series };
}

export const volumeUnit = (metric: VolumeMetric) => (metric === 'hours' ? 'h' : metric === 'swim' ? 'm' : 'km');

export function fmtVolume(v: number, metric: VolumeMetric) {
  if (metric === 'hours') return fmtHours(v * 3600);
  return metric === 'swim' ? `${Math.round(v).toLocaleString()} m` : `${v.toFixed(1)} km`;
}

export const volumeTitle = (metric: VolumeMetric) =>
  metric === 'hours' ? 'Weekly volume (hours)' : `Weekly ${SPORT_LABEL[metric].toLowerCase()} distance (${volumeUnit(metric)})`;
