import { SPORT_LABEL, type Sport } from '@/lib/helpers/sports';
import { SportLabel } from './SportLabel';
import styles from './Legend.module.css';

// Chart legend for two or more sports; a single series is named by the chart title.
export function Legend({ sports }: { sports: Sport[] }) {
  if (sports.length < 2) return null;
  return (
    <div className={styles.legend}>
      {sports.map((s) => <SportLabel key={s} sport={s}>{SPORT_LABEL[s]}</SportLabel>)}
    </div>
  );
}
