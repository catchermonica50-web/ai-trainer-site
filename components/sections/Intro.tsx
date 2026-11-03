import { SITE } from '@/content/site';

export function Intro() {
  return (
    <section
      id="intro"
      className="section-shell intro-shell"
      aria-labelledby="intro-title"
    >
      <div className="status-label">{SITE.intro.eyebrow}</div>
      <h1 id="intro-title">{SITE.intro.title}</h1>
      <a className="button" href="#about">
        {SITE.nav[1].label} <span aria-hidden="true">↗</span>
      </a>
    </section>
  );
}
