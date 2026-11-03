import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WORKS, getWork } from '@/content/works';
import { SITE } from '@/content/site';
import { WorkDetail } from '@/components/work/WorkDetail';

export const dynamicParams = false;
export function generateStaticParams() {
  return WORKS.map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = getWork(slug);
  if (!found) return {};
  return {
    title: found.work.title,
    description: found.work.summary,
    alternates: { canonical: `/work/${slug}` },
    openGraph: {
      title: found.work.title,
      description: found.work.summary,
      images: [found.work.cover],
    },
  };
}

export default async function WorkPage({ params }: Props) {
  const { slug } = await params;
  const found = getWork(slug);
  if (!found) notFound();
  const { work } = found;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: work.title,
    description: work.summary,
    keywords: work.tags.join(', '),
    url: `${SITE.url}/work/${work.slug}`,
    image: `${SITE.url}${work.cover}`,
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WorkDetail {...found} />
    </>
  );
}
