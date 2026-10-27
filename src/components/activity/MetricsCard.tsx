import { Card } from '@/components/ui/Card';
import { Metric, MetricGrid } from '@/components/ui/Metric';
import { activityMetrics } from '@/lib/helpers/activityMetrics';
import type { Sport } from '@/lib/helpers/sports';
import type { ActivityDetail } from '@/types/garmin';

export function MetricsCard({ activity, sport }: { activity: ActivityDetail; sport: Sport }) {
  return (
    <Card>
      <MetricGrid>
        {activityMetrics(activity, sport).map((m) => <Metric key={m.label} {...m} />)}
      </MetricGrid>
    </Card>
  );
}
