'use client';

import { useSyncExternalStore } from 'react';

const query = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void) {
  const media = matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

// The OS color scheme. Charts list it as a dependency so they redraw with new colors.
export function useColorScheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    subscribe,
    () => (matchMedia(query).matches ? 'dark' : 'light'),
    () => 'light',
  );
}
