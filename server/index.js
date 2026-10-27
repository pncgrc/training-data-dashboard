// Local server: serves the dashboard from public/ and exposes cached Garmin data under /api.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { garminGet, garminDownload, GarminError } from './garmin.js';
import { parseActivityFile } from './fit.js';
import { cached } from './cache.js';

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = join(import.meta.dirname, '..', 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
// Finished activities never change, so their details and files are cached for a long time.
const IMMUTABLE_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;

const isoDate = (d) => d.toISOString().slice(0, 10);
function dateRange(q, defaultDays = 30) {
  const end = q.get('end') || isoDate(new Date());
  const start = q.get('start') || isoDate(new Date(Date.parse(end) - (defaultDays - 1) * 86400000));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new GarminError('Dates must be YYYY-MM-DD', 400);
  return { start, end };
}

function activityId(q) {
  const id = q.get('id');
  if (!/^\d+$/.test(id || '')) throw new GarminError('Activity id must be numeric', 400);
  return id;
}

// Pages through the activity list until every activity in the date range is collected.
async function activitiesInRange(start, end) {
  const all = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await garminGet('/activitylist-service/activities/search/activities', {
      start: offset, limit: PAGE_SIZE, startDate: start, endDate: end,
    });
    all.push(...page);
    if (page.length < PAGE_SIZE) return all;
  }
}

// The detail endpoint lacks zone times and the power curve, which only the list
// endpoint returns, so attach the matching list entry as `listEntry`.
async function activityWithListEntry(id) {
  const detail = await garminGet(`/activity-service/activity/${id}`);
  const day = detail.summaryDTO?.startTimeLocal?.slice(0, 10);
  const sameDay = day ? await activitiesInRange(day, day) : [];
  return { ...detail, listEntry: sameDay.find((a) => String(a.activityId) === id) ?? null };
}

// Each route returns a cache key, a fetcher, and optionally a cache TTL.
// See docs/garmin-personal-api.openapi.json for everything else that's available.
const daily = (path, q) => { const { start, end } = dateRange(q); return garminGet(path, { startDate: start, endDate: end }); };
const routes = {
  '/api/profile': () => ['profile', () => garminGet('/userprofile-service/userprofile/settings')],
  '/api/activities': (q) => {
    const { start, end } = dateRange(q, 84);
    return [`activities:${start}:${end}`, () => activitiesInRange(start, end)];
  },
  '/api/activity': (q) => {
    const id = activityId(q);
    return [`activity:${id}`, () => activityWithListEntry(id), IMMUTABLE_TTL_MS];
  },
  '/api/activity-streams': (q) => {
    const id = activityId(q);
    return [`streams:${id}`, async () => parseActivityFile(await garminDownload(`/download-service/files/activity/${id}`)), IMMUTABLE_TTL_MS];
  },
  '/api/daily-summaries': (q) => [`daily:${q}`, () => daily('/usersummary-service/v2/dailysummaries', q)],
  '/api/sleep': (q) => [`sleep:${q}`, () => daily('/sleep-service/sleep/dailySleepSummariesByDate', q)],
  '/api/body-battery': (q) => [`bb:${q}`, () => daily('/wellness-service/wellness/bodyBattery/reports/daily', q)],
  '/api/hrv': (q) => { const { start, end } = dateRange(q); return [`hrv:${start}:${end}`, () => garminGet(`/hrv-service/hrv/daily/${start}/${end}`)]; },
  '/api/stress': (q) => { const { start, end } = dateRange(q); return [`stress:${start}:${end}`, () => garminGet(`/usersummary-service/stats/stress/daily/${start}/${end}`)]; },
  '/api/steps': (q) => { const { start, end } = dateRange(q); return [`steps:${start}:${end}`, () => garminGet(`/usersummary-service/stats/steps/daily/${start}/${end}`)]; },
  '/api/heart-rate-zones': () => ['hr-zones', () => garminGet('/biometric-service/heartRateZones/v2')],
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function handleApi(req, res, url) {
  const route = routes[url.pathname];
  if (!route) return sendJson(res, 404, { error: 'Unknown API route' });

  try {
    const q = url.searchParams;
    const [key, fetcher, ttlMs] = route(q);
    const data = await cached(key, fetcher, { ttlMs, refresh: q.has('refresh') });
    sendJson(res, 200, data);
  } catch (err) {
    const status = err instanceof GarminError ? err.status : 500;
    console.error(`[api] ${url.pathname}: ${err.message}`, err.body ? `\n${String(err.body).slice(0, 500)}` : '');
    sendJson(res, status, { error: err.message });
  }
}

async function serveStatic(res, pathname) {
  const rel = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^([/\\])+/, '');
  if (rel.startsWith('..')) return sendJson(res, 403, { error: 'Forbidden' });
  try {
    const body = await readFile(join(PUBLIC_DIR, rel));
    res.writeHead(200, { 'Content-Type': MIME[extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  return serveStatic(res, url.pathname);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
  if (!process.env.GARMIN_API_KEY) console.warn('Warning: GARMIN_API_KEY is not set; API calls will fail.');
});
