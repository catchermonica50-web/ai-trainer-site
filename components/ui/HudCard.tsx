import type { ReactNode } from 'react';

type Props = { index: string; title: string; children: ReactNode };

/** Panel with a 45° cut corner, four corner ticks, a mono index and a hover scanline. */
export function HudCard({ index, title, children }: Props) {
  return (
    <article className="hud-card">
      <span className="hud-tick hud-tick-tl" aria-hidden />
      <span className="hud-tick hud-tick-tr" aria-hidden />
      <span className="hud-tick hud-tick-bl" aria-hidden />
      <span className="hud-tick hud-tick-br" aria-hidden />
      <span className="hud-scan" aria-hidden />
      <div className="hud-index">[{index}]</div>
      <h3 className="hud-title">{title}</h3>
      <p className="hud-body">{children}</p>
    </article>
  );
}
