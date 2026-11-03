/** Where the home page was when a work card was opened, so returning restores it (spec §6). */
const KEY = 'work:return';

export type WorkReturn = { y: number; x: number };

export function saveWorkReturn(state: WorkReturn) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage blocked: returning simply lands on the default position.
  }
}

export function peekWorkReturn(): WorkReturn | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkReturn>;
    if (typeof parsed.y !== 'number' || typeof parsed.x !== 'number') return null;
    return { y: parsed.y, x: parsed.x };
  } catch {
    return null;
  }
}

export function clearWorkReturn() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}

/** Called by the intro once its layout is final. Returns true if it handled the scroll position. */
export function restoreWorkReturn() {
  const state = peekWorkReturn();
  if (!state) return false;
  clearWorkReturn();
  window.scrollTo({ top: state.y, left: 0, behavior: 'instant' });
  const rail = document.querySelector<HTMLElement>('[data-work-rail]');
  if (rail) rail.scrollLeft = state.x;
  return true;
}
