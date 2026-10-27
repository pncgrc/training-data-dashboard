'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';
import { hasRealRoute, type Sport } from '@/lib/helpers/sports';
import { routePoints } from '@/lib/helpers/streams';
import type { StreamRecord } from '@/types/streams';
import styles from './RouteMap.module.css';

// Leaflet needs the browser, so it loads on the client only.
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className={styles.map} />,
});

export function RouteMap({ records, sport, typeKey }: { records: StreamRecord[]; sport: Sport; typeKey?: string }) {
  const points = useMemo(() => routePoints(records), [records]);
  if (!hasRealRoute(typeKey) || points.length < 2) return null;
  return (
    <Card title="Route">
      <LeafletMap points={points} sport={sport} className={styles.map} />
    </Card>
  );
}
