import type { Ref } from 'react';
import { cx } from '@/lib/helpers/cx';
import styles from './ChartCanvas.module.css';

interface ChartCanvasProps {
  ref: Ref<HTMLCanvasElement>;
  label: string;
  size?: 'default' | 'small';
}

// A sized box for a Chart.js canvas; the chart fills it.
export function ChartCanvas({ ref, label, size = 'default' }: ChartCanvasProps) {
  return (
    <div className={cx(styles.box, size === 'small' && styles.small)}>
      <canvas ref={ref} role="img" aria-label={label} />
    </div>
  );
}
