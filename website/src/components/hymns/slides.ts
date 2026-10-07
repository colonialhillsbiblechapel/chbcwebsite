/**
 * A hymn's slides, like the chapel's PowerPoint decks: a title slide, then the words as they were
 * divided by hand (see scripts/review-hymns.mjs) — verses in order, each refrain where it is sung.
 */
import type { Chosen } from './service';
import type { Background, Words } from './vault';

export type SlideData =
  | { kind: 'title'; chosen: Chosen; words?: Words; background?: Background }
  | { kind: 'lines'; chosen: Chosen; label: string; lines: string[]; background?: Background };

type Part = Words['slides'][number];
const sameStanza = (a?: Part, b?: Part) =>
  !!a && !!b && a.kind === b.kind && a.kind === 'verse' && a.verse === b.verse;

/** "Verse 2", "Verse 2 (1/2)" for a verse on two slides, or "Refrain". */
function labels(parts: Part[]) {
  return parts.map((part, i) => {
    if (part.kind === 'refrain') return 'Refrain';
    let first = i;
    while (sameStanza(parts[first - 1], part)) first--;
    let last = i;
    while (sameStanza(parts[last + 1], part)) last++;
    const name = `Verse ${part.verse}`;
    return last > first ? `${name} (${i - first + 1}/${last - first + 1})` : name;
  });
}

/** A hymn's slides: its title slide, then its words, all on its background if it has one. */
export function slidesFor(chosen: Chosen, words?: Words): SlideData[] {
  const parts = words?.slides ?? [];
  const names = labels(parts);
  const background = words?.background;
  return [
    { kind: 'title', chosen, words, background },
    ...parts.map((part, i) => ({
      kind: 'lines' as const,
      chosen,
      label: names[i] ?? '',
      lines: part.lines,
      background,
    })),
  ];
}

/**
 * The hymn as stanzas for reading: the slides of one verse joined back together, and likewise a
 * refrain that runs over several slides.
 */
export function stanzas(words: Words) {
  const out: { kind: 'verse' | 'refrain'; verse?: number; lines: string[] }[] = [];
  words.slides.forEach((part, i) => {
    const last = out.at(-1);
    const previous = words.slides[i - 1];
    const sameRefrain = part.kind === 'refrain' && previous?.kind === 'refrain';
    if (last && (sameStanza(previous, part) || sameRefrain))
      last.lines = [...last.lines, ...part.lines];
    else out.push({ kind: part.kind, verse: part.verse, lines: [...part.lines] });
  });
  return out;
}

/** First words of a slide, for thumbnails and lists. */
export const preview = (slide: SlideData) =>
  slide.kind === 'title'
    ? (slide.background?.name ?? slide.chosen.hymn.title)
    : (slide.lines[0] ?? '');
