// Axis helpers that give Chart.js round, evenly spaced ticks.

import type { Scale } from 'chart.js';

export const TIME_STEPS = [30, 60, 120, 300, 600, 900, 1200, 1800, 3600, 7200];
export const PACE_STEPS = [5, 10, 15, 30, 60, 120, 300];
export const DIST_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 25, 50];

// Picks a round tick step so an axis gets at most ~maxTicks ticks.
export function niceStep(span: number, steps: number[], maxTicks = 8) {
  return steps.find((s) => span / s <= maxTicks) ?? steps[steps.length - 1];
}

// Ticks at every multiple of step between min and max.
export function roundTicks(min: number, max: number, step: number) {
  const ticks: { value: number }[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push({ value: Number(v.toFixed(6)) });
  return ticks;
}

// Chart.js adds the data min/max as end ticks when they aren't round; drop those.
export function dropUnroundEnds(scale: Scale) {
  const t = scale.ticks;
  if (t.length < 4) return;
  const step = t[2].value - t[1].value;
  scale.ticks = t.filter((tick) => Math.abs(tick.value / step - Math.round(tick.value / step)) < 1e-6);
}

// Axis bounds from the 2nd–98th percentile, so short stops don't flatten the line.
export function robustBounds(values: (number | null)[]): { min?: number; max?: number } {
  const sorted = values.filter((v): v is number => v != null).sort((a, b) => a - b);
  if (sorted.length < 10) return {};
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  const pad = (hi - lo) * 0.15 || 1;
  return { min: Math.max(0, lo - pad), max: hi + pad };
}
