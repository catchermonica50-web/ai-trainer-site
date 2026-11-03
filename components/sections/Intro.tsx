import { IntroStage } from './intro/IntroStage';

export function Intro() {
  return (
    <section id="intro" className="intro-shell" aria-labelledby="intro-title">
      <IntroStage />
    </section>
  );
}
