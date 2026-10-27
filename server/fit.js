// Turns Garmin's activity download (a zip holding the original .fit file) into
// compact time series, laps and swim lengths for the detail page.

import { inflateRawSync } from 'node:zlib';
import { Decoder, Stream } from '@garmin/fitsdk';

const MAX_POINTS = 1500;
const SEMICIRCLE_TO_DEG = 180 / 2 ** 31;

// Garmin's zip holds a single .fit entry. Read it via the central directory,
// because local headers may defer sizes to a trailing data descriptor.
function unzipFirstFit(buf) {
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

const round = (v, digits = 0) => (v == null || Number.isNaN(v) ? null : Number(v.toFixed(digits)));
const speedOf = (m) => m.enhancedSpeed ?? m.speed ?? null;
const avgSpeedOf = (m) => m.enhancedAvgSpeed ?? m.avgSpeed ?? null;

function buildRecords(records) {
  if (!records.length) return [];
  const t0 = records[0].timestamp.getTime();
  const step = Math.max(1, Math.ceil(records.length / MAX_POINTS));
  const out = [];
  for (let i = 0; i < records.length; i += step) {
    const r = records[i];
    out.push({
      t: Math.round((r.timestamp.getTime() - t0) / 1000),
      dist: round(r.distance, 1),
      hr: r.heartRate || null, // 0 means no HR sensor
      speed: round(speedOf(r), 3),
      power: r.power ?? null,
      cadence: r.cadence != null ? r.cadence + (r.fractionalCadence ?? 0) : null,
      alt: round(r.enhancedAltitude ?? r.altitude, 1),
      lat: r.positionLat != null ? round(r.positionLat * SEMICIRCLE_TO_DEG, 6) : null,
      lon: r.positionLong != null ? round(r.positionLong * SEMICIRCLE_TO_DEG, 6) : null,
    });
  }
  return out;
}

function buildLaps(laps) {
  return laps.map((l) => ({
    start: l.startTime,
    elapsed: round(l.totalElapsedTime, 1),
    timer: round(l.totalTimerTime, 1),
    distance: round(l.totalDistance, 1),
    avgSpeed: round(avgSpeedOf(l), 3),
    maxSpeed: round(l.enhancedMaxSpeed ?? l.maxSpeed, 3),
    avgHr: l.avgHeartRate || null,
    maxHr: l.maxHeartRate || null,
    avgPower: l.avgPower ?? null,
    normPower: l.normalizedPower ?? null,
    maxPower: l.maxPower ?? null,
    avgCadence: l.avgCadence ?? l.avgRunningCadence ?? null,
    ascent: l.totalAscent ?? null,
    strokes: l.totalStrokes ?? null,
    swimStroke: l.swimStroke ?? null,
    activeLengths: l.numActiveLengths ?? null,
    intensity: l.intensity ?? null,
  }));
}

function buildLengths(lengths) {
  return lengths.map((l) => ({
    type: l.lengthType, // 'active' or 'idle' (rest)
    timer: round(l.totalTimerTime, 1),
    strokes: l.totalStrokes ?? null,
    swimStroke: l.swimStroke ?? null,
    avgSpeed: round(l.avgSpeed, 3),
    cadence: l.avgSwimmingCadence ?? null,
  }));
}

export function parseActivityFile(download) {
  const decoder = new Decoder(Stream.fromBuffer(unzipFirstFit(download)));
  if (!decoder.isFIT()) throw new Error('Activity file is not a FIT file');
  const { messages, errors } = decoder.read();
  if (errors.length && !messages.recordMesgs && !messages.lapMesgs) throw errors[0];

  const records = buildRecords(messages.recordMesgs ?? []);
  const has = (key) => records.some((r) => r[key] != null);
  return {
    channels: ['hr', 'speed', 'power', 'cadence', 'alt', 'lat'].filter(has),
    records,
    laps: buildLaps(messages.lapMesgs ?? []),
    lengths: buildLengths(messages.lengthMesgs ?? []),
  };
}
