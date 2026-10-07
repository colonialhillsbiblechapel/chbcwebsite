import { useEffect, useState } from 'preact/hooks';
import { Icon } from './icons';
import { tuneName, type Chosen } from './service';
import { stanzas } from './slides';
import { lyrics, type Words } from './vault';

interface Props {
  chosen: Chosen;
  previous?: Chosen;
  next?: Chosen;
  inList: boolean;
  onToggle: () => void;
  onPresent: () => void;
  onOpen: (chosen: Chosen) => void;
  onBack: () => void;
}

/** Reading sizes for the words; the choice is kept on this device. */
const SIZES = [
  'text-[1.15rem]',
  'text-[1.3rem]',
  'text-[1.48rem]',
  'text-[1.7rem]',
  'text-[1.95rem]',
] as const;
const SIZE_KEY = 'chbc-hymns-text-size';
function savedSize() {
  try {
    const n = Number(localStorage.getItem(SIZE_KEY));
    return Number.isInteger(n) && n >= 0 && n < SIZES.length ? n : 1;
  } catch {
    return 1;
  }
}

const isRed = (chosen: Chosen) => chosen.book.id === 'praise';

/** One hymn to read on a phone or tablet: the words as they are sung, set like a hymnal page. */
export function HymnReader({
  chosen,
  previous,
  next,
  inList,
  onToggle,
  onPresent,
  onOpen,
  onBack,
}: Props) {
  const { hymn, book } = chosen;
  const [words, setWords] = useState<Words | null | undefined>();
  const [size, setSize] = useState(savedSize);

  useEffect(() => {
    let current = true;
    setWords(undefined);
    lyrics(book.id)
      .then((all) => current && setWords(all.get(hymn.number) ?? null))
      .catch(() => current && setWords(null));
    return () => {
      current = false;
    };
  }, [book.id, hymn.number]);

  const resize = (by: 1 | -1) => {
    const n = Math.max(0, Math.min(SIZES.length - 1, size + by));
    setSize(n);
    try {
      localStorage.setItem(SIZE_KEY, String(n));
    } catch {
      // Not kept in private browsing.
    }
  };

  const pill =
    'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.9rem] font-medium transition-colors';

  return (
    <article className="font-ui" aria-labelledby="reader-title">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-ink hover:bg-ink/[0.07] -ml-3 inline-flex min-h-10 min-w-0 items-center gap-2 rounded-full px-4 text-[0.88rem] font-medium"
        >
          <Icon name="back" className="size-4" />
          <span className="truncate">{book.title}</span>
        </button>
        <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Text size">
          <button
            type="button"
            onClick={() => resize(-1)}
            disabled={size === 0}
            className="text-ink hover:bg-ink/[0.07] font-display flex size-10 items-center justify-center rounded-full text-[1rem] disabled:opacity-30"
          >
            A<span className="sr-only"> smaller text</span>
          </button>
          <button
            type="button"
            onClick={() => resize(1)}
            disabled={size === SIZES.length - 1}
            className="text-ink hover:bg-ink/[0.07] font-display flex size-10 items-center justify-center rounded-full text-[1.4rem] disabled:opacity-30"
          >
            A<span className="sr-only"> larger text</span>
          </button>
        </div>
      </div>

      <header className="mx-auto mt-8 max-w-2xl text-center">
        <p
          className={`font-serif text-[0.95rem] font-bold tracking-[0.36em] uppercase ${isRed(chosen) ? 'text-pew' : 'text-ink'}`}
        >
          Hymn&nbsp;&nbsp;{hymn.number}
        </p>
        <h2
          id="reader-title"
          className="mt-3 font-serif text-[clamp(2rem,1.5rem+2.4vw,3.2rem)] leading-[1.08] font-semibold text-balance text-[#4a1d26] italic"
        >
          {hymn.title}
        </h2>
        {words?.author && (
          <p className="text-ink-soft mt-4 font-serif text-[1.1rem] italic">{words.author}</p>
        )}
        <p className="text-muted mt-1 text-[0.8rem] tracking-[0.12em] uppercase">
          {book.cover}
          {tuneName(hymn.tune) && ` · Tune: ${tuneName(hymn.tune)}`}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={inList}
            className={`${pill} ${inList ? 'bg-ink text-paper' : 'text-ink ring-rule hover:ring-ink/40 ring-1'}`}
          >
            <Icon name={inList ? 'check' : 'plus'} className="size-4" />
            {inList ? 'In the service list' : 'Add to service list'}
          </button>
          <button
            type="button"
            onClick={onPresent}
            className={`${pill} text-ink ring-rule hover:ring-ink/40 ring-1`}
          >
            <Icon name="play" className="size-4" />
            Present
          </button>
        </div>
      </header>

      <div className="border-rule mx-auto mt-10 max-w-2xl border-t pt-10">
        {words === undefined && <p className="text-muted text-center">Opening the words…</p>}
        {words === null && (
          <p className="text-muted text-center">The words of this hymn couldn’t be opened.</p>
        )}
        {words && (
          <div className={`font-serif leading-[1.55] text-[#1f1a17] ${SIZES[size]}`}>
            {stanzas(words).map((stanza, i) =>
              stanza.kind === 'refrain' ? (
                <section key={i} className="mt-8 pl-[2.2em] italic first:mt-0" aria-label="Refrain">
                  <p className="font-ui text-muted mb-1 text-[0.72rem] font-semibold tracking-[0.18em] uppercase not-italic">
                    Refrain
                  </p>
                  {stanza.lines.map((line, j) => (
                    <p key={j} className="pl-[1em] -indent-[1em]">
                      {line}
                    </p>
                  ))}
                </section>
              ) : (
                <section
                  key={i}
                  className="relative mt-8 pl-[2.2em] first:mt-0"
                  aria-label={`Verse ${stanza.verse}`}
                >
                  <span
                    className={`font-ui absolute top-[0.35em] left-0 text-[0.75rem] font-semibold tabular-nums ${isRed(chosen) ? 'text-pew' : 'text-gold-ink'}`}
                    aria-hidden="true"
                  >
                    {stanza.verse}
                  </span>
                  {stanza.lines.map((line, j) => (
                    <p key={j} className="pl-[1em] -indent-[1em]">
                      {line}
                    </p>
                  ))}
                </section>
              ),
            )}
            {(words.copyright || words.note) && (
              <div className="font-ui text-muted mt-10 space-y-1 text-[0.82rem] not-italic">
                {words.copyright && <p>© {words.copyright}</p>}
                {words.note && <p>{words.note}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      <nav
        aria-label="Other hymns"
        className="border-rule mx-auto mt-12 grid max-w-2xl gap-3 border-t pt-6 sm:grid-cols-2"
      >
        {previous ? (
          <button
            type="button"
            onClick={() => onOpen(previous)}
            className="hover:bg-ink/[0.05] flex min-h-14 items-center gap-3 rounded-xl px-3 text-left"
          >
            <Icon name="prev" className="text-muted size-5" />
            <span className="min-w-0">
              <span className="text-muted block text-[0.75rem] tracking-[0.12em] uppercase">
                Hymn {previous.hymn.number}
              </span>
              <span className="font-display text-ink block truncate text-[1.1rem]">
                {previous.hymn.title}
              </span>
            </span>
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button
            type="button"
            onClick={() => onOpen(next)}
            className="hover:bg-ink/[0.05] flex min-h-14 items-center justify-end gap-3 rounded-xl px-3 text-right"
          >
            <span className="min-w-0">
              <span className="text-muted block text-[0.75rem] tracking-[0.12em] uppercase">
                Hymn {next.hymn.number}
              </span>
              <span className="font-display text-ink block truncate text-[1.1rem]">
                {next.hymn.title}
              </span>
            </span>
            <Icon name="next" className="text-muted size-5" />
          </button>
        )}
      </nav>
    </article>
  );
}
