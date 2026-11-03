'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SITE } from '@/content/site';
import { NAV_ITEMS } from '@/lib/sections';
import { Magnetic } from './Magnetic';

/** Fixed thin top bar: anchors, current-section indicator, blur after scroll, mobile full-screen menu. */
export function Nav() {
  const [current, setCurrent] = useState<string>(NAV_ITEMS[0].id);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const sections = NAV_ITEMS.map((n) => document.getElementById(n.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    // Work detail pages belong to 作品集; the home sections are re-observed after returning.
    if (pathname.startsWith('/work/')) setCurrent('work');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="site-nav" data-scrolled={scrolled ? '1' : undefined}>
      <Link href="/#intro" className="nav-brand" data-cursor="hover">
        {SITE.brand}
      </Link>
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="nav-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{open ? SITE.menuClose : SITE.menuOpen}</span>
        <span className="nav-toggle-bars" aria-hidden />
      </button>
      <nav id="nav-menu" aria-label={SITE.navLabel} data-open={open ? '1' : undefined}>
        <ul className="nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <Magnetic>
                <Link
                  href={`/#${item.id}`}
                  className="nav-link"
                  aria-current={current === item.id ? 'location' : undefined}
                  data-cursor="hover"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </Magnetic>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
