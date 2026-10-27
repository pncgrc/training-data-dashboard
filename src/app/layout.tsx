import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'Training Dashboard',
  description: 'Personal training dashboard backed by the Garmin Connect Personal API',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className={styles.wrap}>{children}</div>
      </body>
    </html>
  );
}
