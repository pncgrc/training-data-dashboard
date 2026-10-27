'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveElement, ChartConfiguration, Plugin, Scale } from 'chart.js';
import { Card } from '@/components/ui/Card';
import { ChartCanvas } from '@/components/ui/ChartCanvas';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useColorScheme } from '@/hooks/useColorScheme';
import { axisStyle, Chart } from '@/lib/chart';
import { DIST_STEPS, dropUnroundEnds, niceStep, PACE_STEPS, robustBounds, roundTicks, TIME_STEPS } from '@/lib/helpers/chartScale';
import { fmtDuration } from '@/lib/helpers/format';
import type { Sport } from '@/lib/helpers/sports';
import { fmtX, hasDistance, nearestIndex, streamSeries, xValues, type StreamSeries, type XAxis } from '@/lib/helpers/streams';
import { cssVar, sportColor } from '@/lib/helpers/theme';
import type { StreamRecord } from '@/types/streams';
import styles from './StreamCharts.module.css';

type Point = { x: number; y: number | null };
type LineChart = Chart<'line', Point[]>;

const AXES: { value: XAxis; label: string }[] = [
  { value: 'time', label: 'Time' },
  { value: 'distance', label: 'Distance' },
];

// Fixed y-axis width keeps the plots of all small multiples aligned.
const Y_AXIS_WIDTH = 52;

function seriesConfig(s: StreamSeries, xs: number[], axis: XAxis, sport: Sport, plugin: Plugin<'line'>): ChartConfiguration<'line', Point[]> {
  const color = sportColor(sport);
  const axes = axisStyle({ xType: 'linear', yReverse: s.reverse });
  const xMin = xs[0], xMax = xs[xs.length - 1];
  const xStep = niceStep(xMax - xMin, axis === 'time' ? TIME_STEPS : DIST_STEPS);

  // Pace axes ignore stops and glitches, and snap to round pace steps.
  let yBounds: { min?: number; max?: number } = {};
  let yStep: number | undefined;
  if (s.key === 'pace') {
    yBounds = robustBounds(s.values);
    if (s.reverse && yBounds.min != null && yBounds.max != null) {
      yStep = niceStep(yBounds.max - yBounds.min, PACE_STEPS, 4);
      yBounds = { min: Math.floor(yBounds.min / yStep) * yStep, max: Math.ceil(yBounds.max / yStep) * yStep };
    }
  }

  return {
    type: 'line',
    data: {
      datasets: [{
        data: s.values.map((y, j) => ({ x: xs[j], y })),
        borderColor: color,
        backgroundColor: s.area ? `color-mix(in srgb, ${color} 10%, transparent)` : color,
        fill: s.area ? 'origin' : false,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: cssVar('--surface'),
        pointHoverBorderWidth: 2,
        spanGaps: false,
        tension: 0,
      }],
    },
    options: {
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      normalized: true,
      events: ['mousemove', 'mouseout'],
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          ...axes.x,
          type: 'linear',
          min: xMin,
          max: xMax,
          ticks: { ...axes.x.ticks, callback: (v) => (axis === 'distance' ? `${v} km` : fmtDuration(Number(v))) },
          afterBuildTicks: (scale: Scale) => { scale.ticks = roundTicks(scale.min, scale.max, xStep); },
        },
        y: {
          ...axes.y,
          ...yBounds,
          ticks: { ...axes.y.ticks, stepSize: yStep, callback: s.tick ? (v) => s.tick!(Number(v)) : undefined },
          afterBuildTicks: dropUnroundEnds,
          afterFit: (scale: Scale) => { scale.width = Y_AXIS_WIDTH; },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: { title: (items) => fmtX(items[0].parsed.x ?? 0, axis), label: (item) => s.fmt(item.parsed.y ?? 0) },
        },
      },
    },
    plugins: [plugin],
  };
}

// Small multiples of HR, pace, power, cadence and elevation with a shared, synced crosshair.
export function StreamCharts({ records, sport, typeKey }: { records: StreamRecord[]; sport: Sport; typeKey?: string }) {
  const [xAxis, setXAxis] = useState<XAxis>('time');
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const scheme = useColorScheme();

  const series = useMemo(() => streamSeries(records, sport, typeKey), [records, sport, typeKey]);
  const withDistance = useMemo(() => hasDistance(records), [records]);
  const axis: XAxis = withDistance ? xAxis : 'time';

  useEffect(() => {
    const xs = xValues(records, axis);
    const charts: LineChart[] = [];

    // Mirrors the hovered moment onto every chart.
    let syncing = false;
    const syncHover = (x: number | null) => {
      if (syncing) return;
      syncing = true;
      const idx = x == null ? -1 : nearestIndex(xs, x);
      for (const c of charts) {
        const valid = idx >= 0 && c.data.datasets[0].data[idx]?.y != null;
        const active = valid ? [{ datasetIndex: 0, index: idx }] : [];
        c.setActiveElements(active);
        c.tooltip?.setActiveElements(active, valid ? { x: c.scales.x.getPixelForValue(xs[idx]), y: c.chartArea.top } : { x: 0, y: 0 });
        c.update('none');
      }
      syncing = false;
    };

    const crosshair: Plugin<'line'> = {
      id: 'crosshair',
      afterEvent(chart, args) {
        const e = args.event;
        if (e.type === 'mouseout') return syncHover(null);
        if (e.type !== 'mousemove' || !args.inChartArea || e.x == null) return;
        syncHover(chart.scales.x.getValueForPixel(e.x) ?? null);
      },
      afterDatasetsDraw(chart) {
        const active: ActiveElement | undefined = chart.tooltip?.getActiveElements()[0];
        if (!active) return;
        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.strokeStyle = cssVar('--axis');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(active.element.x, chartArea.top);
        ctx.lineTo(active.element.x, chartArea.bottom);
        ctx.stroke();
        ctx.restore();
      },
    };

    series.forEach((s, i) => {
      const canvas = canvases.current[i];
      if (canvas) charts.push(new Chart(canvas, seriesConfig(s, xs, axis, sport, crosshair)));
    });
    return () => charts.forEach((c) => c.destroy());
  }, [records, series, axis, sport, scheme]);

  if (!series.length) return null;

  return (
    <Card
      title="Data over the activity"
      actions={withDistance && <SegmentedControl label="Horizontal axis" options={AXES} value={axis} onChange={setXAxis} />}
    >
      <div className={styles.list}>
        {series.map((s, i) => (
          <div key={s.key}>
            <div className={styles.label}>{s.label}</div>
            <ChartCanvas size="small" label={s.label} ref={(el) => { canvases.current[i] = el; }} />
          </div>
        ))}
      </div>
    </Card>
  );
}
