import type { ReactNode } from 'react';
import Link from 'next/link';
import { logout } from '@/app/login/actions';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: ReactNode;
  back?: { href: string; label: string };
  subtitle?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, back, subtitle, status, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.main}>
        {back && <Link className={styles.back} href={back.href}>← {back.label}</Link>}
        <h1>{title}</h1>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        {status}
      </div>
      <div className={styles.actions}>
        {actions}
        <form action={logout}>
          <button type="submit" className={styles.logout}>Log out</button>
        </form>
      </div>
    </header>
  );
}
