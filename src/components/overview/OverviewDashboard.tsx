'use client';

import { useMemo, useState } from 'react';
import { Stack } from '@/components/ui/Layout';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { useApi } from '@/hooks/useAsync';
import { withSport } from '@/lib/helpers/activity';
import { isoDate, rangeWeeks } from '@/lib/helpers/dates';
import { fmtDate } from '@/lib/helpers/format';
import { saveWeeks, WEEK_OPTIONS } from '@/lib/prefs';
import type { ActivityListEntry } from '@/types/garmin';
import { ActivityTable } from './ActivityTable';
import { SportTiles } from './SportTiles';
import { VolumeChart } from './VolumeChart';

const RANGES = WEEK_OPTIONS.map((w) => ({ value: w, label: `${w} weeks` }));

const rangeFor = (weeks: number) => ({ weeks, start: isoDate(rangeWeeks(weeks)[0]), end: isoDate(new Date()) });

export function OverviewDashboard({ initialWeeks }: { initialWeeks: number }) {
  const [range, setRange] = useState(() => rangeFor(initialWeeks));
  const { data, error, loading } = useApi<ActivityListEntry[]>(`/api/activities?start=${range.start}&end=${range.end}`);
  const activities = useMemo(() => (data ?? []).map(withSport), [data]);

  const changeWeeks = (weeks: number) => {
    saveWeeks(weeks);
    setRange(rangeFor(weeks));
  };

  const status = error
    ? <StatusMessage error>{error.message}</StatusMessage>
    : <StatusMessage>{loading ? 'Loading…' : `${activities.length} activities since ${fmtDate(range.start)}`}</StatusMessage>;

  return (
    <>
      <PageHeader
        title="Training Dashboard"
        status={status}
        actions={<SegmentedControl label="Date range" options={RANGES} value={range.weeks} onChange={changeWeeks} />}
      />
      {data && (
        <Stack dimmed={loading}>
          <SportTiles activities={activities} weeks={range.weeks} />
          <VolumeChart activities={activities} weeks={range.weeks} />
          <ActivityTable activities={activities} />
        </Stack>
      )}
    </>
  );
}
