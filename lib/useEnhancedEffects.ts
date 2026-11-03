'use client';

import { useSyncExternalStore } from 'react';
import { ENHANCED_EFFECTS_QUERY } from './motion';

function subscribe(callback: () => void) {
  const media = window.matchMedia(ENHANCED_EFFECTS_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

/** The single gate for 3D, magnetic hover and the custom cursor (spec §4/§7). */
export function useEnhancedEffects() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(ENHANCED_EFFECTS_QUERY).matches,
    () => false,
  );
}
