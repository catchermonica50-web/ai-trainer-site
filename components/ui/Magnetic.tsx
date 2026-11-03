'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { MOTION } from '@/lib/motion';
import { useEnhancedEffects } from '@/lib/useEnhancedEffects';

/** Pulls its child toward the pointer within 80px, by at most 12px. */
export function Magnetic({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const enabled = useEnhancedEffects();

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const { radius, maxOffset } = MOTION.magnetic;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        // Distance from the element's edge, not its centre.
        const gapX = Math.max(0, Math.abs(dx) - r.width / 2);
        const gapY = Math.max(0, Math.abs(dy) - r.height / 2);
        const inside = Math.hypot(gapX, gapY) <= radius;
        const clamp = (v: number) => Math.max(-maxOffset, Math.min(maxOffset, v * 0.25));
        el.style.transform = inside ? `translate(${clamp(dx)}px, ${clamp(dy)}px)` : '';
        el.dataset.magnet = inside ? '1' : '';
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      el.style.transform = '';
    };
  }, [enabled]);

  return (
    <span ref={ref} className="magnetic">
      {children}
    </span>
  );
}
