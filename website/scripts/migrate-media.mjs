#!/usr/bin/env node
/**
 * Moves the video library from the old site's media-page.html into the sermons collection:
 * one YAML file per video in src/content/sermons/<YouTube ID>.yaml.
 *
 * Titles, speakers and descriptions are copied exactly as written. Re-run it before launch to pick
 * up any messages added to the old site in the meantime (existing files are overwritten).
 *
 * Usage: node scripts/migrate-media.mjs [path/to/media-page.html]
 *        (default: media-page.html on the master branch of this repository)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const OUT = 'src/content/sermons';
const html = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : execFileSync('git', ['show', 'master:media-page.html'], { encoding: 'utf8' });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ENTITIES = { '&amp;': '&', '&quot;': '"', '&#39;': '’', '&apos;': '’', '&nbsp;': ' ' };

const text = (fragment = '') =>
  fragment
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e] ?? e)
    .replace(/(?<=[A-Za-z])'(?=[A-Za-z])/g, '’')
    .replace(/\s+/g, ' ')
    .trim();
const pick = (chunk, pattern) => chunk.match(pattern)?.[1];

/** "Sep 27, 2026" → { date: "2026-09-27" }, "2023" → { year: 2023 }, anything else → {} */
function parseDate(value = '') {
  const full = value.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/);
  if (full) {
    const month = String(MONTHS.indexOf(full[1]) + 1).padStart(2, '0');
    return { date: `${full[3]}-${month}-${full[2].padStart(2, '0')}` };
  }
  return /^\d{4}$/.test(value) ? { year: Number(value) } : {};
}

const cards = html
  .split('<div class="video-card"')
  .slice(1)
  .map((chunk) => {
    const meta = Object.fromEntries(
      [...chunk.matchAll(/<span><i class="fas fa-(user|calendar)"><\/i>([\s\S]*?)<\/span>/g)].map(
        (m) => [m[1], text(m[2])],
      ),
    );
    return {
      id: pick(chunk, /data-video-id="([^"]+)"/),
      categories: (pick(chunk, /data-category="([^"]+)"/) ?? '').split(/\s+/),
      label: text(pick(chunk, /class="video-category">([\s\S]*?)<\/span>/)),
      title: text(pick(chunk, /class="video-title">([\s\S]*?)<\/h3>/)),
      speaker: meta.user,
      date: meta.calendar,
      description: text(pick(chunk, /class="video-description">([\s\S]*?)<\/div>/)),
      slides: pick(chunk, /href="(https:\/\/docs\.google\.com\/[^"]+)"/),
    };
  });

const quote = (value) => JSON.stringify(value); // JSON strings are valid YAML

mkdirSync(OUT, { recursive: true });
const written = new Set();
for (const card of cards) {
  if (!card.id) continue;
  const fields = { title: card.title };
  // The old page left one placeholder; every other episode of that series says "Guest Speaker".
  fields.speaker = card.speaker === 'Speaker Name' ? 'Guest Speaker' : card.speaker;
  Object.assign(fields, parseDate(card.date));
  fields.category = card.categories.includes('conference')
    ? 'conference'
    : card.categories.includes('sunday')
      ? 'sunday'
      : 'special';

  if (card.label === 'Light from the Word') {
    fields.series = 'light-from-the-word';
    fields.episode = Number(card.title.match(/^Episode (\d+)/)?.[1]);
  } else if (/^Doctrine of Discipleship/.test(card.title)) {
    fields.series = 'doctrine-of-discipleship';
    fields.episode = Number(card.title.match(/Discipleship\s*-\s*(\d+)/)?.[1] ?? 1);
  }
  const edition = card.title.match(/\b(1\d\d)(?:st|nd|rd|th)?\b/)?.[1];
  if (fields.category === 'conference' && edition) fields.conference = Number(edition);
  if (card.description) fields.description = card.description;
  if (card.slides) fields.slides = card.slides;

  const yaml = Object.entries(fields)
    .filter(([, v]) => v !== undefined && !Number.isNaN(v))
    .map(([k, v]) => `${k}: ${typeof v === 'number' ? v : quote(v)}`)
    .join('\n');
  writeFileSync(`${OUT}/${card.id}.yaml`, `${yaml}\n`);
  written.add(`${card.id}.yaml`);
}

const extra = readdirSync(OUT).filter((f) => f.endsWith('.yaml') && !written.has(f));
console.log(`✓ Wrote ${written.size} sermons to ${OUT}/`);
if (extra.length) console.log(`• Not on the old page (kept): ${extra.join(', ')}`);
