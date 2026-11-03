'use client';

import { useEffect, useRef, useState } from 'react';
import { SITE } from '@/content/site';
import { INTRO_MEDIA } from '@/lib/intro/assets';
import { markIntroSeen } from '@/lib/intro/session';

type Props = { onStart: () => void; onFail: () => void };

/** Mobile: no scrub. The first scroll plays the 720p transformation once. */
export function MobileTransform({ onStart, onFail }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const start = () => {
      const v = video.current;
      if (!v || window.scrollY <= 0) return;
      window.removeEventListener('scroll', start);
      v.play()
        .then(() => {
          setPlaying(true);
          onStart();
        })
        .catch(onFail);
    };
    window.addEventListener('scroll', start, { passive: true });
    return () => window.removeEventListener('scroll', start);
  }, [onStart, onFail]);

  return (
    <video
      ref={video}
      className="intro-layer intro-fade"
      data-hidden={playing ? undefined : '1'}
      muted
      playsInline
      preload="metadata"
      aria-label={SITE.intro.transformLabel}
      onEnded={() => markIntroSeen()}
      onError={onFail}
    >
      <source src={INTRO_MEDIA.transformMobile.webm} type="video/webm" />
      <source src={INTRO_MEDIA.transformMobile.mp4} type="video/mp4" />
    </video>
  );
}
