import { SITE } from '@/content/site';
import { Button } from '@/components/ui/Button';

export function Contact() {
  const { contact } = SITE;
  return (
    <section
      id="contact"
      className="section-shell contact"
      aria-labelledby="contact-title"
    >
      <h2 id="contact-title">{contact.title}</h2>
      <p className="contact-desc">{contact.description}</p>
      <dl className="contact-list">
        <div>
          <dt>{contact.emailLabel}</dt>
          <dd>{contact.email}</dd>
        </div>
        <div>
          <dt>{contact.socialLabel}</dt>
          <dd>{contact.social}</dd>
        </div>
      </dl>
      <Button href={`mailto:${contact.email}`}>{contact.cta}</Button>
    </section>
  );
}
