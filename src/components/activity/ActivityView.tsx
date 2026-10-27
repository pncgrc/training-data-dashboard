'use client';

import { useEffect } from 'react';
import { CardGrid, Stack } from '@/components/ui/Layout';
import { PageHeader } from '@/components/ui/PageHeader';
import { SportLabel } from '@/components/ui/SportLabel';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { useApi } from '@/hooks/useAsync';
import { peakPower, zoneTimes } from '@/lib/helpers/activity';
import { fmtDateTime, fmtLabel } from '@/lib/helpers/format';
import { activityTypeLabel, SPORT_LABEL, sportClass, sportOf } from '@/lib/helpers/sports';
import type { ActivityDetail } from '@/types/garmin';
import type { ActivityStreams } from '@/types/streams';
import { LapsTable } from './LapsTable';
import { LegsCard } from './LegsCard';
import { LengthsTable } from './LengthsTable';
import { MetricsCard } from './MetricsCard';
import { PeakPowerCard } from './PeakPowerCard';
import { RouteMap } from './RouteMap';
import { StreamCharts } from './StreamCharts';
import { HeartRateZonesCard, ZonesCard } from './ZoneCards';

const BACK = { href: '/', label: 'All activities' };

// Activity detail: sport-specific metrics, zones, peak power, time series, laps and route.
export function ActivityView({ id }: { id: string }) {
  const valid = /^\d+$/.test(id);
  const activity = useApi<ActivityDetail>(valid ? `/api/activity?id=${id}` : null);
  const streams = useApi<ActivityStreams>(valid ? `/api/activity-streams?id=${id}` : null);
  const a = activity.data;

  useEffect(() => {
    if (a) document.title = `${a.activityName || 'Untitled'} · Training Dashboard`;
  }, [a]);

  if (!valid) return <PageHeader back={BACK} title="Activity not found" />;
  if (activity.error) {
    return <PageHeader back={BACK} title="Could not load activity" status={<StatusMessage error>{activity.error.message}</StatusMessage>} />;
  }
  if (!a) return <PageHeader back={BACK} title="Loading…" />;

  const typeKey = a.activityTypeDTO?.typeKey;
  const sport = sportOf(typeKey);
  const subtitle = [
    typeKey === 'multi_sport' ? 'Multisport' : `${SPORT_LABEL[sport]} · ${activityTypeLabel(typeKey)}`,
    fmtDateTime(a.summaryDTO.startTimeLocal),
    a.locationName,
    a.metadataDTO?.manufacturer && fmtLabel(a.metadataDTO.manufacturer),
  ].filter(Boolean).join(' · ');

  const hrTimes = zoneTimes(a.listEntry, 'hrTimeInZone_');
  const powerTimes = zoneTimes(a.listEntry, 'powerTimeInZone_');
  const peaks = peakPower(a.listEntry);
  const showPeaks = peaks.length >= 3;
  const childIds = a.metadataDTO?.childIds ?? [];
  const s = streams.data;

  const status = streams.error
    ? <StatusMessage error>Detailed data unavailable: {streams.error.message}</StatusMessage>
    : streams.loading && <StatusMessage>Loading activity file…</StatusMessage>;

  return (
    <>
      <PageHeader
        back={BACK}
        title={a.activityName || 'Untitled'}
        subtitle={<SportLabel sport={sport}>{subtitle}</SportLabel>}
        status={status}
      />
      {/* The sport class colors zone bars and other marks. */}
      <Stack className={sportClass(sport)}>
        <MetricsCard activity={a} sport={sport} />
        {childIds.length > 0 && <LegsCard childIds={childIds} />}
        {(hrTimes || powerTimes || showPeaks) && (
          <CardGrid>
            {hrTimes && <HeartRateZonesCard times={hrTimes} />}
            {powerTimes && <ZonesCard title="Time in power zones" times={powerTimes} />}
            {showPeaks && <PeakPowerCard points={peaks} sport={sport} />}
          </CardGrid>
        )}
        {s && (
          <>
            <StreamCharts records={s.records} sport={sport} typeKey={typeKey} />
            <LapsTable laps={s.laps} sport={sport} />
            <LengthsTable lengths={s.lengths} summary={a.summaryDTO} />
            <RouteMap records={s.records} sport={sport} typeKey={typeKey} />
          </>
        )}
      </Stack>
    </>
  );
}
