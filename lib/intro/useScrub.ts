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
  /** Called once the pin exists, so layout (and #about offset) is final. */
  onReady: () => void;
};

const LAST = MOTION.intro.frameCount - 1;
const DROP_WINDOW = 90;
/** Spec §6: decode the current frame ± 8–12; 8 keeps ≤ 17 + 1 fallback frames (≈ 150 MiB at 1080p). */
const DECODE_RADIUS = 8;

/** Pins the stage and maps scroll progress to frames 0–121 drawn on canvas. */
export function useScrub({
  enabled,
  quality,
  stage,
  canvas,
  onActivate,
  onDowngrade,
  onReady,
}: Options) {
  useEffect(() => {
    const el = stage.current;
    const cv = canvas.current;
    if (!enabled || !el || !cv) return;
    // CPU-backed canvas: each drawImage copies pixels into one canvas buffer, so decoded frames are
    // never uploaded and cached as separate GPU textures (that cache grew the GPU process by ~470 MiB).
    const ctx = cv.getContext('2d', { alpha: false, willReadFrequently: true });
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

    // Draws the target frame, or the nearest decoded one while it is missing.
    const draw = () => {
      const hit = store.get(frame);
      if (!hit) return;
      ctx.drawImage(hit.bmp, 0, 0, set.width, set.height);
      drawn = hit.index;
      if (section) {
        section.dataset.frame = String(hit.index);
        section.dataset.target = String(frame);
        if (process.env.NODE_ENV !== 'production') {
          section.dataset.decoded = String(store.stats.decoded);
          section.dataset.decodedPeakMib = (store.stats.peakBytes / 1048576).toFixed(1);
        }
      }
    };
    const tryActivate = (progress: number) => {
      // Normally frame 0; on a return visit (landed on #about) whatever frame is current.
      if (activated || progress <= 0 || !store.get(frame)) return;
      activated = true;
      onActivate();
    };
    const store = new FrameStore(
      set,
      MOTION.intro.frameCount,
      DECODE_RADIUS,
      onDowngrade,
      (i) => {
        if (drawn !== frame && Math.abs(i - frame) < Math.abs(drawn - frame)) draw();
      },
    );
    // Warm the queue once the idle loop plays (poster is painted by then).
    const start = () => store.start();
    el.addEventListener('playing', start, { capture: true, once: true });
    const warmTimer = window.setTimeout(start, 2500);

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const state = { frame: 0 };
      const deltas: number[] = [];
      // Holder: gsap calls onUpdate during creation, before the tween is returned.
      const ref: { tween?: gsap.core.Tween } = {};
      ref.tween = gsap.to(state, {
        frame: LAST,
        ease: 'none',
        snap: { frame: 1 },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: `+=${MOTION.intro.scrollScreens * 100}%`,
          pin: true,
          scrub: MOTION.scrub,
          onUpdate: (st) => {
            const target = Math.round(st.progress * LAST);
            store.setTarget(target);
            if (section) section.dataset.scrollTarget = String(target);
            tryActivate(st.progress);
          },
          onLeave: () => markIntroSeen(),
        },
        onUpdate: () => {
          frame = Math.round(state.frame);
          store.setCurrent(frame);
          draw();
          tryActivate(ref.tween?.scrollTrigger?.progress ?? 0);
        },
      });
      // Sustained frame drops while scrubbing → step down quality.
      const watch = (_t: number, delta: number) => {
        const st = ref.tween?.scrollTrigger;
        if (!st?.isActive || st.getVelocity() === 0) return;
        deltas.push(delta);
        if (deltas.length < DROP_WINDOW) return;
        const slow = deltas.filter((d) => d > 34).length;
        deltas.length = 0;
        if (slow > DROP_WINDOW / 2) onDowngrade();
      };
      gsap.ticker.add(watch);
      if (section) section.dataset.scrubReady = '1';
      onReady();
      cleanup = () => {
        gsap.ticker.remove(watch);
        ref.tween?.scrollTrigger?.kill();
        ref.tween?.kill();
      };
    })();

    return () => {
      disposed = true;
      window.clearTimeout(warmTimer);
      el.removeEventListener('playing', start, { capture: true });
      cleanup();
      store.dispose();
    };
    // Callbacks come from the parent; re-run only on mode/quality changes.
  }, [enabled, quality]);
}
