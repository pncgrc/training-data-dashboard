import { cookies } from 'next/headers';
import { OverviewDashboard } from '@/components/overview/OverviewDashboard';
import { parseWeeks, WEEKS_COOKIE } from '@/lib/prefs';

export default async function OverviewPage() {
  const weeks = parseWeeks((await cookies()).get(WEEKS_COOKIE)?.value);
  return <OverviewDashboard initialWeeks={weeks} />;
}
