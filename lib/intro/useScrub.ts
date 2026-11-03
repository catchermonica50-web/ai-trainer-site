'use client';

import { useEffect, type RefObject } from 'react';
import { MOTION } from '@/lib/motion';
import { INTRO_MEDIA } from './assets';
import { FrameStore } from './FrameStore';
import { markIntroSeen } from './session';

type Options = {
  enabled: boolean;
  quality: '1080' | '720';
  stage: RefObject<HTMLDivElement | null>;
  canvas: RefObject<HTMLCanvasElement | null>;
  onActivate: () => void;
  onDowngrade: () => void;
};

const LAST = MOTION.intro.frameCount - 1;
const DROP_WINDOW = 90;

/** Pins the stage and maps scroll progress to frames 0–121 drawn on canvas. */
export function useScrub({
  enabled,
  quality,
  stage,
  canvas,
  onActivate,
  onDowngrade,
}: Options) {
  useEffect(() => {
    const el = stage.current;
    const cv = canvas.current;
    if (!enabled || !el || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return onDowngrade();
    const set = quality === '1080' ? INTRO_MEDIA.seq1080 : INTRO_MEDIA.seq720;
    cv.width = set.width;
    cv.height = set.height;

    let disposed = false;
    let frame = 0;
    let drawn = -1;
    let activated = false;
    let cleanup = () => {};
    const section = el.closest('section');

    const draw = () => {
      const bmp = store.get(frame);
      if (!bmp) return;
      ctx.drawImage(bmp, 0, 0, set.width, set.height);
      drawn = frame;
      if (section) {
        section.dataset.frame = String(frame);
        section.dataset.decoded = String(store.stats.decoded);
        section.dataset.decodedPeakMib = (store.stats.peakBytes / 1048576).toFixed(1);
      }
    };
    const tryActivate = (progress: number) => {
      if (activated || progress <= 0 || !store.has(0)) return;
      activated = true;
      onActivate();
    };
    const store = new FrameStore(set, MOTION.intro.frameCount, 10, onDowngrade, (i) => {
      if (i === frame || drawn !== frame) draw();
    });
    void store.download();

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const state = { frame: 0 };
      const deltas: number[] = [];
      const tween = gsap.to(state, {
        frame: LAST,
        ease: 'none',
        snap: { frame: 1 },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: `+=${MOTION.intro.scrollScreens * 100}%`,
          pin: true,
          scrub: MOTION.scrub,
          onUpdate: (st) => tryActivate(st.progress),
          onLeave: () => markIntroSeen(),
        },
        onUpdate: () => {
          frame = Math.round(state.frame);
          store.setCurrent(frame);
          draw();
          tryActivate(tween.scrollTrigger?.progress ?? 0);
        },
      });
      // Sustained frame drops while scrubbing → step down quality.
      const watch = (_t: number, delta: number) => {
        if (!tween.scrollTrigger?.isActive || tween.scrollTrigger.getVelocity() === 0)
          return;
        deltas.push(delta);
        if (deltas.length < DROP_WINDOW) return;
        const slow = deltas.filter((d) => d > 34).length;
        deltas.length = 0;
        if (slow > DROP_WINDOW / 2) onDowngrade();
      };
      gsap.ticker.add(watch);
      if (section) section.dataset.scrubReady = '1';
      cleanup = () => {
        gsap.ticker.remove(watch);
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
      store.dispose();
    };
    // Callbacks come from the parent; re-run only on mode/quality changes.
  }, [enabled, quality]);
}
