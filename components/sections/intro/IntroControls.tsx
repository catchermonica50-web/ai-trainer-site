import { SITE } from '@/content/site';

type Props = { needsPlay: boolean; onPlay: () => void; onSkip: () => void };

export function IntroControls({ needsPlay, onPlay, onSkip }: Props) {
  return (
    <>
      <a className="intro-hint" href="#about">
        <span>{SITE.intro.scroll}</span>
        <span className="intro-hint-arrow" aria-hidden="true">
          ↓
        </span>
      </a>
      {needsPlay && (
        <button type="button" className="button intro-play" onClick={onPlay}>
          {SITE.intro.play}
        </button>
      )}
      <button type="button" className="button intro-skip" onClick={onSkip}>
        {SITE.intro.skip}
      </button>
    </>
  );
}
