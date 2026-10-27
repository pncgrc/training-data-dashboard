'use client';

import { useActionState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { login, type LoginState } from './actions';
import styles from './LoginForm.module.css';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.title}>Training Dashboard</h1>
        <form action={action} className={styles.form}>
          <input type="hidden" name="next" value={next} />
          <label className={styles.field}>
            <span>Password</span>
            <input className={styles.input} type="password" name="password" autoComplete="current-password" required autoFocus />
          </label>
          <button className={styles.button} type="submit" disabled={pending}>{pending ? 'Logging in…' : 'Log in'}</button>
          {state.error && <StatusMessage error>{state.error}</StatusMessage>}
        </form>
      </Card>
    </div>
  );
}
