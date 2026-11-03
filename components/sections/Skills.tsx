import { SITE } from '@/content/site';
import { HudCard } from '@/components/ui/HudCard';

export function Skills() {
  return (
    <section id="skills" className="section-shell" aria-labelledby="skills-title">
      <h2 id="skills-title">{SITE.skills.title}</h2>
      <div className="skills-grid">
        {SITE.skills.items.map((item) => (
          <HudCard key={item.id} index={item.id} title={item.title}>
            {item.description}
          </HudCard>
        ))}
      </div>
    </section>
  );
}
