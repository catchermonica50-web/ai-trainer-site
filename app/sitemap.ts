import type { MetadataRoute } from 'next';
import { SITE } from '@/content/site';
import { WORKS } from '@/content/works';

export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url },
    ...WORKS.map((work) => ({ url: `${SITE.url}/work/${work.slug}` })),
  ];
}
