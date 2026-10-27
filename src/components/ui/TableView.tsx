import type { ReactNode } from 'react';
import styles from './TableView.module.css';

// Collapsible table twin of a chart, for exact values and screen readers.
export function TableView({ children }: { children: ReactNode }) {
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>Show as table</summary>
      {children}
    </details>
  );
}
