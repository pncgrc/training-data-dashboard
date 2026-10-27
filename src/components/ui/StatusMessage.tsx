import type { ReactNode } from 'react';
import { cx } from '@/lib/helpers/cx';
import styles from './StatusMessage.module.css';

export function StatusMessage({ error, children }: { error?: boolean; children?: ReactNode }) {
  return (
    <div className={cx(styles.status, error && styles.error)} role={error ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
