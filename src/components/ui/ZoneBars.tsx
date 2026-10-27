import { fmtDuration } from '@/lib/helpers/format';
import styles from './ZoneBars.module.css';

interface ZoneBarsProps {
  times: number[]; // seconds in each zone, Z1 first
  labels?: string[] | null; // e.g. the zone's bpm range
}

// Horizontal bars scaled to the longest zone, colored with the surrounding --sport.
export function ZoneBars({ times, labels }: ZoneBarsProps) {
  const total = times.reduce((a, b) => a + b, 0);
  const max = Math.max(...times);
  return (
    <div className={styles.zones}>
      {times.map((t, i) => (
        <div key={i} className={styles.row}>
          <div className={styles.name}>
            Z{i + 1}
            {labels?.[i] && <small>{labels[i]}</small>}
          </div>
          <div className={styles.track}>
            <div className={styles.bar} style={{ width: `${max ? (t / max) * 100 : 0}%` }} />
          </div>
          <div className={styles.value}>{fmtDuration(t)} · {total ? Math.round((t / total) * 100) : 0}%</div>
        </div>
      ))}
    </div>
  );
}
