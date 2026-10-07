import { useEffect, useState } from 'preact/hooks';
import { Icon } from './icons';
import { allowSecondScreen, secondScreen } from './screens';

/**
 * When a second screen is connected, asks — once, ahead of time — that the slides may open on it,
 * so pressing Present (or the clicker) later puts them there in one go. Says how to undo a "no".
 */
export function SecondScreenNotice() {
  const [state, setState] = useState<Awaited<ReturnType<typeof secondScreen>>>('none');

  useEffect(() => {
    const check = () => void secondScreen().then(setState);
    check();
    // A projector plugged in or out (Chrome tells the screen), or permission changed in the site
    // settings (seen when the window is back in front).
    const screen = window.screen as Screen & Partial<EventTarget>;
    screen.addEventListener?.('change', check);
    window.addEventListener('focus', check);
    return () => {
      screen.removeEventListener?.('change', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  if (state === 'none' || state === 'ready') return null;
  return (
    <div
      role="status"
      className="border-rule mb-8 hidden items-center gap-4 rounded-xl border bg-white/75 px-5 py-4 sm:flex"
    >
      <span className="bg-gold-tint text-gold-ink flex size-10 shrink-0 items-center justify-center rounded-full">
        <Icon name="monitor" className="size-5" />
      </span>
      {state === 'ask' ? (
        <>
          <p className="text-ink-soft min-w-0 flex-1 text-[0.95rem] leading-snug">
            <span className="text-ink font-medium">A second screen is connected.</span> Allow the
            slides to open on it by themselves, full screen, with the presenter view here.
          </p>
          <button
            type="button"
            onClick={() => void allowSecondScreen().then(setState)}
            className="bg-ink text-paper min-h-11 shrink-0 rounded-full px-5 text-[0.9rem] font-semibold hover:bg-[#2b261d]"
          >
            Allow
          </button>
        </>
      ) : (
        <p className="text-ink-soft min-w-0 flex-1 text-[0.95rem] leading-snug">
          <span className="text-ink font-medium">The second screen isn’t allowed yet.</span> Click
          the icon at the left of the address bar, then Site settings, and set Window management to
          Allow. The slides will then open on the second screen.
        </p>
      )}
    </div>
  );
}
