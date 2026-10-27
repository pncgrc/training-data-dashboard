import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { nonZero, poolLengthMeters } from '@/lib/helpers/activity';
import { DASH, fmtDuration, fmtLabel, fmtNum } from '@/lib/helpers/format';
import type { ActivitySummary } from '@/types/garmin';
import type { PoolLength } from '@/types/streams';

type Row = PoolLength & { n: number | null }; // n numbers active lengths only

const DEFAULT_POOL_M = 25;

function lengthColumns(pool: number): Column<Row>[] {
  const active = (l: Row) => l.type === 'active';
  const pace = (l: Row) => (active(l) && l.timer ? (l.timer * 100) / pool : null);
  return [
    { key: 'n', label: '#', always: true, cell: (l) => l.n ?? '' },
    { key: 'stroke', label: 'Stroke', always: true, cell: (l) => (active(l) ? fmtLabel(l.swimStroke) : 'Rest') },
    { key: 'time', label: 'Time', num: true, always: true, value: (l) => l.timer, cell: (l) => fmtDuration(l.timer) },
    { key: 'pace', label: 'Pace', num: true, value: pace, cell: (l) => { const p = pace(l); return p == null ? DASH : `${fmtDuration(p)} /100m`; } },
    { key: 'strokes', label: 'Strokes', num: true, value: (l) => (active(l) ? l.strokes : null) },
    { key: 'swolf', label: 'SWOLF', num: true, value: (l) => (active(l) && l.strokes != null && l.timer != null ? Math.round(l.timer + l.strokes) : null) },
    { key: 'rate', label: 'Stroke rate', num: true, value: (l) => (active(l) ? nonZero(l.cadence) : null), cell: (l) => fmtNum(active(l) ? nonZero(l.cadence) : null, 0, ' spm') },
  ];
}

export function LengthsTable({ lengths, summary }: { lengths: PoolLength[]; summary: ActivitySummary }) {
  if (!lengths.length) return null;
  let count = 0;
  const rows: Row[] = lengths.map((l) => ({ ...l, n: l.type === 'active' ? ++count : null }));
  return (
    <Card title="Pool lengths">
      <DataTable
        columns={lengthColumns(poolLengthMeters(summary) ?? DEFAULT_POOL_M)}
        rows={rows}
        rowKey={(_, i) => i}
        rowMuted={(l) => l.type !== 'active'}
        hideEmptyColumns
      />
    </Card>
  );
}
