'use client';

import { useEffect, useRef } from 'react';
import { useEnhancedEffects } from '@/lib/useEnhancedEffects';

const TRAIL = 5;

/** Dot + ring + trail. Grows and turns orange over [data-cursor] or links/buttons. */
export function Cursor() {
  const enabled = useEnhancedEffects();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!enabled || !el) return;
    const html = document.documentElement;
    html.classList.add('has-cursor');
    const dot = el.querySelector<HTMLElement>('.cursor-dot')!;
    const ring = el.querySelector<HTMLElement>('.cursor-ring')!;
    const trail = [...el.querySelectorAll<HTMLElement>('.cursor-trail')];
    const target = { x: -100, y: -100 };
    const pts = Array.from({ length: TRAIL + 1 }, () => ({ x: -100, y: -100 }));
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      const hit = (e.target as Element | null)?.closest?.('a, button, [data-cursor]');
      el.dataset.hover = hit ? '1' : '';
      el.dataset.view = hit?.getAttribute('data-cursor') === 'view' ? '1' : '';
    };
    const tick = () => {
      pts[0].x += (target.x - pts[0].x) * 0.25;
      pts[0].y += (target.y - pts[0].y) * 0.25;
      for (let i = 1; i < pts.length; i += 1) {
        pts[i].x += (pts[i - 1].x - pts[i].x) * 0.35;
        pts[i].y += (pts[i - 1].y - pts[i].y) * 0.35;
      }
      dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      ring.style.transform = `translate3d(${pts[0].x}px, ${pts[0].y}px, 0)`;
      trail.forEach((t, i) => {
        t.style.transform = `translate3d(${pts[i + 1].x}px, ${pts[i + 1].y}px, 0)`;
      });
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      html.classList.remove('has-cursor');
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div ref={root} className="cursor" aria-hidden>
      {Array.from({ length: TRAIL }, (_, i) => (
        <span key={i} className="cursor-trail" style={{ opacity: 0.3 - i * 0.05 }} />
      ))}
      <span className="cursor-ring">
        <span className="cursor-label">VIEW</span>
      </span>
      <span className="cursor-dot" />
    </div>
  );
}
