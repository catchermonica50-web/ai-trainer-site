'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { MOTION } from './motion';
import { peekWorkReturn } from './workReturn';

const EDGE = 1;

/** Horizontal rail: pointer drag (mouse + touch), wheel hand-off at the edges, keys, prev/next. */
export function useRail(rail: RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({ start: true, end: false });
  const dragged = useRef(false);

  const update = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft <= EDGE, end: el.scrollLeft >= max - EDGE });
  }, [rail]);

  const step = useCallback(
    (dir: 1 | -1) => {
      const el = rail.current;
      if (!el) return;
      const card = el.querySelector<HTMLElement>('[data-work-card]');
      const gap = parseFloat(getComputedStyle(el.firstElementChild ?? el).columnGap) || 0;
      const dx = (card?.offsetWidth ?? el.clientWidth) + gap;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollBy({ left: dir * dx, behavior: reduce ? 'instant' : 'smooth' });
    },
    [rail],
  );

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const saved = peekWorkReturn();
    if (saved) el.scrollLeft = saved.x;
    update();

    let id = -1;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let horizontal: boolean | null = null;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      id = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = el.scrollLeft;
      horizontal = null;
      dragged.current = false;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (horizontal === null && Math.hypot(dx, dy) > MOTION.rail.dragThreshold) {
        horizontal = Math.abs(dx) > Math.abs(dy);
        // Vertical touch moves belong to the page (touch-action: pan-y).
        if (!horizontal) id = -1;
        else {
          dragged.current = true;
          el.setPointerCapture(e.pointerId);
          el.dataset.dragging = '';
        }
      }
      if (horizontal) el.scrollLeft = startLeft - dx;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      delete el.dataset.dragging;
    };
    // A drag past the threshold cancels the link click that ends it.
    const click = (e: MouseEvent) => {
      if (!dragged.current) return;
      e.preventDefault();
      e.stopPropagation();
      dragged.current = false;
    };
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const max = el.scrollWidth - el.clientWidth;
      const canMove = delta > 0 ? el.scrollLeft < max - EDGE : el.scrollLeft > EDGE;
      if (!canMove || delta === 0) return; // at the edge: let the page scroll
      e.preventDefault();
      el.scrollLeft += delta;
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      step(e.key === 'ArrowRight' ? 1 : -1);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('click', click, true);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('keydown', key);
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('click', click, true);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('keydown', key);
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [rail, step, update]);

  return { edges, step, dragged };
}
