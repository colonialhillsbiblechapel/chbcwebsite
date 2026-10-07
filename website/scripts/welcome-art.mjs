#!/usr/bin/env node
/**
 * Prepares the pictures of the Sunday welcome slides (public/hymns/welcome/) from the chapel's own
 * artwork: the watercolour backgrounds of CHBC_Welcome_Songs.pptx and the 4K welcome pictures.
 *
 * - <slide>.jpg: the deck's backgrounds (welcome, chorus, song, birthday, anniversary), 2560 × 1440.
 * - picture-<name>.jpg (3840 × 2160) and thumb-<name>.jpg: the finished welcome pictures.
 * - brush.png: the gold brush stroke of the welcome pictures, lifted off its paper (transparent),
 *   so it lays on any of the paintings without a patch.
 *
 * Usage: node scripts/welcome-art.mjs <folder with the deck and the *_Welcome_4K.png pictures>
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import sharp from 'sharp';

const from = process.argv[2];
if (!from) {
  console.error('Usage: node scripts/welcome-art.mjs <folder>');
  process.exit(1);
}
const OUT = 'public/hymns/welcome';
mkdirSync(OUT, { recursive: true });
const jpeg = { quality: 84, mozjpeg: true, chromaSubsampling: '4:4:4' };

/** Reads one file out of a .pptx (a zip) without unpacking it. */
function unzip(file, name) {
  const zip = readFileSync(file);
  for (let at = zip.lastIndexOf(0x06054b50 & 0xff); at >= 0; at--) {
    if (zip.readUInt32LE(at) !== 0x06054b50) continue;
    let entry = zip.readUInt32LE(at + 16);
    for (let n = zip.readUInt16LE(at + 10); n > 0; n--) {
      const size = zip.readUInt32LE(entry + 20);
      const nameLength = zip.readUInt16LE(entry + 28);
      const extra = zip.readUInt16LE(entry + 30) + zip.readUInt16LE(entry + 32);
      const local = zip.readUInt32LE(entry + 42);
      const entryName = zip.toString('utf8', entry + 46, entry + 46 + nameLength);
      if (entryName === name) {
        const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
        const data = zip.subarray(start, start + size);
        return zip.readUInt16LE(entry + 10) === 8 ? inflateRawSync(data) : data;
      }
      entry += 46 + nameLength + extra;
    }
  }
  throw new Error(`${name} not found in ${file}`);
}

// The deck's backgrounds: slide layouts 2–6 use image1–5.
const deck = join(from, 'CHBC_Welcome_Songs.pptx');
const slides = ['welcome', 'chorus', 'song', 'birthday', 'anniversary'];
for (const [i, name] of slides.entries()) {
  await sharp(unzip(deck, `ppt/media/image${i + 1}.png`))
    .resize(2560, 1440)
    .jpeg(jpeg)
    .toFile(join(OUT, `${name}.jpg`));
}

// The finished welcome pictures.
const pictures = {
  morning: 'Morning_Welcome_4K.png',
  afternoon: 'Afternoon_Welcome_4K.png',
  evening: 'Evening_Welcome_4K.png',
  lily: 'Lily_Welcome_4K.png',
  olive: 'Olive_Welcome_4K.png',
  classic: 'Welcome_4K.png',
};
for (const [name, file] of Object.entries(pictures)) {
  const image = sharp(join(from, file));
  await image
    .clone()
    .resize(3840, 2160)
    .jpeg(jpeg)
    .toFile(join(OUT, `picture-${name}.jpg`));
  await image
    .clone()
    .resize(640, 360)
    .jpeg({ ...jpeg, quality: 80 })
    .toFile(join(OUT, `thumb-${name}.jpg`));
}

// The gold brush stroke, lifted off its paper into a transparent picture: each pixel's gold and
// how much of it covers the paper. (Laid on with a blend mode instead, it would make the browser
// draw the whole slide in tiles at full screen, with hairline seams between them.)
const crop = { left: 1300, top: 975, width: 1240, height: 160 };
const { data, info } = await sharp(join(from, 'Welcome_4K.png'))
  .extract(crop)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const paper = [0, 1, 2].map((c) => {
  const edge = [];
  for (let x = 0; x < info.width; x++)
    for (const y of [0, 1, 2, info.height - 3, info.height - 2, info.height - 1])
      edge.push(data[(y * info.width + x) * 3 + c]);
  edge.sort((a, b) => a - b);
  return edge[Math.floor(edge.length / 2)];
});
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let p = 0; p < info.width * info.height; p++) {
  // How much each channel is darkened from the paper (1 = untouched paper).
  const m = [0, 1, 2].map((c) => Math.min(1, data[p * 3 + c] / paper[c]));
  const cover = 1 - Math.min(...m);
  // The paper's own grain is not part of the stroke.
  const a = cover < 0.04 ? 0 : Math.min(1, (cover - 0.04) / 0.96 + 0.04);
  for (let c = 0; c < 3; c++) {
    const gold = a ? (paper[c] * (m[c] - (1 - a))) / a : 0;
    rgba[p * 4 + c] = Math.max(0, Math.min(255, Math.round(gold)));
  }
  rgba[p * 4 + 3] = Math.round(a * 255);
}
await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9, palette: false })
  .toFile(join(OUT, 'brush.png'));

console.log(`✓ Welcome pictures written to ${OUT}/`);
