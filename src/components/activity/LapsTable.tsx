import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { cadenceUnit, cadenceValue, nonZero } from '@/lib/helpers/activity';
import { fmtDistance, fmtDuration, fmtLabel, fmtNum, fmtPace } from '@/lib/helpers/format';
import type { Sport } from '@/lib/helpers/sports';
import type { Lap } from '@/types/streams';

function lapColumns(sport: Sport): Column<Lap>[] {
  return [
    { key: 'n', label: '#', always: true, value: (_, i) => i + 1 },
    { key: 'time', label: 'Time', num: true, always: true, value: (l) => l.timer, cell: (l) => fmtDuration(l.timer) },
    { key: 'distance', label: 'Distance', num: true, value: (l) => nonZero(l.distance), cell: (l) => fmtDistance(l.distance, sport) },
    { key: 'pace', label: sport === 'bike' ? 'Speed' : 'Pace', num: true, value: (l) => nonZero(l.avgSpeed), cell: (l) => fmtPace(l.avgSpeed, sport) },
    { key: 'avgHr', label: 'Avg HR', num: true, value: (l) => l.avgHr, cell: (l) => fmtNum(l.avgHr, 0, ' bpm') },
    { key: 'maxHr', label: 'Max HR', num: true, value: (l) => l.maxHr, cell: (l) => fmtNum(l.maxHr, 0, ' bpm') },
    { key: 'avgPower', label: 'Avg power', num: true, value: (l) => nonZero(l.avgPower), cell: (l) => fmtNum(nonZero(l.avgPower), 0, ' W') },
    { key: 'np', label: 'NP', num: true, value: (l) => nonZero(l.normPower), cell: (l) => fmtNum(nonZero(l.normPower), 0, ' W') },
    { key: 'maxPower', label: 'Max power', num: true, value: (l) => nonZero(l.maxPower), cell: (l) => fmtNum(nonZero(l.maxPower), 0, ' W') },
    {
      key: 'cadence', label: 'Cadence', num: true,
      value: (l) => nonZero(cadenceValue(l.avgCadence, sport)),
      cell: (l) => fmtNum(nonZero(cadenceValue(l.avgCadence, sport)), 0, ` ${cadenceUnit(sport, { short: true })}`),
    },
    { key: 'ascent', label: 'Ascent', num: true, value: (l) => (sport === 'swim' ? null : nonZero(l.ascent)), cell: (l) => fmtNum(nonZero(l.ascent), 0, ' m') },
    { key: 'lengths', label: 'Lengths', num: true, value: (l) => nonZero(l.activeLengths) },
    { key: 'strokes', label: 'Strokes', num: true, value: (l) => nonZero(l.strokes) },
    { key: 'stroke', label: 'Stroke', value: (l) => l.swimStroke, cell: (l) => fmtLabel(l.swimStroke) },
  ];
}

// Laps, or intervals for pool swims. Columns without data are left out.
export function LapsTable({ laps, sport }: { laps: Lap[]; sport: Sport }) {
  if (!laps.length || (laps.length < 2 && sport !== 'swim')) return null;
  return (
    <Card title={sport === 'swim' ? 'Intervals' : 'Laps'}>
      <DataTable
        columns={lapColumns(sport)}
        rows={laps}
        rowKey={(_, i) => i}
        // Laps with no distance are rest intervals in pool swims.
        rowMuted={(l) => !nonZero(l.distance)}
        hideEmptyColumns
      />
    </Card>
  );
}
