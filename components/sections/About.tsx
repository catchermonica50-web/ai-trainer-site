import { SITE } from '@/content/site';
import { INTRO_MEDIA } from '@/lib/intro/assets';
import { RobotBackdrop } from '@/components/fx/RobotBackdrop';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { IntroPicture } from './intro/IntroPicture';
import { shown } from '@/lib/placeholder';

/** Video end-frame robot in the middle, copy on either side; stacked on mobile. */
export function About() {
  const { about } = SITE;
  const stats = about.stats.filter(shown);
  return (
    <section id="about" className="about" aria-labelledby="about-title">
      <RobotBackdrop />
      <div className="about-grid">
        <div className="about-copy about-left reveal">
          <Tag>{about.eyebrow}</Tag>
          <h2 id="about-title">{about.title}</h2>
          <p className="about-desc">{about.description}</p>
        </div>
        <div className="about-figure">
          <IntroPicture
            media={INTRO_MEDIA.still}
            alt={about.robotAlt}
            className="about-still"
          />
        </div>
        <div className="about-copy about-right reveal">
          {stats.length > 0 && (
            <ul className="about-stats" aria-label={about.statsLabel}>
              {stats.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          <div className="about-actions">
            <Button href="#contact">{about.cta}</Button>
            <Button href="#skills" variant="secondary">
              {about.ctaSecondary}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
