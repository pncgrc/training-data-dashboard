'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column, type SortState } from '@/components/ui/DataTable';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SportLink } from '@/components/ui/SportLabel';
import { activityHref, movingTime, powerOf, type Activity } from '@/lib/helpers/activity';
import { DASH, fmtDate, fmtDistance, fmtDuration, fmtLabel, fmtNum, fmtPace } from '@/lib/helpers/format';
import { activityTypeLabel, sportClass, type Sport } from '@/lib/helpers/sports';

type SportFilter = Sport | 'all';

const FILTERS: { value: SportFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'swim', label: 'Swim' },
  { value: 'bike', label: 'Bike' },
  { value: 'run', label: 'Run' },
  { value: 'other', label: 'Other' },
];

const sortValue: Record<string, (a: Activity) => string | number> = {
  date: (a) => a.startTimeLocal,
  title: (a) => (a.activityName || '').toLowerCase(),
  type: (a) => a.activityType?.typeKey || '',
  distance: (a) => a.distance || 0,
  time: movingTime,
  speed: (a) => a.averageSpeed || 0,
  hr: (a) => a.averageHR || 0,
  power: (a) => powerOf(a) || 0,
  effect: (a) => a.trainingEffectLabel || '',
};

const TEXT_COLUMNS = ['title', 'type', 'effect'];

const columns: Column<Activity>[] = [
  { key: 'date', label: 'Date', sortable: true, cell: (a) => fmtDate(a.startTimeLocal) },
  { key: 'title', label: 'Title', sortable: true, cell: (a) => <SportLink sport={a.sport} href={activityHref(a.activityId)}>{a.activityName || 'Untitled'}</SportLink> },
  { key: 'type', label: 'Type', sortable: true, cell: (a) => activityTypeLabel(a.activityType?.typeKey) },
  { key: 'distance', label: 'Distance', num: true, sortable: true, cell: (a) => fmtDistance(a.distance, a.sport) },
  { key: 'time', label: 'Time', num: true, sortable: true, cell: (a) => fmtDuration(movingTime(a)) },
  { key: 'speed', label: 'Pace / speed', num: true, sortable: true, cell: (a) => (a.sport === 'other' ? DASH : fmtPace(a.averageSpeed, a.sport)) },
  { key: 'hr', label: 'Avg HR', num: true, sortable: true, cell: (a) => fmtNum(a.averageHR || null, 0, ' bpm') },
  { key: 'power', label: 'Power', num: true, sortable: true, cell: (a) => fmtNum(powerOf(a), 0, ' W') },
  { key: 'effect', label: 'Training effect', sortable: true, cell: (a) => fmtLabel(a.trainingEffectLabel) },
];

// Sortable, filterable list of activities; a row opens the activity.
export function ActivityTable({ activities }: { activities: Activity[] }) {
  const router = useRouter();
  const [sport, setSport] = useState<SportFilter>('all');
  const [sort, setSort] = useState<SortState>({ key: 'date', dir: -1 });

  const rows = useMemo(() => {
    const value = sortValue[sort.key];
    return activities
      .filter((a) => sport === 'all' || a.sport === sport)
      .sort((a, b) => {
        const va = value(a), vb = value(b);
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      });
  }, [activities, sport, sort]);

  // A new column starts A→Z for text and highest-first for dates and numbers.
  const onSort = (key: string) =>
    setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : TEXT_COLUMNS.includes(key) ? 1 : -1 }));

  return (
    <Card title="Activities" actions={<SegmentedControl label="Sport filter" options={FILTERS} value={sport} onChange={setSport} />}>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(a) => a.activityId}
        rowClassName={(a) => sportClass(a.sport)}
        onRowClick={(a) => router.push(activityHref(a.activityId))}
        sort={sort}
        onSort={onSort}
        empty="No activities in this range."
      />
    </Card>
  );
}
