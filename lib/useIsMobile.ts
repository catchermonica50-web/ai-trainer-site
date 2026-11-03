'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 1023px), (hover: none), (pointer: coarse)';
function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}
