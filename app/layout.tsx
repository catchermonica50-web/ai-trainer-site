import type { Metadata } from 'next';
import { JetBrains_Mono, Noto_Sans_SC, Orbitron, Rajdhani } from 'next/font/google';
import { SITE } from '@/content/site';
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
const NOTO = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-noto',
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      className={`${ORBITRON.variable} ${RAJDHANI.variable} ${NOTO.variable} ${MONO.variable}`}
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
