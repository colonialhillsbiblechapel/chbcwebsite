import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { buildEntries, highlight, search, sections, type Entry } from './hymn-index';
import { Icon } from './icons';
import { HymnReader } from './HymnReader';
import { Presenter, type DeckHymn, type Position } from './Presenter';
import {
  loadService,
  resolve,
  sameItem,
  saveService,
  tuneName,
  type Chosen,
  type ServiceItem,
} from './service';
import { slidesFor } from './slides';
import { SecondScreenNotice } from './SecondScreen';
import { SundayWelcome } from './SundayWelcome';
import { lyrics, type HymnIndexData, type Hymnal } from './vault';

interface Props {
  data: HymnIndexData;
  onLock: () => void;
}

/** Where we are is part of the address (#book=praise, #book=praise&hymn=332), so Back works. */
function fromUrl() {
  const params = new URLSearchParams(location.hash.slice(1));
  return { book: params.get('book') ?? '', hymn: params.get('hymn') ?? '' };
}
const toUrl = (book: string, hymn = '') =>
  book ? `#${new URLSearchParams(hymn ? { book, hymn } : { book })}` : location.pathname;

/** Each hymnal keeps the color of its printed cover. */
const isRed = (book: Hymnal) => book.id === 'praise';

/**
 * The hymns, as used in the chapel: choose a hymnal, read a hymn, add hymns to the service list,
 * put them in order, then present them on the screen, slide by slide.
 */
export function HymnApp({ data, onLock }: Props) {
  const [bookId, setBookId] = useState(() => fromUrl().book);
  const [hymnNumber, setHymnNumber] = useState(() => fromUrl().hymn);
  const [query, setQuery] = useState('');
  const [service, setService] = useState<ServiceItem[]>(loadService);
  const [presenting, setPresenting] = useState<{ deck: DeckHymn[]; start: Position } | null>(null);
  const [opening, setOpening] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const book = data.books.find((b) => b.id === bookId);
  const allEntries = useMemo(() => buildEntries(data.books), [data]);
  const bookEntries = useMemo(
    () => (book ? allEntries.filter((e) => e.book === book) : []),
    [allEntries, book],
  );
  const results = useMemo(
    () => (query ? search(book ? bookEntries : allEntries, query) : []),
    [query, book, bookEntries, allEntries],
  );
  const bookSections = useMemo(() => sections(bookEntries), [bookEntries]);

  useEffect(() => {
    const onPop = () => {
      const route = fromUrl();
      setBookId(route.book);
      setHymnNumber(route.hymn);
      setQuery('');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = (book: string, hymn = '') => {
    history.pushState(null, '', toUrl(book, hymn));
    setBookId(book);
    setHymnNumber(hymn);
    if (!hymn) setQuery('');
    top.current?.scrollIntoView({ block: 'start' });
  };
  const openBook = (id: string) => go(id);
  const openHymn = (c: Chosen) => go(c.book.id, c.hymn.number);

  /** Opens the words of every hymnal in the list, then presents from `start`. */
  const present = async (items: Chosen[], start: Position = { hymn: 0, slide: 0 }) => {
    if (items.length === 0) return;
    setOpening(true);
    try {
      const books = [...new Set(items.map((c) => c.book.id))];
      const words = new Map(
        await Promise.all(books.map(async (id) => [id, await lyrics(id)] as const)),
      );
      const deck = items.map((c) => ({
        slides: slidesFor(c, words.get(c.book.id)?.get(c.hymn.number)),
      }));
      setPresenting({ deck, start });
    } catch {
      // The words couldn't be opened: present the title slides only.
      setPresenting({ deck: items.map((c) => ({ slides: slidesFor(c) })), start });
    } finally {
      setOpening(false);
    }
  };

  // "/" or Ctrl/⌘+K to search; Escape clears. F5 — a clicker's start button, as in PowerPoint —
  // presents the service list (rather than reloading the page).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (presenting) return;
      if (event.key === 'F5' && service.length > 0 && bookId !== 'welcome') {
        event.preventDefault();
        presentList.current();
        return;
      }
      const typing = (event.target as HTMLElement).closest('input, textarea, select');
      if (
        (event.key === '/' && !typing) ||
        (event.key === 'k' && (event.metaKey || event.ctrlKey))
      ) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (event.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenting, service.length, bookId]);

  const updateService = (items: ServiceItem[]) => {
    setService(items);
    saveService(items);
  };
  const itemOf = (entry: Entry): ServiceItem => ({
    book: entry.book.id,
    number: entry.hymn.number,
  });
  const isChosen = (entry: Entry) => service.some((i) => sameItem(i, itemOf(entry)));
  const toggle = (entry: Entry) => {
    const item = itemOf(entry);
    updateService(
      service.some((i) => sameItem(i, item))
        ? service.filter((i) => !sameItem(i, item))
        : [...service, item],
    );
  };
  const chosen = useMemo(() => resolve(service, data), [service, data]);
  const presentList = useRef(() => {});
  presentList.current = () => void present(chosen);
  const closePresenter = useCallback(() => setPresenting(null), []);

  const row = (entry: Entry, showBook: boolean) => {
    const selected = isChosen(entry);
    const c = { hymn: entry.hymn, book: entry.book };
    return (
      <li
        key={`${entry.book.id}-${entry.hymn.number}`}
        className="border-rule/70 flex items-center gap-1 border-b sm:gap-2"
      >
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => toggle(entry)}
          title={selected ? 'In the service list — tap to remove' : 'Add to the service list'}
          className="group/check -ml-2.5 flex size-11 shrink-0 items-center justify-center rounded-full"
        >
          <span
            className={`flex size-6 items-center justify-center rounded-full ring-1 transition-colors ${selected ? 'bg-ink ring-ink text-paper' : 'ring-rule group-hover/check:ring-ink/60 group-hover/check:text-ink/40 text-transparent'}`}
          >
            <Icon name="check" className="size-3.5" />
          </span>
          <span className="sr-only">
            Hymn {entry.hymn.number}: {selected ? 'in the service list' : 'add to the service list'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => openHymn(c)}
          className="group/row flex min-w-0 flex-1 items-center gap-3 py-3.5 pr-2 text-left sm:gap-5"
        >
          <span
            className={`font-display w-12 shrink-0 text-[1.55rem] leading-none lining-nums tabular-nums sm:w-16 sm:text-[1.8rem] ${isRed(entry.book) ? 'text-pew' : 'text-ink'}`}
          >
            {entry.hymn.number}
          </span>
          <span className="min-w-0">
            <span className="font-display text-ink group-hover/row:text-gold-ink block text-[1.22rem] leading-snug transition-colors sm:text-[1.32rem]">
              {highlight(entry.hymn.title, query).map((part, i) =>
                part.match ? (
                  <mark key={i} className="bg-gold-tint text-ink rounded-sm px-0.5">
                    {part.text}
                  </mark>
                ) : (
                  part.text
                ),
              )}
            </span>
            <span className="text-muted mt-0.5 block truncate text-[0.74rem] tracking-[0.12em] uppercase">
              {showBook && (
                <span className={isRed(entry.book) ? 'text-pew' : 'text-ink'}>
                  {entry.book.cover} ·{' '}
                </span>
              )}
              {tuneName(entry.hymn.tune)}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => void present([c])}
          disabled={opening}
          title={`Present hymn ${entry.hymn.number} now`}
          className="text-ink-soft ring-rule hover:bg-ink hover:text-paper hover:ring-ink hidden size-11 shrink-0 items-center justify-center rounded-full ring-1 transition-colors sm:flex"
        >
          <Icon name="play" className="size-4" />
          <span className="sr-only">Present hymn {entry.hymn.number} now</span>
        </button>
      </li>
    );
  };

  const searchField = (placeholder: string) => (
    <label className="border-rule bg-paper focus-within:border-ink/50 flex min-h-12 flex-1 items-center gap-3 rounded-full border px-5 shadow-[inset_0_1px_2px_rgb(23_20_15/0.06)]">
      <Icon name="search" className="text-muted size-5" />
      <span className="sr-only">Search hymns</span>
      <input
        ref={searchRef}
        type="search"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        autoComplete="off"
        spellcheck={false}
        className="placeholder:text-muted min-w-0 flex-1 bg-transparent text-[1rem] outline-none"
      />
      {query ? (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="text-muted hover:text-ink -mr-2 flex size-9 items-center justify-center rounded-full"
        >
          <Icon name="close" className="size-4" />
          <span className="sr-only">Clear search</span>
        </button>
      ) : (
        <kbd className="text-muted border-rule hidden rounded border px-1.5 py-0.5 text-[0.75rem] sm:block">
          /
        </kbd>
      )}
    </label>
  );

  const searchResults = (
    <>
      <p className="text-muted mt-6 text-[0.9rem]" aria-live="polite">
        {results.length} {results.length === 1 ? 'hymn' : 'hymns'} found
      </p>
      {results.length > 0 ? (
        <ol className="mt-2">{results.map((e) => row(e, !book))}</ol>
      ) : (
        <p className="font-display text-ink mt-8 text-[1.5rem]">
          No hymn matches “{query}”. Try a number, a few words of the first line, or a tune.
        </p>
      )}
    </>
  );

  const lockButton = (
    <button
      type="button"
      onClick={onLock}
      className="text-ink hover:bg-ink/[0.07] -mr-3 inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[0.88rem] font-medium"
    >
      <Icon name="lock" className="size-4" />
      Lock
    </button>
  );

  return (
    <div
      ref={top}
      className={`font-ui scroll-mt-20 lg:scroll-mt-28 ${service.length ? 'pb-36' : ''}`}
    >
      <SecondScreenNotice />
      {bookId === 'welcome' ? (
        /* ——— The Sunday welcome slides ——— */
        <SundayWelcome onBack={() => openBook('')} lockButton={lockButton} />
      ) : book && hymnNumber ? (
        /* ——— One hymn, to read ——— */
        (() => {
          const at = book.hymns.findIndex((h) => h.number === hymnNumber);
          const hymn = book.hymns[at];
          if (!hymn) return <p className="text-muted">That hymn isn’t in this hymnal.</p>;
          const c = { hymn, book };
          const near = (i: number) => {
            const h = book.hymns[i];
            return h ? { hymn: h, book } : undefined;
          };
          const entry = bookEntries[at];
          return (
            <HymnReader
              chosen={c}
              previous={near(at - 1)}
              next={near(at + 1)}
              inList={!!entry && isChosen(entry)}
              onToggle={() => entry && toggle(entry)}
              onPresent={() => void present([c])}
              onOpen={openHymn}
              onBack={() => openBook(book.id)}
            />
          );
        })()
      ) : book ? (
        /* ——— One hymnal ——— */
        <div>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => openBook('')}
              className="text-ink hover:bg-ink/[0.07] -ml-3 inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[0.88rem] font-medium"
            >
              <Icon name="back" className="size-4" />
              All hymnals
            </button>
            {lockButton}
          </div>
          <header className="mt-8 text-center">
            <p
              className={`text-[0.78rem] font-semibold tracking-[0.24em] uppercase ${isRed(book) ? 'text-pew' : 'text-ink-soft'}`}
            >
              {book.book} · {book.cover}
            </p>
            <h2 className="text-section mt-4">{book.title}</h2>
            <p className="font-display text-ink-soft mx-auto mt-4 max-w-xl text-[1.15rem] italic">
              “{book.verse.text}”
            </p>
            <p className="label mt-2">{book.verse.reference}</p>
          </header>

          <div className="bg-paper border-rule sticky top-20 z-20 -mx-5 mt-10 border-b px-5 pt-3 pb-2 sm:-mx-10 sm:px-10 lg:top-24">
            {searchField('Search by number, first line or tune')}
            {!query && (
              <nav
                aria-label="Quick navigation"
                className="-mx-1 mt-2 flex gap-1 overflow-x-auto px-1 pb-1"
              >
                {bookSections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      document.getElementById(s.id)?.scrollIntoView({ block: 'start' })
                    }
                    className="text-ink-soft hover:bg-ink/[0.07] hover:text-ink inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-[0.82rem] whitespace-nowrap tabular-nums"
                  >
                    {s.short}
                  </button>
                ))}
              </nav>
            )}
          </div>

          {query ? (
            searchResults
          ) : (
            <>
              <p className="text-muted mt-6 text-[0.9rem]">
                {bookEntries.length} hymns · tap a hymn to read it, the circle to add it to the
                service list
              </p>
              {bookSections.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="mt-8 scroll-mt-48"
                  aria-labelledby={`${s.id}-h`}
                >
                  <h3
                    id={`${s.id}-h`}
                    className="text-muted flex items-center gap-4 text-[0.78rem] font-semibold tracking-[0.2em] uppercase"
                  >
                    {s.label}
                    <span className="bg-rule h-px flex-1" aria-hidden="true" />
                  </h3>
                  <ol className="mt-2">{s.entries.map((e) => row(e, false))}</ol>
                </section>
              ))}
            </>
          )}
        </div>
      ) : (
        /* ——— The shelf: choose a hymnal, or search both ——— */
        <div>
          <div className="flex items-center justify-between gap-4">
            <p className="label">Select a hymnal</p>
            {lockButton}
          </div>
          <div className="mt-5">{searchField('Search both hymnals')}</div>
          {query ? (
            searchResults
          ) : (
            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:gap-10">
              {data.books.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => openBook(b.id)}
                  className={`group relative block aspect-[3/4] w-full overflow-hidden rounded-l-[3px] rounded-r-lg text-left shadow-[0_30px_50px_-28px_rgb(23_20_15/0.75)] transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:shadow-[0_40px_60px_-28px_rgb(23_20_15/0.8)] ${isRed(b) ? 'bg-pew' : 'bg-ink'}`}
                >
                  {/* cloth grain, spine and gold-tooled frame of a hardback hymnal */}
                  <span
                    className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.035)_0_1px,transparent_1px_3px)]"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute inset-y-0 left-0 w-[9%] bg-gradient-to-r from-black/50 via-black/20 to-white/5"
                    aria-hidden="true"
                  />
                  <span
                    className="border-gold-light/55 absolute inset-y-[6%] right-[7%] left-[15%] border"
                    aria-hidden="true"
                  >
                    <span className="border-gold-light/30 absolute inset-1.5 border" />
                  </span>
                  <span className="absolute inset-y-[6%] right-[7%] left-[15%] flex flex-col items-center justify-center p-3 text-center sm:p-6">
                    <span className="text-gold-light text-[0.6rem] font-semibold tracking-[0.24em] uppercase sm:text-[0.72rem]">
                      {b.cover}
                    </span>
                    <span className="font-display text-gold-light mt-3 text-[1.15rem] leading-[1.15] sm:mt-5 sm:text-[2rem]">
                      {b.title}
                    </span>
                    <span
                      className="bg-gold-light/60 my-3 h-px w-8 sm:my-5 sm:w-12"
                      aria-hidden="true"
                    />
                    <span className="font-display text-paper/75 hidden max-w-[16rem] text-[0.98rem] leading-snug italic sm:block">
                      “{b.verse.text}”
                    </span>
                    <span className="text-gold-light/90 mt-2 hidden text-[0.68rem] tracking-[0.16em] uppercase sm:block">
                      {b.verse.reference}
                    </span>
                    <span className="text-paper/75 mt-auto text-[0.72rem] sm:text-[0.82rem]">
                      <span className="hidden sm:inline">{b.book} · </span>
                      {b.hymns.length} hymns
                    </span>
                  </span>
                </button>
              ))}
              {/* The Sunday welcome: prepared and presented from a computer, so not on phones. */}
              <button
                type="button"
                onClick={() => openBook('welcome')}
                className="group border-rule col-span-2 hidden w-full grid-cols-[1.2fr_1fr] overflow-hidden rounded-lg border bg-white/70 text-left shadow-[0_30px_50px_-34px_rgb(23_20_15/0.6)] transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_40px_60px_-34px_rgb(23_20_15/0.7)] sm:grid"
              >
                <img
                  src="/hymns/welcome/thumb-classic.jpg"
                  alt=""
                  className="aspect-video size-full object-cover"
                />
                <span className="flex flex-col justify-center p-6 lg:p-8">
                  <span className="text-ink-soft text-[0.72rem] font-semibold tracking-[0.22em] uppercase">
                    Every Lord’s Day
                  </span>
                  <span className="font-display text-ink group-hover:text-gold-ink mt-2 text-[1.9rem] leading-tight transition-colors">
                    Sunday welcome
                  </span>
                  <span className="text-ink-soft mt-2 text-[0.95rem] leading-relaxed">
                    The welcome, the week’s chorus, our welcome song, and the birthday and
                    anniversary songs, ready to present.
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {service.length > 0 && !presenting && bookId !== 'welcome' && (
        <ServiceTray
          chosen={chosen}
          onReorder={(items) =>
            updateService(items.map((c) => ({ book: c.book.id, number: c.hymn.number })))
          }
          onClear={() => updateService([])}
          onPresent={(start) => void present(chosen, { hymn: start, slide: 0 })}
        />
      )}

      {presenting && presenting.deck.length > 0 && (
        <Presenter deck={presenting.deck} start={presenting.start} onClose={closePresenter} />
      )}
    </div>
  );
}

/** The service list, docked at the bottom: reorder, remove, choose the slide style, present. */
function ServiceTray({
  chosen,
  onReorder,
  onClear,
  onPresent,
}: {
  chosen: Chosen[];
  onReorder: (items: Chosen[]) => void;
  onClear: () => void;
  onPresent: (start: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= chosen.length || from === to) return;
    const items = [...chosen];
    const [moved] = items.splice(from, 1);
    if (moved) items.splice(to, 0, moved);
    onReorder(items);
  };
  const remove = (at: number) => onReorder(chosen.filter((_, i) => i !== at));

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 p-3 sm:p-5">
      <div
        role="region"
        aria-label="Service list"
        className="text-paper pointer-events-auto mx-auto max-w-3xl overflow-hidden rounded-2xl bg-[#1d1915] shadow-[0_30px_70px_-20px_rgb(0_0_0/0.6)] ring-1 ring-white/10"
      >
        {open && (
          <div className="max-h-[55svh] overflow-y-auto border-b border-white/10 p-3 sm:p-4">
            <ol className="space-y-1.5">
              {chosen.map((c, i) => (
                <li
                  key={`${c.book.id}-${c.hymn.number}`}
                  draggable
                  onDragStart={() => setDragging(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragging !== null) move(dragging, i);
                    setDragging(null);
                  }}
                  onDragEnd={() => setDragging(null)}
                  className={`flex items-center gap-2 rounded-xl bg-white/[0.06] py-1.5 pr-1.5 pl-2 ${dragging === i ? 'opacity-40' : ''}`}
                >
                  <Icon name="grip" className="size-5 cursor-grab text-white/35" />
                  <span className="w-5 text-center text-[0.8rem] text-white/50 tabular-nums">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onPresent(i)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-white/5"
                    title="Present from this hymn"
                  >
                    <span
                      className={`inline-flex h-7 min-w-11 items-center justify-center rounded-full px-2 text-[0.82rem] font-semibold tabular-nums ${isRed(c.book) ? 'bg-pew' : 'bg-white/15'}`}
                    >
                      {c.hymn.number}
                    </span>
                    <span className="truncate text-[0.95rem]">{c.hymn.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className="flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-25"
                  >
                    <Icon name="up" className="size-4" />
                    <span className="sr-only">Move up</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === chosen.length - 1}
                    className="flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-25"
                  >
                    <Icon name="down" className="size-4" />
                    <span className="sr-only">Move down</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
                  >
                    <Icon name="close" className="size-4" />
                    <span className="sr-only">Remove hymn {c.hymn.number}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex justify-end px-1">
              <button
                type="button"
                onClick={onClear}
                className="min-h-10 rounded-full px-4 text-[0.88rem] text-white/75 ring-1 ring-white/20 hover:bg-white/10"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 p-2.5 pl-3 sm:gap-3 sm:p-3 sm:pl-4">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-left hover:bg-white/5"
          >
            <span className="font-display text-[1.7rem] leading-none text-[#e2c98f] lining-nums tabular-nums">
              {chosen.length}
            </span>
            <span className="min-w-0">
              <span className="block text-[0.9rem] font-medium">Service list</span>
              <span className="block truncate text-[0.78rem] text-white/55 tabular-nums">
                {chosen.map((c) => c.hymn.number).join(' · ')}
              </span>
            </span>
            <Icon name={open ? 'down' : 'up'} className="ml-auto size-4 text-white/60" />
          </button>
          <button
            type="button"
            onClick={() => onPresent(0)}
            className="inline-flex min-h-12 shrink-0 items-center gap-2.5 rounded-xl bg-[#e2c98f] px-5 font-semibold text-[#1d1915] transition-colors hover:bg-[#ecd8a6] sm:px-6"
          >
            <Icon name="play" className="size-4" />
            Present
          </button>
        </div>
      </div>
    </div>
  );
}
