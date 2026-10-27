// Formatting helpers. Units are metric, matching the Garmin profile setting.

const DASH = '—';
const pad = (n) => String(n).padStart(2, '0');

export function fmtDuration(s) {
  if (s == null || Number.isNaN(s)) return DASH;
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

// Long durations for totals, e.g. "12h 05m".
export function fmtHours(s) {
  if (!s) return '0h';
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${pad(m)}m` : `${m}m`;
}

// Swims are measured in metres; everything else in kilometres.
export function fmtDistance(m, sport) {
  if (!m) return DASH;
  if (sport === 'swim') return `${Math.round(m).toLocaleString()} m`;
  return `${(m / 1000).toFixed(m >= 100000 ? 0 : 1)} km`;
}

// Pace for swim (/100 m) and run (/km); speed for everything else (km/h).
export function paceUnit(sport) {
  return sport === 'swim' ? '/100m' : sport === 'run' ? '/km' : 'km/h';
}

export function paceValue(speed, sport) {
  if (!speed || speed <= 0) return null;
  if (sport === 'swim') return 100 / speed; // seconds per 100 m
  if (sport === 'run') return 1000 / speed; // seconds per km
  return speed * 3.6; // km/h
}

export function fmtPace(speed, sport, { unit = true } = {}) {
  const v = paceValue(speed, sport);
  if (v == null) return DASH;
  const text = sport === 'swim' || sport === 'run' ? fmtDuration(v) : v.toFixed(1);
  return unit ? `${text} ${paceUnit(sport)}` : text;
}

export const fmtNum = (v, digits = 0, suffix = '') =>
  v == null || Number.isNaN(v) ? DASH : `${Number(v).toFixed(digits)}${suffix}`;

export function fmtDate(local) {
  if (!local) return DASH;
  const d = new Date(local.replace(' ', 'T'));
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(local) {
  if (!local) return DASH;
  const d = new Date(local.replace(' ', 'T'));
  return `${fmtDate(local)}, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

// "AEROBIC_BASE" -> "Aerobic base"
export const fmtLabel = (s) => (s && s !== 'UNKNOWN' ? s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : DASH);
