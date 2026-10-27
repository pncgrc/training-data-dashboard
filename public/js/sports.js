// Groups Garmin activity types into swim / bike / run / other.

export const SPORTS = ['swim', 'bike', 'run', 'other'];
export const SPORT_LABEL = { swim: 'Swim', bike: 'Bike', run: 'Run', other: 'Other' };

const BIKE_TYPES = new Set([
  'cycling', 'road_biking', 'virtual_ride', 'indoor_cycling', 'mountain_biking',
  'gravel_cycling', 'cyclocross', 'track_cycling', 'e_bike_fitness', 'recumbent_cycling',
]);

export function sportOf(typeKey = '') {
  if (typeKey.includes('swim')) return 'swim';
  if (BIKE_TYPES.has(typeKey) || typeKey.includes('cycling') || typeKey.includes('biking')) return 'bike';
  if (typeKey.includes('running')) return 'run';
  return 'other';
}

export const typeLabel = (typeKey = '') => typeKey.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// Activities whose GPS points don't correspond to a real-world route.
export const hasRealRoute = (typeKey = '') =>
  !['virtual_ride', 'indoor_cycling', 'treadmill_running', 'lap_swimming', 'indoor_running'].includes(typeKey);

// Reads a sport's color from the CSS tokens so charts follow the active theme.
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
export const sportColor = (sport) => cssVar(`--${sport}`);
