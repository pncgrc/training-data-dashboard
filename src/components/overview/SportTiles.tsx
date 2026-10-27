import { StatTile, StatTileGrid } from '@/components/ui/StatTile';
import { countsTowardTotals, movingTime, type Activity } from '@/lib/helpers/activity';
import { fmtDistance, fmtHours, fmtPace } from '@/lib/helpers/format';
import { SPORT_LABEL, SPORTS, type Sport } from '@/lib/helpers/sports';

interface Totals {
  n: number;
  dist: number;
  time: number;
}

function sportTotals(activities: Activity[]) {
  const totals = Object.fromEntries(SPORTS.map((s) => [s, { n: 0, dist: 0, time: 0 }])) as Record<Sport, Totals>;
  for (const a of activities.filter(countsTowardTotals)) {
    const t = totals[a.sport];
    t.n++;
    t.dist += a.distance || 0;
    t.time += movingTime(a);
  }
  return totals;
}

// Swim / bike / run totals for the range, plus an all-sports tile.
export function SportTiles({ activities, weeks }: { activities: Activity[]; weeks: number }) {
  const totals = sportTotals(activities);
  const all = Object.values(totals).reduce((s, t) => ({ n: s.n + t.n, time: s.time + t.time }), { n: 0, time: 0 });

  return (
    <StatTileGrid>
      {(['swim', 'bike', 'run'] as const).map((sport) => {
        const t = totals[sport];
        return (
          <StatTile
            key={sport}
            sport={sport}
            label={SPORT_LABEL[sport]}
            value={fmtHours(t.time)}
            stats={[
              ['Sessions', String(t.n)],
              ['Distance', fmtDistance(t.dist, sport)],
              ['Per week', fmtHours(t.time / weeks)],
              [sport === 'bike' ? 'Avg speed' : 'Avg pace', t.time ? fmtPace(t.dist / t.time, sport) : '—'],
            ]}
          />
        );
      })}
      <StatTile
        label="Total"
        value={fmtHours(all.time)}
        stats={[
          ['Sessions', String(all.n)],
          ['Per week', fmtHours(all.time / weeks)],
          ['Other sports', fmtHours(totals.other.time)],
          ['Weeks', String(weeks)],
        ]}
      />
    </StatTileGrid>
  );
}
