import { SITE } from '@/content/site';

export function Contact() {
  return (
    <section id="contact" className="section-shell" aria-labelledby="contact-title">
      <h2 id="contact-title">{SITE.contact.title}</h2>
    </section>
  );
}
