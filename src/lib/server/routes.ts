// The /api/* routes. Each returns a cache key, a fetcher, and optionally a cache TTL.
// See docs/garmin-personal-api.openapi.json for everything else that's available.

import 'server-only';
import type { ActivityDetail, ActivityListEntry } from '@/types/garmin';
import { isIsoDate, isoDateUtc } from '@/lib/helpers/dates';
import { garminDownload, garminGet, GarminError } from './garmin';
import { parseActivityFile } from './fit';

// Finished activities never change, so their details and files are cached for a long time.
const IMMUTABLE_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;

type Route = (q: URLSearchParams) => [key: string, fetcher: () => Promise<unknown>, ttlMs?: number];

function dateRange(q: URLSearchParams, defaultDays = 30) {
  const end = q.get('end') || isoDateUtc(new Date());
  const start = q.get('start') || isoDateUtc(new Date(Date.parse(end) - (defaultDays - 1) * 86400000));
  if (!isIsoDate(start) || !isIsoDate(end)) throw new GarminError('Dates must be YYYY-MM-DD', 400);
  return { start, end };
}

function activityId(q: URLSearchParams) {
  const id = q.get('id') ?? '';
  if (!/^\d+$/.test(id)) throw new GarminError('Activity id must be numeric', 400);
  return id;
}

// Pages through the activity list until every activity in the date range is collected.
async function activitiesInRange(start: string, end: string) {
  const all: ActivityListEntry[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await garminGet<ActivityListEntry[]>('/activitylist-service/activities/search/activities', {
      start: offset, limit: PAGE_SIZE, startDate: start, endDate: end,
    });
    all.push(...page);
    if (page.length < PAGE_SIZE) return all;
  }
}

// The detail endpoint lacks zone times and the power curve, which only the list
// endpoint returns, so attach the matching list entry as `listEntry`.
async function activityWithListEntry(id: string): Promise<ActivityDetail> {
  const detail = await garminGet<Omit<ActivityDetail, 'listEntry'>>(`/activity-service/activity/${id}`);
  const day = detail.summaryDTO?.startTimeLocal?.slice(0, 10);
  const sameDay = day ? await activitiesInRange(day, day) : [];
  return { ...detail, listEntry: sameDay.find((a) => String(a.activityId) === id) ?? null };
}

// Daily wellness endpoints that take the range as query parameters.
const daily = (name: string, path: string): Route => (q) => {
  const { start, end } = dateRange(q);
  return [`${name}:${start}:${end}`, () => garminGet(path, { startDate: start, endDate: end })];
};

// Daily wellness endpoints that take the range in the path.
const dailyPath = (name: string, path: (start: string, end: string) => string): Route => (q) => {
  const { start, end } = dateRange(q);
  return [`${name}:${start}:${end}`, () => garminGet(path(start, end))];
};

export const routes: Record<string, Route> = {
  profile: () => ['profile', () => garminGet('/userprofile-service/userprofile/settings')],
  activities: (q) => {
    const { start, end } = dateRange(q, 84);
    return [`activities:${start}:${end}`, () => activitiesInRange(start, end)];
  },
  activity: (q) => {
    const id = activityId(q);
    return [`activity:${id}`, () => activityWithListEntry(id), IMMUTABLE_TTL_MS];
  },
  'activity-streams': (q) => {
    const id = activityId(q);
    return [`streams:${id}`, async () => parseActivityFile(await garminDownload(`/download-service/files/activity/${id}`)), IMMUTABLE_TTL_MS];
  },
  'daily-summaries': daily('daily', '/usersummary-service/v2/dailysummaries'),
  sleep: daily('sleep', '/sleep-service/sleep/dailySleepSummariesByDate'),
  'body-battery': daily('bb', '/wellness-service/wellness/bodyBattery/reports/daily'),
  hrv: dailyPath('hrv', (start, end) => `/hrv-service/hrv/daily/${start}/${end}`),
  stress: dailyPath('stress', (start, end) => `/usersummary-service/stats/stress/daily/${start}/${end}`),
  steps: dailyPath('steps', (start, end) => `/usersummary-service/stats/steps/daily/${start}/${end}`),
  'heart-rate-zones': () => ['hr-zones', () => garminGet('/biometric-service/heartRateZones/v2')],
};
