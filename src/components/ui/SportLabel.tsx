import type { ReactNode } from 'react';
import Link from 'next/link';
import { cx } from '@/lib/helpers/cx';
import { SPORT_LABEL, sportClass, type Sport } from '@/lib/helpers/sports';
import styles from './SportLabel.module.css';

// Sport identity is a colored dot beside the text, never colored text.
export function SportDot({ sport, title }: { sport: Sport; title?: string }) {
  return <span className={cx(styles.dot, sportClass(sport))} title={title} />;
}

export function SportLabel({ sport, className, children }: { sport: Sport; className?: string; children: ReactNode }) {
  return (
    <span className={cx(styles.label, className)}>
      <SportDot sport={sport} title={SPORT_LABEL[sport]} />
      {children}
    </span>
  );
}

export function SportLink({ sport, href, children }: { sport: Sport; href: string; children: ReactNode }) {
  return (
    <SportLabel sport={sport}>
      <Link className={styles.link} href={href}>{children}</Link>
    </SportLabel>
  );
}
