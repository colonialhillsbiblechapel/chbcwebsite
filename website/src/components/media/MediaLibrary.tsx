import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CATEGORY_LABELS, type Category, type MediaItem } from '@/lib/media-shared';
import {
  DEFAULT_FILTERS,
  SORT_LABELS,
  applyFilters,
  categoryCounts,
  conferenceOptions,
  filtersFromParams,
  filtersToParams,
  seriesOptions,
  speakerOptions,
  type Filters,
  type Sort,
} from './library';
import { Sidebar } from './Sidebar';
import { VideoCard } from './VideoCard';
import { WatchView } from './WatchView';
import { readWatched, saveWatched } from './watched';

interface Props {
  items: MediaItem[];
}

const PAGE = 24;
const chip =
  'inline-flex min-h-10 shrink-0 items-center rounded-lg bg-ink/[0.06] px-3.5 py-2 font-ui text-[0.88rem] font-medium whitespace-nowrap text-ink transition-colors hover:bg-ink/[0.12] aria-pressed:bg-ink aria-pressed:text-paper';

interface HistoryState {
  v?: string;
  /** How many messages have been opened since leaving the library (for "Back to all messages"). */
  depth?: number;
  scrollY?: number;
}

export default function MediaLibrary({ items }: Props) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [watching, setWatching] = useState<MediaItem | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [now, setNow] = useState<Date | null>(null);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const restoreScroll = useRef<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const results = useMemo(() => applyFilters(items, filters), [items, filters]);
  const speakers = useMemo(() => speakerOptions(items), [items]);
  const series = useMemo(() => seriesOptions(items), [items]);
  const conferences = useMemo(() => conferenceOptions(items), [items]);
  const categories = useMemo(() => categoryCounts(items), [items]);
  const isDefaultView = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);

  // Follow the address: filters and the open message, on load and on Back / Forward.
  useEffect(() => {
    history.scrollRestoration = 'manual';
    setNow(new Date());
    setWatched(readWatched());
    const fromAddress = () => {
      const params = new URLSearchParams(location.search);
      setFilters(filtersFromParams(params));
      const id = params.get('v');
      const item = id ? (items.find((i) => i.id === id) ?? null) : null;
      setWatching(item);
      if (item) window.scrollTo(0, 0);
      else restoreScroll.current = (history.state as HistoryState | null)?.scrollY ?? null;
    };
    fromAddress();
    window.addEventListener('popstate', fromAddress);
    return () => window.removeEventListener('popstate', fromAddress);
  }, [items]);

  useLayoutEffect(() => {
    if (!watching && restoreScroll.current !== null) {
      window.scrollTo(0, restoreScroll.current);
      restoreScroll.current = null;
    }
  }, [watching]);

  // Load more messages as the visitor nears the end of the grid.
  useEffect(() => {
    const target = sentinel.current;
    if (!target || watching) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && setShown((n) => n + PAGE),
      { rootMargin: '1200px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watching, results.length, shown]);

  const updateFilters = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    setShown(PAGE);
    const url = new URL(location.href);
    filtersToParams(next, url.searchParams);
    url.searchParams.delete('v');
    if (watching) {
      // Searching from the watch page goes back to the library with the results.
      history.pushState({ depth: 0 } satisfies HistoryState, '', url);
      setWatching(null);
    } else {
      history.replaceState(history.state, '', url);
    }
  };

  const play = useCallback((item: MediaItem) => {
    const state = (history.state ?? {}) as HistoryState;
    if (!state.v) history.replaceState({ ...state, scrollY: window.scrollY }, '');
    const url = new URL(location.href);
    url.searchParams.set('v', item.id);
    history.pushState(
      { v: item.id, depth: (state.depth ?? 0) + 1 } satisfies HistoryState,
      '',
      url,
    );
    setWatching(item);
    window.scrollTo(0, 0);
    setWatched((previous) => {
      const next = new Set(previous).add(item.id);
      saveWatched(next);
      return next;
    });
  }, []);

  const backToLibrary = useCallback(() => {
    const depth = (history.state as HistoryState | null)?.depth ?? 0;
    if (depth > 0) {
      history.go(-depth); // popstate restores the library and its scroll position
      return;
    }
    const url = new URL(location.href);
    url.searchParams.delete('v');
    history.replaceState({}, '', url);
    setWatching(null);
  }, []);

  const clearHistory = () => {
    saveWatched(new Set());
    setWatched(new Set());
  };

  // Previous / next follow the list being browsed (every message when opened from a link).
  const playlist = watching && results.some((i) => i.id === watching.id) ? results : items;

  const chips: { label: string; active: boolean; patch: Partial<Filters> }[] = [
    { label: 'All', active: isDefaultView, patch: DEFAULT_FILTERS },
    ...(Object.keys(CATEGORY_LABELS) as Category[]).map((category) => ({
      label: CATEGORY_LABELS[category],
      active:
        filters.category === category && !filters.series && !filters.conference && !filters.speaker,
      patch: { category, series: '', conference: '', speaker: '' },
    })),
    ...series.map((s) => ({
      label: s.label,
      active: filters.series === s.key,
      patch: { category: 'all' as const, series: s.key, conference: '', speaker: '' },
    })),
    ...conferences.map((c) => ({
      label: c.label.replace(' Houston Bible Conference', ' Conference'),
      active: filters.conference === c.key,
      patch: { category: 'all' as const, series: '', conference: c.key, speaker: '' },
    })),
  ];

  if (watching) {
    return (
      <div className="font-ui mx-auto max-w-[110rem] px-4 pt-24 pb-24 sm:px-6 lg:pt-28">
        <WatchView
          item={watching}
          playlist={playlist}
          library={items}
          now={now}
          watched={watched}
          onSelect={play}
          onBack={backToLibrary}
        />
      </div>
    );
  }

  return (
    <div className="font-ui mx-auto grid max-w-[120rem] gap-8 px-4 pt-24 pb-24 sm:px-6 lg:pt-28 xl:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden xl:block">
        <div className="sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-2 pb-6">
          <Sidebar
            filters={filters}
            total={items.length}
            categories={categories}
            series={series}
            conferences={conferences}
            speakers={speakers}
            hasHistory={watched.size > 0}
            onFilter={updateFilters}
            onClearHistory={clearHistory}
          />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <h1 className="text-[clamp(2.2rem,1.8rem+1.6vw,3.2rem)] leading-tight">
              Media Library
            </h1>
            <p className="font-display text-muted text-[1.2rem] italic">
              Messages, Teachings & Doctrinal Q&A
            </p>
          </div>
          <label className="text-muted flex items-center gap-2 text-[0.88rem]">
            Sort
            <select
              value={filters.sort}
              onChange={(event) => updateFilters({ sort: event.currentTarget.value as Sort })}
              className="bg-ink/[0.06] text-ink min-h-10 cursor-pointer rounded-lg px-3 py-1.5 font-medium"
            >
              {(Object.keys(SORT_LABELS) as Sort[]).map((sort) => (
                <option key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </label>
        </header>

        {/* Search and chips stay in reach while scrolling */}
        <div className="bg-paper sticky top-20 z-20 -mx-4 mt-5 px-4 py-3 sm:-mx-6 sm:px-6 lg:top-24">
          <form
            role="search"
            onSubmit={(event) => event.preventDefault()}
            className="border-rule bg-paper focus-within:border-ink/50 flex max-w-2xl overflow-hidden rounded-full border shadow-[inset_0_1px_2px_rgb(23_20_15/0.06)]"
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">Search messages</span>
              <input
                type="search"
                value={filters.query}
                onInput={(event) => updateFilters({ query: event.currentTarget.value })}
                placeholder="Search messages, speakers, series"
                className="text-ink placeholder:text-muted w-full bg-transparent px-5 py-2.5 text-[1rem] focus:outline-none"
              />
            </label>
            <span
              className="border-rule bg-ink/[0.04] flex w-16 items-center justify-center border-l"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" className="stroke-ink size-5 fill-none stroke-[1.8]">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m15.5 15.5 5 5" strokeLinecap="round" />
              </svg>
            </span>
          </form>
          <div
            role="group"
            aria-label="Filter"
            className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6"
          >
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                aria-pressed={c.active}
                onClick={() => updateFilters(c.patch)}
                className={chip}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-muted mt-4 text-[0.88rem]" aria-live="polite">
          {isDefaultView
            ? `${items.length} messages`
            : `${results.length} of ${items.length} messages`}
          {!isDefaultView && (
            <button
              type="button"
              onClick={() => updateFilters(DEFAULT_FILTERS)}
              className="text-ink decoration-rule hover:decoration-ink ml-3 font-medium underline underline-offset-4"
            >
              Clear filters
            </button>
          )}
        </p>

        {results.length === 0 ? (
          <p className="font-display text-ink mt-16 max-w-xl text-[2rem] leading-snug">
            No messages match your search.
          </p>
        ) : (
          <ul
            id="all-messages"
            className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          >
            {results.slice(0, shown).map((item, index) => (
              <VideoCard
                key={item.id}
                item={item}
                now={now}
                watched={watched.has(item.id)}
                eager={index < 4}
                priority={index === 0}
                onPlay={play}
              />
            ))}
          </ul>
        )}
        {shown < results.length && <div ref={sentinel} className="h-px" aria-hidden="true" />}
      </div>
    </div>
  );
}
