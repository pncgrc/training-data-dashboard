// Activity detail: sport-specific metrics, zones, peak power, time series, laps and route.

import { api, el, onThemeChange } from './api.js';
import { SPORT_LABEL, sportOf, typeLabel, hasRealRoute, sportColor, cssVar } from './sports.js';
import { fmtDuration, fmtDistance, fmtPace, paceValue, paceUnit, fmtNum, fmtDateTime, fmtLabel } from './format.js';

const id = new URLSearchParams(location.search).get('id');
const statusEl = document.getElementById('status');
const show = (elId) => { document.getElementById(elId).hidden = false; };

let activity, streams, sport, typeKey;
let xAxis = 'time';
let streamCharts = [];
let peakChart = null;

// ---- Metrics ----

function metric(label, value, unit) {
  if (value == null || value === '—') return null;
  return el('div', {},
    el('div', { className: 'metric-label' }, label),
    el('div', { className: 'metric-value' }, String(value), unit ? el('small', {}, unit) : null));
}

// Returns a number, or null when the value is missing or zero.
const n = (v) => (v == null || v === 0 || Number.isNaN(v) ? null : v);
const r0 = (v) => (n(v) == null ? null : Math.round(v));

function renderMetrics() {
  const s = activity.summaryDTO;
  const l = activity.listEntry || {};
  const moving = s.movingDuration ?? s.duration;
  const paceText = (speed) => (n(speed) ? fmtPace(speed, sport, { unit: false }) : null);

  const common = [
    metric('Distance', n(s.distance) && fmtDistance(s.distance, sport)),
    metric('Moving time', fmtDuration(moving)),
    metric('Elapsed time', fmtDuration(s.elapsedDuration ?? s.duration)),
  ];
  const hr = [
    metric('Avg HR', r0(s.averageHR), 'bpm'),
    metric('Max HR', r0(s.maxHR), 'bpm'),
  ];
  const tail = [
    metric('Calories', r0(s.calories), 'kcal'),
    metric('Training effect', l.trainingEffectLabel ? fmtLabel(l.trainingEffectLabel) : null),
  ];

  let specific = [];
  if (sport === 'swim') {
    const pool = n(s.poolLength) ? s.poolLength * ((s.unitOfPoolLength?.factor ?? 100) / 100) : null;
    specific = [
      metric('Avg pace', paceText(s.averageSpeed), paceUnit('swim')),
      metric('Pool length', pool && Math.round(pool), 'm'),
      metric('Active lengths', n(s.numberOfActiveLengths)),
      metric('Total strokes', n(s.totalNumberOfStrokes)),
      metric('Strokes / length', n(s.averageStrokes) && s.averageStrokes.toFixed(1)),
      metric('Avg SWOLF', r0(s.averageSWOLF)),
      metric('Stroke distance', n(s.averageStrokeDistance) && s.averageStrokeDistance.toFixed(2), 'm'),
      metric('Stroke rate', r0(s.averageSwimCadence), 'spm'),
    ];
  } else if (sport === 'bike') {
    const np = n(s.normalizedPower) ?? n(l.normPower);
    const avgP = n(s.averagePower) ?? n(l.avgPower);
    specific = [
      metric('Avg speed', paceText(s.averageMovingSpeed ?? s.averageSpeed), 'km/h'),
      metric('Max speed', paceText(s.maxSpeed), 'km/h'),
      metric('Avg power', r0(avgP), 'W'),
      metric('Normalized power', r0(np), 'W'),
      metric('Variability index', np && avgP ? (np / avgP).toFixed(2) : null),
      metric('Max power', r0(s.maxPower), 'W'),
      metric('Max 20 min power', r0(l.max20MinPower ?? s.maxPowerTwentyMinutes), 'W'),
      metric('Work', avgP ? Math.round((avgP * moving) / 1000) : null, 'kJ'),
      metric('Avg cadence', r0(s.averageBikeCadence), 'rpm'),
      metric('Elevation gain', r0(s.elevationGain), 'm'),
    ];
  } else if (sport === 'run') {
    specific = [
      metric('Avg pace', paceText(s.averageMovingSpeed ?? s.averageSpeed), paceUnit('run')),
      metric('Best pace', paceText(s.maxSpeed), paceUnit('run')),
      metric('Fastest 1 km', n(l.fastestSplit_1000) && fmtDuration(l.fastestSplit_1000)),
      metric('Fastest mile', n(l.fastestSplit_1609) && fmtDuration(l.fastestSplit_1609)),
      metric('Avg cadence', r0(s.averageRunCadence), 'spm'),
      metric('Stride length', n(s.strideLength) && (s.strideLength / 100).toFixed(2), 'm'),
      metric('Ground contact', r0(s.groundContactTime), 'ms'),
      metric('Vertical oscillation', n(s.verticalOscillation) && s.verticalOscillation.toFixed(1), 'cm'),
      metric('Vertical ratio', n(s.verticalRatio) && s.verticalRatio.toFixed(1), '%'),
      metric('Avg power', r0(s.averagePower), 'W'),
      metric('Elevation gain', r0(s.elevationGain), 'm'),
    ];
  } else {
    specific = [metric('Avg speed', paceText(s.averageSpeed), 'km/h')];
  }

  document.getElementById('metrics').replaceChildren(...[...common, ...specific, ...hr, ...tail].filter(Boolean));
}

// ---- Zones ----

function renderZoneBars(containerId, times, labels) {
  const total = times.reduce((a, b) => a + b, 0);
  const max = Math.max(...times);
  const nodes = times.flatMap((t, i) => [
    el('div', { className: 'zone-name' }, `Z${i + 1}`, labels?.[i] ? el('small', {}, labels[i]) : null),
    el('div', { className: 'zone-track' }, Object.assign(el('div', { className: 'zone-bar' }), { style: `width: ${max ? (t / max) * 100 : 0}%` })),
    el('div', { className: 'zone-val' }, `${fmtDuration(t)} · ${total ? Math.round((t / total) * 100) : 0}%`),
  ]);
  document.getElementById(containerId).replaceChildren(...nodes);
}

function zoneTimes(prefix) {
  const l = activity.listEntry || {};
  const times = [];
  for (let i = 1; l[`${prefix}${i}`] !== undefined; i++) times.push(l[`${prefix}${i}`] || 0);
  return times.some((t) => t > 0) ? times : null;
}

async function renderZones() {
  const hrTimes = zoneTimes('hrTimeInZone_');
  if (hrTimes) {
    let labels = null;
    try {
      const zones = await api('/api/heart-rate-zones');
      const z = zones.find((x) => x.sport === 'DEFAULT') ?? zones[0];
      const floors = [1, 2, 3, 4, 5].map((i) => z[`zone${i}Floor`]);
      labels = floors.map((f, i) => (i < 4 ? `${f}–${floors[i + 1] - 1} bpm` : `${f}+ bpm`));
    } catch { /* zone boundaries are optional */ }
    renderZoneBars('hr-zones', hrTimes, labels);
    show('hr-zones-card');
  }
  const powerTimes = zoneTimes('powerTimeInZone_');
  if (powerTimes) {
    renderZoneBars('power-zones', powerTimes);
    show('power-zones-card');
  }
}

// ---- Peak power ----

const PEAK_DURATIONS = [1, 2, 5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600, 7200, 18000];
const durationLabel = (s) => (s < 60 ? `${s}s` : s < 3600 ? `${s / 60}m` : `${s / 3600}h`);

function renderPeakPower() {
  const l = activity.listEntry || {};
  const points = PEAK_DURATIONS.filter((d) => n(l[`maxAvgPower_${d}`])).map((d) => ({ d, w: Math.round(l[`maxAvgPower_${d}`]) }));
  if (points.length < 3) return;
  show('peak-power-card');

  const color = sportColor(sport);
  peakChart?.destroy();
  peakChart = new Chart(document.getElementById('peak-power-chart'), {
    type: 'line',
    data: {
      labels: points.map((p) => durationLabel(p.d)),
      datasets: [{ data: points.map((p) => p.w), borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, pointHoverBorderColor: cssVar('--surface'), pointHoverBorderWidth: 2, tension: 0.25 }],
    },
    options: {
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      scales: axisStyle({ yBeginAtZero: true }),
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: (i) => `Best ${i[0].label}`, label: (i) => ` ${i.raw} W` } } },
    },
  });

  document.getElementById('peak-power-table').replaceChildren(
    el('thead', {}, el('tr', {}, el('th', {}, 'Duration'), el('th', { className: 'num' }, 'Power'))),
    el('tbody', {}, ...points.map((p) => el('tr', {}, el('td', {}, durationLabel(p.d)), el('td', { className: 'num' }, `${p.w} W`)))),
  );
}

// ---- Time series (small multiples with a shared, synced crosshair) ----

function axisStyle({ yReverse = false, yBeginAtZero = false, xType = 'category', xTicks } = {}) {
  const muted = cssVar('--muted');
  return {
    x: { type: xType, grid: { display: false }, border: { color: cssVar('--axis') }, ticks: { color: muted, maxRotation: 0, autoSkipPadding: 16, ...xTicks } },
    y: { reverse: yReverse, beginAtZero: yBeginAtZero, grid: { color: cssVar('--grid') }, border: { display: false }, ticks: { color: muted, maxTicksLimit: 5 } },
  };
}

function smooth(values, window = 5) {
  const half = Math.floor(window / 2);
  return values.map((v, i) => {
    if (v == null) return null;
    let sum = 0, count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j++) {
      if (values[j] != null) { sum += values[j]; count++; }
    }
    return sum / count;
  });
}

// Pace slower than SLOWEST is standing still; faster than FASTEST is a GPS glitch.
const SLOWEST = { swim: 300, run: 900 };
const FASTEST = { swim: 45, run: 120 };

function streamSeries() {
  const recs = streams.records;
  const pick = (key) => recs.map((r) => r[key]);
  const series = [];
  const hasAny = (vals) => vals.some((v) => v != null && v !== 0);

  const hr = pick('hr');
  if (hasAny(hr)) series.push({ key: 'hr', label: 'Heart rate', unit: 'bpm', values: hr, fmt: (v) => `${Math.round(v)} bpm` });

  const speed = smooth(pick('speed'));
  if (hasAny(speed)) {
    const values = speed.map((v) => {
      const p = paceValue(v, sport === 'other' ? 'bike' : sport);
      if (p == null || !SLOWEST[sport]) return p;
      return p > SLOWEST[sport] || p < FASTEST[sport] ? null : p;
    });
    const isPace = sport === 'swim' || sport === 'run';
    series.push({
      key: 'pace',
      label: isPace ? `Pace (${paceUnit(sport)})` : 'Speed (km/h)',
      values,
      reverse: isPace, // faster is up
      fmt: (v) => (isPace ? `${fmtDuration(v)} ${paceUnit(sport)}` : `${v.toFixed(1)} km/h`),
      tick: isPace ? (v) => fmtDuration(v) : undefined,
    });
  }

  const power = pick('power');
  if (hasAny(power)) series.push({ key: 'power', label: 'Power (W)', values: smooth(power, 3), fmt: (v) => `${Math.round(v)} W` });

  // Running cadence in FIT records is per leg; double it to steps per minute.
  const cadence = pick('cadence').map((v) => (v == null ? null : sport === 'run' ? v * 2 : v));
  const cadUnit = sport === 'run' ? 'spm' : sport === 'swim' ? 'strokes/min' : 'rpm';
  if (hasAny(cadence)) series.push({ key: 'cadence', label: `Cadence (${cadUnit})`, values: cadence, fmt: (v) => `${Math.round(v)} ${cadUnit}` });

  const alt = pick('alt');
  if (hasAny(alt) && sport !== 'swim' && typeKey !== 'virtual_ride') series.push({ key: 'alt', label: 'Elevation (m)', values: alt, area: true, fmt: (v) => `${Math.round(v)} m` });

  return series;
}

// One x value per record, so index i means the same moment in every chart.
// Missing distances are carried forward from the previous record.
function xValues() {
  if (xAxis === 'time') return streams.records.map((r) => r.t);
  let last = 0;
  return streams.records.map((r) => (last = r.dist != null ? r.dist / 1000 : last));
}

const fmtX = (v) => (xAxis === 'distance' ? `${v.toFixed(2)} km` : fmtDuration(v));

// Picks a round tick step so an axis gets at most ~maxTicks ticks.
function niceStep(span, steps, maxTicks = 8) {
  return steps.find((s) => span / s <= maxTicks) ?? steps.at(-1);
}
const TIME_STEPS = [30, 60, 120, 300, 600, 900, 1200, 1800, 3600, 7200];
const PACE_STEPS = [5, 10, 15, 30, 60, 120, 300];
const DIST_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 25, 50];

// Ticks at every multiple of step between min and max.
function roundTicks(min, max, step) {
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push({ value: Number(v.toFixed(6)) });
  return ticks;
}

// Chart.js adds the data min/max as end ticks when they aren't round; drop those.
function dropUnroundEnds(scale) {
  const t = scale.ticks;
  if (t.length < 4) return;
  const step = t[2].value - t[1].value;
  scale.ticks = t.filter((tick) => Math.abs(tick.value / step - Math.round(tick.value / step)) < 1e-6);
}

// Axis bounds from the 2nd–98th percentile, so short stops don't flatten the line.
function robustBounds(values) {
  const sorted = values.filter((v) => v != null).sort((a, b) => a - b);
  if (sorted.length < 10) return {};
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  const pad = (hi - lo) * 0.15 || 1;
  return { min: Math.max(0, lo - pad), max: hi + pad };
}

// Draws the shared crosshair and mirrors hover across all stream charts.
const crosshair = {
  id: 'crosshair',
  afterEvent(chart, args) {
    const e = args.event;
    if (e.type === 'mouseout') return syncHover(null);
    if (e.type !== 'mousemove' || !args.inChartArea) return;
    syncHover(chart.scales.x.getValueForPixel(e.x));
  },
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.()[0];
    if (!active) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.strokeStyle = cssVar('--axis');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(active.element.x, chartArea.top);
    ctx.lineTo(active.element.x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

let syncing = false;
function syncHover(x) {
  if (syncing) return;
  syncing = true;
  const xs = xValues();
  let idx = -1;
  if (x != null) {
    let best = Infinity;
    for (let i = 0; i < xs.length; i++) {
      const d = Math.abs(xs[i] - x);
      if (d < best) { best = d; idx = i; }
    }
  }
  for (const c of streamCharts) {
    const valid = idx >= 0 && c.data.datasets[0].data[idx]?.y != null;
    const active = valid ? [{ datasetIndex: 0, index: idx }] : [];
    c.setActiveElements(active);
    c.tooltip.setActiveElements(active, valid ? { x: c.scales.x.getPixelForValue(xs[idx]), y: c.chartArea.top } : { x: 0, y: 0 });
    c.update('none');
  }
  syncing = false;
}

function renderStreams() {
  for (const c of streamCharts) c.destroy();
  streamCharts = [];
  const series = streamSeries();
  const container = document.getElementById('streams');
  container.replaceChildren();
  if (!series.length) return;
  show('streams-card');

  const hasDistance = streams.records.some((r) => r.dist != null);
  document.getElementById('x-axis').hidden = !hasDistance;
  if (!hasDistance) xAxis = 'time';
  for (const b of document.querySelectorAll('#x-axis button')) b.setAttribute('aria-pressed', String(b.dataset.axis === xAxis));

  const xs = xValues();
  const color = sportColor(sport);
  const surface = cssVar('--surface');

  series.forEach((s, i) => {
    const canvas = el('canvas', { ariaLabel: s.label });
    const box = el('div', { className: 'chart-box small' }, canvas);
    container.append(el('div', { className: 'metric-label', style: i ? 'margin-top: 12px' : '' }, s.label), box);

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        datasets: [{
          data: s.values.map((y, j) => ({ x: xs[j], y })),
          borderColor: color,
          backgroundColor: s.area ? `color-mix(in srgb, ${color} 10%, transparent)` : color,
          fill: s.area ? 'origin' : false,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: surface,
          pointHoverBorderWidth: 2,
          spanGaps: false,
          tension: 0,
        }],
      },
      options: {
        maintainAspectRatio: false,
        animation: false,
        parsing: false,
        normalized: true,
        events: ['mousemove', 'mouseout'],
        interaction: { mode: 'index', intersect: false },
        scales: axisStyle({
          xType: 'linear',
          yReverse: s.reverse,
          xTicks: { callback: (v) => (xAxis === 'distance' ? `${v} km` : fmtDuration(v)) },
        }),
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: { title: (items) => fmtX(items[0].parsed.x), label: (item) => s.fmt(item.parsed.y) },
          },
        },
      },
      plugins: [crosshair],
    });
    const { x, y } = chart.options.scales;
    x.min = xs[0];
    x.max = xs.at(-1);
    const xStep = niceStep(x.max - x.min, xAxis === 'time' ? TIME_STEPS : DIST_STEPS);
    x.afterBuildTicks = (scale) => { scale.ticks = roundTicks(scale.min, scale.max, xStep); };
    y.afterBuildTicks = dropUnroundEnds;
    if (s.key === 'pace') {
      Object.assign(y, robustBounds(s.values));
      if (s.reverse && y.max != null) {
        const step = (y.ticks.stepSize = niceStep(y.max - y.min, PACE_STEPS, 4));
        y.min = Math.floor(y.min / step) * step;
        y.max = Math.ceil(y.max / step) * step;
      }
    }
    // Fixed y-axis width keeps the plots of all small multiples aligned.
    y.afterFit = (scale) => { scale.width = 52; };
    if (s.tick) y.ticks.callback = s.tick;
    chart.update('none');
    streamCharts.push(chart);
  });
}

// ---- Laps and lengths ----

function renderTable(tableId, columns, rows, rowClass) {
  const used = columns.filter((c) => c.always || rows.some((r) => c.value(r) != null));
  document.getElementById(tableId).replaceChildren(
    el('thead', {}, el('tr', {}, ...used.map((c) => el('th', { className: c.num ? 'num' : '' }, c.label)))),
    el('tbody', {}, ...rows.map((r, i) => el('tr', { className: rowClass?.(r) || '' },
      ...used.map((c) => el('td', { className: c.num ? 'num' : '' }, c.fmt ? c.fmt(c.value(r, i), r) : String(c.value(r, i) ?? '—')))))),
  );
}

function renderLaps() {
  const laps = streams.laps;
  if (laps.length < 2 && sport !== 'swim') return;
  if (!laps.length) return;
  show('laps-card');
  document.getElementById('laps-title').textContent = sport === 'swim' ? 'Intervals' : 'Laps';

  const cad = (v) => (v == null ? null : sport === 'run' ? v * 2 : v);
  const columns = [
    { label: '#', always: true, value: (_, i) => i + 1 },
    { label: 'Time', num: true, always: true, value: (l) => l.timer, fmt: fmtDuration },
    { label: 'Distance', num: true, value: (l) => n(l.distance), fmt: (v) => fmtDistance(v, sport) },
    { label: sport === 'bike' ? 'Speed' : 'Pace', num: true, value: (l) => n(l.avgSpeed), fmt: (v) => fmtPace(v, sport) },
    { label: 'Avg HR', num: true, value: (l) => l.avgHr, fmt: (v) => fmtNum(v, 0, ' bpm') },
    { label: 'Max HR', num: true, value: (l) => l.maxHr, fmt: (v) => fmtNum(v, 0, ' bpm') },
    { label: 'Avg power', num: true, value: (l) => n(l.avgPower), fmt: (v) => fmtNum(v, 0, ' W') },
    { label: 'NP', num: true, value: (l) => n(l.normPower), fmt: (v) => fmtNum(v, 0, ' W') },
    { label: 'Max power', num: true, value: (l) => n(l.maxPower), fmt: (v) => fmtNum(v, 0, ' W') },
    { label: 'Cadence', num: true, value: (l) => n(cad(l.avgCadence)), fmt: (v) => fmtNum(v, 0, sport === 'run' ? ' spm' : sport === 'swim' ? ' spm' : ' rpm') },
    { label: 'Ascent', num: true, value: (l) => (sport === 'swim' ? null : n(l.ascent)), fmt: (v) => fmtNum(v, 0, ' m') },
    { label: 'Lengths', num: true, value: (l) => n(l.activeLengths) },
    { label: 'Strokes', num: true, value: (l) => n(l.strokes) },
    { label: 'Stroke', value: (l) => l.swimStroke, fmt: (v) => fmtLabel(v) },
  ];
  // Laps with no distance are rest intervals in pool swims.
  renderTable('laps', columns, laps, (l) => (!n(l.distance) ? 'muted' : ''));
}

function renderLengths() {
  const lengths = streams.lengths;
  if (!lengths.length) return;
  show('lengths-card');
  const s = activity.summaryDTO;
  const pool = (s.poolLength || 25) * ((s.unitOfPoolLength?.factor ?? 100) / 100);
  let active = 0;

  const columns = [
    { label: '#', always: true, value: (l) => (l.type === 'active' ? ++active : '') },
    { label: 'Stroke', always: true, value: (l) => (l.type === 'active' ? fmtLabel(l.swimStroke) : 'Rest') },
    { label: 'Time', num: true, always: true, value: (l) => l.timer, fmt: fmtDuration },
    { label: 'Pace', num: true, value: (l) => (l.type === 'active' && l.timer ? (l.timer * 100) / pool : null), fmt: (v) => (v == null ? '—' : `${fmtDuration(v)} /100m`) },
    { label: 'Strokes', num: true, value: (l) => (l.type === 'active' ? l.strokes : null) },
    { label: 'SWOLF', num: true, value: (l) => (l.type === 'active' && l.strokes != null ? Math.round(l.timer + l.strokes) : null) },
    { label: 'Stroke rate', num: true, value: (l) => (l.type === 'active' ? n(l.cadence) : null), fmt: (v) => fmtNum(v, 0, ' spm') },
  ];
  renderTable('lengths', columns, lengths, (l) => (l.type === 'active' ? '' : 'muted'));
}

// ---- Map ----

function renderMap() {
  if (!hasRealRoute(typeKey)) return;
  const points = streams.records.filter((r) => r.lat != null && r.lon != null).map((r) => [r.lat, r.lon]);
  if (points.length < 2) return;
  show('map-card');
  const map = L.map('map', { scrollWheelZoom: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  const line = L.polyline(points, { color: sportColor(sport), weight: 3 }).addTo(map);
  map.fitBounds(line.getBounds(), { padding: [16, 16] });
}

// ---- Multisport legs ----

async function renderLegs() {
  const childIds = activity.metadataDTO?.childIds;
  if (!childIds?.length) return;
  show('legs-card');
  const legs = await Promise.all(childIds.map((cid) => api(`/api/activity?id=${cid}`).catch(() => null)));
  const rows = legs.filter(Boolean).map((a) => {
    const legSport = sportOf(a.activityTypeDTO?.typeKey);
    const sm = a.summaryDTO;
    return el('tr', { className: `sport-${legSport}` },
      el('td', {}, el('span', { className: 'title-cell' }, el('span', { className: 'dot' }),
        el('a', { href: `/activity.html?id=${a.activityId}` }, typeLabel(a.activityTypeDTO?.typeKey)))),
      el('td', { className: 'num' }, fmtDistance(sm.distance, legSport)),
      el('td', { className: 'num' }, fmtDuration(sm.duration)),
      el('td', { className: 'num' }, legSport === 'other' ? '—' : fmtPace(sm.averageSpeed, legSport)),
      el('td', { className: 'num' }, fmtNum(n(sm.averageHR), 0, ' bpm')));
  });
  document.getElementById('legs').replaceChildren(
    el('thead', {}, el('tr', {}, ...['Leg', 'Distance', 'Time', 'Pace / speed', 'Avg HR'].map((h, i) => el('th', { className: i ? 'num' : '' }, h)))),
    el('tbody', {}, ...rows),
  );
}

// ---- Load ----

async function load() {
  if (!/^\d+$/.test(id || '')) {
    document.getElementById('title').textContent = 'Activity not found';
    return;
  }
  try {
    activity = await api(`/api/activity?id=${id}`);
  } catch (err) {
    document.getElementById('title').textContent = 'Could not load activity';
    statusEl.textContent = err.message;
    statusEl.className = 'status error';
    return;
  }

  typeKey = activity.activityTypeDTO?.typeKey;
  sport = sportOf(typeKey);
  const s = activity.summaryDTO;
  document.title = `${activity.activityName} · Training Dashboard`;
  document.getElementById('title').textContent = activity.activityName || 'Untitled';
  const sub = document.getElementById('subtitle');
  sub.className = `subtitle title-cell sport-${sport}`;
  sub.replaceChildren(
    el('span', { className: 'dot' }),
    [typeKey === 'multi_sport' ? 'Multisport' : `${SPORT_LABEL[sport]} · ${typeLabel(typeKey)}`,
      fmtDateTime(s.startTimeLocal), activity.locationName, activity.metadataDTO?.manufacturer && fmtLabel(activity.metadataDTO.manufacturer)]
      .filter(Boolean).join(' · '),
  );
  const content = document.getElementById('content');
  content.classList.add(`sport-${sport}`); // zone bars and other marks use the sport color
  content.hidden = false;

  renderMetrics();
  renderZones();
  renderPeakPower();
  renderLegs();

  statusEl.textContent = 'Loading activity file…';
  try {
    streams = await api(`/api/activity-streams?id=${id}`);
    statusEl.textContent = '';
    renderStreams();
    renderLaps();
    renderLengths();
    renderMap();
  } catch (err) {
    statusEl.textContent = `Detailed data unavailable: ${err.message}`;
    statusEl.className = 'status error';
  }
}

document.getElementById('x-axis').addEventListener('click', (e) => {
  const axis = e.target.closest('button')?.dataset.axis;
  if (!axis || axis === xAxis) return;
  xAxis = axis;
  renderStreams();
});

onThemeChange(() => {
  if (streams) renderStreams();
  if (activity) renderPeakPower();
});

load();
