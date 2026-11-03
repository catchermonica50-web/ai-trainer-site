'use client';

import { useEffect, useState } from 'react';

export type IntroMode = 'pending' | 'scrub' | 'mobile' | 'still';
export type IntroQuality = '1080' | '720';

const MOBILE_QUERY = '(max-width: 1023px), (hover: none), (pointer: coarse)';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function pick(): { mode: IntroMode; quality: IntroQuality } {
  if (window.matchMedia(REDUCED_QUERY).matches) return { mode: 'still', quality: '720' };
  if (window.matchMedia(MOBILE_QUERY).matches) return { mode: 'mobile', quality: '720' };
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (memory !== undefined && memory < 2) return { mode: 'still', quality: '720' };
  if (memory !== undefined && memory < 4) return { mode: 'scrub', quality: '720' };
  return { mode: 'scrub', quality: '1080' };
}

/** Decides once on mount how the intro runs; `downgrade` steps 1080 → 720 → still. */
export function useIntroMode() {
  const [state, setState] = useState<{ mode: IntroMode; quality: IntroQuality }>({
    mode: 'pending',
    quality: '1080',
  });

  useEffect(() => {
    setState(pick());
  }, []);

  const downgrade = () =>
    setState((s) =>
      s.mode === 'scrub' && s.quality === '1080'
        ? { mode: 'scrub', quality: '720' }
        : { mode: 'still', quality: '720' },
    );

  return { ...state, downgrade };
}
