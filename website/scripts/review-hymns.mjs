#!/usr/bin/env node
/**
 * The hand review of the hymn slides (how each hymn is divided into slides, the way the chapel
 * sings it). Reviewers read private/review/in/batch-NN.json and write private/review/out/batch-NN.json;
 * this script keeps them honest and then puts the reviewed slides in place.
 *
 *   node scripts/review-hymns.mjs check 07   — checks one reviewed batch
 *   node scripts/review-hymns.mjs merge      — checks every batch and writes private/lyrics/*.json
 *   node scripts/review-hymns.mjs words      — checks (and with --apply saves) private/review/words/*.json, where
 *     syllable hyphens copied from sheet music ("A-ma-zing") were joined back into words
 *
 * The check guarantees the words are untouched: every line on a slide must be one of that hymn's
 * own lines, character for character, and no line of the hymn may be left out.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const [command, which] = process.argv.slice(2);

function check(name) {
  const source = read(`private/review/in/${name}`);
  const outPath = `private/review/out/${name}`;
  if (!existsSync(outPath)) return { errors: [`${name}: not reviewed yet`], reviewed: [] };
  const reviewed = read(outPath);
  const errors = [];
  const warnings = [];
  if (!Array.isArray(reviewed)) return { errors: [`${name}: must be a JSON array`], reviewed: [] };

  source.forEach((hymn, i) => {
    const at = `${name} ${hymn.book} ${hymn.number}`;
    const out = reviewed[i];
    if (!out || out.book !== hymn.book || out.number !== hymn.number) {
      errors.push(`${at}: missing or out of order (found ${out?.book} ${out?.number})`);
      return;
    }
    if (!Array.isArray(out.slides) || out.slides.length === 0) {
      errors.push(`${at}: no slides`);
      return;
    }
    const own = new Set(hymn.sections.flatMap((s) => s.lines));
    const shown = new Set();
    let lastVerse = 0;
    out.slides.forEach((slide, j) => {
      const where = `${at} slide ${j + 1}`;
      if (slide.kind !== 'verse' && slide.kind !== 'refrain')
        errors.push(`${where}: kind must be "verse" or "refrain"`);
      if (slide.kind === 'verse') {
        if (!Number.isInteger(slide.verse) || slide.verse < 1)
          errors.push(`${where}: verse needs a number`);
        else if (slide.verse !== lastVerse && slide.verse !== lastVerse + 1)
          errors.push(`${where}: verse ${slide.verse} follows verse ${lastVerse}`);
        else lastVerse = slide.verse;
      }
      if (!Array.isArray(slide.lines) || slide.lines.length === 0) {
        errors.push(`${where}: no lines`);
        return;
      }
      if (slide.lines.length > 6)
        warnings.push(`${where}: ${slide.lines.length} lines on one slide`);
      for (const line of slide.lines) {
        if (!own.has(line))
          errors.push(
            `${where}: line is not in the hymn exactly as written: ${JSON.stringify(line)}`,
          );
        shown.add(line);
      }
    });
    for (const line of own)
      if (!shown.has(line)) errors.push(`${at}: line left out: ${JSON.stringify(line)}`);
  });
  if (reviewed.length !== source.length)
    errors.push(`${name}: ${reviewed.length} hymns, expected ${source.length}`);
  return { errors, warnings, reviewed };
}

const batches = readdirSync('private/review/in')
  .filter((f) => f.endsWith('.json'))
  .sort();

if (command === 'check') {
  const name = batches.find((b) => b.includes(which ?? '')) ?? '';
  const { errors, warnings } = check(name);
  for (const w of warnings ?? []) console.log(`  note: ${w}`);
  for (const e of errors) console.log(`✗ ${e}`);
  console.log(errors.length ? `✗ ${errors.length} problem(s) in ${name}` : `✓ ${name} is clean`);
  process.exit(errors.length ? 1 : 0);
}

if (command === 'merge') {
  const all = batches.map((b) => check(b));
  const errors = all.flatMap((r) => r.errors);
  if (errors.length) {
    for (const e of errors.slice(0, 40)) console.log(`✗ ${e}`);
    console.log(`✗ ${errors.length} problem(s); nothing merged.`);
    process.exit(1);
  }
  const slides = new Map(all.flatMap((r) => r.reviewed).map((h) => [`${h.book} ${h.number}`, h]));
  const { books } = read('private/hymns.json');
  for (const { id } of books) {
    const source = read(`private/source/${id}.json`);
    const hymns = source.hymns.map((original) => {
      const hymn = Object.fromEntries(Object.entries(original).filter(([k]) => k !== 'sections'));
      const reviewed = slides.get(`${id} ${hymn.number}`);
      if (!reviewed) throw new Error(`No reviewed slides for ${id} ${hymn.number}`);
      return {
        ...hymn,
        slides: reviewed.slides.map(({ kind, verse, lines }) => ({
          kind,
          ...(kind === 'verse' ? { verse } : {}),
          lines,
        })),
      };
    });
    writeFileSync(`private/lyrics/${id}.json`, `${JSON.stringify({ hymns })}\n`);
    console.log(`✓ ${id}: ${hymns.length} hymns with reviewed slides → private/lyrics/${id}.json`);
  }
  const notes = all.flatMap((r) => r.reviewed).filter((h) => h.note);
  writeFileSync(
    'private/review/notes.md',
    notes.map((h) => `- ${h.book} ${h.number}: ${h.note}`).join('\n') + '\n',
  );
  console.log(
    `✓ ${notes.length} hymns had changes beyond dividing slides — see private/review/notes.md`,
  );
  process.exit(0);
}

/**
 * True if `after` is `before` with only syllable hyphens taken out, and stray breaks inside a word
 * ("al-read' y", "bitter ness"): nothing added, nothing else removed. Every change is listed for a
 * person to read before it is applied.
 */
function onlyJoined(before, after) {
  let j = 0;
  for (let i = 0; i < before.length; i++) {
    if (before[i] === after[j]) {
      j++;
      continue;
    }
    const c = before[i];
    const strayBreak =
      (c === "'" || c === '’') && before[i + 1] === ' ' && /\w/.test(before[i + 2] ?? '');
    const strayAfter = c === ' ' && (before[i - 1] === "'" || before[i - 1] === '’');
    // A word broken by a stray space ("bitter ness", "On ly"): letters on both sides.
    const strayGap =
      c === ' ' && /[a-z]/i.test(before[i - 1] ?? '') && /[a-z]/.test(before[i + 1] ?? '');
    if (c !== '-' && !strayBreak && !strayAfter && !strayGap) return false;
  }
  return j === after.length;
}

if (command === 'words') {
  const fixes = readdirSync('private/review/words')
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => read(`private/review/words/${f}`));
  const errors = [];
  const changed = [];
  const books = new Map();
  for (const fix of fixes) {
    if (!books.has(fix.book)) books.set(fix.book, read(`private/lyrics/${fix.book}.json`));
    const hymn = books.get(fix.book).hymns.find((h) => h.number === fix.number);
    const at = `${fix.book} ${fix.number}`;
    if (!hymn) {
      errors.push(`${at}: no such hymn`);
      continue;
    }
    const before = hymn.slides;
    if (!Array.isArray(fix.slides) || fix.slides.length !== before.length) {
      errors.push(`${at}: the slides must stay exactly as reviewed (same number of slides)`);
      continue;
    }
    fix.slides.forEach((slide, i) => {
      const old = before[i];
      if (
        slide.kind !== old.kind ||
        slide.verse !== old.verse ||
        slide.lines?.length !== old.lines.length
      ) {
        errors.push(`${at} slide ${i + 1}: only the words may change, not the slide`);
        return;
      }
      slide.lines.forEach((line, k) => {
        if (line === old.lines[k]) return;
        if (!onlyJoined(old.lines[k], line))
          errors.push(
            `${at} slide ${i + 1}: not only joined syllables: ${JSON.stringify(old.lines[k])} → ${JSON.stringify(line)}`,
          );
        else changed.push(`${at}: ${old.lines[k]}  →  ${line}`);
      });
    });
    if (!errors.length)
      hymn.slides = fix.slides.map(({ kind, verse, lines }) => ({
        kind,
        ...(kind === 'verse' ? { verse } : {}),
        lines,
      }));
  }
  if (errors.length) {
    for (const e of errors.slice(0, 40)) console.log(`✗ ${e}`);
    console.log(`✗ ${errors.length} problem(s); nothing applied.`);
    process.exit(1);
  }
  if (process.argv.includes('--apply')) {
    for (const [id, data] of books)
      writeFileSync(`private/lyrics/${id}.json`, `${JSON.stringify(data)}\n`);
    writeFileSync(
      'private/review/words-changes.md',
      changed.map((c) => `- ${c}`).join('\n') + '\n',
    );
    console.log(
      `✓ Applied ${changed.length} joined lines in ${fixes.length} hymns (listed in private/review/words-changes.md).`,
    );
  } else {
    console.log(
      `✓ ${changed.length} lines would change in ${fixes.length} hymns; run with --apply to save.`,
    );
  }
  process.exit(0);
}

console.log('Usage: node scripts/review-hymns.mjs check <batch> | merge | words [--apply]');
process.exit(1);
