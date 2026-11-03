'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SITE } from '@/content/site';
import { INTRO_MEDIA } from '@/lib/intro/assets';
import { hasSeenIntro, jumpToAbout, markIntroSeen } from '@/lib/intro/session';
import { useIntroMode } from '@/lib/intro/useIntroMode';
import { useScrub } from '@/lib/intro/useScrub';
import { IntroPicture } from './IntroPicture';
import { IntroControls } from './IntroControls';
import { MobileTransform } from './MobileTransform';

export function IntroStage() {
  const { mode, quality, downgrade } = useIntroMode();
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const idle = useRef<HTMLVideoElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [needsPlay, setNeedsPlay] = useState(false);
  const [idleFailed, setIdleFailed] = useState(false);

  const activate = useCallback(() => {
    setScrubbing(true);
    window.setTimeout(() => idle.current?.pause(), 200);
  }, []);
  const fail = useCallback(() => setIdleFailed(true), []);
  useScrub({
    enabled: mode === 'scrub',
    quality,
    stage,
    canvas,
    onActivate: activate,
    onDowngrade: downgrade,
  });

  useEffect(() => {
    if (mode === 'pending') return;
    if (hasSeenIntro()) requestAnimationFrame(() => jumpToAbout(false));
    const video = idle.current;
    if (!video) return;
    video.play().catch(() => setNeedsPlay(true));
  }, [mode]);

  const skip = () => {
    markIntroSeen();
    jumpToAbout(mode !== 'still');
  };
  const play = () => {
    idle.current
      ?.play()
      .then(() => setNeedsPlay(false))
      .catch(() => setIdleFailed(true));
  };

  const showIdle = mode === 'scrub' || mode === 'mobile';
  const still = mode === 'still' || idleFailed;

  return (
    <div
      ref={stage}
      className="intro-stage"
      data-mode={still ? 'still' : mode}
      data-quality={quality}
    >
      <IntroPicture
        media={INTRO_MEDIA.poster}
        className="intro-layer"
        alt={SITE.intro.posterAlt}
        priority
      />
      {showIdle && !idleFailed && (
        <video
          ref={idle}
          className="intro-layer intro-fade"
          data-hidden={scrubbing ? '1' : undefined}
          muted
          playsInline
          loop
          autoPlay
          preload="auto"
          poster={INTRO_MEDIA.poster.webp}
          aria-label={SITE.intro.idleLabel}
          onError={() => setIdleFailed(true)}
        >
          <source src={INTRO_MEDIA.idle.webm} type="video/webm" />
          <source src={INTRO_MEDIA.idle.mp4} type="video/mp4" />
        </video>
      )}
      {mode === 'scrub' && !idleFailed && (
        <canvas
          ref={canvas}
          className="intro-layer intro-fade"
          data-hidden={scrubbing ? undefined : '1'}
          role="img"
          aria-label={SITE.intro.transformLabel}
        />
      )}
      {mode === 'mobile' && !idleFailed && (
        <MobileTransform onStart={activate} onFail={fail} />
      )}
      {still && (
        <IntroPicture
          media={INTRO_MEDIA.still}
          className="intro-layer"
          alt={SITE.intro.stillAlt}
        />
      )}
      <div className="intro-copy">
        <div className="status-label">{SITE.intro.eyebrow}</div>
        <h1 id="intro-title">{SITE.intro.title}</h1>
      </div>
      <IntroControls needsPlay={needsPlay && !idleFailed} onPlay={play} onSkip={skip} />
    </div>
  );
}
