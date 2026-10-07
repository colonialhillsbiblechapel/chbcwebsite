#!/usr/bin/env node
/**
 * Builds the words of the Sunday welcome slides (private/choruses/sunday.json, sealed by
 * scripts/seal-hymns.mjs into public/hymns/lyrics-sunday.json):
 *
 * - program: the fixed slides, word for word from the chapel's welcome deck (private/choruses/program.json);
 * - choruses: every chorus of private/choruses/choruses.json (hand-structured and checked against
 *   the chapel's chorus decks), as slides in the order it is sung — each verse and refrain where it
 *   comes, one slide each. A part runs over two slides only where the chapel's own deck breaks it,
 *   or, longer than eight lines, at its stanza breaks (else in even halves). No word is changed.
 *
 * Usage: node scripts/sunday.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MAX = 8;
const program = JSON.parse(readFileSync('private/choruses/program.json', 'utf8'));
const { choruses } = JSON.parse(readFileSync('private/choruses/choruses.json', 'utf8'));

const NAMES = { refrain: 'Refrain' };
/** "verse_2" → "Verse 2", "final_refrain" → "Final refrain". */
const nameOf = (step) =>
  NAMES[step] ??
  step
    .replace(/_/g, ' ')
    .replace(/^verse (\d+)$/, 'Verse $1')
    .replace(/^./, (c) => c.toUpperCase());

/** The lyric a slide line carries, with a printed mark ("1", "[Refrain]", "(x2)") set aside. */
function lyricOf(line, partLines, marks) {
  if (partLines.has(line)) return line;
  for (const m of marks) {
    for (const rest of [
      line.endsWith(m) ? line.slice(0, -m.length) : null,
      line.startsWith(m) ? line.slice(m.length) : null,
    ]) {
      if (rest === null) continue;
      for (const candidate of [rest, rest.trim()])
        if (candidate && partLines.has(candidate)) return candidate;
    }
  }
  return null;
}

/** Splits a run of lines into even groups of at most MAX, preferring the given break points. */
function even(lines, breaks) {
  if (lines.length <= MAX) return [lines];
  const groups = [];
  let start = 0;
  const cuts = [...breaks].filter((b) => b > 0 && b < lines.length).sort((a, b) => a - b);
  // Stanza breaks first: the one nearest an even share, as long as the group stays within MAX.
  while (lines.length - start > MAX) {
    const left = lines.length - start;
    const target = start + Math.ceil(left / Math.ceil(left / MAX));
    const fits = cuts.filter((c) => c > start && c - start <= MAX && lines.length - c >= 1);
    const nearest = fits.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
    const cut = nearest !== undefined && Math.abs(nearest - target) <= 2 ? nearest : target;
    groups.push(lines.slice(start, cut));
    start = cut;
  }
  groups.push(lines.slice(start));
  return groups;
}

function slidesOf(song) {
  const parts = new Map();
  for (const v of song.verses) parts.set(`verse_${v.verse}`, v.lines);
  if (song.refrain) parts.set('refrain', song.refrain.lines);
  for (const p of song.other_parts) parts.set(p.name, p.lines);
  const partLines = new Set([...parts.values()].flat());
  const marks = [...song.printed_notes].sort((a, b) => b.length - a.length);
  const notes = new Set([...song.printed_notes, ...song.credits]);

  // The slides' lyric lines in order, with which deck slide and which stanza of it they are on.
  const flat = [];
  for (const s of song.source_slides) {
    let block = 0;
    for (const line of s.lines) {
      if (!line.trim()) {
        block++;
        continue;
      }
      const lyric = lyricOf(line, partLines, marks);
      if (lyric !== null) flat.push({ lyric, slide: s.slide, block });
      else if (!notes.has(line.trim()) && !notes.has(line))
        throw new Error(`${song.number}: ${line}`);
    }
  }

  /** Where a part sits in the deck: the first run of the slides that sings exactly its lines. */
  const placeOf = (lines) => {
    for (let at = 0; at + lines.length <= flat.length; at++)
      if (lines.every((l, k) => flat[at + k].lyric === l)) return flat.slice(at, at + lines.length);
    return null;
  };

  const out = [];
  for (const step of song.performance_sequence) {
    const lines = parts.get(step);
    const place = placeOf(lines);
    const deckBreaks = [];
    const stanzaBreaks = [];
    if (place)
      for (let k = 1; k < lines.length; k++) {
        if (place[k].slide !== place[k - 1].slide) deckBreaks.push(k);
        else if (place[k].block !== place[k - 1].block) stanzaBreaks.push(k);
      }
    const pieces = [];
    let start = 0;
    for (const cut of [...deckBreaks, lines.length]) {
      const piece = lines.slice(start, cut);
      const inner = stanzaBreaks.filter((b) => b > start && b < cut).map((b) => b - start);
      pieces.push(...even(piece, inner));
      start = cut;
    }
    pieces.forEach((piece, i) =>
      out.push({
        label: pieces.length > 1 ? `${nameOf(step)} (${i + 1}/${pieces.length})` : nameOf(step),
        lines: piece,
      }),
    );
  }
  // Every sung line is on a slide, in order: nothing lost, nothing added.
  const sung = song.performance_sequence.flatMap((s) => parts.get(s));
  if (JSON.stringify(out.flatMap((s) => s.lines)) !== JSON.stringify(sung))
    throw new Error(`${song.number}: the slides do not match the song as sung`);
  return out;
}

const sunday = {
  program: { chorus: program.chorus, songs: program.songs },
  choruses: choruses.map((song) => ({
    number: song.number,
    title: song.title,
    credits: song.credits,
    slides: slidesOf(song),
  })),
};
writeFileSync('private/choruses/sunday.json', `${JSON.stringify(sunday, null, 1)}\n`);
const count = sunday.choruses.reduce((n, c) => n + c.slides.length, 0);
const longest = Math.max(...sunday.choruses.flatMap((c) => c.slides.map((s) => s.lines.length)));
console.log(
  `✓ ${sunday.choruses.length} choruses, ${count} slides (at most ${longest} lines each) → private/choruses/sunday.json`,
);
