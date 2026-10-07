/**
 * Search and grouping for the hymn index: by number, by first line (A–Z) and by tune, across one
 * or both hymnals. Pure functions, so they are easy to test.
 */
import type { Hymn, Hymnal } from './vault';

export interface Entry {
  hymn: Hymn;
  book: Hymnal;
  /** Every searchable form of the hymn, folded to plain lowercase letters and digits. */
  key: string;
  /** The first line folded for alphabetical order. */
  sortTitle: string;
  numberValue: number;
}

export interface Section {
  id: string;
  /** "Hymns 1–25", "Front cover" */
  label: string;
  /** Short form for the quick navigation, e.g. "1–25". */
  short: string;
  entries: Entry[];
}

/** Lowercase, no accents, no punctuation: "Ev'ry" → "evry", "Saviour!" → "saviour". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9’' ]+/g, ' ');

/**
 * Hymns shorten words with apostrophes ("ev'ry", "pow'r", "heav'n"). Index each title with the
 * apostrophe both dropped and read as a missing "e", so "every" finds "ev'ry" and "power" finds "pow'r".
 */
function variants(text: string) {
  const folded = fold(text);
  return [
    folded.replace(/[’']/g, ''),
    folded.replace(/(\w)[’'](\w)/g, '$1e$2').replace(/[’']/g, ''),
  ];
}

const numberValue = (n: string) => (/^\d+$/.test(n) ? Number(n) : -1);

export function buildEntries(books: Hymnal[]): Entry[] {
  return books.flatMap((book) =>
    book.hymns.map((hymn) => ({
      hymn,
      book,
      key: [hymn.number.toLowerCase(), ...variants(hymn.title), ...variants(hymn.tune)]
        .join(' ')
        .replace(/\s+/g, ' '),
      sortTitle: fold(hymn.title).replace(/[’']/g, '').trim(),
      numberValue: numberValue(hymn.number),
    })),
  );
}

const terms = (query: string) => fold(query).replace(/[’']/g, '').split(/\s+/).filter(Boolean);

/** Search results, best first: the exact number, numbers starting with it, then first lines. */
export function search(entries: Entry[], query: string): Entry[] {
  const words = terms(query);
  if (words.length === 0) return entries;
  const numberQuery = /^(fc\s*)?\d+$/i.test(query.trim())
    ? query.trim().toLowerCase().replace(/\s+/g, ' ')
    : '';
  const rank = (e: Entry) => {
    const number = e.hymn.number.toLowerCase();
    if (numberQuery && number === numberQuery) return 0;
    if (numberQuery && number.startsWith(numberQuery)) return 1;
    if (e.sortTitle.startsWith(words.join(' '))) return 2;
    return 3;
  };
  return entries
    .filter((e) => words.every((w) => e.key.includes(w)))
    .map((e) => ({ e, r: rank(e) }))
    .sort((a, b) => a.r - b.r)
    .map(({ e }) => e);
}

const RANGE = 25;

/** One hymnal in sections of 25, as in the printed index (front-cover hymns first). */
export function sections(entries: Entry[]): Section[] {
  const groups = new Map<string, Section>();
  const sorted = [...entries].sort((a, b) => a.numberValue - b.numberValue);
  const highest = sorted.at(-1)?.numberValue ?? 0;
  for (const entry of sorted) {
    const front = entry.numberValue < 0;
    const start = front ? 0 : Math.floor((entry.numberValue - 1) / RANGE) * RANGE + 1;
    const id = `${entry.book.id}-${front ? 'front' : start}`;
    let section = groups.get(id);
    if (!section) {
      const last = Math.min(start + RANGE - 1, highest);
      section = {
        id,
        label: front ? 'Front cover' : `Hymns ${start}–${last}`,
        short: front ? 'Front cover' : `${start}–${last}`,
        entries: [],
      };
      groups.set(id, section);
    }
    section.entries.push(entry);
  }
  return [...groups.values()];
}

/** Splits a first line into plain and matching parts, for highlighting search words. */
export function highlight(text: string, query: string) {
  const words = terms(query).filter((w) => !/^\d+$/.test(w));
  if (words.length === 0) return [{ text, match: false }];
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  const whole = new RegExp(`^(?:${escaped.join('|')})$`, 'i');
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({ text: part, match: whole.test(part) }));
}
