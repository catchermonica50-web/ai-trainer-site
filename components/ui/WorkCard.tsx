'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, type MouseEvent, type PointerEvent } from 'react';
import type { Work } from '@/content/works';
import { SITE } from '@/content/site';
import { MOTION } from '@/lib/motion';
import { saveWorkReturn } from '@/lib/workReturn';
import { Tag } from './Tag';

type Props = { work: Work; index: number; tilt: boolean };

const MAX_TILT = 6;

/** Whole-card link: cover, title, tags, 「示例」 badge; desktop tilt + HUD scan; exit animation. */
export function WorkCard({ work, index, tilt }: Props) {
  const router = useRouter();
  const card = useRef<HTMLAnchorElement>(null);
  const href = `/work/${work.slug}`;

  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    const el = card.current;
    if (!tilt || !el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${(px * 2 * MAX_TILT).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-py * 2 * MAX_TILT).toFixed(2)}deg`);
  };
  const onLeave = () => {
    card.current?.style.removeProperty('--rx');
    card.current?.style.removeProperty('--ry');
  };
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const rail = card.current?.closest<HTMLElement>('[data-work-rail]');
    saveWorkReturn({ y: window.scrollY, x: rail?.scrollLeft ?? 0 });
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.current?.setAttribute('data-leaving', '');
    const ms = (reduce ? MOTION.reduced.duration : MOTION.component.min) * 1000;
    window.setTimeout(() => router.push(href), ms);
  };

  return (
    <Link
      ref={card}
      href={href}
      className="work-card"
      data-work-card=""
      data-cursor="view"
      data-tilt={tilt ? '' : undefined}
      draggable={false}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
    >
      <span className="work-cover">
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, pre-sized WebP */}
        <img
          src={work.cover}
          alt=""
          width={1280}
          height={800}
          loading="lazy"
          draggable={false}
        />
        <span className="hud-scan" aria-hidden />
      </span>
      {work.isSample && <span className="work-sample">{SITE.work.sample}</span>}
      <span className="work-body">
        <span className="hud-index">[{String(index + 1).padStart(2, '0')}]</span>
        <span className="work-title">{work.title}</span>
        <span className="work-summary">{work.summary}</span>
        <span className="work-tags">
          {work.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </span>
      </span>
    </Link>
  );
}
