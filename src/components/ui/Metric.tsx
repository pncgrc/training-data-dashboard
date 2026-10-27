import type { ReactNode } from 'react';
import styles from './Metric.module.css';

export function Metric({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>
        {value}
        {unit && <small className={styles.unit}>{unit}</small>}
      </div>
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}
