// Registers the Chart.js pieces the dashboard uses, and shared axis styling.

import {
  BarController, BarElement, CategoryScale, Chart, Filler, LinearScale,
  LineController, LineElement, PointElement, Tooltip,
} from 'chart.js';
import { cssVar } from '@/lib/helpers/theme';

Chart.register(BarController, BarElement, CategoryScale, Filler, LinearScale, LineController, LineElement, PointElement, Tooltip);

export { Chart };

interface AxisOptions {
  xType?: 'category' | 'linear';
  xTicks?: Record<string, unknown>;
  yReverse?: boolean;
  yBeginAtZero?: boolean;
  stacked?: boolean;
}

// Muted ticks, no vertical grid, light horizontal grid. Read at render time so it follows the theme.
export function axisStyle({ xType = 'category', xTicks, yReverse = false, yBeginAtZero = false, stacked = false }: AxisOptions = {}) {
  const muted = cssVar('--muted');
  return {
    x: {
      type: xType,
      stacked,
      grid: { display: false },
      border: { color: cssVar('--axis') },
      ticks: { color: muted, maxRotation: 0, autoSkipPadding: 16, ...xTicks },
    },
    y: {
      reverse: yReverse,
      beginAtZero: yBeginAtZero,
      stacked,
      grid: { color: cssVar('--grid') },
      border: { display: false },
      ticks: { color: muted, maxTicksLimit: 5 },
    },
  };
}
