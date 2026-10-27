// Overview: swim/bike/run totals, weekly volume and the activity list.

import { api, el, onThemeChange } from './api.js';
import { SPORTS, SPORT_LABEL, sportOf, typeLabel, sportColor, cssVar } from './sports.js';
import { fmtDuration, fmtHours, fmtDistance, fmtPace, fmtNum, fmtDate, fmtLabel } from './format.js';

const state = {
  weeks: Number(readPref('weeks')) || 12,
  metric: 'hours',
  sport: 'all',
  sort: { key: 'date', dir: -1 },
  activities: [],
};

let volumeChart = null;
const statusEl = document.getElementById('status');
const contentEl = document.getElementById('content');

function readPref(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writePref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Monday of the week containing d.
function weekStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function rangeWeeks(n) {
  const last = weekStart(new Date());
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(last);
    d.setDate(d.getDate() - (n - 1 - i) * 7);
    return d;
  });
}

const movingTime = (a) => a.movingDuration ?? a.duration ?? 0;
const powerOf = (a) => a.normPower ?? a.avgPower ?? null;

// Multisport parents duplicate their legs, so totals count only the legs.
const countsTowardTotals = (a) => !a.isParent && a.activityType?.typeKey !== 'multi_sport';

function setPressed(groupId, attr, value) {
  for (const b of document.querySelectorAll(`#${groupId} button`)) {
    b.setAttribute('aria-pressed', String(b.dataset[attr] === String(value)));
  }
}

// ---- Sport tiles ----

function renderTiles() {
  const acts = state.activities.filter(countsTowardTotals);
  const totals = {};
  for (const s of SPORTS) totals[s] = { n: 0, dist: 0, time: 0 };
  for (const a of acts) {
    const t = totals[a.sport];
    t.n++;
    t.dist += a.distance || 0;
    t.time += movingTime(a);
  }

  const tile = (sport, t) => {
    const stats = el('dl', { className: 'tile-stats' });
    const row = (k, v) => stats.append(el('dt', {}, k), el('dd', {}, v));
    row('Sessions', String(t.n));
    row('Distance', fmtDistance(t.dist, sport));
    row('Per week', fmtHours(t.time / state.weeks));
    row(sport === 'bike' ? 'Avg speed' : 'Avg pace', t.time ? fmtPace(t.dist / t.time, sport) : '—');
    return el('section', { className: `card sport-${sport}` },
      el('div', { className: 'tile-label' }, el('span', { className: 'dot' }), SPORT_LABEL[sport]),
      el('div', { className: 'tile-value' }, fmtHours(t.time)),
      stats);
  };

  const all = Object.values(totals).reduce((s, t) => ({ n: s.n + t.n, time: s.time + t.time }), { n: 0, time: 0 });
  const totalStats = el('dl', { className: 'tile-stats' });
  const totalRow = (k, v) => totalStats.append(el('dt', {}, k), el('dd', {}, v));
  totalRow('Sessions', String(all.n));
  totalRow('Per week', fmtHours(all.time / state.weeks));
  totalRow('Other sports', fmtHours(totals.other.time));
  totalRow('Weeks', String(state.weeks));

  document.getElementById('tiles').replaceChildren(
    tile('swim', totals.swim), tile('bike', totals.bike), tile('run', totals.run),
    el('section', { className: 'card' },
      el('div', { className: 'tile-label' }, 'Total'),
      el('div', { className: 'tile-value' }, fmtHours(all.time)),
      totalStats),
  );
}

// ---- Weekly volume chart ----

function weeklyData() {
  const weeks = rangeWeeks(state.weeks);
  const keys = weeks.map(isoDate);
  const index = Object.fromEntries(keys.map((k, i) => [k, i]));
  const series = Object.fromEntries(SPORTS.map((s) => [s, keys.map(() => 0)]));

  for (const a of state.activities.filter(countsTowardTotals)) {
    const i = index[isoDate(weekStart(new Date(a.startTimeLocal.replace(' ', 'T'))))];
    if (i === undefined) continue;
    if (state.metric === 'hours') series[a.sport][i] += movingTime(a) / 3600;
    else if (a.sport === state.metric) series[a.sport][i] += (a.distance || 0) / (a.sport === 'swim' ? 1 : 1000);
  }

  const labels = weeks.map((d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }));
  const sports = state.metric === 'hours' ? SPORTS.filter((s) => series[s].some((v) => v > 0)) : [state.metric];
  return { labels, sports, series };
}

function metricUnit() {
  return state.metric === 'hours' ? 'h' : state.metric === 'swim' ? 'm' : 'km';
}

function fmtMetric(v) {
  if (state.metric === 'hours') return fmtHours(v * 3600);
  return state.metric === 'swim' ? `${Math.round(v).toLocaleString()} m` : `${v.toFixed(1)} km`;
}

function renderVolume() {
  const { labels, sports, series } = weeklyData();
  const surface = cssVar('--surface');
  const muted = cssVar('--muted');

  document.getElementById('volume-title').textContent =
    state.metric === 'hours' ? 'Weekly volume (hours)' : `Weekly ${SPORT_LABEL[state.metric].toLowerCase()} distance (${metricUnit()})`;

  // Legend for 2+ series; a single series is named by the title.
  document.getElementById('volume-legend').replaceChildren(
    ...(sports.length > 1 ? sports.map((s) => el('span', { className: `sport-${s}` }, el('span', { className: 'dot' }), SPORT_LABEL[s])) : []),
  );

  // Round only the top end of each stack.
  const topRadius = (ctx) => {
    const { dataIndex, datasetIndex, chart } = ctx;
    const above = chart.data.datasets.slice(datasetIndex + 1).some((d) => d.data[dataIndex] > 0);
    return above ? 0 : { topLeft: 4, topRight: 4 };
  };

  const datasets = sports.map((s) => ({
    label: SPORT_LABEL[s],
    data: series[s],
    backgroundColor: sportColor(s),
    borderColor: surface,
    borderWidth: { top: 2 }, // surface gap between stacked segments
    borderSkipped: 'bottom',
    borderRadius: topRadius,
    maxBarThickness: 24,
  }));

  volumeChart?.destroy();
  volumeChart = new Chart(document.getElementById('volume-chart'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { stacked: true, grid: { display: false }, border: { color: cssVar('--axis') }, ticks: { color: muted, maxRotation: 0, autoSkipPadding: 12 } },
        y: {
          stacked: true,
          beginAtZero: true,
          grid: { color: cssVar('--grid') },
          border: { display: false },
          ticks: { color: muted, maxTicksLimit: 6, callback: (v) => `${v}${metricUnit() === 'h' ? 'h' : ''}` },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: (item) => item.raw > 0,
          callbacks: {
            title: (items) => `Week of ${items[0].label}`,
            label: (item) => ` ${item.dataset.label}: ${fmtMetric(item.raw)}`,
            footer: (items) => (items.length > 1 ? `Total: ${fmtMetric(items.reduce((s, i) => s + i.raw, 0))}` : ''),
          },
        },
      },
    },
  });

  // Table view twin of the chart.
  const head = el('tr', {}, el('th', {}, 'Week'), ...sports.map((s) => el('th', { className: 'num' }, SPORT_LABEL[s])));
  const rows = labels.map((label, i) => el('tr', {}, el('td', {}, label), ...sports.map((s) => el('td', { className: 'num' }, fmtMetric(series[s][i])))));
  document.getElementById('volume-table').replaceChildren(el('thead', {}, head), el('tbody', {}, ...rows.reverse()));
}

// ---- Activity table ----

const sortValue = {
  date: (a) => a.startTimeLocal,
  title: (a) => (a.activityName || '').toLowerCase(),
  type: (a) => a.activityType?.typeKey || '',
  distance: (a) => a.distance || 0,
  time: movingTime,
  speed: (a) => a.averageSpeed || 0,
  hr: (a) => a.averageHR || 0,
  power: (a) => powerOf(a) || 0,
  effect: (a) => a.trainingEffectLabel || '',
};

function renderTable() {
  const { key, dir } = state.sort;
  const rows = state.activities
    .filter((a) => state.sport === 'all' || a.sport === state.sport)
    .sort((a, b) => {
      const va = sortValue[key](a), vb = sortValue[key](b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });

  for (const th of document.querySelectorAll('#activities th[data-sort]')) {
    th.setAttribute('aria-sort', th.dataset.sort === key ? (dir > 0 ? 'ascending' : 'descending') : 'none');
  }

  const tbody = document.querySelector('#activities tbody');
  if (!rows.length) {
    tbody.replaceChildren(el('tr', {}, el('td', { colSpan: 9, className: 'empty' }, 'No activities in this range.')));
    return;
  }

  tbody.replaceChildren(...rows.map((a) => {
    const href = `/activity.html?id=${a.activityId}`;
    const tr = el('tr', { className: `clickable sport-${a.sport}` },
      el('td', {}, fmtDate(a.startTimeLocal)),
      el('td', { className: 'title' },
        el('span', { className: 'title-cell' },
          el('span', { className: 'dot', title: SPORT_LABEL[a.sport] }),
          el('a', { href }, a.activityName || 'Untitled'))),
      el('td', {}, a.activityType?.typeKey === 'multi_sport' ? 'Multisport' : typeLabel(a.activityType?.typeKey)),
      el('td', { className: 'num' }, fmtDistance(a.distance, a.sport)),
      el('td', { className: 'num' }, fmtDuration(movingTime(a))),
      el('td', { className: 'num' }, a.sport === 'other' ? '—' : fmtPace(a.averageSpeed, a.sport)),
      el('td', { className: 'num' }, fmtNum(a.averageHR || null, 0, ' bpm')),
      el('td', { className: 'num' }, fmtNum(powerOf(a), 0, ' W')),
      el('td', {}, a.trainingEffectLabel ? fmtLabel(a.trainingEffectLabel) : '—'),
    );
    tr.addEventListener('click', (e) => { if (!e.target.closest('a')) location.href = href; });
    return tr;
  }));
}

// ---- Loading ----

async function load() {
  setPressed('range', 'weeks', state.weeks);
  contentEl.style.opacity = state.activities.length ? '0.5' : '1';
  statusEl.className = 'status';
  statusEl.textContent = 'Loading…';

  const start = isoDate(rangeWeeks(state.weeks)[0]);
  const end = isoDate(new Date());
  try {
    const list = await api(`/api/activities?start=${start}&end=${end}`);
    state.activities = list.map((a) => ({ ...a, sport: sportOf(a.activityType?.typeKey) }));
    statusEl.textContent = `${state.activities.length} activities since ${fmtDate(start)}`;
    renderAll();
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = 'status error';
  } finally {
    contentEl.style.opacity = '1';
  }
}

function renderAll() {
  renderTiles();
  renderVolume();
  renderTable();
}

document.getElementById('range').addEventListener('click', (e) => {
  const weeks = Number(e.target.closest('button')?.dataset.weeks);
  if (!weeks || weeks === state.weeks) return;
  state.weeks = weeks;
  writePref('weeks', weeks);
  load();
});

document.getElementById('volume-metric').addEventListener('click', (e) => {
  const metric = e.target.closest('button')?.dataset.metric;
  if (!metric) return;
  state.metric = metric;
  setPressed('volume-metric', 'metric', metric);
  renderVolume();
});

document.getElementById('sport-filter').addEventListener('click', (e) => {
  const sport = e.target.closest('button')?.dataset.sport;
  if (!sport) return;
  state.sport = sport;
  setPressed('sport-filter', 'sport', sport);
  renderTable();
});

document.querySelector('#activities thead').addEventListener('click', (e) => {
  const key = e.target.closest('th')?.dataset.sort;
  if (!key) return;
  // A new column starts A→Z for text and highest-first for dates and numbers.
  const textColumn = ['title', 'type', 'effect'].includes(key);
  state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : textColumn ? 1 : -1 };
  renderTable();
});

onThemeChange(() => state.activities.length && renderVolume());

setPressed('volume-metric', 'metric', state.metric);
setPressed('sport-filter', 'sport', state.sport);
load();
