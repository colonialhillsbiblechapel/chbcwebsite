import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Icon } from './icons';
import { Presenter, type DeckHymn, type Position } from './Presenter';
import { Slide } from './Slide';
import {
  chorusOf,
  clearPlan,
  deckFor,
  findChoruses,
  fromText,
  loadPlan,
  PICTURES,
  savePlan,
  toText,
  welcomeSlide,
  type Plan,
} from './sunday';
import { sunday, type Chorus, type Sunday } from './vault';

interface Props {
  onBack: () => void;
  lockButton: ComponentChildren;
}

const ART = '/hymns/welcome';

/**
 * The Sunday welcome, prepared and presented: choose the welcome picture and the week's chorus
 * (or none), change its words or write one, then present — the welcome, the chorus, our welcome
 * song, and the birthday and anniversary songs, each on its own painted slide.
 */
export function SundayWelcome({ onBack, lockButton }: Props) {
  const [data, setData] = useState<Sunday | null>(null);
  const [failed, setFailed] = useState(false);
  const [plan, setPlan] = useState<Plan>(loadPlan);
  const [presenting, setPresenting] = useState<{ deck: DeckHymn[]; start: Position } | null>(null);
  const [editing, setEditing] = useState<{ title: string; text: string; number?: number } | null>(
    null,
  );
  const [confirmClear, setConfirmClear] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    sunday()
      .then(setData)
      .catch(() => setFailed(true));
    // Fetch the paintings ahead, so the first showing of each slide is instant.
    for (const name of ['welcome', 'chorus', 'song', 'birthday', 'anniversary'])
      new Image().src = `${ART}/${name}.jpg`;
    new Image().src = `${ART}/brush.png`;
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const update = (next: Plan) => {
    setPlan(next);
    savePlan(next);
  };
  const chorus = useMemo(() => (data ? chorusOf(plan.chorus, data) : null), [plan.chorus, data]);
  const deck = useMemo(() => (data ? deckFor(plan, data, now) : []), [plan, data, now]);
  const present = (start: Position = { hymn: 0, slide: 0 }) => {
    if (!data) return;
    setPresenting({ deck: deckFor(plan, data, new Date()), start });
  };
  const closePresenter = useCallback(() => setPresenting(null), []);

  const editChorus = () => {
    if (chorus)
      setEditing({ title: chorus.title, text: toText(chorus.slides), number: chorus.from?.number });
  };
  const saveEdit = () => {
    if (!editing) return;
    const slides = fromText(editing.text);
    if (slides.length === 0) return;
    const original = data?.choruses.find((c) => c.number === editing.number);
    const unchanged =
      original &&
      editing.title === original.title &&
      JSON.stringify(slides) === JSON.stringify(original.slides.map((s) => s.lines));
    update({
      ...plan,
      chorus: unchanged
        ? { number: original.number }
        : {
            title: editing.title,
            slides,
            ...(editing.number === undefined ? {} : { number: editing.number }),
          },
    });
    setEditing(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="text-ink hover:bg-ink/[0.07] -ml-3 inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[0.88rem] font-medium"
        >
          <Icon name="back" className="size-4" />
          All hymnals
        </button>
        {lockButton}
      </div>

      <header className="mt-8 text-center">
        <p className="text-ink-soft text-[0.78rem] font-semibold tracking-[0.24em] uppercase">
          Every Lord’s Day
        </p>
        <h2 className="text-section mt-4">Sunday welcome</h2>
        <p className="text-ink-soft mx-auto mt-4 max-w-xl text-[1.05rem] leading-relaxed">
          The welcome, the week’s chorus, our welcome song, and the birthday and anniversary songs,
          each on its own slide. Choose, then present.
        </p>
      </header>

      <p className="font-display text-ink mt-12 text-center text-[1.35rem] sm:hidden">
        The Sunday welcome is prepared and presented from a computer. Please open this page on a
        laptop or desktop.
      </p>
      {failed ? (
        <p className="font-display text-ink mt-12 hidden text-center text-[1.4rem] sm:block">
          The choruses couldn’t be opened. Please check your connection and try again.
        </p>
      ) : !data ? (
        <p className="text-muted mt-12 hidden text-center sm:block">Opening the choruses…</p>
      ) : (
        <div className="mt-12 hidden gap-12 sm:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
          <div className="min-w-0 space-y-14">
            <Step number={1} title="The welcome" note="Shown first, as the chapel gathers.">
              <div
                role="radiogroup"
                aria-label="Welcome picture"
                className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
              >
                {PICTURES.map((p) => {
                  const selected = plan.picture === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => update({ ...plan, picture: p.id })}
                      className="group text-left"
                    >
                      <span
                        className={`block overflow-hidden rounded-md ring-2 transition-shadow ${selected ? 'ring-ink' : 'group-hover:ring-rule ring-transparent'}`}
                      >
                        {p.id === 'auto' || p.id === 'dated' ? (
                          <span aria-hidden="true" className="block">
                            <Slide
                              slide={welcomeSlide(p.id, now)}
                              className="pointer-events-none aspect-video w-full"
                            />
                          </span>
                        ) : (
                          <img
                            src={`${ART}/thumb-${p.id}.jpg`}
                            alt=""
                            loading="lazy"
                            className="aspect-video w-full object-cover"
                          />
                        )}
                      </span>
                      <span className="text-ink mt-2 flex items-center gap-1.5 text-[0.9rem] font-medium">
                        {selected && <Icon name="check" className="size-3.5" />}
                        {p.name}
                      </span>
                      <span className="text-muted block text-[0.78rem]">{p.note}</span>
                    </button>
                  );
                })}
              </div>
            </Step>

            <Step
              number={2}
              title="The chorus"
              note="Let us sing: find this week’s chorus, or present without one."
            >
              {chorus ? (
                <div className="border-rule rounded-lg border bg-white/60 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-ink text-[1.45rem] leading-tight">
                        {chorus.title}
                      </p>
                      <p className="text-muted mt-1 text-[0.85rem]">
                        {chorus.slides.length} {chorus.slides.length === 1 ? 'slide' : 'slides'}
                        {chorus.kind === 'edited' && ' · words changed on this device'}
                        {chorus.kind === 'own' && ' · written on this device'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <SmallButton onClick={editChorus}>Edit the words</SmallButton>
                      {chorus.kind === 'edited' && chorus.from && (
                        <SmallButton
                          onClick={() =>
                            chorus.from &&
                            update({ ...plan, chorus: { number: chorus.from.number } })
                          }
                        >
                          Use the original
                        </SmallButton>
                      )}
                      <SmallButton onClick={() => update({ ...plan, chorus: null })}>
                        No chorus
                      </SmallButton>
                    </div>
                  </div>
                  <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {deck[1]?.slides.map((s, j) => (
                      <li key={j}>
                        <span aria-hidden="true" className="block">
                          <Slide
                            slide={s}
                            className="pointer-events-none aspect-video w-full rounded"
                          />
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <p className="text-ink-soft border-rule rounded-lg border border-dashed px-5 py-4 text-[0.95rem]">
                  No chorus this week: the welcome is followed by our welcome song.
                </p>
              )}
              <ChorusSearch
                choruses={data.choruses}
                chosen={plan.chorus && 'slides' in plan.chorus ? undefined : plan.chorus?.number}
                onChoose={(c) => update({ ...plan, chorus: { number: c.number } })}
              />
              <button
                type="button"
                onClick={() => setEditing({ title: '', text: '' })}
                className="text-ink mt-3 text-[0.92rem] font-medium underline decoration-[#b38f4d] underline-offset-4 hover:decoration-2"
              >
                Write a chorus of your own
              </button>
            </Step>

            <Step
              number={3}
              title="Every week"
              note="Our welcome song, and the songs for birthdays and anniversaries, as always."
            >
              <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {deck.slice(-3).map((part) => (
                  <li key={part.name}>
                    <span aria-hidden="true" className="block">
                      <Slide
                        slide={part.slides[0]}
                        className="pointer-events-none aspect-video w-full rounded-md"
                      />
                    </span>
                    <p className="text-ink mt-2 text-[0.9rem] font-medium">{part.name}</p>
                  </li>
                ))}
              </ol>
            </Step>
          </div>

          {/* The slides in order, and Present. */}
          <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="The slides">
            <div className="border-rule rounded-xl border bg-white/70 p-4 shadow-[0_30px_60px_-45px_rgb(23_20_15/0.6)] sm:p-5">
              <p className="label">In order</p>
              <ol className="mt-4 space-y-2">
                {deck.map((part, i) => (
                  <li key={`${i}-${part.name}`}>
                    <button
                      type="button"
                      onClick={() => present({ hymn: i, slide: 0 })}
                      title="Present from here"
                      className="hover:bg-ink/[0.05] grid w-full grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 rounded-lg p-1.5 text-left"
                    >
                      <span aria-hidden="true" className="block">
                        <Slide
                          slide={part.slides[0]}
                          className="pointer-events-none aspect-video w-full rounded"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="text-ink block truncate text-[0.92rem] font-medium">
                          {part.name}
                        </span>
                        <span className="text-muted block text-[0.78rem]">
                          {part.slides.length} {part.slides.length === 1 ? 'slide' : 'slides'}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => present()}
                className="bg-ink text-paper mt-5 inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-lg text-[0.95rem] font-semibold transition-colors hover:bg-[#2b261d]"
              >
                <Icon name="play" className="size-4" />
                Present
              </button>
              <div className="mt-3 flex min-h-10 items-center justify-center gap-2 text-[0.85rem]">
                {confirmClear ? (
                  <>
                    <span className="text-ink-soft">Clear the chorus and choices?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPlan(clearPlan());
                        setConfirmClear(false);
                      }}
                      className="text-pew rounded-full px-3 py-1.5 font-semibold hover:bg-[#6b1f2b]/10"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="text-ink-soft hover:bg-ink/[0.07] rounded-full px-3 py-1.5"
                    >
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="text-ink-soft hover:bg-ink/[0.07] rounded-full px-3 py-1.5"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-muted mt-1 text-center text-[0.76rem] leading-snug">
                Your choices and any words you change are kept on this device only.
              </p>
            </div>
          </aside>
        </div>
      )}

      {editing && (
        <ChorusEditor
          editing={editing}
          eyebrow={data?.program.chorus.eyebrow ?? ''}
          onChange={setEditing}
          onSave={saveEdit}
          onCancel={() => setEditing(null)}
        />
      )}

      {presenting && presenting.deck.length > 0 && (
        <Presenter
          deck={presenting.deck}
          start={presenting.start}
          onClose={closePresenter}
          listName="Sunday welcome"
        />
      )}
    </div>
  );
}

function Step({
  number,
  title,
  note,
  children,
}: {
  number: number;
  title: string;
  note: string;
  children: ComponentChildren;
}) {
  return (
    <section aria-labelledby={`step-${number}`}>
      <div className="border-rule flex items-baseline gap-4 border-b pb-3">
        <span className="font-display text-gold-ink text-[1.9rem] leading-none lining-nums">
          {number}
        </span>
        <div>
          <h3 id={`step-${number}`} className="font-display text-ink text-[1.6rem] leading-tight">
            {title}
          </h3>
          <p className="text-muted text-[0.9rem]">{note}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SmallButton({ onClick, children }: { onClick: () => void; children: ComponentChildren }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-ink ring-rule hover:ring-ink/40 hover:bg-ink/[0.04] inline-flex min-h-9 items-center rounded-full px-3.5 text-[0.85rem] font-medium ring-1"
    >
      {children}
    </button>
  );
}

/** Search the choruses by title or words, or open the list and choose (a combobox). */
function ChorusSearch({
  choruses,
  chosen,
  onChoose,
}: {
  choruses: Chorus[];
  chosen?: number;
  onChoose: (c: Chorus) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const results = useMemo(() => findChoruses(choruses, query), [choruses, query]);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);
  useEffect(() => {
    document.getElementById(`chorus-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (c: Chorus) => {
    onChoose(c);
    setQuery('');
    setOpen(false);
    field.current?.blur();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };
  const first = (c: Chorus) => c.slides[0]?.lines.find((l) => l.trim()) ?? '';

  return (
    <div ref={box} className="relative mt-5">
      <div className="border-rule bg-paper focus-within:border-ink/50 flex min-h-12 items-center gap-3 rounded-full border pr-1.5 pl-5 shadow-[inset_0_1px_2px_rgb(23_20_15/0.06)]">
        <Icon name="search" className="text-muted size-5" />
        <input
          ref={field}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls="chorus-options"
          aria-activedescendant={open ? `chorus-option-${active}` : undefined}
          aria-label="Find a chorus"
          value={query}
          onInput={(e) => {
            setQuery((e.target as HTMLInputElement).value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Find a chorus by its title or words"
          autoComplete="off"
          spellcheck={false}
          className="placeholder:text-muted min-w-0 flex-1 bg-transparent text-[1rem] outline-none"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            field.current?.focus();
          }}
          aria-label={open ? 'Close the list of choruses' : 'Show all the choruses'}
          className="text-ink-soft hover:bg-ink/[0.07] flex size-9 items-center justify-center rounded-full"
        >
          <Icon name={open ? 'up' : 'down'} className="size-4" />
        </button>
      </div>
      {open && (
        <ul
          id="chorus-options"
          role="listbox"
          aria-label="Choruses"
          className="border-rule absolute inset-x-0 top-full z-30 mt-2 max-h-[22rem] overflow-y-auto rounded-xl border bg-[#fdfbf7] p-1.5 shadow-[0_30px_60px_-30px_rgb(23_20_15/0.55)]"
        >
          {results.length === 0 && (
            <li className="text-muted px-4 py-3 text-[0.92rem]">No chorus matches “{query}”.</li>
          )}
          {results.map((c, i) => (
            <li
              key={c.number}
              id={`chorus-option-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerMove={() => setActive(i)}
              onClick={() => choose(c)}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 aria-selected:bg-[#f0eadf]"
            >
              <span className="min-w-0 flex-1">
                <span className="text-ink block truncate text-[0.95rem] font-medium">
                  {c.title}
                </span>
                <span className="text-muted block truncate text-[0.82rem]">{first(c)}</span>
              </span>
              {c.number === chosen ? (
                <span className="text-gold-ink flex items-center gap-1 text-[0.78rem] font-semibold">
                  <Icon name="check" className="size-3.5" />
                  Chosen
                </span>
              ) : (
                <span className="text-ink-soft text-[0.78rem] font-medium">Add</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted mt-2 px-1 text-[0.8rem]">{choruses.length} choruses</p>
    </div>
  );
}

/** Change a chorus's words, or write one: one line per line on the screen, an empty line between slides. */
function ChorusEditor({
  editing,
  eyebrow,
  onChange,
  onSave,
  onCancel,
}: {
  editing: { title: string; text: string; number?: number };
  eyebrow: string;
  onChange: (next: { title: string; text: string; number?: number }) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const slides = fromText(editing.text);
  const title = editing.title.trim() || 'Chorus';
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="chorus-editor-title"
      className="bg-paper m-auto w-[min(64rem,calc(100vw-1.5rem))] max-w-none rounded-2xl p-0 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.6)] backdrop:bg-[#17140f]/60"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
        className="grid max-h-[calc(100svh-2rem)] gap-6 overflow-y-auto p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <div className="min-w-0">
          <h2
            id="chorus-editor-title"
            className="font-display text-ink text-[1.9rem] leading-tight"
          >
            {editing.number === undefined ? 'Write a chorus' : 'Edit the words'}
          </h2>
          <p className="text-ink-soft mt-2 text-[0.92rem]">
            Each line here is a line on the screen. Leave an empty line to begin the next slide.
            Kept on this device only.
          </p>
          <label className="text-ink mt-5 block text-[0.88rem] font-medium" htmlFor="chorus-title">
            Title
          </label>
          <input
            id="chorus-title"
            value={editing.title}
            onInput={(e) => onChange({ ...editing, title: (e.target as HTMLInputElement).value })}
            className="border-rule bg-paper focus:border-ink/60 mt-1.5 min-h-11 w-full rounded-lg border px-4 text-[1rem] outline-none"
          />
          <label className="text-ink mt-4 block text-[0.88rem] font-medium" htmlFor="chorus-words">
            Words
          </label>
          <textarea
            id="chorus-words"
            value={editing.text}
            onInput={(e) => onChange({ ...editing, text: (e.target as HTMLTextAreaElement).value })}
            rows={16}
            spellcheck={false}
            className="border-rule bg-paper focus:border-ink/60 mt-1.5 w-full rounded-lg border px-4 py-3 font-serif text-[1.05rem] leading-relaxed outline-none"
          />
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-ink hover:bg-ink/[0.07] min-h-11 rounded-full px-5 text-[0.92rem] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={slides.length === 0}
              className="bg-ink text-paper min-h-11 rounded-full px-6 text-[0.92rem] font-semibold hover:bg-[#2b261d] disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
        <div>
          <p className="label">
            {slides.length} {slides.length === 1 ? 'slide' : 'slides'}
          </p>
          {/* A preview of the words typed beside it. */}
          <ol className="mt-3 space-y-3" aria-hidden="true">
            {slides.map((lines, i) => (
              <li key={i}>
                <Slide
                  slide={{
                    kind: 'program',
                    theme: 'chorus',
                    eyebrow,
                    title,
                    label: `Slide ${i + 1}`,
                    lines,
                    first: i === 0,
                  }}
                  className="pointer-events-none aspect-video w-full rounded-md"
                />
              </li>
            ))}
          </ol>
        </div>
      </form>
    </dialog>
  );
}
