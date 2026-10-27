// Verifies the API key works: gets an access token and fetches a few endpoints.
// Prints only response shapes (field names), never the key or token.

import { getAccessToken, garminGet } from '../server/garmin.js';

const today = new Date().toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

function shape(data) {
  if (Array.isArray(data)) return `array(${data.length})` + (data[0] && typeof data[0] === 'object' ? ` of {${Object.keys(data[0]).slice(0, 12).join(', ')}}` : '');
  if (data && typeof data === 'object') return `{${Object.keys(data).slice(0, 15).join(', ')}}`;
  return String(data);
}

const checks = [
  ['Profile settings', '/userprofile-service/userprofile/settings'],
  ['Recent activities', '/activitylist-service/activities/search/activities', { start: 0, limit: 5 }],
  ['Daily summaries', '/usersummary-service/v2/dailysummaries', { startDate: weekAgo, endDate: today }],
  ['Sleep', '/sleep-service/sleep/dailySleepSummariesByDate', { startDate: weekAgo, endDate: today }],
  ['HRV', `/hrv-service/hrv/daily/${weekAgo}/${today}`],
];

try {
  await getAccessToken();
  console.log('✔ Access token obtained');
} catch (err) {
  console.error(`✘ ${err.message}`);
  if (err.body) console.error(String(err.body).slice(0, 500));
  process.exit(1);
}

let failed = 0;
for (const [name, path, params] of checks) {
  try {
    console.log(`✔ ${name}: ${shape(await garminGet(path, params))}`);
  } catch (err) {
    failed++;
    console.error(`✘ ${name}: ${err.message}`);
  }
}
process.exit(failed ? 1 : 0);
