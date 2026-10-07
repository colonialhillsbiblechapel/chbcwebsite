#!/usr/bin/env node
/**
 * Tools for the hymn backgrounds ("scenes"): each hymn's recipe, name and verse.
 *
 * Every command takes an optional hymnal first: "praise" (the red hymnal, the default; batches in
 * private/scenes/out/) or "worship" (the black hymnal; batches in private/scenes/worship/out/),
 * e.g. `node scripts/scenes.mjs worship check private/scenes/worship/out/batch-01.json`.
 *
 *   node scripts/scenes.mjs check  <file.json>             — checks recipes, names and verses
 *   node scripts/scenes.mjs render <file.json> <out.png>   — a contact sheet of the title slides
 *            [--band]                                       — …or of the strip under the words
 *   node scripts/scenes.mjs verse "Psalm 23:1-2"           — prints a passage from the KJV
 *   node scripts/scenes.mjs find "still waters"            — finds KJV verses with these words
 *   node scripts/scenes.mjs used "Psalm 23:2"              — which hymns already have this verse
 *   node scripts/scenes.mjs merge                          — checks every reviewed batch and writes
 *                                                            private/scenes/praise.json, which
 *                                                            seal-hymns.mjs seals with the words
 *
 * A scenes file is a JSON array of entries:
 *   { "number": "251", "name": "There Is Power in the Blood",
 *     "verse": { "ref": "Revelation 12:11", "quote": "And they overcame him by the blood of the Lamb, …" },
 *     "scene": { "palette": "crimson", "land": "hills", … }, "why": "…" }
 *
 * Every verse is checked word for word against the King James Version (private/kjv.json), so a
 * verse can never be misquoted. "why" is for the review only and is never published. The names
 * would tell which hymns are in the book, so the scenes are only ever published sealed.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  CLOUDS,
  FEATURES,
  FLOWERS,
  LANDS,
  LIGHTS,
  TREES,
  WATERS,
  hasWater,
} from '../src/components/hymns/art/compose.ts';
import { PALETTE_NAMES } from '../src/components/hymns/art/palettes.ts';
import { PRESETS } from '../src/components/hymns/art/presets.ts';
import { drawScene, inkFor } from '../src/components/hymns/art/scene.ts';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const args = process.argv.slice(2);
const BOOK = ['praise', 'worship'].includes(args[0]) ? args.shift() : 'praise';
const [command, file, out] = args;
const OUT = { praise: 'private/scenes/out', worship: 'private/scenes/worship/out' };
const BOOK_NAME = { praise: 'Truth and Praise', worship: 'Worship and Remembrance' };

const index = new Map(
  read('private/hymns.json')
    .books.find((b) => b.id === BOOK)
    .hymns.map((h) => [h.number, h]),
);
const words = new Map(read(`private/lyrics/${BOOK}.json`).hymns.map((h) => [h.number, h]));
const kjv = existsSync('private/kjv.json') ? read('private/kjv.json') : null;

/** "Psalm 23:2", "Revelation 12:11", "Isaiah 53:4-5" → the KJV text. */
function verseText(ref) {
  const m = ref.match(/^((?:[1-3] )?[A-Z][A-Za-z ]+?) (\d+):(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  const book = m[1] === 'Psalm' ? 'Psalms' : m[1] === 'Song of Songs' ? 'Song of Solomon' : m[1];
  const [c, v1, v2] = [m[2], Number(m[3]), Number(m[4] ?? m[3])];
  if (v2 < v1 || v2 - v1 > 3) return null;
  const parts = [];
  for (let v = v1; v <= v2; v++) {
    const t = kjv?.[`${book} ${c}:${v}`];
    if (!t) return null;
    parts.push(t);
  }
  return parts.join(' ');
}

const ONE_OF = {
  palette: PALETTE_NAMES,
  land: LANDS,
  light: LIGHTS,
  clouds: CLOUDS,
  water: WATERS,
  trees: TREES,
  flowers: FLOWERS,
  feature: FEATURES,
};
const KEYS = new Set([
  'palette',
  'land',
  'light',
  'lightX',
  'rays',
  'clouds',
  'water',
  'path',
  'trees',
  'flowers',
  'feature',
  'featureX',
  'birds',
  'seed',
]);

function check(entries, label) {
  const errors = [];
  if (!Array.isArray(entries)) return [`${label}: must be a JSON array`];
  const seen = new Set();
  for (const e of entries) {
    const at = `${label} #${e?.number}`;
    if (!e || !index.has(e.number)) {
      errors.push(`${at}: no such hymn in ${BOOK_NAME[BOOK]}`);
      continue;
    }
    if (seen.has(e.number)) errors.push(`${at}: listed twice`);
    seen.add(e.number);
    const sc = e.scene;
    if (!sc || typeof sc !== 'object') errors.push(`${at}: scene is missing`);
    else if ('preset' in sc) {
      if (!(sc.preset in PRESETS)) errors.push(`${at}: unknown preset "${sc.preset}"`);
    } else {
      for (const k of Object.keys(sc))
        if (!KEYS.has(k)) errors.push(`${at}: unknown scene field "${k}"`);
      for (const [k, list] of Object.entries(ONE_OF)) {
        if ((k === 'palette' || k === 'land') && sc[k] === undefined)
          errors.push(`${at}: scene.${k} is required`);
        if (sc[k] !== undefined && !list.includes(sc[k]))
          errors.push(`${at}: scene.${k} must be one of ${list.join(', ')}`);
      }
      for (const k of ['lightX', 'featureX'])
        if (sc[k] !== undefined && !(sc[k] >= 0.1 && sc[k] <= 0.9))
          errors.push(`${at}: scene.${k} must be between 0.1 and 0.9`);
      for (const k of ['rays', 'path', 'birds'])
        if (sc[k] !== undefined && typeof sc[k] !== 'boolean')
          errors.push(`${at}: scene.${k} must be true or false`);
      if (sc.feature === 'boat' && !hasWater(sc))
        errors.push(`${at}: a boat needs water (land shore/sea/waves/coast, or water "lake")`);
      if (sc.feature === 'lighthouse' && sc.land !== 'coast')
        errors.push(`${at}: a lighthouse stands on a coast (land "coast")`);
      if (
        sc.feature === 'bridge' &&
        !['river', 'stream'].includes(sc.water ?? (sc.land === 'valley' ? 'river' : 'none'))
      )
        errors.push(`${at}: a bridge needs a river or stream`);
    }
    if (
      e.name !== undefined &&
      (typeof e.name !== 'string' || e.name.length < 3 || e.name.length > 60)
    )
      errors.push(`${at}: name must be 3–60 characters`);
    if (e.verse !== undefined) {
      const { ref, quote } = e.verse ?? {};
      const text = typeof ref === 'string' ? verseText(ref) : null;
      if (!text)
        errors.push(
          `${at}: verse ref "${ref}" is not a KJV reference like "Psalm 23:2" (up to 4 verses)`,
        );
      else if (typeof quote !== 'string' || quote.length < 12 || quote.length > 170)
        errors.push(`${at}: verse quote must be 12–170 characters`);
      else {
        const core = quote.replace(/^[“"‘']|[“”"’']$/g, '').replace(/[.,;:!?]+$/, '');
        const hay = text.replace(/\s+/g, ' ');
        const found =
          hay.includes(core) || hay.includes(core.charAt(0).toLowerCase() + core.slice(1));
        if (!found)
          errors.push(
            `${at}: the quote is not word for word in the KJV ${ref}: ${JSON.stringify(quote)}\n      KJV: ${hay}`,
          );
      }
    }
  }
  return errors;
}

async function render(entries, path, band) {
  const { chromium } = await import('@playwright/test');
  const font = (f) =>
    pathToFileURL(resolve(`src/assets/fonts/eb-garamond/eb-garamond-latin-wght-${f}.woff2`)).href;
  const paper = pathToFileURL(resolve('public/hymns/art/paper.jpg')).href;
  const url = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const cells = entries.map((e) => {
    const hymn = index.get(e.number);
    const lyric = words.get(e.number);
    const seed = Number(String(e.number).replace(/\D/g, '')) || 1;
    const title = e.name ?? hymn?.title ?? '';
    const ink = inkFor(e.scene);
    if (band) {
      const lines = (lyric?.slides?.[0]?.lines ?? []).map(esc).join('<br>');
      return `<div class="cell"><img class="paper" src="${paper}"><img class="band" src="${url(drawScene(e.scene, 'band', seed))}"><div class="lyric">${lines}</div><div class="tag">${esc(e.number)}</div></div>`;
    }
    return `<div class="cell"><img class="paper" src="${paper}"><img class="art" src="${url(drawScene(e.scene, 'title', seed))}">
      <div class="t"><div class="n">HYMN&nbsp;&nbsp;${esc(e.number)}</div><div class="h" style="color:${ink}">${esc(title)}</div>
      ${e.verse ? `<div class="v" style="color:${ink}">${esc(e.verse.quote)}</div><div class="r">${esc(e.verse.ref)}</div>` : ''}
      ${lyric?.author ? `<div class="a">${esc(lyric.author)}</div>` : ''}</div><div class="tag">${esc(e.number)}</div></div>`;
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:G;src:url(${font('normal')})}@font-face{font-family:G;font-style:italic;src:url(${font('italic')})}
    body{margin:0;display:grid;grid-template-columns:repeat(2,960px);background:#777;font-family:G,serif}
    .cell{width:960px;height:540px;position:relative;overflow:hidden;background:radial-gradient(ellipse at 50% 38%,#fcf9f2,#efe8da 88%);outline:1px solid #777}
    .paper{position:absolute;inset:0;width:100%;height:100%}.art{position:absolute;left:0;bottom:0;width:100%;height:42.6%;object-fit:cover;object-position:bottom}
    .band{position:absolute;left:0;bottom:0;width:100%;height:18.5%;object-fit:cover;object-position:bottom}
    .t{position:absolute;left:0;right:0;top:0;bottom:33.6%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 60px}
    .n{font-weight:700;letter-spacing:.42em;font-size:20px;color:#2b2420}.h{font-style:italic;font-weight:600;font-size:52px;line-height:1.05;margin-top:8px}
    .v{font-style:italic;font-size:20px;line-height:1.3;margin-top:12px;max-width:760px}.r{font-size:17px;margin-top:4px;color:#4b3f39}.a{font-style:italic;font-size:14px;margin-top:6px;color:#5f534b}
    .lyric{position:absolute;left:0;right:0;top:0;bottom:18.5%;display:flex;align-items:center;justify-content:center;text-align:center;font-size:30px;line-height:1.3;color:#1f1a17}
    .tag{position:absolute;left:8px;top:6px;font:12px sans-serif;color:#aaa}</style></head><body>${cells.join('')}</body></html>`;
  mkdirSync('node_modules/.cache', { recursive: true });
  const page = resolve(`node_modules/.cache/scenes-${process.pid}.html`);
  writeFileSync(page, html);
  const browser = await chromium.launch({ channel: 'chrome' });
  const tab = await browser.newPage({
    viewport: { width: 1920, height: Math.ceil(entries.length / 2) * 540 },
  });
  await tab.goto(pathToFileURL(page).href);
  await tab.waitForTimeout(1500 + entries.length * 60);
  await tab.screenshot({ path, fullPage: true });
  await browser.close();
}

if (command === 'verse') {
  const text = verseText(file ?? '');
  console.log(text ?? `✗ "${file}" is not a KJV reference like "Psalm 23:2" (up to 4 verses)`);
  process.exit(text ? 0 : 1);
}

if (command === 'find') {
  const words = String(file ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const found = Object.entries(kjv ?? {}).filter(([, t]) => {
    const low = t.toLowerCase();
    return words.every((w) => low.includes(w));
  });
  for (const [ref, t] of found.slice(0, 40))
    console.log(`${ref.replace(/^Psalms /, 'Psalm ')}: ${t}`);
  console.log(`(${found.length} verse${found.length === 1 ? '' : 's'})`);
  process.exit(0);
}

if (command === 'used') {
  // Checks both hymnals, so no two hymns anywhere share a verse.
  const users = Object.entries(OUT).flatMap(([book, dir]) =>
    existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith('.json'))
          .flatMap((f) => read(`${dir}/${f}`))
          .filter((e) => e.verse?.ref === file)
          .map((e) => `${book === 'praise' ? 'red' : 'black'} ${e.number}`)
      : [],
  );
  console.log(users.length ? `${file} is used by hymn ${users.join(', ')}` : `${file} is free`);
  process.exit(0);
}

if (command === 'check') {
  const errors = check(read(file), file);
  for (const e of errors) console.log(`✗ ${e}`);
  console.log(errors.length ? `✗ ${errors.length} problem(s)` : `✓ ${file} is clean`);
  process.exit(errors.length ? 1 : 0);
}

if (command === 'render') {
  const entries = read(file);
  const band = process.argv.includes('--band');
  // Long batches are split into sheets of 10 so every slide stays large enough to judge.
  for (let i = 0; i < entries.length; i += 10) {
    const target = entries.length > 10 ? out.replace(/\.png$/, `-${i / 10 + 1}.png`) : out;
    await render(entries.slice(i, i + 10), target, band);
    console.log(`✓ ${target}`);
  }
  process.exit(0);
}

if (command === 'merge') {
  const dir = OUT[BOOK];
  const all = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => read(`${dir}/${f}`));
  const errors = check(all, 'scenes');
  const missing = [...index.keys()].filter((n) => !all.some((e) => e.number === n));
  if (missing.length) errors.push(`no scene yet for: ${missing.join(', ')}`);
  for (const e of errors.slice(0, 60)) console.log(`✗ ${e}`);
  if (errors.length) {
    console.log(`✗ ${errors.length} problem(s); nothing merged.`);
    process.exit(1);
  }
  const published = all
    .map(({ number, name, verse, scene }) => ({
      number,
      ...(name ? { name } : {}),
      ...(verse ? { verse } : {}),
      scene,
    }))
    .sort((a, b) => (Number(a.number) || -1) - (Number(b.number) || -1));
  writeFileSync(
    `private/scenes/${BOOK}.json`,
    `${JSON.stringify({ hymns: published }, null, 1)}\n`,
  );
  console.log(
    `✓ ${published.length} scenes → private/scenes/${BOOK}.json (now run seal-hymns.mjs)`,
  );
  process.exit(0);
}

console.log(
  'Usage: node scripts/scenes.mjs check <file> | render <file> <out.png> [--band] | verse <ref> | find <words> | used <ref> | merge',
);
process.exit(1);
