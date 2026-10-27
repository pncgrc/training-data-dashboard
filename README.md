# Training Data Dashboard

A personal triathlon dashboard for Garmin Connect data, using the official
[Garmin Connect Personal API](https://developer.garmin.com/gc-developer-program/personal/personal-api/).
Built with Next.js, React and TypeScript.

> **Note:** This is a vibecoded app, built largely with AI assistance, and intended for personal use only.
> It isn't maintained as a general-purpose product; use it as inspiration or a starting point at your own risk.

- **Overview:** swim / bike / run totals, weekly volume by sport, and a sortable,
  filterable activity list showing your own activity titles.
- **Activity detail** (click any activity):
  - sport-specific metrics: swim SWOLF and strokes; bike NP, VI and work; run dynamics and fastest splits
  - time in HR and power zones, and a peak-power curve
  - synced HR / pace / power / cadence / elevation charts, plotted by time or by distance
  - laps, pool lengths, and a route map
- **Password login**, so the dashboard can be deployed without exposing your data.

## Setup

Requires Node 22+.

1. In Garmin Connect Web, open the **Personal API Key** page and create a key.
   It is shown only once, so save it straight away.
2. Copy `.env.example` to `.env` and set `GARMIN_API_KEY`, `DASHBOARD_PASSWORD` and `AUTH_SECRET`.
3. Install dependencies and check that the key works:
   ```sh
   npm install
   npm run check
   ```
4. Start the dashboard and open http://localhost:3000:
   ```sh
   npm run dev
   ```

Other scripts: `npm run build` / `npm start` (production build), `npm run lint`, `npm run typecheck`.

## Deploying to Vercel

1. Push the repository to GitHub and import it in Vercel. The framework is detected automatically.
2. Under **Project Settings → Environment Variables**, add `GARMIN_API_KEY`, `GARMIN_API_BASE`,
   `CACHE_TTL_MINUTES`, `DASHBOARD_PASSWORD` and `AUTH_SECRET` for Production and Preview.
3. Deploy. Every page and API route requires the login; use a strong password, since the URL is public.

## Project structure

```
src/
  app/                 routes: overview (/), /activity?id=, /login, /api/[...route]
  components/
    ui/                reusable building blocks (Card, DataTable, SegmentedControl, StatTile, ZoneBars, …)
    overview/          overview page sections
    activity/          activity detail sections
  hooks/               useApi/useAsync, useChart, useColorScheme
  lib/
    helpers/           pure functions: formatting, sports, dates, volume, streams, chart scales
    server/            server-only: Garmin client, FIT parsing, cache, API routes, auth
  types/               Garmin response and stream types
  proxy.ts             redirects to /login without a valid session
```

Each component keeps its styles in a CSS Module beside it (`Name.module.css`).
Theme colors and dark mode are CSS variables in `src/app/globals.css`.

## How it works

- `lib/server/garmin.ts` exchanges the API key for a 24-hour access token and calls the API.
  There are no refresh tokens, so it requests a new token with the key when the old one expires.
- `lib/server/fit.ts` unzips each activity's original `.fit` file (from the download endpoint) and decodes it with
  Garmin's [`@garmin/fitsdk`](https://www.npmjs.com/package/@garmin/fitsdk). It turns the file into
  downsampled time series, laps and pool lengths.
- `lib/server/cache.ts` caches responses in Next's data cache (`.next/cache` locally, Vercel's Data Cache
  when deployed). Activity lists stay fresh for 60 minutes (set by `CACHE_TTL_MINUTES`). Activity details
  and files are kept for a year, since they don't change. Add `?refresh` to an `/api/...` URL to refetch.
- `lib/server/auth.ts` checks the password and signs the session cookie with `AUTH_SECRET`.
  `proxy.ts` and the API route both verify it.
- Chart.js draws the charts; Leaflet draws the map with OpenStreetMap tiles.
- `docs/garmin-personal-api.openapi.json` is the full API spec, taken from Garmin's Swagger docs page.

## API routes

All routes require a logged-in session.

| Route | Source |
| --- | --- |
| `/api/activities?start=&end=` | `/activitylist-service/activities/search/activities`, all pages in the range (default: last 12 weeks) |
| `/api/activity?id=` | `/activity-service/activity/{id}`, plus that activity's list entry as `listEntry` (zone times, power curve) |
| `/api/activity-streams?id=` | `/download-service/files/activity/{id}`, decoded to `{ channels, records, laps, lengths }` |
| `/api/profile` | `/userprofile-service/userprofile/settings` |
| `/api/heart-rate-zones` | `/biometric-service/heartRateZones/v2` |
| `/api/daily-summaries?start=&end=` | `/usersummary-service/v2/dailysummaries` |
| `/api/sleep?start=&end=` | `/sleep-service/sleep/dailySleepSummariesByDate` |
| `/api/hrv?start=&end=` | `/hrv-service/hrv/daily/{from}/{to}` |
| `/api/body-battery?start=&end=` | `/wellness-service/wellness/bodyBattery/reports/daily` |
| `/api/stress?start=&end=` | `/usersummary-service/stats/stress/daily/{start}/{end}` |
| `/api/steps?start=&end=` | `/usersummary-service/stats/steps/daily/{start}/{end}` |

Dates are `YYYY-MM-DD`.

## Data notes

- The sport split groups Garmin activity types: anything with "swim" → swim; cycling, road, virtual, indoor,
  gravel and MTB rides → bike; anything with "running" → run; everything else → other.
- Running cadence in FIT records is per leg, so the charts double it to steps per minute.
- Pace charts hide stops and GPS glitches (swim: outside 0:45–5:00 /100m; run: outside 2:00–15:00 /km).
- Virtual rides (e.g. Zwift) don't get a route map, because their GPS points are in a virtual world.

## Notes

- Personal use only, per Garmin's terms.
- API keys expire after 30, 90, or 180 days or 1 year, depending on what you choose.
  When yours expires, create a new key and update `.env` (and the Vercel environment variable).
