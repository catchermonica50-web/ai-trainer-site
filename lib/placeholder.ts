const PROD = process.env.NODE_ENV === 'production';

/** Empty, or still holds a template marker such as [X], [email] or [链接待定]. */
export function isPlaceholder(value: string | undefined | null): boolean {
  const v = (value ?? '').trim();
  return v === '' || v.includes('[X]') || /^\[[^\]]*\]$/.test(v);
}

/**
 * The production build hides unfilled values; dev keeps them visible so they get filled.
 * Filling a real value in content/site.ts makes it appear with no other change.
 */
export function shown(value: string | undefined | null): value is string {
  return PROD ? !isPlaceholder(value) : (value ?? '') !== '';
}
