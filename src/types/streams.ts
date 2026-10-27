// /api/activity-streams: the activity's FIT file decoded by lib/server/fit.ts.

export interface StreamRecord {
  t: number; // seconds since the first record
  dist: number | null; // metres
  hr: number | null;
  speed: number | null; // m/s
  power: number | null;
  cadence: number | null;
  alt: number | null;
  lat: number | null;
  lon: number | null;
}

export interface Lap {
  start: string | null;
  elapsed: number | null;
  timer: number | null;
  distance: number | null;
  avgSpeed: number | null;
  maxSpeed: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPower: number | null;
  normPower: number | null;
  maxPower: number | null;
  avgCadence: number | null;
  ascent: number | null;
  strokes: number | null;
  swimStroke: string | null;
  activeLengths: number | null;
  intensity: string | null;
}

export interface PoolLength {
  type: string | null; // 'active' or 'idle' (rest)
  timer: number | null;
  strokes: number | null;
  swimStroke: string | null;
  avgSpeed: number | null;
  cadence: number | null;
}

export interface ActivityStreams {
  channels: string[];
  records: StreamRecord[];
  laps: Lap[];
  lengths: PoolLength[];
}
