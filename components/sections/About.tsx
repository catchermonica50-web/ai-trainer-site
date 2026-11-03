import { SITE } from '@/content/site';

export function About() {
  return (
    <section id="about" className="section-shell" aria-labelledby="about-title">
      <h2 id="about-title">{SITE.about.title}</h2>
    </section>
  );
}
