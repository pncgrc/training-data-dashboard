// Turns Garmin's activity download (a zip holding the original .fit file) into
// compact time series, laps and swim lengths for the detail page.

import 'server-only';
import { inflateRawSync } from 'node:zlib';
import { Decoder, Stream, type LapMesg, type LengthMesg, type RecordMesg } from '@garmin/fitsdk';
import type { ActivityStreams, Lap, PoolLength, StreamRecord } from '@/types/streams';

const MAX_POINTS = 1500;
const SEMICIRCLE_TO_DEG = 180 / 2 ** 31;

// Garmin's zip holds a single .fit entry. Read it via the central directory,
// because local headers may defer sizes to a trailing data descriptor.
function unzipFirstFit(buf: Buffer) {
  if (buf.readUInt32LE(0) !== 0x04034b50) return buf; // not a zip; assume raw FIT

  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('Activity download is not a valid zip');
  let entry = buf.readUInt32LE(eocd + 16);
  const count = buf.readUInt16LE(eocd + 10);

  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(entry + 10);
    const compressedSize = buf.readUInt32LE(entry + 20);
    const nameLen = buf.readUInt16LE(entry + 28);
    const extraLen = buf.readUInt16LE(entry + 30);
    const commentLen = buf.readUInt16LE(entry + 32);
    const localOffset = buf.readUInt32LE(entry + 42);
    const name = buf.toString('utf8', entry + 46, entry + 46 + nameLen);

    if (name.toLowerCase().endsWith('.fit')) {
      const dataStart = localOffset + 30 + buf.readUInt16LE(localOffset + 26) + buf.readUInt16LE(localOffset + 28);
      const data = buf.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data);
      throw new Error(`Unsupported zip compression method ${method}`);
    }
    entry += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('No .fit file found in activity download');
}

const round = (v: number | null | undefined, digits = 0) =>
  v == null || Number.isNaN(v) ? null : Number(v.toFixed(digits));
// The decoder converts FIT timestamps to Dates by default.
const timeMs = (ts: unknown) => (ts instanceof Date ? ts.getTime() : 0);
// Enum fields decode to their name, or to the raw number when the profile doesn't know it.
const enumName = (v: unknown) => (typeof v === 'string' ? v : null);

function buildRecords(records: RecordMesg[]): StreamRecord[] {
  if (!records.length) return [];
  const t0 = timeMs(records[0].timestamp);
  const step = Math.max(1, Math.ceil(records.length / MAX_POINTS));
  const out: StreamRecord[] = [];
  for (let i = 0; i < records.length; i += step) {
    const r = records[i];
    out.push({
      t: Math.round((timeMs(r.timestamp) - t0) / 1000),
      dist: round(r.distance, 1),
      hr: r.heartRate || null, // 0 means no HR sensor
      speed: round(r.enhancedSpeed ?? r.speed, 3),
      power: r.power ?? null,
      cadence: r.cadence != null ? r.cadence + (r.fractionalCadence ?? 0) : null,
      alt: round(r.enhancedAltitude ?? r.altitude, 1),
      lat: r.positionLat != null ? round(r.positionLat * SEMICIRCLE_TO_DEG, 6) : null,
      lon: r.positionLong != null ? round(r.positionLong * SEMICIRCLE_TO_DEG, 6) : null,
    });
  }
  return out;
}

function buildLaps(laps: LapMesg[]): Lap[] {
  return laps.map((l) => ({
    start: l.startTime instanceof Date ? l.startTime.toISOString() : null,
    elapsed: round(l.totalElapsedTime, 1),
    timer: round(l.totalTimerTime, 1),
    distance: round(l.totalDistance, 1),
    avgSpeed: round(l.enhancedAvgSpeed ?? l.avgSpeed, 3),
    maxSpeed: round(l.enhancedMaxSpeed ?? l.maxSpeed, 3),
    avgHr: l.avgHeartRate || null,
    maxHr: l.maxHeartRate || null,
    avgPower: l.avgPower ?? null,
    normPower: l.normalizedPower ?? null,
    maxPower: l.maxPower ?? null,
    avgCadence: l.avgCadence ?? l.avgRunningCadence ?? null,
    ascent: l.totalAscent ?? null,
    strokes: l.totalStrokes ?? null,
    swimStroke: enumName(l.swimStroke),
    activeLengths: l.numActiveLengths ?? null,
    intensity: enumName(l.intensity),
  }));
}

function buildLengths(lengths: LengthMesg[]): PoolLength[] {
  return lengths.map((l) => ({
    type: enumName(l.lengthType),
    timer: round(l.totalTimerTime, 1),
    strokes: l.totalStrokes ?? null,
    swimStroke: enumName(l.swimStroke),
    avgSpeed: round(l.avgSpeed, 3),
    cadence: l.avgSwimmingCadence ?? null,
  }));
}

export function parseActivityFile(download: Buffer): ActivityStreams {
  const decoder = new Decoder(Stream.fromBuffer(unzipFirstFit(download)));
  if (!decoder.isFIT()) throw new Error('Activity file is not a FIT file');
  const { messages, errors } = decoder.read();
  if (errors.length && !messages.recordMesgs && !messages.lapMesgs) throw errors[0];

  const records = buildRecords(messages.recordMesgs ?? []);
  const has = (key: keyof StreamRecord) => records.some((r) => r[key] != null);
  return {
    channels: (['hr', 'speed', 'power', 'cadence', 'alt', 'lat'] as const).filter(has),
    records,
    laps: buildLaps(messages.lapMesgs ?? []),
    lengths: buildLengths(messages.lengthMesgs ?? []),
  };
}
