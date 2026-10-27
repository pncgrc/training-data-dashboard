// Verifies the API key works: gets an access token and fetches a few endpoints.
// Prints only response shapes (field names), never the key or token.

import { isoDateUtc } from '../src/lib/helpers/dates';
import { garminGet, getAccessToken, GarminError } from '../src/lib/server/garmin';

const today = isoDateUtc(new Date());
const weekAgo = isoDateUtc(new Date(Date.now() - 6 * 86400000));

function shape(data: unknown) {
  if (Array.isArray(data)) {
    const first = data[0];
    return `array(${data.length})` + (first && typeof first === 'object' ? ` of {${Object.keys(first).slice(0, 12).join(', ')}}` : '');
  }
  if (data && typeof data === 'object') return `{${Object.keys(data).slice(0, 15).join(', ')}}`;
  return String(data);
}

const checks: [name: string, path: string, params?: Record<string, string | number>][] = [
  ['Profile settings', '/userprofile-service/userprofile/settings'],
  ['Recent activities', '/activitylist-service/activities/search/activities', { start: 0, limit: 5 }],
  ['Daily summaries', '/usersummary-service/v2/dailysummaries', { startDate: weekAgo, endDate: today }],
  ['Sleep', '/sleep-service/sleep/dailySleepSummariesByDate', { startDate: weekAgo, endDate: today }],
  ['HRV', `/hrv-service/hrv/daily/${weekAgo}/${today}`],
];

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

try {
  await getAccessToken();
  console.log('✔ Access token obtained');
} catch (err) {
  console.error(`✘ ${message(err)}`);
  if (err instanceof GarminError && err.body) console.error(err.body.slice(0, 500));
  process.exit(1);
}

let failed = 0;
for (const [name, path, params] of checks) {
  try {
    console.log(`✔ ${name}: ${shape(await garminGet(path, params))}`);
  } catch (err) {
    failed++;
    console.error(`✘ ${name}: ${message(err)}`);
  }
}
process.exit(failed ? 1 : 0);
