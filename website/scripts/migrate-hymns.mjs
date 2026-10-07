#!/usr/bin/env node
/**
 * Copies the two hymnals from the old site's hymns pages on the master branch into private/:
 *
 * - private/hymns.json — the index of both books (number, first line, tune);
 * - private/source/<book>.json — the words of every hymn (verses and refrains, author, and any
 *   copyright line or note), copied exactly as written. These are then divided into slides by
 *   hand (see review-hymns.mjs), which writes private/lyrics/<book>.json.
 *
 * That folder is never committed: the public repository only ever holds the sealed copies made by
 * seal-hymns.mjs.
 *
 * Usage: node scripts/migrate-hymns.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const BOOKS = [
  {
    id: 'worship',
    index: 'hymns/hymns-worship-remembrance-index.html',
    words: 'hymns/worship and remembrance.html',
    title: 'Hymns of Worship and Remembrance',
    book: 'Book One',
    cover: 'Black Hymnal',
    verse: {
      text: 'O come, let us worship and bow down; let us kneel before the Lord our Maker.',
      reference: 'Psalm 95:6',
    },
  },
  {
    id: 'praise',
    index: 'hymns/hymns-truth-praise-index.html',
    words: 'hymns/Hymns of Truth and Praise.html',
    title: 'Hymns of Truth and Praise',
    book: 'Book Two',
    cover: 'Red Hymnal',
    verse: {
      text: 'I will praise Thee, O Lord, with my whole heart; I will shew forth all Thy marvellous works.',
      reference: 'Psalm 9:1',
    },
  },
];

const fromMaster = (file) =>
  execFileSync('git', ['show', `master:${file}`], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
const scriptOf = (html) => html.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? '';

/** Reads a `const name = [ … ]` or `{ … }` literal from a page's script, without running the page. */
function literal(script, name) {
  const start = script.indexOf(`const ${name} = `);
  if (start < 0) return undefined;
  const open =
    script.indexOf('=', start) + 1 + script.slice(script.indexOf('=', start) + 1).search(/\S/);
  const [openChar, closeChar] = script[open] === '{' ? ['{', '}'] : ['[', ']'];
  let depth = 0;
  let quote = '';
  for (let i = open; i < script.length; i++) {
    const c = script[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === openChar) depth++;
    else if (c === closeChar && --depth === 0) {
      return runInNewContext(`(${script.slice(open, i + 1)})`, {});
    }
  }
  throw new Error(`Could not read ${name}`);
}

/** The old pages' verses → sections in singing order (a refrain follows its verse). */
function sectionsOf(hymn) {
  const sections = [];
  const everyVerseChorus = !hymn.verses.some((v) => v.chorus) ? hymn.chorus : undefined;
  for (const verse of hymn.verses) {
    if (verse.type === 'chorus') {
      sections.push({ kind: 'refrain', lines: verse.chorus ?? verse.lines });
      continue;
    }
    sections.push({ kind: 'verse', lines: verse.lines });
    const refrain = verse.chorus ?? everyVerseChorus;
    if (refrain) sections.push({ kind: 'refrain', lines: refrain });
  }
  return sections.filter((s) => s.lines?.length);
}

const key = (number) => String(number).replace(/\s+/g, '').toUpperCase();

mkdirSync('private/source', { recursive: true });
const books = BOOKS.map(({ index, words, ...book }) => {
  const indexScript = scriptOf(fromMaster(index));
  const hymns = [
    ...(literal(indexScript, 'frontCoverHymns') ?? []),
    ...literal(indexScript, 'hymns'),
  ].map((h) => ({ number: String(h.num), title: h.title, tune: h.tune }));

  const wordsScript = scriptOf(fromMaster(words));
  const detailed = new Map(
    [
      ...Object.values(literal(wordsScript, 'frontCoverHymnsData') ?? {}),
      ...Object.values(literal(wordsScript, 'hymnsData')),
    ].map((h) => [key(h.number), h]),
  );
  const lyrics = hymns.flatMap(({ number }) => {
    const source = detailed.get(key(number));
    if (!source) return [];
    return [
      {
        number,
        ...(source.author ? { author: source.author } : {}),
        ...(source.copyright ? { copyright: source.copyright } : {}),
        ...(source.note ? { note: source.note } : {}),
        sections: sectionsOf(source),
      },
    ];
  });
  writeFileSync(`private/source/${book.id}.json`, `${JSON.stringify({ hymns: lyrics })}\n`);
  console.log(`${book.title}: ${hymns.length} hymns, words for ${lyrics.length}`);
  return { ...book, hymns };
});

writeFileSync('private/hymns.json', `${JSON.stringify({ books }, null, 2)}\n`);
