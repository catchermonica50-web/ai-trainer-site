import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { JetBrains_Mono, Orbitron, Rajdhani } from 'next/font/google';
import { NOTO_FIRST_URL } from '@/lib/fonts.generated';
import { SITE } from '@/content/site';
import '@/styles/fonts.generated.css';
import '@/styles/globals.css';
import '@/styles/intro.css';
import '@/styles/sections.css';
import '@/styles/work.css';
import { Nav } from '@/components/ui/Nav';
import { Cursor } from '@/components/ui/Cursor';

const ORBITRON = Orbitron({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-orbitron',
});
const RAJDHANI = Rajdhani({
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-rajdhani',
});
const MONO = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: `%s | ${SITE.title}` },
  description: SITE.description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE.title,
    title: SITE.title,
    description: SITE.description,
    locale: 'zh_CN',
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: SITE.ogAlt }],
  },
  twitter: { card: 'summary_large_image', images: [SITE.ogImage] },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Only the first-screen Noto subset is preloaded; the rest loads when a glyph needs it.
  preload(NOTO_FIRST_URL, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  return (
    <html
      lang="zh-CN"
      className={`${ORBITRON.variable} ${RAJDHANI.variable} ${MONO.variable}`}
    >
      <body>
        <a href="#main" className="skip-link">
          {SITE.skipLink}
        </a>
        <Nav />
        {children}
        <Cursor />
      </body>
    </html>
  );
}
