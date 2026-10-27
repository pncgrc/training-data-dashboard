import type { ReactNode } from 'react';
import type { Sport } from '@/lib/helpers/sports';
import { Card } from './Card';
import { SportLabel } from './SportLabel';
import styles from './StatTile.module.css';

interface StatTileProps {
  label: string;
  sport?: Sport; // adds the sport dot to the label
  value: ReactNode;
  stats: [label: string, value: ReactNode][];
}

// A headline number with a short list of supporting stats.
export function StatTile({ label, sport, value, stats }: StatTileProps) {
  return (
    <Card>
      <div className={styles.label}>{sport ? <SportLabel sport={sport}>{label}</SportLabel> : label}</div>
      <div className={styles.value}>{value}</div>
      <dl className={styles.stats}>
        {stats.map(([k, v]) => (
          <div key={k} className={styles.row}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function StatTileGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}
