'use client';

import { useRef } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { Card } from '@/components/ui/Card';
import { ChartCanvas } from '@/components/ui/ChartCanvas';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { TableView } from '@/components/ui/TableView';
import { useChart } from '@/hooks/useChart';
import { useColorScheme } from '@/hooks/useColorScheme';
import { axisStyle } from '@/lib/chart';
import { durationLabel } from '@/lib/helpers/activity';
import type { Sport } from '@/lib/helpers/sports';
import { cssVar, sportColor } from '@/lib/helpers/theme';

type PeakPoint = { duration: number; watts: number };

const columns: Column<PeakPoint>[] = [
  { key: 'duration', label: 'Duration', cell: (p) => durationLabel(p.duration) },
  { key: 'watts', label: 'Power', num: true, cell: (p) => `${p.watts} W` },
];

// Best average power over durations from 1 s to 5 h.
export function PeakPowerCard({ points, sport }: { points: PeakPoint[]; sport: Sport }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scheme = useColorScheme();

  useChart(canvas, (): ChartConfiguration<'line'> => {
    const color = sportColor(sport);
    const axes = axisStyle({ yBeginAtZero: true });
    return {
      type: 'line',
      data: {
        labels: points.map((p) => durationLabel(p.duration)),
        datasets: [{
          data: points.map((p) => p.watts),
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderColor: cssVar('--surface'),
          pointHoverBorderWidth: 2,
          tension: 0.25,
        }],
      },
      options: {
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: { x: { ...axes.x, type: 'category' }, y: axes.y },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { title: (i) => `Best ${i[0].label}`, label: (i) => ` ${i.raw} W` } },
        },
      },
    };
  }, [points, sport, scheme]);

  return (
    <Card title="Peak power (W)">
      <ChartCanvas size="small" ref={canvas} label="Peak power by duration" />
      <TableView>
        <DataTable columns={columns} rows={points} rowKey={(p) => p.duration} />
      </TableView>
    </Card>
  );
}
