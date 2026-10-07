/**
 * Remembers which messages a visitor has played, in their own browser only (localStorage),
 * so the library can mark them as watched. Nothing is sent anywhere. Written only after the
 * visitor presses play; can be cleared from the library ("Clear watch history").
 */
const KEY = 'chbc-watched';

export function readWatched(): Set<string> {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(Array.isArray(value) ? value.filter((v) => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveWatched(ids: Set<string>) {
  try {
    if (ids.size) localStorage.setItem(KEY, JSON.stringify([...ids]));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable (private mode, blocked): the library simply won't remember.
  }
}
