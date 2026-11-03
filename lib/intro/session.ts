const KEY = 'intro:seen';

export function hasSeenIntro() {
  try {
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    window.sessionStorage.setItem(KEY, '1');
  } catch {
    // Storage can be blocked (private mode); the intro simply replays.
  }
}

export function jumpToAbout(smooth: boolean) {
  const about = document.getElementById('about');
  if (!about) return;
  about.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
}
