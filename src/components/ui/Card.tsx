import type { ReactNode } from 'react';
import { cx } from '@/lib/helpers/cx';
import styles from './Card.module.css';

interface CardProps {
  title?: ReactNode;
  // Controls shown beside the title, such as a SegmentedControl.
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({ title, actions, className, children }: CardProps) {
  return (
    <section className={cx(styles.card, className)}>
      {(title || actions) && (
        <div className={styles.head}>
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
