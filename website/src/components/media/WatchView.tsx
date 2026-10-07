import { useEffect, useMemo, useState } from 'preact/hooks';
import type { MediaItem } from '@/lib/media-shared';
import { Avatar } from './Avatar';
import { badgeLabel, kindLabel, plainName, speakerKey } from './library';
import { Poster } from './Poster';
import { whenLabel } from './VideoCard';

interface Props {
  item: MediaItem;
  /** The list the visitor was browsing: previous / next / up next follow it. */
  playlist: MediaItem[];
  /** Every message, for "same speaker" and "same series". */
  library: MediaItem[];
  now: Date | null;
  watched: Set<string>;
  onSelect: (item: MediaItem) => void;
  onBack: () => void;
}

type UpNextMode = 'list' | 'speaker' | 'series';
const UP_NEXT = 12;

const action =
  'inline-flex min-h-10 items-center gap-2 rounded-full bg-ink/[0.07] px-4 py-2 font-ui text-[0.88rem] font-medium text-ink transition-colors hover:bg-ink/[0.13] disabled:pointer-events-none disabled:opacity-35';
const chip =
  'inline-flex min-h-10 shrink-0 items-center rounded-lg bg-ink/[0.06] px-3 py-1.5 font-ui text-[0.86rem] font-medium text-ink transition-colors hover:bg-ink/[0.12] aria-pressed:bg-ink aria-pressed:text-paper';

/** The watch page: player, details and what to watch next — the familiar YouTube layout. */
export function WatchView({ item, playlist, library, now, watched, onSelect, onBack }: Props) {
  const [mode, setMode] = useState<UpNextMode>('list');
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [item.id]);

  const index = playlist.findIndex((i) => i.id === item.id);
  const previous = index > 0 ? playlist[index - 1] : undefined;
  const next = index >= 0 && index < playlist.length - 1 ? playlist[index + 1] : undefined;

  const upNext = useMemo(() => {
    if (mode === 'speaker') {
      return library.filter(
        (i) => i.id !== item.id && speakerKey(i.speaker) === speakerKey(item.speaker),
      );
    }
    if (mode === 'series' && item.series) {
      const episodes = library
        .filter((i) => i.series?.id === item.series?.id)
        .sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0));
      const at = episodes.findIndex((i) => i.id === item.id);
      return [...episodes.slice(at + 1), ...episodes.slice(0, at)];
    }
    const at = Math.max(index, 0);
    return [...playlist.slice(at + 1), ...playlist.slice(0, at)];
  }, [mode, item, index, playlist, library]).slice(0, UP_NEXT);

  // YouTube's shortcuts: Shift+N next, Shift+P previous; Escape returns to the library.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select')) return;
      if (event.shiftKey && event.key.toLowerCase() === 'n' && next) onSelect(next);
      else if (event.shiftKey && event.key.toLowerCase() === 'p' && previous) onSelect(previous);
      else if (event.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, previous, onSelect, onBack]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/media/?v=${item.id}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const details = [item.dateLabel, kindLabel(item), item.episode ? `Episode ${item.episode}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <section aria-labelledby="watch-title" data-watch className="font-ui">
      <div className="grid gap-x-8 gap-y-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="min-w-0">
          <div className="bg-paper sticky top-20 z-20 -mx-4 sm:mx-0 lg:static">
            <div className="bg-ink relative aspect-video overflow-hidden sm:rounded-2xl">
              <iframe
                key={item.id}
                src={`https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&rel=0`}
                title={item.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerpolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 size-full"
              />
            </div>
          </div>

          <h1
            id="watch-title"
            className="font-ui text-ink mt-5 text-[clamp(1.25rem,1.1rem+0.6vw,1.6rem)] leading-snug font-semibold tracking-normal"
          >
            {item.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar speaker={item.speaker} size="lg" />
              <div>
                <p className="text-ink text-[0.98rem] font-semibold">{plainName(item.speaker)}</p>
                <p className="text-muted text-[0.82rem]">{kindLabel(item)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => previous && onSelect(previous)}
                disabled={!previous}
                className={action}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => next && onSelect(next)}
                disabled={!next}
                className={action}
              >
                Next
              </button>
              <button type="button" onClick={share} className={action}>
                {copied ? 'Link copied' : 'Share'}
              </button>
              {item.slides && (
                <a href={item.slides} target="_blank" rel="noopener noreferrer" className={action}>
                  Slides<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              <a
                href={`https://www.youtube.com/watch?v=${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={action}
              >
                YouTube<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>

          <div className="bg-ink/[0.05] text-ink-soft mt-4 rounded-xl p-4 text-[0.92rem] leading-relaxed">
            <p className="text-ink font-semibold">{details}</p>
            {item.description && <p className="mt-1">{item.description}</p>}
            {item.credit && (
              <p className="mt-2">
                Video by{' '}
                <a
                  href={item.credit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  {item.credit.name}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                .
              </p>
            )}
            <p className="text-muted mt-2 text-[0.82rem]">
              Plays from YouTube in privacy-enhanced mode. Keyboard: Shift+N next, Shift+P previous.
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="text-ink decoration-rule hover:decoration-ink mt-6 text-[0.92rem] font-medium underline underline-offset-4"
          >
            ← Back to all messages
          </button>
        </div>

        <aside aria-label="Up next" className="min-w-0">
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Show">
            <button
              type="button"
              aria-pressed={mode === 'list'}
              onClick={() => setMode('list')}
              className={chip}
            >
              Up next
            </button>
            <button
              type="button"
              aria-pressed={mode === 'speaker'}
              onClick={() => setMode('speaker')}
              className={chip}
            >
              From {plainName(item.speaker)}
            </button>
            {item.series && (
              <button
                type="button"
                aria-pressed={mode === 'series'}
                onClick={() => setMode('series')}
                className={chip}
              >
                {item.series.title}
              </button>
            )}
          </div>

          {upNext.length === 0 ? (
            <p className="text-muted mt-6 text-[0.92rem]">No other messages here yet.</p>
          ) : (
            <ol className="mt-4 space-y-1">
              {upNext.map((candidate) => (
                <li key={candidate.id}>
                  <a
                    href={`/media/?v=${candidate.id}`}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                      event.preventDefault();
                      onSelect(candidate);
                    }}
                    className="group hover:bg-ink/[0.045] -mx-2 grid grid-cols-[10.5rem_minmax(0,1fr)] gap-3 rounded-xl p-2 transition-colors"
                  >
                    <span className="bg-paper-shade relative block aspect-video overflow-hidden rounded-lg">
                      <Poster item={candidate} sizes="11rem" />
                      <span className="bg-ink/85 text-paper absolute right-1.5 bottom-1.5 rounded px-1 py-px text-[0.75rem] font-medium">
                        {badgeLabel(candidate)}
                      </span>
                      {watched.has(candidate.id) && (
                        <span className="bg-pew absolute inset-x-0 bottom-0 h-1" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="text-ink line-clamp-2 text-[0.9rem] leading-snug font-semibold">
                        {candidate.title}
                      </span>
                      <span className="text-muted mt-1 block truncate text-[0.8rem]">
                        {plainName(candidate.title) === plainName(candidate.speaker)
                          ? kindLabel(candidate)
                          : plainName(candidate.speaker)}
                      </span>
                      <span className="text-muted block truncate text-[0.8rem]">
                        {whenLabel(candidate, now)}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </section>
  );
}
