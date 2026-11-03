import Link from 'next/link';
import { SITE } from '@/content/site';

export default function NotFound() {
  return (
    <main id="main" className="section-shell intro-shell">
      <p className="status-label">404 / OFFLINE</p>
      <h1>{SITE.notFound.title}</h1>
      <p>{SITE.notFound.description}</p>
      <Link className="button" href="/">
        {SITE.notFound.back}
      </Link>
    </main>
  );
}
