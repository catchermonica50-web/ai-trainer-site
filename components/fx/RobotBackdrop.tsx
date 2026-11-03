'use client';

import dynamic from 'next/dynamic';
import { Component, type ReactNode, useEffect, useRef, useState } from 'react';
import { SITE } from '@/content/site';
import { useEnhancedEffects } from '@/lib/useEnhancedEffects';

// three/R3F stay out of the first-load bundle; fetched only when this mounts.
const RobotScene = dynamic(() => import('./RobotScene'), { ssr: false });

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** A 3D failure (no WebGL, bad asset) must never take the page down: drop the decoration. */
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Background 3D decoration for #about: mounts when near the viewport and effects are enabled. */
export function RobotBackdrop({ src = SITE.robot.model }: { src?: string }) {
  const enabled = useEnhancedEffects();
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || near || failed) return;
    if (!hasWebGL()) {
      setFailed(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        // The intro's pinned spacer settles after first paint; confirm on a later frame so a
        // transient early layout cannot trigger the download.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const r = el.getBoundingClientRect();
            if (r.top < innerHeight + 200 && r.bottom > -200) setNear(true);
          }),
        );
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, near, failed]);

  return (
    <div
      ref={ref}
      className="robot-backdrop"
      data-state={
        failed ? 'failed' : !enabled ? 'off' : ready ? 'ready' : near ? 'loading' : 'idle'
      }
      aria-hidden
    >
      {enabled && near && !failed && (
        <SceneBoundary onError={() => setFailed(true)}>
          <RobotScene src={src} onReady={() => setReady(true)} />
        </SceneBoundary>
      )}
    </div>
  );
}
