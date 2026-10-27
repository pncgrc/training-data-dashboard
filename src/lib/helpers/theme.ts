// Reads theme tokens from CSS so charts and maps follow the active theme.
// Browser-only: call these from effects or event handlers.

import type { Sport } from './sports';

export function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export const sportColor = (sport: Sport) => cssVar(`--${sport}`);
