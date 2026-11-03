'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { preload } from 'react-dom';
import { SITE } from '@/content/site';
import { INTRO_MEDIA } from '@/lib/intro/assets';
import { hasSeenIntro, jumpToAbout, markIntroSeen } from '@/lib/intro/session';
import { useIntroMode } from '@/lib/intro/useIntroMode';
import { useScrub } from '@/lib/intro/useScrub';
import { IntroPicture } from './IntroPicture';
import { IntroControls } from './IntroControls';
import { MobileTransform } from './MobileTransform';

export function IntroStage() {
  // Emit <link rel=preload> for the LCP poster in the static HTML head.
  preload(INTRO_MEDIA.poster.avif, {
    as: 'image',
    type: 'image/avif',
    imageSrcSet: INTRO_MEDIA.poster.avif,
    fetchPriority: 'high',
  });
  const { mode, quality, downgrade } = useIntroMode();
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const idle = useRef<HTMLVideoElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(false);
  const [needsPlay, setNeedsPlay] = useState(false);
  const [idleFailed, setIdleFailed] = useState(false);
  // Hold back the idle video and hero copy until the poster (LCP) has painted.
  const poster = useRef<HTMLImageElement>(null);
  const [posterReady, setPosterReady] = useState(false);
  // Reveal only after the poster has decoded and painted, so it wins LCP.
  const onPosterLoad = useCallback(() => {
    const reveal = () =>
      requestAnimationFrame(() => requestAnimationFrame(() => setPosterReady(true)));
    const img = poster.current;
    if (img?.decode) img.decode().then(reveal, reveal);
    else reveal();
  }, []);
  useEffect(() => {
    if (poster.current?.complete) onPosterLoad();
    const t = window.setTimeout(onPosterLoad, 3000);
    return () => window.clearTimeout(t);
  }, [onPosterLoad]);

  const activate = useCallback(() => {
    scrubbingRef.current = true;
    setScrubbing(true);
    window.setTimeout(() => idle.current?.pause(), 200);
  }, []);
  const fail = useCallback(() => setIdleFailed(true), []);
  const returnChecked = useRef(false);
  // Only on first load: a later quality downgrade must not move the page.
  const returnToAbout = useCallback(() => {
    if (returnChecked.current) return;
    returnChecked.current = true;
    if (hasSeenIntro()) jumpToAbout(false);
  }, []);
  useScrub({
    enabled: mode === 'scrub',
    quality,
    stage,
    canvas,
    onActivate: activate,
    onDowngrade: downgrade,
    onReady: returnToAbout,
  });

  useEffect(() => {
    if (mode === 'pending' || !posterReady) return;
    // Scrub mode jumps from onReady, after the pin spacer changes the layout.
    if (mode !== 'scrub') requestAnimationFrame(returnToAbout);
    const video = idle.current;
    if (!video) return;
    video.play().catch(() => setNeedsPlay(true));
  }, [mode, posterReady, returnToAbout]);

  const skip = () => {
    markIntroSeen();
    jumpToAbout(false);
  };
  const play = () => {
    idle.current
      ?.play()
      .then(() => setNeedsPlay(false))
      .catch(() => setIdleFailed(true));
  };

  const showIdle = posterReady && (mode === 'scrub' || mode === 'mobile');
  const still = mode === 'still' || idleFailed;

  return (
    <div
      ref={stage}
      className="intro-stage"
      data-mode={still ? 'still' : mode}
      data-quality={quality}
      data-poster-ready={posterReady ? '1' : undefined}
    >
      <IntroPicture
        media={INTRO_MEDIA.poster}
        className="intro-layer"
        alt={SITE.intro.posterAlt}
        imgRef={poster}
        onLoad={onPosterLoad}
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
          // Pinning re-parents the stage, which pauses media; keep the idle loop going.
          onPause={(e) => {
            if (!scrubbingRef.current && !e.currentTarget.ended)
              void e.currentTarget.play().catch(() => {});
          }}
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
