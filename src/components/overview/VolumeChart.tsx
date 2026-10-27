'use client';

import { useMemo, useRef, useState } from 'react';
import type { ChartConfiguration, ScriptableContext } from 'chart.js';
import { Card } from '@/components/ui/Card';
import { ChartCanvas } from '@/components/ui/ChartCanvas';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Legend } from '@/components/ui/Legend';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableView } from '@/components/ui/TableView';
import { useChart } from '@/hooks/useChart';
import { useColorScheme } from '@/hooks/useColorScheme';
import { axisStyle } from '@/lib/chart';
import type { Activity } from '@/lib/helpers/activity';
import { SPORT_LABEL } from '@/lib/helpers/sports';
import { cssVar, sportColor } from '@/lib/helpers/theme';
import { fmtVolume, volumeTitle, volumeUnit, weeklyVolume, type VolumeMetric } from '@/lib/helpers/volume';

const METRICS: { value: VolumeMetric; label: string }[] = [
  { value: 'hours', label: 'Hours' },
  { value: 'swim', label: 'Swim distance' },
  { value: 'bike', label: 'Bike distance' },
  { value: 'run', label: 'Run distance' },
];

// Round only the top end of each stack.
function topRadius(ctx: ScriptableContext<'bar'>) {
  const { dataIndex, datasetIndex, chart } = ctx;
  const above = chart.data.datasets.slice(datasetIndex + 1).some((d) => Number(d.data[dataIndex]) > 0);
  return above ? 0 : { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 };
}

// Stacked weekly volume by sport, switchable between hours and per-sport distance.
export function VolumeChart({ activities, weeks }: { activities: Activity[]; weeks: number }) {
  const [metric, setMetric] = useState<VolumeMetric>('hours');
  const { labels, sports, series } = useMemo(() => weeklyVolume(activities, weeks, metric), [activities, weeks, metric]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scheme = useColorScheme();

  useChart(canvas, (): ChartConfiguration<'bar'> => {
    const fmt = (v: number) => fmtVolume(v, metric);
    const axes = axisStyle({ yBeginAtZero: true, stacked: true });
    return {
      type: 'bar',
      data: {
        labels,
        datasets: sports.map((s) => ({
          label: SPORT_LABEL[s],
          data: series[s],
          backgroundColor: sportColor(s),
          borderColor: cssVar('--surface'),
          borderWidth: { top: 2, right: 0, bottom: 0, left: 0 }, // surface gap between stacked segments
          borderSkipped: 'bottom',
          borderRadius: topRadius,
          maxBarThickness: 24,
        })),
      },
      options: {
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { ...axes.x, type: 'category', ticks: { ...axes.x.ticks, autoSkipPadding: 12 } },
          y: {
            ...axes.y,
            ticks: { ...axes.y.ticks, maxTicksLimit: 6, callback: (v) => `${v}${volumeUnit(metric) === 'h' ? 'h' : ''}` },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (item) => Number(item.raw) > 0,
            callbacks: {
              title: (items) => `Week of ${items[0].label}`,
              label: (item) => ` ${item.dataset.label}: ${fmt(Number(item.raw))}`,
              footer: (items) => (items.length > 1 ? `Total: ${fmt(items.reduce((s, i) => s + Number(i.raw), 0))}` : ''),
            },
          },
        },
      },
    };
  }, [labels, sports, series, metric, scheme]);

  const columns: Column<number>[] = [
    { key: 'week', label: 'Week', cell: (i) => labels[i] },
    ...sports.map((s): Column<number> => ({ key: s, label: SPORT_LABEL[s], num: true, cell: (i) => fmtVolume(series[s][i], metric) })),
  ];
  const newestFirst = labels.map((_, i) => i).reverse();

  return (
    <Card
      title={volumeTitle(metric)}
      actions={<SegmentedControl label="Chart metric" options={METRICS} value={metric} onChange={setMetric} />}
    >
      <Legend sports={sports} />
      <ChartCanvas ref={canvas} label="Weekly training volume" />
      <TableView>
        <DataTable columns={columns} rows={newestFirst} rowKey={(i) => i} />
      </TableView>
    </Card>
  );
}
