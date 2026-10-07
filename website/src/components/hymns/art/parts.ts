/**
 * Small painted things for the hymn backgrounds: trees, clouds, flowers, palms and a hill city.
 * Each returns SVG path data, to be painted by the Picture (painter.ts).
 */
import { r1, random, type Point } from './painter.ts';

export function pines(
  points: Point[],
  {
    seed,
    H,
    from,
    to,
    min = 0.07,
    max = 0.17,
  }: { seed: number; H: number; from: number; to: number; min?: number; max?: number },
) {
  const r = random(seed);
  let d = '';
  for (const [x, y] of points) {
    if (x < from || x > to || r() > 0.42) continue;
    const h = H * (min + r() * (max - min));
    const w = h * (0.3 + r() * 0.1);
    for (let t = 0; t < 4; t++) {
      const top = y - h + (t * h) / 5.2;
      const half = (w / 2) * (0.45 + t * 0.2) * (0.9 + r() * 0.2);
      const bottom = top + h * 0.34;
      d += `M${r1(x)},${r1(top)}L${r1(x + half)},${r1(bottom)}L${r1(x - half)},${r1(bottom)}Z`;
    }
  }
  return d;
}

/** A cloud as overlapping soft puffs (painted with cloudWash, so no outline shows). */
export function cloudShape(cx: number, cy: number, width: number, height: number, seed: number) {
  const r = random(seed);
  let d = '';
  const puffs = 7 + Math.floor(r() * 4);
  for (let i = 0; i < puffs; i++) {
    const t = i / (puffs - 1);
    const px = cx - width / 2 + width * t + (r() - 0.5) * width * 0.08;
    const lift = Math.sin(t * Math.PI);
    const rx = width * (0.1 + r() * 0.08);
    const ry = height * (0.28 + lift * 0.42) * (0.8 + r() * 0.4);
    const py = cy - ry * 0.45 * lift;
    d += `M${r1(px - rx)},${r1(py)}a${r1(rx)},${r1(ry)} 0 1 0 ${r1(rx * 2)},0a${r1(rx)},${r1(ry)} 0 1 0 ${r1(-rx * 2)},0Z`;
  }
  return d;
}

/** Small dabs of paint gathered in clusters along a skyline (flowers, foliage). */
export function clusters(
  points: Point[],
  {
    seed,
    clusters: count,
    per,
    size,
    spread,
    H,
    avoid = [],
  }: {
    seed: number;
    clusters: number;
    per: number;
    size: number;
    spread: number;
    H: number;
    avoid?: [number, number][];
  },
) {
  const r = random(seed);
  let d = '';
  for (let c = 0; c < count; c++) {
    const [x, y] = points[Math.floor(r() * points.length)] as Point;
    if (avoid.some(([a, b]) => x > a && x < b)) continue;
    const cy = y + H * spread * (0.2 + r() * 0.8);
    for (let i = 0; i < per; i++) {
      const s = size * (0.55 + r() * 0.7);
      const dx = (r() - 0.5) * 90;
      const dy = (r() - 0.5) * 26;
      d += `M${r1(x + dx - s)},${r1(cy + dy)}a${r1(s)},${r1(s * 0.82)} 0 1 0 ${r1(s * 2)},0a${r1(s)},${r1(s * 0.82)} 0 1 0 ${r1(-s * 2)},0Z`;
    }
  }
  return d;
}

/** Round trees (olive, orchard): a soft canopy on a short trunk. */
export function roundTrees(spots: [number, number, number?][], size: number) {
  let canopy = '';
  let trunks = '';
  for (const [x, y, k = 1] of spots) {
    const s = size * k;
    trunks += `M${r1(x - s * 0.09)},${r1(y)}L${r1(x - s * 0.05)},${r1(y - s * 0.75)}L${r1(x + s * 0.05)},${r1(y - s * 0.75)}L${r1(x + s * 0.09)},${r1(y)}Z`;
    canopy += cloudShape(x, y - s * 0.8, s * 1.15, s * 0.9, Math.round(x));
  }
  return { canopy, trunks };
}

export function palm(x: number, groundY: number, height: number, lean: number, seed: number) {
  const r = random(seed);
  const topX = x + lean;
  const topY = groundY - height;
  const trunk = `M${r1(x - 10)},${r1(groundY)}Q${r1(x + lean * 0.3 - 6)},${r1(groundY - height * 0.55)} ${r1(topX - 3)},${r1(topY)}L${r1(topX + 3)},${r1(topY)}Q${r1(x + lean * 0.3 + 7)},${r1(groundY - height * 0.55)} ${r1(x + 10)},${r1(groundY)}Z`;
  let fronds = '';
  const count = 9;
  for (let i = 0; i < count; i++) {
    const a = -Math.PI * 1.02 + (Math.PI * 1.04 * i) / (count - 1) + (r() - 0.5) * 0.2;
    const len = height * (0.34 + r() * 0.12);
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.4 + len * 0.46;
    const mx = topX + Math.cos(a) * len * 0.55;
    const my = topY + Math.sin(a) * len * 0.6 - len * 0.1;
    const w = len * 0.12;
    fronds += `M${r1(topX)},${r1(topY)}Q${r1(mx)},${r1(my - w)} ${r1(ex)},${r1(ey)}Q${r1(mx + w * 0.4)},${r1(my + w)} ${r1(topX)},${r1(topY + 5)}Z`;
  }
  return { trunk, fronds };
}

/** A walled hill city with towers and a domed temple, standing on `ground`. */
export function city(cx: number, ground: number, unit: number) {
  const u = (n: number) => n * unit;
  let walls = '';
  let shade = '';
  const teeth = (x: number, y: number, w: number) => {
    let t = '';
    for (let k = 0; k < Math.floor(w / u(14)); k++)
      t += `M${r1(x + k * u(14))},${r1(y)}v${r1(-u(7))}h${r1(u(8))}v${r1(u(7))}Z`;
    return t;
  };
  const block = (x: number, w: number, h: number) => {
    walls +=
      `M${r1(x)},${r1(ground + 4)}v${r1(-h)}h${r1(w)}v${r1(h)}Z` + teeth(x, ground + 4 - h, w);
    shade += `M${r1(x + w * 0.7)},${r1(ground + 4)}v${r1(-h)}h${r1(w * 0.3)}v${r1(h)}Z`;
  };
  block(cx - u(330), u(660), u(34));
  block(cx - u(300), u(46), u(70));
  block(cx - u(150), u(40), u(58));
  block(cx + u(120), u(42), u(62));
  block(cx + u(260), u(48), u(74));
  const tw = u(150);
  const th = u(72);
  walls += `M${r1(cx - tw / 2)},${r1(ground + 4)}v${r1(-th)}h${r1(tw)}v${r1(th)}Z`;
  shade += `M${r1(cx + tw * 0.2)},${r1(ground + 4)}v${r1(-th)}h${r1(tw * 0.3)}v${r1(th)}Z`;
  const dr = u(46);
  walls += `M${r1(cx - dr)},${r1(ground + 4 - th + 1)}a${r1(dr)},${r1(dr * 0.95)} 0 0 1 ${r1(dr * 2)},0Z`;
  return { walls, shade };
}
