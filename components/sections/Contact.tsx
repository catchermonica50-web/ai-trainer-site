import { SITE } from '@/content/site';
import { Button } from '@/components/ui/Button';
import { shown } from '@/lib/placeholder';

export function Contact() {
  const { contact } = SITE;
  const email = shown(contact.email) ? contact.email : null;
  const social = shown(contact.social) ? contact.social : null;
  return (
    <section
      id="contact"
      className="section-shell contact"
      aria-labelledby="contact-title"
    >
      <h2 id="contact-title">{contact.title}</h2>
      <p className="contact-desc">{contact.description}</p>
      {(email || social) && (
        <dl className="contact-list">
          {email && (
            <div>
              <dt>{contact.emailLabel}</dt>
              <dd>{email}</dd>
            </div>
          )}
          {social && (
            <div>
              <dt>{contact.socialLabel}</dt>
              <dd>{social}</dd>
            </div>
          )}
        </dl>
      )}
      {email && <Button href={`mailto:${email}`}>{contact.cta}</Button>}
    </section>
  );
}
