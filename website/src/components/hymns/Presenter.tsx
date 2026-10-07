import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { CHANNEL, type Blank, type DisplayMessage } from './display';
import { Icon, type IconName } from './icons';
import { actionFor, wheelStepper, type Action } from './keys';
import { hasSecondScreen, openProjector } from './screens';
import { Slide } from './Slide';
import { preview, type SlideData } from './slides';
import { rememberedKey } from './vault';

/** One hymn of the service list, with its slides — or one part of the Sunday welcome. */
export interface DeckHymn {
  slides: SlideData[];
  /** For a part that isn't a hymn: its name and its place, for the list and the controls. */
  name?: string;
  badge?: string;
}

export interface Position {
  hymn: number;
  slide: number;
}

interface Props {
  deck: DeckHymn[];
  start: Position;
  onClose: () => void;
  /** What the list of the deck is called ("Service list", "Sunday welcome"). */
  listName?: string;
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

/**
 * Presents the deck slide by slide, like PowerPoint's slide show. With a second screen connected,
 * the slides open full screen on it and this window becomes the presenter view: what's showing,
 * what's next, and every slide of the hymn. With one screen, the slides fill this one, and the
 * controls appear only when the mouse moves.
 *
 * Every presentation clicker works (keys.ts), in this window or the projector's. (No web page can
 * hear a clicker while another program is in front: keep the browser the active window.)
 */
export function Presenter({ deck, start, onClose, listName = 'Service list' }: Props) {
  const [pos, setPos] = useState<Position>(start);
  const [blank, setBlank] = useState<Blank>(false);
  const [controls, setControls] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [projector, setProjector] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /** Counts "hello"s from the projector window, so it is brought up to date each time it opens. */
  const [hellos, setHellos] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number>(0);
  const togglingFullscreen = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const displayWindow = useRef<Window | null>(null);
  /** A slide number being typed (PowerPoint: the number, then Enter). */
  const typed = useRef({ digits: '', at: 0 });

  const hymn = deck[pos.hymn];
  const slide = hymn?.slides[pos.slide];
  const opening = hymn?.slides[0];
  const chosen = opening && 'chosen' in opening ? opening.chosen : undefined;
  const isFirst = pos.hymn === 0 && pos.slide === 0;
  const isLast = pos.hymn === deck.length - 1 && pos.slide === (hymn?.slides.length ?? 1) - 1;
  /** Every slide of the deck in order, for "first", "last" and going to a slide by its number. */
  const every = deck.flatMap((h, i) => h.slides.map((_, j) => ({ hymn: i, slide: j })));

  const show = useCallback((next: Position) => {
    setPos(next);
    setBlank(false);
  }, []);
  const step = useCallback(
    (by: 1 | -1) =>
      setPos((p) => {
        const count = deck[p.hymn]?.slides.length ?? 1;
        if (by === 1) {
          if (p.slide < count - 1) return { hymn: p.hymn, slide: p.slide + 1 };
          return p.hymn < deck.length - 1 ? { hymn: p.hymn + 1, slide: 0 } : p;
        }
        if (p.slide > 0) return { hymn: p.hymn, slide: p.slide - 1 };
        if (p.hymn === 0) return p;
        return { hymn: p.hymn - 1, slide: (deck[p.hymn - 1]?.slides.length ?? 1) - 1 };
      }),
    [deck],
  );
  const next = useCallback(() => {
    step(1);
    setBlank(false);
  }, [step]);
  const previous = useCallback(() => {
    step(-1);
    setBlank(false);
  }, [step]);
  const jumpHymn = useCallback(
    (by: 1 | -1) => show({ hymn: Math.max(0, Math.min(deck.length - 1, pos.hymn + by)), slide: 0 }),
    [deck.length, pos.hymn, show],
  );

  // The controls appear only when the mouse moves, and fade after a few seconds.
  const wake = useCallback(() => {
    setControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControls(false), 2800);
  }, []);

  const toggleFullscreen = useCallback(() => {
    togglingFullscreen.current = true;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void root.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  /** Opens the projector window: full screen on the second screen, where there is one. */
  const openSecondScreen = useCallback(async () => {
    displayWindow.current = await openProjector();
    return !!displayWindow.current;
  }, []);

  // Straight away: on the second screen if one is connected, else full screen here. And stop the
  // page behind from scrolling.
  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    void (async () => {
      if (hasSecondScreen() && (await openSecondScreen())) return;
      await root.current?.requestFullscreen?.().catch(() => wake());
    })();
    return () => {
      document.documentElement.classList.remove('overflow-hidden');
      window.clearTimeout(hideTimer.current);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [openSecondScreen, wake]);

  // Leaving full screen with Esc ends the presentation (unless it was our own toggle).
  useEffect(() => {
    const onChange = () => {
      const now = !!document.fullscreenElement;
      setFullscreen(now);
      if (!now && !togglingFullscreen.current && !displayWindow.current) onClose();
      togglingFullscreen.current = false;
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [onClose]);

  /** What a key, clicker button, click or wheel does — here or in the projector window. */
  const act = useCallback(
    (action: Action) => {
      if (action === 'next') next();
      else if (action === 'previous') previous();
      else if (action === 'nextPart') jumpHymn(1);
      else if (action === 'previousPart') jumpHymn(-1);
      else if (action === 'first' && every[0]) show(every[0]);
      else if (action === 'last' && every.at(-1)) show(every.at(-1) as Position);
      else if (action === 'black') setBlank((b) => (b === 'black' ? false : 'black'));
      else if (action === 'white') setBlank((b) => (b === 'white' ? false : 'white'));
      else if (action === 'fullscreen') toggleFullscreen();
      else if (action === 'list') {
        setListOpen((open) => !open);
        wake();
      } else if (action === 'end') {
        if (listOpen) setListOpen(false);
        else onClose();
      }
      // "start" (F5, a clicker's start button): already presenting — and never reload the page.
    },
    [next, previous, jumpHymn, every, show, toggleFullscreen, wake, listOpen, onClose],
  );

  /** A key press here or in the projector window; true if it was ours. */
  const press = useCallback(
    (event: Parameters<typeof actionFor>[0]) => {
      const t = typed.current;
      if (/^[0-9]$/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
        t.digits = (performance.now() - t.at < 2000 ? t.digits : '') + event.key;
        t.at = performance.now();
        return true;
      }
      if (event.key === 'Enter' && t.digits && performance.now() - t.at < 4000) {
        const target = every[Number(t.digits) - 1];
        t.digits = '';
        if (target) show(target);
        return true;
      }
      t.digits = '';
      const action = actionFor(event);
      if (!action) return false;
      act(action);
      return true;
    },
    [act, every, show],
  );

  // Keyboard and clickers. The controls stay hidden while presenting with them, so nothing
  // flashes up on the chapel screen. Attached as the slide appears, so no press is missed.
  useLayoutEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (press(event)) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  // Clickers that act as a mouse: the wheel (or a swipe) goes on or back a slide.
  const wheel = useRef(wheelStepper());
  const onWheel = (event: WheelEvent) => {
    if (listOpen) return;
    const by = wheel.current(event);
    if (by === 1) next();
    else if (by === -1) previous();
  };

  // The projector window: tell it what to show whenever something changes, and act on the
  // clicker when that window is the one in front.
  const send = useCallback((message: DisplayMessage) => channel.current?.postMessage(message), []);
  const pressRef = useRef(press);
  pressRef.current = press;
  useEffect(() => {
    if (!('BroadcastChannel' in window)) return;
    const bc = new BroadcastChannel(CHANNEL);
    channel.current = bc;
    bc.onmessage = (event: MessageEvent<DisplayMessage>) => {
      if (event.data.type === 'press') {
        pressRef.current(event.data.press);
        return;
      }
      if (event.data.type !== 'hello') return;
      if (document.fullscreenElement) {
        togglingFullscreen.current = true;
        void document.exitFullscreen().catch(() => undefined);
      }
      // First the unlock key (so it can open the hymns), then — via the effect below — the slide.
      const key = rememberedKey();
      const message: DisplayMessage = { type: 'state', slide: 0, blank: 'black' };
      bc.postMessage(key ? { ...message, key: toBase64(key) } : message);
      setProjector(true);
      setHellos((n) => n + 1);
    };
    return () => {
      bc.postMessage({ type: 'end' } satisfies DisplayMessage);
      bc.close();
      channel.current = null;
    };
  }, []);
  useEffect(() => {
    if (!projector) return;
    send({
      type: 'state',
      item: chosen && { book: chosen.book.id, number: chosen.hymn.number },
      // A slide that isn't a hymn's is sent whole (it stays on this computer).
      content: chosen ? undefined : slide,
      slide: pos.slide,
      blank,
    });
  }, [projector, hellos, chosen, slide, pos.slide, blank, send]);

  // Notice when the projector window is closed.
  useEffect(() => {
    if (!projector) return;
    const timer = window.setInterval(() => {
      if (displayWindow.current?.closed) {
        displayWindow.current = null;
        setProjector(false);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [projector]);

  const count = `${pos.slide + 1}/${hymn?.slides.length ?? 1}`;
  const where = hymn?.name
    ? `${pos.hymn + 1} of ${deck.length} · ${hymn.name} · ${count}`
    : `Hymn ${pos.hymn + 1} of ${deck.length} · ${count}`;
  const label = (s: SlideData) =>
    s.kind === 'title' ? 'Title' : s.kind === 'welcome' ? 'Welcome' : s.label;

  /** Every hymn in the service list, with the slides of the current one. */
  const outline = (dark: 'panel' | 'overlay') => (
    <ol className="space-y-1">
      {deck.map((h, i) => {
        const first = h.slides[0];
        const c = first && 'chosen' in first ? first.chosen : undefined;
        const name = h.name ?? c?.hymn.title;
        const badge = h.badge ?? c?.hymn.number;
        if (!name) return null;
        const open = i === pos.hymn;
        return (
          <li key={`${i}-${c?.book.id ?? ''}-${badge ?? ''}`}>
            <button
              type="button"
              onClick={() => {
                show({ hymn: i, slide: 0 });
                if (dark === 'overlay') setListOpen(false);
              }}
              aria-current={open ? 'true' : undefined}
              className="grid w-full grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3 rounded-lg px-3 py-2.5 text-left text-white/80 transition-colors hover:bg-white/10 aria-[current]:bg-white/15 aria-[current]:text-white"
            >
              <span
                className={`inline-flex h-7 items-center justify-center rounded-full text-[0.8rem] font-semibold tabular-nums ${c?.book.id === 'praise' ? 'bg-pew' : 'bg-white/15'}`}
              >
                {badge}
              </span>
              <span className="truncate text-[0.92rem]">{name}</span>
            </button>
            {open && (
              <ol className="mt-1 mb-2 ml-[3.25rem] space-y-0.5 border-l border-white/10 pl-2">
                {h.slides.map((s, j) => (
                  <li key={j}>
                    <button
                      type="button"
                      onClick={() => show({ hymn: i, slide: j })}
                      aria-current={j === pos.slide ? 'true' : undefined}
                      className="w-full rounded-md px-2 py-1.5 text-left text-white/60 hover:bg-white/10 hover:text-white aria-[current]:bg-[#e2c98f] aria-[current]:text-[#1d1915]"
                    >
                      <span className="block text-[0.7rem] font-semibold tracking-[0.14em] uppercase opacity-80">
                        {label(s)}
                      </span>
                      <span className="block truncate text-[0.85rem]">{preview(s)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </li>
        );
      })}
    </ol>
  );

  const button = (
    text: string,
    icon: IconName,
    onClick: () => void,
    pressed?: boolean,
    disabled?: boolean,
  ) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      disabled={disabled}
      title={text}
      className="inline-flex size-11 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-30 aria-pressed:bg-white aria-pressed:text-black"
    >
      <Icon name={icon} className="size-5" />
      <span className="sr-only">{text}</span>
    </button>
  );

  // With a projector window: this window is the control panel.
  if (projector) {
    const nextSlide =
      hymn && pos.slide < hymn.slides.length - 1
        ? hymn.slides[pos.slide + 1]
        : deck[pos.hymn + 1]?.slides[0];
    return (
      <div
        ref={root}
        role="dialog"
        aria-label="Presenting hymns"
        className="font-ui fixed inset-0 z-[70] overflow-y-auto bg-[#141210] p-5 text-white sm:p-8"
      >
        <div className="mx-auto grid max-w-[100rem] gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section aria-label="On the screen now" className="min-w-0">
            <p className="mb-3 flex items-center gap-2 text-[0.8rem] tracking-[0.18em] text-white/60 uppercase">
              <span className="size-2 rounded-full bg-red-500" aria-hidden="true" />
              On the screen now · {where}
            </p>
            <Slide slide={slide} blank={blank} className="aspect-video w-full rounded-xl" />
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={previous}
                disabled={isFirst}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white/10 px-5 font-medium hover:bg-white/20 disabled:opacity-30"
              >
                <Icon name="prev" className="size-5" /> Previous
              </button>
              <button
                type="button"
                onClick={next}
                disabled={isLast}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-black hover:bg-white/90 disabled:opacity-30"
              >
                Next <Icon name="next" className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => act('black')}
                aria-pressed={!!blank}
                className="inline-flex min-h-12 items-center gap-2 rounded-full px-5 font-medium text-white/85 ring-1 ring-white/25 hover:bg-white/10 aria-pressed:bg-white aria-pressed:text-black"
              >
                <Icon name="blank" className="size-4" />
                {blank ? 'Show the slide' : 'Blank screen'}
                <kbd className="text-[0.75rem] opacity-60">B</kbd>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="ml-auto inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-white/80 ring-1 ring-white/25 hover:bg-white/10"
              >
                End
              </button>
            </div>

            {/* Every slide of this hymn, like the slide sorter in PowerPoint */}
            {hymn && (
              <ol className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {hymn.slides.map((s, j) => (
                  <li key={j}>
                    <button
                      type="button"
                      onClick={() => show({ hymn: pos.hymn, slide: j })}
                      aria-current={j === pos.slide ? 'true' : undefined}
                      className="block w-full rounded-lg p-1 text-left ring-2 ring-transparent hover:ring-white/30 aria-[current]:ring-[#e2c98f]"
                    >
                      <Slide
                        slide={s}
                        className="pointer-events-none aspect-video w-full rounded-md"
                      />
                      <span className="mt-1.5 block px-1 text-[0.7rem] font-semibold tracking-[0.12em] text-white/60 uppercase">
                        {j + 1} · {label(s)}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <aside className="space-y-6">
            <div>
              <p className="mb-3 text-[0.8rem] tracking-[0.18em] text-white/60 uppercase">Next</p>
              {nextSlide ? (
                <Slide slide={nextSlide} className="aspect-video w-full rounded-lg opacity-90" />
              ) : (
                <p className="rounded-lg bg-white/5 p-6 text-white/60">The last slide.</p>
              )}
            </div>
            <div>
              <p className="mb-3 text-[0.8rem] tracking-[0.18em] text-white/60 uppercase">
                {listName}
              </p>
              {outline('panel')}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // Presenting in this window.
  return (
    <div
      ref={root}
      role="dialog"
      aria-label="Presenting hymns"
      onPointerMove={wake}
      onWheel={onWheel}
      onContextMenu={(event) => {
        // A right click (or a clicker's "back" button acting as one) goes back, as in PowerPoint.
        event.preventDefault();
        previous();
      }}
      // Paper behind the slide, not black: should the browser ever leave a hairline between the
      // tiles it draws a full-screen slide in, it shows paper, not a black line.
      className={`font-ui fixed inset-0 z-[70] text-white ${blank ? 'bg-black' : 'bg-[#f6f3ec]'} ${controls ? '' : 'cursor-none'}`}
    >
      <Slide slide={slide} blank={blank} className="absolute inset-0" />

      {/* Tap the left third to go back, anywhere else to go on (tablets). */}
      <button
        type="button"
        aria-label="Previous slide"
        tabIndex={-1}
        onClick={previous}
        className="absolute inset-y-0 left-0 w-1/3 cursor-[inherit]"
      />
      <button
        type="button"
        aria-label="Next slide"
        tabIndex={-1}
        onClick={next}
        className="absolute inset-y-0 right-0 w-2/3 cursor-[inherit]"
      />

      {listOpen && (
        <div className="absolute inset-y-0 left-0 z-10 w-[min(22rem,85vw)] overflow-y-auto bg-[#0d0c0b] p-4 pt-6 shadow-[20px_0_40px_rgb(0_0_0/0.5)]">
          <p className="mb-3 px-3 text-[0.8rem] tracking-[0.18em] text-white/60 uppercase">
            {listName}
          </p>
          {outline('overlay')}
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 z-20 flex justify-center p-4 transition-opacity duration-500 sm:p-6 ${controls || listOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-black/80 p-1.5 shadow-2xl ring-1 ring-white/10">
          {button('End (Esc)', 'close', onClose)}
          {button(`${listName} (L)`, 'list', () => setListOpen(!listOpen), listOpen)}
          <span className="mx-1 h-6 w-px bg-white/15" aria-hidden="true" />
          {button('Previous slide (←)', 'prev', previous, undefined, isFirst)}
          <span className="min-w-36 px-2 text-center text-[0.82rem] text-white/80 tabular-nums">
            {where}
          </span>
          {button('Next slide (→)', 'next', next, undefined, isLast)}
          <span className="mx-1 h-6 w-px bg-white/15" aria-hidden="true" />
          {button(
            blank ? 'Show the slide (B)' : 'Blank the screen (B)',
            'blank',
            () => act('black'),
            !!blank,
          )}
          {button(
            'Second screen — show on the projector',
            'monitor',
            () => void openSecondScreen(),
          )}
          {button(
            fullscreen ? 'Leave full screen (F)' : 'Full screen (F)',
            fullscreen ? 'exitFullscreen' : 'fullscreen',
            toggleFullscreen,
          )}
        </div>
      </div>
    </div>
  );
}
