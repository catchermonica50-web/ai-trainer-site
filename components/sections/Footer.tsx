import { SITE } from '@/content/site';

export function Footer() {
  const { footer } = SITE;
  return (
    <footer className="site-footer">
      <span>{footer.copyright}</span>
      <a href={footer.creditUrl} rel="noopener" target="_blank">
        {footer.credit}
      </a>
    </footer>
  );
}
