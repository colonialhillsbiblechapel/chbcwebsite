#!/usr/bin/env node
/**
 * Saves the thumbnail of every message into src/assets/thumbnails/<YouTube ID>.jpg, so the site
 * never has to contact YouTube to show them. Existing files are kept; run it after adding new
 * messages. (Videos from another channel are credited to that channel wherever they appear.)
 *
 * Usage: node scripts/fetch-thumbnails.mjs
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';

const SERMONS = 'src/content/sermons';
const OUT = 'src/assets/thumbnails';
const SIZES = ['maxresdefault', 'sddefault', 'hqdefault'];

mkdirSync(OUT, { recursive: true });
let saved = 0;
const missing = [];
for (const file of readdirSync(SERMONS).filter((f) => f.endsWith('.yaml'))) {
  const id = file.replace(/\.yaml$/, '');
  if (existsSync(`${OUT}/${id}.jpg`)) continue;

  let image;
  for (const size of SIZES) {
    const response = await fetch(`https://i.ytimg.com/vi/${id}/${size}.jpg`);
    const bytes = response.ok ? Buffer.from(await response.arrayBuffer()) : null;
    // YouTube answers missing sizes with a tiny grey placeholder.
    if (bytes && bytes.length > 3000) {
      image = bytes;
      break;
    }
  }
  if (image) {
    writeFileSync(`${OUT}/${id}.jpg`, image);
    saved++;
  } else {
    missing.push(id);
  }
}

console.log(`✓ Saved ${saved} new thumbnail(s) to ${OUT}/`);
if (missing.length) console.log(`• No thumbnail found on YouTube for: ${missing.join(', ')}`);
