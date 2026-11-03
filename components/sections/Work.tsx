'use client';

import { useRef } from 'react';
import { SITE } from '@/content/site';
import { WORKS } from '@/content/works';
import { WorkCard } from '@/components/ui/WorkCard';
import { useEnhancedEffects } from '@/lib/useEnhancedEffects';
import { useRail } from '@/lib/useRail';

export function Work() {
  const rail = useRef<HTMLDivElement>(null);
  const { edges, step } = useRail(rail);
  const enhanced = useEnhancedEffects();

  return (
    <section id="work" className="section-shell work" aria-labelledby="work-title">
      <div className="work-head">
        <h2 id="work-title">{SITE.work.title}</h2>
        <div className="work-controls">
          <button
            type="button"
            className="rail-btn"
            aria-label={SITE.work.prevCard}
            aria-controls="work-rail"
            disabled={edges.start}
            onClick={() => step(-1)}
          >
            ←
          </button>
          <button
            type="button"
            className="rail-btn"
            aria-label={SITE.work.nextCard}
            aria-controls="work-rail"
            disabled={edges.end}
            onClick={() => step(1)}
          >
            →
          </button>
        </div>
      </div>
      <p className="work-hint">{SITE.work.hint}</p>
      <div
        ref={rail}
        id="work-rail"
        className="work-rail"
        data-work-rail=""
        tabIndex={0}
        role="region"
        aria-label={SITE.work.railLabel}
      >
        <ul className="work-list">
          {WORKS.map((work, index) => (
            <li key={work.slug} className="work-item">
              <WorkCard work={work} index={index} tilt={enhanced} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
