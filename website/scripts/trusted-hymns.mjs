#!/usr/bin/env node
/**
 * Replaces a hymnal's words with the church's trusted transcription of the printed book
 * (private/trusted/<book>/*.json, which is final). Each hymn's slides are divided by hand, the
 * way it is sung; this script only prepares the work and keeps it honest. See
 * private/trusted/README.md for the whole process.
 *
 *   node scripts/trusted-hymns.mjs [book] prepare      — writes private/trusted/<book>/in/batch-NN.md:
 *                                                        each hymn's words in the order they are sung
 *                                                        (every refrain where it is sung), beside today's
 *   node scripts/trusted-hymns.mjs [book] check NN     — checks one batch of hand-divided slides
 *   node scripts/trusted-hymns.mjs [book] show NN [n]  — prints a batch's slides as they will be seen
 *   node scripts/trusted-hymns.mjs [book] merge        — checks every batch and puts the slides into
 *                                                        private/lyrics/<book>.json
 *
 * `book` is "worship" (the black hymnal, the default) or "praise" (the red hymnal). Batches go by
 * number (1–25 is batch 01, 26–50 is 02, …), so they stay the same as more of a book arrives.
 *
 * The check guarantees the words are the trusted words exactly: each verse and each refrain is
 * there, in the sung order, character for character. Only where a line is broken may differ (a
 * line may be broken between two words, and printed score lines are rebuilt into sung lines),
 * and no slide has more than four lines. A hymn whose sung order the transcription does not set
 * down in full is held back: it keeps today's words until the church decides.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const BOOKS = { worship: 'Black hymnal', praise: 'Red hymnal' };
const args = process.argv.slice(2);
const BOOK = args[0] in BOOKS ? args.shift() : 'worship';
const [command, which, only] = args;
const DIR = `private/trusted/${BOOK}`;
const LYRICS = `private/lyrics/${BOOK}.json`;
const BATCH = 25;
const MAX_LINES = 4;
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));

const order = read('private/hymns.json')
  .books.find((b) => b.id === BOOK)
  .hymns.map((h) => h.number);
const trusted = readdirSync(DIR)
  .filter((f) => /^hymns_.*\.json$/.test(f))
  .flatMap((f) =>
    read(`${DIR}/${f}`).hymns.map((h) => ({ ...h, number: String(h.number), file: f })),
  )
  .sort((a, b) => order.indexOf(a.number) - order.indexOf(b.number));
const current = new Map(read(LYRICS).hymns.map((h) => [h.number, h]));

/*
 * Obvious scanning slips the owner has approved fixing (corrections.json: a missing letter or
 * space, a lowercase l for I, a word split by a space). Nothing else in the trusted words is ever
 * changed. Each fix must find its text exactly once in that hymn, or nothing runs.
 */
const corrections = existsSync(`${DIR}/corrections.json`)
  ? read(`${DIR}/corrections.json`).corrections
  : [];
for (const c of corrections) {
  const h = trusted.find((x) => x.number === c.number);
  if (!h) throw new Error(`correction for hymn ${c.number}, which is not in the trusted JSON`);
  const arrays = [
    ...(h.verses ?? []).map((v) => v.lines),
    h.refrain?.lines,
    ...(h.refrain_variants ?? []).flatMap((v) => [v.lines, v.first_pass, v.second_pass]),
    h.opening_text,
  ].filter(Array.isArray);
  let found = 0;
  for (const lines of arrays)
    for (const [i, line] of lines.entries())
      if (line.includes(c.from)) {
        found += line.split(c.from).length - 1;
        lines[i] = line.replace(c.from, c.to);
      }
  if (found !== 1)
    throw new Error(`correction "${c.from}" in hymn ${c.number} matched ${found} times, not once`);
}

/** Which batch a hymn belongs to: by its number, so batches never shift. */
const batchOf = (number) =>
  /^\d+$/.test(number) ? String(Math.ceil(Number(number) / BATCH)).padStart(2, '0') : 'FC';
const batches = [...new Set(trusted.map((h) => batchOf(h.number)))];
const inBatch = (id) => trusted.filter((h) => batchOf(h.number) === id);

/** The refrain's lines (stored as { lines } in most files, as a plain list in some). */
const refrainLines = (h) => (Array.isArray(h.refrain) ? h.refrain : h.refrain?.lines);

/** Refrain variants that are sung as the refrain (not lower-voice underlays or D.S. returns). */
const refrainVariants = (h) =>
  (h.refrain_variants ?? []).filter((v) => !/D\.S\.|underlay/i.test(v.label ?? ''));

/*
 * Hymns whose sung order the transcription does not set down in full are decided by hand
 * (manual.json, with the reason): their parts are written from the trusted words, and the slides
 * are checked against them like any other hymn. Until then such a hymn is held back.
 */
const manual = existsSync(`${DIR}/manual.json`) ? read(`${DIR}/manual.json`).hymns : {};

/** A hymn as it is sung: its verses and refrains in order, each refrain wherever it is repeated. */
function sung(h) {
  if (manual[h.number])
    return {
      parts: manual[h.number].parts,
      notes: [`Sung order decided by hand: ${manual[h.number].why}`],
    };
  const parts = [];
  const notes = [];
  let amen;
  let hold;
  const verse = (n) => {
    const v = h.verses.find((x) => x.verse === n);
    if (!v) throw new Error(`${h.number}: no verse ${n}`);
    return v;
  };
  for (const step of h.performance_sequence ?? []) {
    if (typeof step === 'object') {
      // Black hymnal 1–100: each step carries its own words.
      if (step.type === 'stanza')
        parts.push({ kind: 'verse', verse: step.number, lines: step.lines });
      else if (step.type === 'refrain')
        parts.push({ kind: 'refrain', lines: step.lines, label: step.label });
      else throw new Error(`${h.number}: unknown step ${JSON.stringify(step)}`);
      continue;
    }
    let m;
    if ((m = step.match(/^verse_(\d+)$/))) {
      const v = verse(Number(m[1]));
      parts.push({ kind: 'verse', verse: v.verse, lines: v.lines });
    } else if ((m = step.match(/^(?:refrain|chorus)_after_verse_(\d+)$/))) {
      const variant = refrainVariants(h).find((x) => x.after_verse === Number(m[1]));
      const lines = variant?.lines ?? refrainLines(h);
      if (!lines) throw new Error(`${h.number}: no refrain for ${step}`);
      parts.push({ kind: 'refrain', lines, label: h.refrain?.label });
    } else if (step === 'refrain') {
      const lines = refrainLines(h);
      if (!lines) throw new Error(`${h.number}: no refrain for ${step}`);
      parts.push({ kind: 'refrain', lines });
    } else if (step === 'refrain_opening') {
      // The refrain printed first and sung before verse 1.
      parts.push({ kind: 'refrain', lines: refrainLines(h), label: 'Opening' });
    } else if (step === 'repeated_ending') {
      parts.push({ kind: 'refrain', lines: [h.repeated_ending.text] });
    } else if ((m = step.match(/^refrain_line_(\d+)$/))) {
      // The refrain sung line by line (with a D.S. back to one of its lines): one refrain part.
      const line = refrainLines(h)?.[Number(m[1]) - 1];
      if (!line) throw new Error(`${h.number}: no ${step}`);
      const last = parts.at(-1);
      if (last?.byLine) last.lines = [...last.lines, line];
      else parts.push({ kind: 'refrain', lines: [line], byLine: true });
    } else if ((m = step.match(/^D\.S\._repeat_refrain_line_(\d+)_to_FINE$/))) {
      const line = refrainLines(h)?.[Number(m[1]) - 1];
      const last = parts.at(-1);
      if (!line || !last?.byLine) throw new Error(`${h.number}: no ${step}`);
      last.lines = [...last.lines, line];
    } else if ((m = step.match(/^refrain_pass_(1|2)_ending_\1$/))) {
      // The refrain between repeat signs: first with its first ending, then with its second.
      const lines = [...refrainLines(h)];
      const { first_ending: first, second_ending: second } = h.refrain;
      if (!lines.at(-1).endsWith(second))
        throw new Error(`${h.number}: ${step} does not end "${second}"`);
      if (m[1] === '1') lines[lines.length - 1] = lines.at(-1).slice(0, -second.length) + first;
      const last = parts.at(-1);
      if (m[1] === '2' && last?.pass) last.lines = [...last.lines, ...lines];
      else parts.push({ kind: 'refrain', lines, pass: true });
    } else if (step === 'full_text_first_pass') {
      for (const v of h.verses) parts.push({ kind: 'verse', verse: v.verse, lines: v.lines });
    } else if (step === 'D.C._return_to_beginning') {
      // The return itself; the next step says which lines are sung again.
    } else if ((m = step.match(/^repeat_lines_(\d+)_and_(\d+)_to_FINE$/))) {
      const v = h.verses[0];
      parts.push({
        kind: 'verse',
        verse: v.verse,
        lines: [v.lines[Number(m[1]) - 1], v.lines[Number(m[2]) - 1]],
      });
    } else if ((m = step.match(/^verse_(\d+)_main_pass_then_D\.S\._closing_line_to_FINE$/))) {
      // The D.S. returns only to reach the closing line, which is sung once (hymn 396's notes).
      const v = verse(Number(m[1]));
      parts.push({ kind: 'verse', verse: v.verse, lines: v.lines });
    } else if ((m = step.match(/^verse_(\d+)_with_simultaneous_italic_upper_voice$/))) {
      // The upper voice's words are not sung from the screen; the verse is.
      const v = verse(Number(m[1]));
      parts.push({ kind: 'verse', verse: v.verse, lines: v.lines });
    } else if ((m = step.match(/^D\.S\._ending_after_verse_(\d+)$/))) {
      // The verse's own ending, sung after the D.S.
      const v = (h.refrain_variants ?? []).find(
        (x) => x.after_verse === Number(m[1]) && /D\.S\. ending/i.test(x.label ?? ''),
      );
      if (!v) throw new Error(`${h.number}: no ${step}`);
      parts.push({ kind: 'verse', verse: Number(m[1]), lines: v.lines });
    } else if (step === 'd_s_repeat_from_hebrews_to_end') {
      const v = h.verses[0];
      const from = v.lines.findIndex((l) => l.startsWith('Hebrews'));
      if (from < 0) throw new Error(`${h.number}: no line beginning "Hebrews"`);
      parts.push({ kind: 'verse', verse: v.verse, lines: v.lines.slice(from) });
    } else if (step === 'd_s_repeat_opening_phrase_to_fine') {
      hold =
        'its D.S. repeats an "opening phrase" to FINE, and the transcription does not say where FINE falls, so the words to repeat are not set down';
    } else if (/^printed_refrain_text_after_verse_\d+_mapping_not_numbered$/.test(step)) {
      hold =
        'two refrain texts are printed under the same music, and the transcription does not say which is sung after which verse';
    } else if (/^refrain_with_repeat_and_1st_2nd_endings_after_verse_\d+$/.test(step)) {
      // The refrain between repeat signs; where a second ending is printed, it is sung again with it.
      const second = (h.refrain_variants ?? []).find((v) => v.ending === 'second');
      parts.push({ kind: 'refrain', lines: [...h.refrain.lines, ...(second?.lines ?? [])] });
    } else if ((m = step.match(/^refrain_variant_after_verse_(\d+)_(first|second)_pass$/))) {
      const v = (h.refrain_variants ?? []).find((x) => x.after_verse === Number(m[1]));
      const lines = v?.[`${m[2]}_pass`];
      if (!lines) throw new Error(`${h.number}: no ${step}`);
      parts.push({ kind: 'refrain', lines });
    } else if ((m = step.match(/^refrain_variant_(\d+)_after_verse_(\d+)$/))) {
      const v = refrainVariants(h)[Number(m[1]) - 1];
      if (!(v?.after_verses ?? v?.applies_after_verses)?.includes(Number(m[2])))
        throw new Error(`${h.number}: no ${step}`);
      parts.push({ kind: 'refrain', lines: v.lines });
    } else if ((m = step.match(/^refrain_variant_after_verse_(\d+)$/))) {
      const v = refrainVariants(h).find((x) => x.after_verse === Number(m[1]));
      if (!v) throw new Error(`${h.number}: no ${step}`);
      if (!v.lines) {
        hold = `its refrain after verse ${m[1]} is set down only in part (${JSON.stringify(v.opening ?? v.printed_text)}), not word for word`;
        continue;
      }
      parts.push({ kind: 'refrain', lines: v.lines });
    } else if (step === 'opening_alleluia') {
      parts.push({ kind: 'refrain', lines: h.opening_text, label: 'Opening' });
    } else if (step === 'D.S._repeat_second_half_of_current_verse_to_Fine') {
      // D.S.: the second half of the verse just sung is sung again after the refrain.
      const last = parts.findLast((p) => p.kind === 'verse');
      const v = verse(last.verse);
      parts.push({
        kind: 'verse',
        verse: v.verse,
        lines: v.lines.slice(Math.ceil(v.lines.length / 2)),
      });
    } else if (/^D\.S\._common_ending_after_verse_\d+$/.test(step)) {
      const v = (h.refrain_variants ?? []).find((x) => /D\.S\. common ending/i.test(x.label ?? ''));
      if (!v) throw new Error(`${h.number}: no ${step}`);
      parts.push({ kind: 'refrain', lines: v.lines });
    } else if ((m = step.match(/^D\.S\._repeat_certainty_tag_verse_(\d+)_to_Fine$/))) {
      const v = (h.refrain_variants ?? []).find(
        (x) => x.after_verse === Number(m[1]) && /certainty/i.test(x.label ?? ''),
      );
      if (!v) throw new Error(`${h.number}: no ${step}`);
      parts.push({ kind: 'verse', verse: Number(m[1]), lines: v.lines });
    } else if (/^polyphonic_repeated_ending_after_verse_\d+$/.test(step)) {
      hold =
        'its repeated ending is printed only as overlapping voice parts, and the transcription does not set down one sung line for it';
    } else if (/^verse_\d+_first_ending$/.test(step)) {
      notes.push(`"${step}" is a printed first ending; its words are already in the verse.`);
    } else if (step === 'final_amen') {
      amen = h.refrain?.final_ending ?? ['A-MEN.'];
    } else throw new Error(`${h.number}: unknown step "${step}"`);
  }
  return { parts, notes, amen, hold };
}

/**
 * A part's words as one string, for comparing. Printed score lines sometimes wrap just before a
 * comma or other mark, which belongs to the word before it; and a dash may join two words with
 * no space, where a slide may still break. So no space counts before such a mark or after a dash.
 */
const squash = (lines) =>
  lines
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/ ([,;:!?.)”])/g, '$1')
    .replace(/— /g, '—')
    .trim();

/* ——— prepare ——— */

/** Word-level differences between today's words and the trusted ones (a reviewer's aid only). */
function differences(oldText, newText) {
  const a = oldText.split(' ');
  const b = newText.split(' ');
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  let del = [];
  let ins = [];
  const flush = () => {
    if (del.length || ins.length) {
      const before = a.slice(Math.max(0, i - del.length - 3), i - del.length).join(' ');
      out.push(`…${before} [today: "${del.join(' ')}" → trusted: "${ins.join(' ')}"]`);
    }
    del = [];
    ins = [];
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      flush();
      i++;
      j++;
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) ins.push(b[j++]);
    else del.push(a[i++]);
  }
  flush();
  return out;
}

const text = (t) => (typeof t === 'string' ? t : JSON.stringify(t));

function describe(h) {
  const { parts, notes, amen, hold } = sung(h);
  const now = current.get(h.number);
  let md = `\n---\n\n## ${h.number} · ${h.title}\n`;
  md += `Tune: ${h.tune ?? '—'}${h.meter ? ` (${h.meter})` : ''}\n`;
  const fixed = corrections.filter((c) => c.number === h.number);
  if (fixed.length)
    md += `Approved corrections of scanning slips (already applied below): ${fixed.map((c) => `"${c.from}" → "${c.to}"`).join('; ')}\n`;
  if (hold)
    md += `\n**HELD BACK: write \`{ "number": "${h.number}", "hold": true }\` for this hymn and divide nothing.** Its words stay as they are today, because ${hold}. Describe it in the report; the church will decide.\n`;
  const extra = [
    ...(h.printed_notes ?? []).map((t) => `printed: ${text(t)}`),
    ...(h.notes ?? []).map((t) => `note: ${text(t)}`),
    ...(h.alternates ?? []).map((t) => `alternate: ${text(t)}`),
    ...(h.alternate_tunes ?? []).map((t) => `alternate tune: ${text(t)}`),
    ...(h.simultaneous_part_text ?? []).map((t) => `other voice: ${text(t)}`),
    ...(h.printed_repetition_underlays ?? []).map((t) => `other voice / underlay: ${text(t)}`),
    ...(h.lyric_underlays ?? []).map((t) => `other voice / underlay: ${text(t)}`),
    ...(h.additional_vocal_lines ?? []).map(
      (t) => `other voice (not sung from the screen): ${text(t)}`,
    ),
    ...(h.refrain_variants ?? [])
      .filter((v) => /underlay/i.test(v.label ?? ''))
      .map((v) => `other voice / underlay (not sung from the screen): ${text(v.lines)}`),
    ...(h.special_endings ?? []).map((t) => `special ending: ${text(t)}`),
    ...(h.verification?.performance_notation_flags ?? []).map((t) => `notation: ${text(t)}`),
    ...(h.verification?.notes ?? []).map((t) => `verification note: ${text(t)}`),
    ...(h.verification?.uncertain_words ?? []).map(
      (t) => `uncertain in the transcription: ${text(t)}`,
    ),
    ...notes,
    ...(amen ? [`ends with "${amen.join(' ')}" after the last refrain`] : []),
  ];
  if (extra.length)
    md += `Notes from the transcription:\n${extra.map((t) => `- ${t}`).join('\n')}\n`;
  md += `\n### Trusted words, in the order they are sung\n`;
  if (BOOK === 'praise')
    md += `(These lines are the printed score's lines, not sung lines: rebuild them into sung lines.)\n`;
  let r = 0;
  for (const [i, p] of parts.entries()) {
    const again =
      p.kind === 'verse' &&
      parts.slice(0, i).some((x) => x.kind === 'verse' && x.verse === p.verse);
    if (p.kind === 'verse') md += `\nVerse ${p.verse}${again ? ' (sung again, D.S.)' : ''}:\n`;
    else
      md += `\n${p.label === 'Opening' ? 'Opening (sung once, before verse 1)' : `Refrain (sung time ${++r})`}:\n`;
    md += `${p.lines.join('\n')}\n`;
  }
  md += `\n### Today's words on the site (for the conflict report only; never copy from here)\n`;
  if (!now) md += '\n(none)\n';
  else
    for (const s of now.slides)
      md += `\n${s.kind === 'refrain' ? 'Refrain' : `Verse ${s.verse}`}: ${s.lines.join(' / ')}\n`;
  if (now) {
    const oldVerses = new Set(now.slides.filter((s) => s.kind === 'verse').map((s) => s.verse))
      .size;
    const newVerses = new Set(parts.filter((p) => p.kind === 'verse').map((p) => p.verse)).size;
    const oldRefrains = now.slides.filter(
      (s, i, all) => s.kind === 'refrain' && all[i - 1]?.kind !== 'refrain',
    ).length;
    const newRefrains = parts.filter((p) => p.kind === 'refrain').length;
    const plain = (t) => t.replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
    const oldText = squash(now.slides.flatMap((s) => s.lines));
    const newText = squash(parts.flatMap((p) => p.lines));
    const diffs = differences(plain(oldText), plain(newText));
    if (oldText !== newText && plain(oldText) === plain(newText))
      diffs.push('only the style of apostrophes or quotation marks differs');
    else if (plain(oldText) !== oldText || plain(newText) !== newText)
      md +=
        '(apostrophes and quotation marks are compared without their style: today straight, trusted curly)\n';
    md += `\n### Machine comparison (a starting point: confirm each one yourself)\n`;
    md += `verses today ${oldVerses}, trusted ${newVerses}; refrains sung today ${oldRefrains}, trusted ${newRefrains}\n`;
    md += diffs.length
      ? `${diffs
          .slice(0, 40)
          .map((d) => `- ${d}`)
          .join('\n')}${diffs.length > 40 ? `\n- … and ${diffs.length - 40} more` : ''}\n`
      : 'no word differences\n';
  }
  return md;
}

if (command === 'prepare') {
  mkdirSync(`${DIR}/in`, { recursive: true });
  for (const id of batches) {
    const part = inBatch(id);
    let md = `# ${BOOKS[BOOK]}, batch ${id}: hymns ${part[0].number} to ${part.at(-1).number}\n\nWrite ${DIR}/out/batch-${id}.json and ${DIR}/reports/batch-${id}.txt (see ${DIR}/DIVIDE.md).\n`;
    for (const h of part) md += describe(h);
    writeFileSync(`${DIR}/in/batch-${id}.md`, md);
    const held = part.filter((h) => sung(h).hold).map((h) => h.number);
    console.log(
      `✓ ${DIR}/in/batch-${id}.md (${part.length} hymns, ${part[0].number}–${part.at(-1).number}${held.length ? `; held back: ${held.join(', ')}` : ''})`,
    );
  }
  process.exit(0);
}

/* ——— check ——— */

function checkBatch(id) {
  const errors = [];
  const rebroken = [];
  const hymns = inBatch(id);
  const path = `${DIR}/out/batch-${id}.json`;
  if (!hymns.length) return { errors: [`no batch ${id}`], hymns: [], out: [] };
  if (!existsSync(path)) return { errors: [`${path}: not written yet`], hymns, out: [] };
  let out;
  try {
    out = read(path);
  } catch (e) {
    return { errors: [`${path}: not valid JSON (${e.message})`], hymns, out: [] };
  }
  if (!Array.isArray(out)) return { errors: [`${path}: must be a JSON array`], hymns, out: [] };
  hymns.forEach((h, i) => {
    const at = `hymn ${h.number}`;
    const got = out[i];
    if (!got || String(got.number) !== h.number) {
      errors.push(`${at}: missing or out of order (found ${got?.number})`);
      return;
    }
    const { parts, amen, hold } = sung(h);
    if (hold) {
      if (got.hold !== true || got.slides)
        errors.push(
          `${at}: is held back; write { "number": "${h.number}", "hold": true } and nothing else`,
        );
      return;
    }
    if (got.hold) {
      errors.push(`${at}: only hymns the batch file marks HELD BACK may be held`);
      return;
    }
    const slides = Array.isArray(got.slides) ? got.slides : [];
    if (!slides.length) errors.push(`${at}: no slides`);
    for (const [k, s] of slides.entries()) {
      const where = `${at} slide ${k + 1}`;
      if (
        !Array.isArray(s.lines) ||
        !s.lines.length ||
        s.lines.some((l) => typeof l !== 'string' || !l.trim())
      )
        errors.push(`${where}: needs one to four non-empty lines`);
      else if (s.lines.length > MAX_LINES)
        errors.push(`${where}: ${s.lines.length} lines (at most ${MAX_LINES})`);
      if (s.kind !== 'verse' && s.kind !== 'refrain')
        errors.push(`${where}: kind must be "verse" or "refrain"`);
      if (s.kind === 'verse' && !Number.isInteger(s.verse))
        errors.push(`${where}: a verse slide needs its verse number`);
      if (s.kind === 'refrain' && 'verse' in s)
        errors.push(`${where}: a refrain slide has no verse number`);
    }
    // Walk the slides through the sung parts: each part is one or more whole slides, in order.
    let k = 0;
    for (const [p, part] of parts.entries()) {
      const want = squash(part.lines);
      const name =
        part.kind === 'verse'
          ? `verse ${part.verse}`
          : `refrain (sung time ${parts.slice(0, p + 1).filter((x) => x.kind === 'refrain').length})`;
      const taken = [];
      while (
        k < slides.length &&
        squash(taken.flatMap((s) => s.lines ?? [])).length < want.length
      ) {
        const s = slides[k];
        if (s.kind !== part.kind || (part.kind === 'verse' && s.verse !== part.verse)) break;
        taken.push(s);
        k++;
      }
      let got = squash(taken.flatMap((s) => s.lines ?? []));
      // The closing "Amen", where the book prints one, may end the last slide of the last refrain.
      const last = p === parts.length - 1;
      if (last && amen && got !== want) {
        for (const form of [amen.join(' '), 'Amen.', 'Amen']) {
          if (got === `${want} ${form}`) got = want;
        }
      }
      if (got !== want) {
        errors.push(
          `${at}: ${name} does not match the trusted words.\n      trusted: ${want}\n      slides:  ${got || '(nothing)'}`,
        );
        return;
      }
      const own = new Set(part.lines.map((l) => l.trim()));
      for (const s of taken)
        for (const l of s.lines) if (!own.has(l.trim())) rebroken.push(`${at} ${name}: "${l}"`);
    }
    if (k < slides.length)
      errors.push(`${at}: ${slides.length - k} extra slide(s) after the last part sung`);
  });
  if (out.length > hymns.length)
    errors.push(`${path}: ${out.length - hymns.length} extra hymn(s) at the end`);
  return { errors, rebroken, hymns, out };
}

if (command === 'check') {
  const id = /^\d+$/.test(which ?? '') ? which.padStart(2, '0') : which;
  const { errors, rebroken } = checkBatch(id);
  for (const e of errors) console.log(`✗ ${e}`);
  if (!errors.length) {
    if (rebroken?.length)
      console.log(
        `(${rebroken.length} line(s) broken differently from the transcription, all between words)`,
      );
    const report = `${DIR}/reports/batch-${id}.txt`;
    if (!existsSync(report)) console.log(`✗ ${report} is not written yet`);
    else console.log(`✓ batch ${id} is clean`);
  }
  process.exit(errors.length || !existsSync(`${DIR}/reports/batch-${id}.txt`) ? 1 : 0);
}

/* ——— show ——— */

if (command === 'show') {
  const id = /^\d+$/.test(which ?? '') ? which.padStart(2, '0') : which;
  const out = read(`${DIR}/out/batch-${id}.json`);
  for (const h of out) {
    if (only && String(h.number) !== only) continue;
    const t = trusted.find((x) => x.number === String(h.number));
    if (h.hold) {
      console.log(`\n=== ${h.number} · ${t?.title ?? ''} (held back: keeps today's words)`);
      continue;
    }
    console.log(`\n=== ${h.number} · ${t?.title ?? ''} (${h.slides.length} slides)`);
    h.slides.forEach((s, i) => {
      const label = s.kind === 'refrain' ? 'Refrain' : `Verse ${s.verse}`;
      console.log(`  [${i + 1}] ${label}`);
      for (const l of s.lines) console.log(`      ${l}${l.length > 45 ? `   (${l.length})` : ''}`);
    });
  }
  process.exit(0);
}

/* ——— merge ——— */

if (command === 'merge') {
  const all = [];
  let failed = 0;
  for (const id of batches) {
    const { errors, out } = checkBatch(id);
    for (const e of errors.slice(0, 10)) console.log(`✗ batch ${id}: ${e}`);
    failed += errors.length;
    all.push(...out);
  }
  if (failed) {
    console.log(`✗ ${failed} problem(s); nothing written.`);
    process.exit(1);
  }
  const book = read(LYRICS);
  const done = new Map(all.map((h) => [String(h.number), h]));
  let replaced = 0;
  const held = [];
  for (const h of book.hymns) {
    const got = done.get(h.number);
    if (!got) continue; // not in the trusted transcription yet: today's words stay
    if (got.hold) {
      held.push(h.number);
      continue;
    }
    h.slides = got.slides.map((s) =>
      s.kind === 'verse'
        ? { kind: 'verse', verse: s.verse, lines: s.lines }
        : { kind: 'refrain', lines: s.lines },
    );
    replaced++;
  }
  writeFileSync(LYRICS, `${JSON.stringify(book, null, 1)}\n`);
  console.log(
    `✓ ${replaced} of ${book.hymns.length} hymns now have the trusted words → ${LYRICS}${held.length ? `; held back (today's words kept): ${held.join(', ')}` : ''}. Now run seal-hymns.mjs.`,
  );
  process.exit(0);
}

console.log(
  'Usage: node scripts/trusted-hymns.mjs [worship|praise] prepare | check NN | show NN [n] | merge',
);
process.exit(1);
