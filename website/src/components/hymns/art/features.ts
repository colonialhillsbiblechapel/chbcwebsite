/**
 * Small painted features that a hymn's words call for: a chapel, a cottage, the crosses of
 * Calvary, a garden tomb, a stable, sheep on the hillside, a boat, a lighthouse, a bridge, a tent,
 * a rainbow, a star. Each is drawn simply, in light colours, at a modest size,
 * so it belongs to the landscape rather than standing in front of it.
 *
 * Coordinates are in the picture's pixels; `u` scales everything (1 on the title slide, smaller on
 * the strip under the words).
 */
import { W, r1, random, through, type Picture, type Point } from './painter.ts';
import { cloudShape } from './parts.ts';
import type { Palette } from './palettes.ts';

const rect = (x: number, y: number, w: number, h: number) =>
  `M${r1(x)},${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}Z`;

export function chapel(p: Picture, x: number, ground: number, u: number, pal: Palette) {
  const w = 74 * u;
  const h = 44 * u;
  const body = rect(x - w / 2, ground - h, w, h + 4);
  const roof = `M${r1(x - w / 2 - 6 * u)},${r1(ground - h + 1)}L${r1(x)},${r1(ground - h - 30 * u)}L${r1(x + w / 2 + 6 * u)},${r1(ground - h + 1)}Z`;
  const tx = x - w / 2 - 4 * u;
  const tw = 24 * u;
  const th = 78 * u;
  const tower = rect(tx - tw / 2, ground - th, tw, th + 4);
  const spire = `M${r1(tx - tw / 2 - 2 * u)},${r1(ground - th + 1)}L${r1(tx)},${r1(ground - th - 42 * u)}L${r1(tx + tw / 2 + 2 * u)},${r1(ground - th + 1)}Z`;
  const door = `M${r1(x - 7 * u)},${r1(ground + 2)}v${r1(-16 * u)}a${r1(7 * u)},${r1(7 * u)} 0 0 1 ${r1(14 * u)},0v${r1(16 * u)}Z`;
  const windows = [x + 18 * u, x - 18 * u]
    .map(
      (wx) =>
        `M${r1(wx - 4 * u)},${r1(ground - 18 * u)}v${r1(-12 * u)}a${r1(4 * u)},${r1(4 * u)} 0 0 1 ${r1(8 * u)},0v${r1(12 * u)}Z`,
    )
    .join('');
  const towerWindow = `M${r1(tx - 4 * u)},${r1(ground - th + 26 * u)}v${r1(-10 * u)}a${r1(4 * u)},${r1(4 * u)} 0 0 1 ${r1(8 * u)},0v${r1(10 * u)}Z`;
  p.paint(body + tower, pal.walls, { edge: 2, rim: 1, opacity: 0.98, blend: false });
  p.paint(roof + spire, pal.roof, { edge: 2, rim: 1, opacity: 0.95 });
  p.paint(door + windows + towerWindow, pal.shade, { edge: 1.5, rim: 1, opacity: 0.85 });
  p.paint(rect(x + w * 0.2, ground - h, w * 0.3, h + 4), pal.shade, {
    edge: 2,
    rim: 1,
    opacity: 0.35,
  });
}

export function cottage(p: Picture, x: number, ground: number, u: number, pal: Palette) {
  const w = 96 * u;
  const h = 46 * u;
  const body = rect(x - w / 2, ground - h, w, h + 4);
  const roof = `M${r1(x - w / 2 - 10 * u)},${r1(ground - h + 2)}L${r1(x - w / 2 + 16 * u)},${r1(ground - h - 34 * u)}L${r1(x + w / 2 - 16 * u)},${r1(ground - h - 34 * u)}L${r1(x + w / 2 + 10 * u)},${r1(ground - h + 2)}Z`;
  const chimney = rect(x + w * 0.22, ground - h - 46 * u, 12 * u, 22 * u);
  const door = rect(x - 8 * u, ground - 26 * u, 16 * u, 30 * u);
  const windows =
    rect(x - w * 0.36, ground - 32 * u, 16 * u, 14 * u) +
    rect(x + w * 0.2, ground - 32 * u, 16 * u, 14 * u);
  p.paint(body + chimney, pal.walls, { edge: 2, rim: 1, opacity: 0.98, blend: false });
  p.paint(roof, pal.roof, { edge: 2, rim: 1, opacity: 0.95 });
  p.paint(door, pal.wood, { edge: 1.5, rim: 1, opacity: 0.8 });
  p.paint(windows, '#f6e2a8', { edge: 1.5, rim: 1, opacity: 0.9, blend: false });
  p.strokes(
    `M${r1(x + w * 0.22 + 6 * u)},${r1(ground - h - 52 * u)}c${r1(-10 * u)},${r1(-14 * u)} ${r1(14 * u)},${r1(-22 * u)} ${r1(2 * u)},${r1(-38 * u)}`,
    pal.cloud[1],
    4 * u,
    { opacity: 0.6, edge: 3 },
  );
}

/** One cross: an upright and a crossbeam, softly painted. */
function crossPath(x: number, ground: number, h: number, t: number) {
  return (
    rect(x - t / 2, ground - h, t, h + 4) +
    rect(x - h * 0.27, ground - h * 0.74, h * 0.54, t * 0.85)
  );
}

/** The three crosses of Calvary on a green hill — small, distant and quiet. */
export function calvary(p: Picture, x: number, ground: number, u: number, pal: Palette) {
  const top = ground;
  const d =
    crossPath(x, top + 2, 92 * u, 7 * u) +
    crossPath(x - 74 * u, top + 12 * u, 66 * u, 5.5 * u) +
    crossPath(x + 74 * u, top + 12 * u, 66 * u, 5.5 * u);
  p.paint(d, pal.wood, { edge: 2, rim: 1, opacity: 0.92 });
}

/** A single cross on a hill. */
export function cross(p: Picture, x: number, ground: number, u: number, pal: Palette) {
  const top = ground;
  p.paint(crossPath(x, top + 2, 100 * u, 7.5 * u), pal.wood, { edge: 2, rim: 1, opacity: 0.92 });
}

/** The garden tomb: a rounded rock with its doorway open and the great stone rolled away. */
export function tomb(p: Picture, x: number, ground: number, u: number, pal: Palette) {
  const rock: Point[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const rise = Math.sin(t * Math.PI) ** 0.7 * (0.92 + 0.08 * Math.sin(t * 13));
    rock.push([x - 170 * u + t * 340 * u, ground - 96 * u * rise]);
  }
  const d = `M${r1(x - 170 * u)},${r1(p.H + 40)}L${pt2(rock[0] as Point)}${through(rock)}L${r1(x + 170 * u)},${r1(p.H + 40)}Z`;
  p.paint(
    d,
    p.gradient([
      [0, stoneShade(pal.shade, 0.15)],
      [0.35, pal.walls],
      [0.62, pal.walls, 0],
    ]),
    { edge: 5, rim: 2, opacity: 0.97, blend: false },
  );
  p.paint(
    d,
    p.gradient([
      [0, pal.shade],
      [0.35, pal.shade, 0.6],
      [0.6, pal.shade, 0],
    ]),
    { edge: 5, rim: 2, opacity: 0.25 },
  );
  const dx = x - 30 * u;
  const door = `M${r1(dx - 24 * u)},${r1(ground + 4)}v${r1(-40 * u)}a${r1(24 * u)},${r1(24 * u)} 0 0 1 ${r1(48 * u)},0v${r1(40 * u)}Z`;
  p.paint(door, stoneShade(pal.shade, 0.45), { edge: 1.5, rim: 1, opacity: 0.9, blend: false });
  const sr = 36 * u;
  const sx = x + 66 * u;
  const stone = `M${r1(sx - sr)},${r1(ground - sr + 4)}a${r1(sr)},${r1(sr)} 0 1 0 ${r1(sr * 2)},0a${r1(sr)},${r1(sr)} 0 1 0 ${r1(-sr * 2)},0Z`;
  p.paint(stone, pal.walls, { edge: 2.5, rim: 2, opacity: 1, blend: false });
  p.paint(stone, pal.shade, { edge: 2.5, rim: 2, opacity: 0.4 });
  p.strokes(
    `M${r1(sx - sr * 0.5)},${r1(ground - sr * 1.2)}a${r1(sr * 0.6)},${r1(sr * 0.6)} 0 0 1 ${r1(sr)},${r1(sr * 0.2)}`,
    pal.walls,
    3 * u,
    { opacity: 0.8 },
  );
}
const pt2 = ([x, y]: Point) => `${r1(x)},${r1(y)}`;
/** A slightly deeper stone colour (still light). */
function stoneShade(c: string, by: number) {
  const n = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  return `#${n
    .map((v) =>
      Math.round(v * (1 - by * 0.35))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** A humble stable of wood and thatch, warm light within. */
export function stable(p: Picture, x: number, ground: number, u: number, pal: Palette) {
  const w = 150 * u;
  const h = 60 * u;
  p.glow(x, (ground - h * 0.4) / p.H, 120 * u, '#f8e2a6', 0.55);
  const back = rect(x - w / 2, ground - h, w, h + 4);
  const opening = rect(x - w / 2 + 20 * u, ground - h + 12 * u, w - 40 * u, h - 8 * u);
  const posts =
    rect(x - w / 2, ground - h, 8 * u, h + 4) +
    rect(x + w / 2 - 8 * u, ground - h, 8 * u, h + 4) +
    rect(x - 4 * u, ground - h, 8 * u, 14 * u);
  const roof = `M${r1(x - w / 2 - 22 * u)},${r1(ground - h + 8 * u)}L${r1(x - w * 0.1)},${r1(ground - h - 36 * u)}L${r1(x + w * 0.1)},${r1(ground - h - 36 * u)}L${r1(x + w / 2 + 22 * u)},${r1(ground - h + 8 * u)}Z`;
  let thatch = '';
  for (let k = -6; k <= 6; k++)
    thatch += `M${r1(x + k * 14 * u)},${r1(ground - h - 30 * u + Math.abs(k) * 2 * u)}l${r1(k * 3 * u)},${r1(38 * u)}`;
  p.paint(back, pal.wood, { edge: 2, rim: 1, opacity: 0.75 });
  p.paint(opening, '#f8e6b6', { edge: 2, rim: 1, opacity: 0.95, blend: false });
  p.paint(posts, pal.wood, { edge: 1.5, rim: 1, opacity: 0.95 });
  p.paint(roof, pal.roof, { edge: 3, rim: 1, opacity: 0.95 });
  p.strokes(thatch, pal.wood, 2 * u, { opacity: 0.45 });
}

/** A small flock grazing on the hillside. */
export function sheep(
  p: Picture,
  surface: Point[],
  from: number,
  to: number,
  u: number,
  pal: Palette,
  seed: number,
) {
  const r = random(seed);
  let wool = '';
  let heads = '';
  const count = 9;
  for (let i = 0; i < count; i++) {
    const x = from + (to - from) * ((i + r() * 0.6) / count);
    const crest = crestAt(surface, x) + 10 * u + r() * 26 * u;
    const s = (15 + r() * 6) * u;
    wool += cloudShape(x, crest, s * 2.1, s * 1.3, Math.round(x * 7));
    const dir = r() < 0.5 ? -1 : 1;
    heads += `M${r1(x + dir * s * 1.05 - 4 * u)},${r1(crest - s * 0.25)}a${r1(5 * u)},${r1(6 * u)} 0 1 0 ${r1(10 * u)},0a${r1(5 * u)},${r1(6 * u)} 0 1 0 ${r1(-10 * u)},0Z`;
  }
  p.paint(wool, '#fdfbf6', { edge: 3, rim: 1.5, opacity: 0.98, blend: false });
  p.paint(heads, pal.wood, { edge: 1, rim: 1, opacity: 0.7 });
}

/** A small sailing boat on the water, with its reflection. */
export function boat(p: Picture, x: number, water: number, u: number, pal: Palette) {
  const y = water;
  const hull = `M${r1(x - 52 * u)},${r1(y - 10 * u)}L${r1(x + 56 * u)},${r1(y - 10 * u)}Q${r1(x + 40 * u)},${r1(y + 8 * u)} ${r1(x + 26 * u)},${r1(y + 9 * u)}L${r1(x - 30 * u)},${r1(y + 9 * u)}Q${r1(x - 44 * u)},${r1(y + 6 * u)} ${r1(x - 52 * u)},${r1(y - 10 * u)}Z`;
  const mast = rect(x - 2 * u, y - 112 * u, 4 * u, 102 * u);
  const sail = `M${r1(x + 4 * u)},${r1(y - 108 * u)}Q${r1(x + 50 * u)},${r1(y - 60 * u)} ${r1(x + 48 * u)},${r1(y - 16 * u)}L${r1(x + 4 * u)},${r1(y - 16 * u)}Z`;
  const jib = `M${r1(x - 4 * u)},${r1(y - 96 * u)}L${r1(x - 4 * u)},${r1(y - 16 * u)}L${r1(x - 44 * u)},${r1(y - 16 * u)}Z`;
  p.paint(sail + jib, '#fdfaf3', { edge: 2, rim: 1.5, opacity: 0.98, blend: false });
  p.paint(sail + jib, pal.shade, { edge: 2, rim: 1.5, opacity: 0.25 });
  p.paint(mast + hull, pal.wood, { edge: 1.5, rim: 1, opacity: 0.9 });
  p.strokes(
    `M${r1(x - 46 * u)},${r1(y + 16 * u)}h${r1(90 * u)}M${r1(x - 30 * u)},${r1(y + 26 * u)}h${r1(60 * u)}`,
    pal.shimmer,
    3 * u,
    { opacity: 0.85 },
  );
}

/** A lighthouse on the headland, its lamp glowing softly. */
export function lighthouse(p: Picture, x: number, ground: number, u: number, pal: Palette) {
  const h = 128 * u;
  const tower = `M${r1(x - 17 * u)},${r1(ground + 3)}L${r1(x - 11 * u)},${r1(ground - h)}L${r1(x + 11 * u)},${r1(ground - h)}L${r1(x + 17 * u)},${r1(ground + 3)}Z`;
  const bands = [0.3, 0.62]
    .map(
      (f) =>
        `M${r1(x - 17 * u + 6 * u * f)},${r1(ground - h * f)}L${r1(x + 17 * u - 6 * u * f)},${r1(ground - h * f)}L${r1(x + 17 * u - 6 * u * (f + 0.12))},${r1(ground - h * (f + 0.12))}L${r1(x - 17 * u + 6 * u * (f + 0.12))},${r1(ground - h * (f + 0.12))}Z`,
    )
    .join('');
  const lamp = rect(x - 10 * u, ground - h - 18 * u, 20 * u, 18 * u);
  const cap = `M${r1(x - 14 * u)},${r1(ground - h - 17 * u)}L${r1(x)},${r1(ground - h - 32 * u)}L${r1(x + 14 * u)},${r1(ground - h - 17 * u)}Z`;
  p.glow(x, (ground - h - 9 * u) / p.H, 46 * u, '#f9e2a2', 0.65);
  p.paint(tower, pal.walls, { edge: 1.5, rim: 1, opacity: 0.98, blend: false });
  p.paint(bands + cap, pal.roof, { edge: 1.5, rim: 1, opacity: 0.9 });
  p.paint(lamp, '#f8e6ae', { edge: 1.5, rim: 1, opacity: 0.95, blend: false });
}

/** A stone footbridge arching over the river. */
export function bridge(p: Picture, x: number, y: number, u: number, pal: Palette) {
  const w = 150 * u;
  const d = `M${r1(x - w / 2)},${r1(y + 6 * u)}L${r1(x - w / 2)},${r1(y - 14 * u)}Q${r1(x)},${r1(y - 44 * u)} ${r1(x + w / 2)},${r1(y - 14 * u)}L${r1(x + w / 2)},${r1(y + 6 * u)}L${r1(x + w * 0.32)},${r1(y + 6 * u)}Q${r1(x)},${r1(y - 26 * u)} ${r1(x - w * 0.32)},${r1(y + 6 * u)}Z`;
  p.paint(d, pal.walls, { edge: 2, rim: 1.5, opacity: 0.98, blend: false });
  p.paint(d, pal.shade, { edge: 2, rim: 1.5, opacity: 0.3 });
}

/** A pilgrim's tent. */
export function tent(p: Picture, x: number, ground: number, u: number, pal: Palette) {
  const body = `M${r1(x - 70 * u)},${r1(ground + 3)}L${r1(x)},${r1(ground - 70 * u)}L${r1(x + 70 * u)},${r1(ground + 3)}Z`;
  const door = `M${r1(x - 16 * u)},${r1(ground + 3)}L${r1(x)},${r1(ground - 44 * u)}L${r1(x + 16 * u)},${r1(ground + 3)}Z`;
  p.paint(body, pal.walls, { edge: 2, rim: 1.5, opacity: 0.98, blend: false });
  p.paint(body, pal.shade, { edge: 2, rim: 1.5, opacity: 0.3 });
  p.paint(door, pal.wood, { edge: 1.5, rim: 1, opacity: 0.7 });
  p.strokes(`M${r1(x)},${r1(ground - 70 * u)}l${r1(-6 * u)},${r1(-14 * u)}`, pal.wood, 3 * u, {
    opacity: 0.8,
  });
}

/** A soft pastel rainbow across the sky — God's promise. */
export function rainbow(p: Picture, x: number, u: number) {
  const colours = ['#f2c4c4', '#f6dcb4', '#f5ecb8', '#cfe4c4', '#c4d8ea', '#d8cce8'];
  const r0 = 520 * u;
  const cy = p.y(1.12);
  let i = 0;
  for (const c of colours) {
    const r = r0 - i * 16 * u;
    p.add(
      `<path d="M${r1(x - r)},${r1(cy)}A${r1(r)},${r1(r)} 0 0 1 ${r1(x + r)},${r1(cy)}" fill="none" stroke="${c}" stroke-width="${r1(17 * u)}" opacity="0.5" filter="url(#${p.blur(5)})"/>`,
    );
    i++;
  }
}

/** A single bright star with a soft halo — the star of Bethlehem, the Morning Star. */
export function star(p: Picture, x: number, yFraction: number, u: number, pal: Palette) {
  const y = p.y(yFraction);
  p.glow(x, yFraction, 90 * u, pal.glow, 0.85);
  const a = 46 * u;
  const b = 9 * u;
  const d = `M${r1(x)},${r1(y - a)}Q${r1(x + b * 0.4)},${r1(y - b * 0.4)} ${r1(x + a * 0.72)},${r1(y)}Q${r1(x + b * 0.4)},${r1(y + b * 0.4)} ${r1(x)},${r1(y + a)}Q${r1(x - b * 0.4)},${r1(y + b * 0.4)} ${r1(x - a * 0.72)},${r1(y)}Q${r1(x - b * 0.4)},${r1(y - b * 0.4)} ${r1(x)},${r1(y - a)}Z`;
  p.paint(d, pal.sun[0], { edge: 1.5, rim: 1, opacity: 0.98, blend: false });
  p.paint(d, pal.sun[1], { edge: 1.5, rim: 1, opacity: 0.45 });
}

/** A few small gold stars scattered high in the sky. */
export function stars(p: Picture, u: number, pal: Palette, seed: number, avoid: number) {
  const r = random(seed);
  let d = '';
  for (let i = 0; i < 14; i++) {
    const x = 80 + r() * (W - 160);
    if (Math.abs(x - avoid) < 160 * u) continue;
    const y = p.y(0.08 + r() * 0.3);
    const s = (5 + r() * 6) * u;
    d += `M${r1(x)},${r1(y - s)}L${r1(x + s * 0.28)},${r1(y - s * 0.28)}L${r1(x + s)},${r1(y)}L${r1(x + s * 0.28)},${r1(y + s * 0.28)}L${r1(x)},${r1(y + s)}L${r1(x - s * 0.28)},${r1(y + s * 0.28)}L${r1(x - s)},${r1(y)}L${r1(x - s * 0.28)},${r1(y - s * 0.28)}Z`;
  }
  p.paint(d, pal.sun[1], { edge: 1, rim: 1, opacity: 0.8, blend: false });
}

/** Height of a surface (a skyline) at x. */
export function crestAt(surface: Point[], x: number) {
  let best = surface[0] as Point;
  for (const point of surface) if (Math.abs(point[0] - x) < Math.abs(best[0] - x)) best = point;
  return best[1];
}
