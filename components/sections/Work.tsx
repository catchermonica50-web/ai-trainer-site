import { SITE } from '@/content/site';

export function Work() {
  return (
    <section id="work" className="section-shell" aria-labelledby="work-title">
      <h2 id="work-title">{SITE.work.title}</h2>
    </section>
  );
}
