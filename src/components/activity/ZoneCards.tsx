'use client';

import { Card } from '@/components/ui/Card';
import { ZoneBars } from '@/components/ui/ZoneBars';
import { useApi } from '@/hooks/useAsync';
import { hrZoneLabels } from '@/lib/helpers/activity';
import type { HeartRateZones } from '@/types/garmin';

export function ZonesCard({ title, times, labels }: { title: string; times: number[]; labels?: string[] | null }) {
  return (
    <Card title={title}>
      <ZoneBars times={times} labels={labels} />
    </Card>
  );
}

// Heart-rate zones, labelled with the user's bpm ranges once those load.
export function HeartRateZonesCard({ times }: { times: number[] }) {
  const { data: zones } = useApi<HeartRateZones[]>('/api/heart-rate-zones');
  return <ZonesCard title="Time in heart-rate zones" times={times} labels={zones && hrZoneLabels(zones)} />;
}
