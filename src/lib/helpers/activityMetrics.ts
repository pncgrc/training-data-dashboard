// The headline metrics for an activity, picked per sport.

import type { ActivityDetail } from '@/types/garmin';
import { cadenceUnit, nonZero, poolLengthMeters, roundNonZero as r0 } from './activity';
import { DASH, fmtDistance, fmtDuration, fmtLabel, fmtPace, paceUnit } from './format';
import type { Sport } from './sports';

export interface MetricItem {
  label: string;
  value: string | number;
  unit?: string;
}

type Value = string | number | null | undefined | false;

const metric = (label: string, value: Value, unit?: string): MetricItem | null =>
  value == null || value === false || value === DASH ? null : { label, value, unit };

export function activityMetrics(activity: ActivityDetail, sport: Sport): MetricItem[] {
  const s = activity.summaryDTO;
  const l = activity.listEntry ?? { activityId: 0, startTimeLocal: '' };
  const moving = s.movingDuration ?? s.duration;
  const paceText = (speed: number | undefined) => (nonZero(speed) ? fmtPace(speed, sport, { unit: false }) : null);
  const fixed = (v: number | undefined, digits: number) => (nonZero(v) == null ? null : v!.toFixed(digits));

  const common = [
    metric('Distance', nonZero(s.distance) && fmtDistance(s.distance, sport)),
    metric('Moving time', fmtDuration(moving)),
    metric('Elapsed time', fmtDuration(s.elapsedDuration ?? s.duration)),
  ];
  const hr = [metric('Avg HR', r0(s.averageHR), 'bpm'), metric('Max HR', r0(s.maxHR), 'bpm')];
  const tail = [
    metric('Calories', r0(s.calories), 'kcal'),
    metric('Training effect', l.trainingEffectLabel ? fmtLabel(l.trainingEffectLabel) : null),
  ];

  let specific: (MetricItem | null)[];
  if (sport === 'swim') {
    const pool = poolLengthMeters(s);
    specific = [
      metric('Avg pace', paceText(s.averageSpeed), paceUnit('swim')),
      metric('Pool length', pool && Math.round(pool), 'm'),
      metric('Active lengths', nonZero(s.numberOfActiveLengths)),
      metric('Total strokes', nonZero(s.totalNumberOfStrokes)),
      metric('Strokes / length', fixed(s.averageStrokes, 1)),
      metric('Avg SWOLF', r0(s.averageSWOLF)),
      metric('Stroke distance', fixed(s.averageStrokeDistance, 2), 'm'),
      metric('Stroke rate', r0(s.averageSwimCadence), cadenceUnit('swim', { short: true })),
    ];
  } else if (sport === 'bike') {
    const np = nonZero(s.normalizedPower) ?? nonZero(l.normPower);
    const avgP = nonZero(s.averagePower) ?? nonZero(l.avgPower);
    specific = [
      metric('Avg speed', paceText(s.averageMovingSpeed ?? s.averageSpeed), 'km/h'),
      metric('Max speed', paceText(s.maxSpeed), 'km/h'),
      metric('Avg power', r0(avgP), 'W'),
      metric('Normalized power', r0(np), 'W'),
      metric('Variability index', np && avgP ? (np / avgP).toFixed(2) : null),
      metric('Max power', r0(s.maxPower), 'W'),
      metric('Max 20 min power', r0(l.max20MinPower ?? s.maxPowerTwentyMinutes), 'W'),
      metric('Work', avgP && moving ? Math.round((avgP * moving) / 1000) : null, 'kJ'),
      metric('Avg cadence', r0(s.averageBikeCadence), 'rpm'),
      metric('Elevation gain', r0(s.elevationGain), 'm'),
    ];
  } else if (sport === 'run') {
    specific = [
      metric('Avg pace', paceText(s.averageMovingSpeed ?? s.averageSpeed), paceUnit('run')),
      metric('Best pace', paceText(s.maxSpeed), paceUnit('run')),
      metric('Fastest 1 km', nonZero(l.fastestSplit_1000) && fmtDuration(l.fastestSplit_1000)),
      metric('Fastest mile', nonZero(l.fastestSplit_1609) && fmtDuration(l.fastestSplit_1609)),
      metric('Avg cadence', r0(s.averageRunCadence), 'spm'),
      metric('Stride length', nonZero(s.strideLength) && (s.strideLength! / 100).toFixed(2), 'm'),
      metric('Ground contact', r0(s.groundContactTime), 'ms'),
      metric('Vertical oscillation', fixed(s.verticalOscillation, 1), 'cm'),
      metric('Vertical ratio', fixed(s.verticalRatio, 1), '%'),
      metric('Avg power', r0(s.averagePower), 'W'),
      metric('Elevation gain', r0(s.elevationGain), 'm'),
    ];
  } else {
    specific = [metric('Avg speed', paceText(s.averageSpeed), 'km/h')];
  }

  return [...common, ...specific, ...hr, ...tail].filter((m): m is MetricItem => m != null);
}
