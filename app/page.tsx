import { Intro } from '@/components/sections/Intro';
import { About } from '@/components/sections/About';
import { Skills } from '@/components/sections/Skills';
import { Work } from '@/components/sections/Work';
import { Contact } from '@/components/sections/Contact';
import { Footer } from '@/components/sections/Footer';

export default function HomePage() {
  return (
    <>
      <main id="main">
        <Intro />
        <About />
        <Skills />
        <Work />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
