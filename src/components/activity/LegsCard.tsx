'use client';

import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SportLink } from '@/components/ui/SportLabel';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { activityHref, nonZero } from '@/lib/helpers/activity';
import { DASH, fmtDistance, fmtDuration, fmtNum, fmtPace } from '@/lib/helpers/format';
import { sportClass, sportOf, typeLabel, type Sport } from '@/lib/helpers/sports';
import type { ActivityDetail } from '@/types/garmin';

type Leg = ActivityDetail & { sport: Sport };

const columns: Column<Leg>[] = [
  { key: 'leg', label: 'Leg', cell: (a) => <SportLink sport={a.sport} href={activityHref(a.activityId)}>{typeLabel(a.activityTypeDTO?.typeKey)}</SportLink> },
  { key: 'distance', label: 'Distance', num: true, cell: (a) => fmtDistance(a.summaryDTO.distance, a.sport) },
  { key: 'time', label: 'Time', num: true, cell: (a) => fmtDuration(a.summaryDTO.duration) },
  { key: 'pace', label: 'Pace / speed', num: true, cell: (a) => (a.sport === 'other' ? DASH : fmtPace(a.summaryDTO.averageSpeed, a.sport)) },
  { key: 'hr', label: 'Avg HR', num: true, cell: (a) => fmtNum(nonZero(a.summaryDTO.averageHR), 0, ' bpm') },
];

async function loadLegs(childIds: number[], signal: AbortSignal) {
  const legs = await Promise.all(childIds.map((id) => api<ActivityDetail>(`/api/activity?id=${id}`, signal).catch(() => null)));
  return legs.filter((a) => a != null).map((a): Leg => ({ ...a, sport: sportOf(a.activityTypeDTO?.typeKey) }));
}

// The individual sports of a multisport activity.
export function LegsCard({ childIds }: { childIds: number[] }) {
  const { data, error } = useAsync(childIds.join(','), (signal) => loadLegs(childIds, signal));
  return (
    <Card title="Legs">
      <DataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(a) => a.activityId}
        rowClassName={(a) => sportClass(a.sport)}
        empty={error ? error.message : 'Loading…'}
      />
    </Card>
  );
}
