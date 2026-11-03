import { SITE } from '@/content/site';
import { shown } from '@/lib/placeholder';

/** The contact section (and every link to it) exists only once a real email or social link is filled in. */
export const CONTACT_VISIBLE = shown(SITE.contact.email) || shown(SITE.contact.social);

export const NAV_ITEMS = SITE.nav.filter((n) => n.id !== 'contact' || CONTACT_VISIBLE);
