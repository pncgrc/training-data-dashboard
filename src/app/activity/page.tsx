import type { Metadata } from 'next';
import { ActivityView } from '@/components/activity/ActivityView';

export const metadata: Metadata = { title: 'Activity · Training Dashboard' };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const { id } = await searchParams;
  return <ActivityView key={String(id)} id={typeof id === 'string' ? id : ''} />;
}
