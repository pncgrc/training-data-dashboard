import type { ReactNode } from 'react';
import { cx } from '@/lib/helpers/cx';
import styles from './Layout.module.css';

// Vertical stack of cards with even spacing.
export function Stack({ className, dimmed, children }: { className?: string; dimmed?: boolean; children: ReactNode }) {
  return <main className={cx(styles.stack, dimmed && styles.dimmed, className)}>{children}</main>;
}

// Side-by-side cards that wrap to one column on narrow screens.
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}
