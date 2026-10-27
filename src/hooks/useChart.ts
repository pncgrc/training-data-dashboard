'use client';

import { useEffect, type DependencyList, type RefObject } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { Chart } from '@/lib/chart';

// Creates a chart on the canvas and recreates it whenever deps change.
// config is called inside the effect, so it can read CSS theme tokens.
export function useChart(canvas: RefObject<HTMLCanvasElement | null>, config: () => ChartConfiguration | null, deps: DependencyList) {
  useEffect(() => {
    const cfg = canvas.current && config();
    if (!cfg) return;
    const chart = new Chart(canvas.current!, cfg);
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
