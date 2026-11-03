import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WORKS } from '@/content/works';
import { SITE } from '@/content/site';

export const dynamicParams = false;
export function generateStaticParams() {
  return WORKS.map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = WORKS.find((work) => work.slug === slug);
  return { title: work?.title, description: work?.description };
}

export default async function WorkPage({ params }: Props) {
  const { slug } = await params;
  const work = WORKS.find((work) => work.slug === slug);
  if (!work) notFound();
  return (
    <main id="main" className="section-shell">
      <h1>{work.title}</h1>
      <Link className="button" href="/">
        {SITE.work.back}
      </Link>
    </main>
  );
}
