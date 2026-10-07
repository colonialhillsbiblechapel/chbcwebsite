/**
 * The watercolour painter behind the hymn backgrounds: deterministic noise, smooth skylines and an
 * SVG "picture" with watercolour filters (wobbly edges, pigment blooms, dried rims), mist, glows and
 * soft clouds. Pure functions only, so the same code draws in the browser and in Node scripts.
 */

export const W = 1920;
export type Kind = 'title' | 'band';
const HEIGHTS: Record<Kind, number> = { title: 460, band: 200 };

export type Point = [number, number];

/* ——— Randomness that is the same on every run ——— */

export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise(seed: number) {
  const r = random(seed);
  const lattice = Array.from({ length: 1024 }, () => r() * 2 - 1);
  const at = (i: number) => lattice[((i % 1024) + 1024) % 1024] ?? 0;
  return (x: number) => {
    const i = Math.floor(x);
    const t = (1 - Math.cos((x - i) * Math.PI)) / 2;
    return at(i) * (1 - t) + at(i + 1) * t;
  };
}

function fbm(n: (x: number) => number, x: number, octaves: number) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * n(x * freq + o * 31.7);
    norm += amp;
    amp *= 0.5;
    freq *= 2.07;
  }
  return Math.max(-1, Math.min(1, (sum / norm) * 1.7));
}

/* ——— Paths ——— */

export const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = ([x, y]: Point) => `${r1(x)},${r1(y)}`;

/** Smooth curve through points (Catmull-Rom as cubic Béziers), without the opening move. */
export function through(points: Point[]) {
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i] as Point;
    const p0 = points[i - 1] ?? p1;
    const p2 = points[i + 1] as Point;
    const p3 = points[i + 2] ?? p2;
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d;
}

interface Shape {
  seed: number;
  /** Where the range sits, as a fraction of the picture's height (its foot). */
  base: number;
  /** How tall it rises, as a fraction of the picture's height. */
  amp: number;
  scale?: number;
  octaves?: number;
  /** Mountains (summits) rather than rolling hills. */
  peaks?: boolean;
  from?: number;
  to?: number;
  fall?: number;
}

/**
 * The top edge of a hill or mountain range, as points.
 *
 * Mountains (`peaks`) are built like real ranges: a handful of summits of different heights and
 * widths, each with broad shoulders and a softly rounded top, overlapping one another, with fine
 * ridges along their slopes. Hills are a gentle rolling line. A range that stops short of the edge
 * (`from`/`to`) slopes away at its ends instead of ending in a cliff.
 */
function skyline({
  seed,
  base,
  amp,
  scale = 320,
  octaves = 4,
  peaks = false,
  from = -80,
  to = W + 80,
  fall = 0,
}: Shape): Point[] {
  const n = noise(seed);
  const detail = noise(seed + 101);
  const r = random(seed + 7);
  const summits: { c: number; h: number; w: number; lean: number }[] = [];
  if (peaks) {
    for (let c = from - scale * 0.3; c < to + scale * 0.5; c += scale * (0.55 + r() * 0.55)) {
      summits.push({
        c,
        h: 0.45 + r() * 0.55,
        w: scale * (0.55 + r() * 0.6),
        lean: (r() - 0.5) * 0.5,
      });
    }
  }
  const raw: Point[] = [];
  for (let x = from; x <= to; x += 10) {
    let h;
    if (peaks) {
      let top = 0;
      for (const { c, h: sh, w, lean } of summits) {
        const d = (x - c) / w;
        const side = d < 0 ? 1 + lean : 1 - lean; // one slope steeper than the other
        const t = Math.max(0, 1 - Math.abs(d) * side);
        top = Math.max(top, sh * t ** 1.35);
      }
      const ridges = (fbm(detail, x / (scale / 6), 3) * 0.5 + 0.5) * 0.08;
      h = Math.min(
        1,
        top + ridges * Math.max(0.25, top) + (fbm(n, x / (scale * 2), 2) * 0.5 + 0.5) * 0.12,
      );
    } else {
      h = fbm(n, x / scale, octaves) * 0.5 + 0.5;
    }
    raw.push([x, h]);
  }
  // Soften the very tops so no summit is a needle.
  const at = (i: number) => (raw[Math.min(raw.length - 1, Math.max(0, i))] as Point)[1];
  const smooth = raw.map(([x], i): Point => {
    const k = [-2, -1, 0, 1, 2].map((o) => at(i + o)) as [number, number, number, number, number];
    return [x, (k[0] + 2 * k[1] + 3 * k[2] + 2 * k[3] + k[4]) / 9];
  });
  const taper = 320;
  const partial = from > -80 || to < W + 80;
  return smooth.map(([x, h]): Point => {
    const inside = Math.min(1, Math.max(0, Math.min(x - from, to - x) / taper));
    const env = partial ? inside * inside * (3 - 2 * inside) : 1;
    return [x, base - amp * h * env + (1 - env) * fall];
  });
}

/** A filled land shape: the skyline down to the bottom of the picture. */
function land(points: Point[], H: number) {
  const first = points[0] as Point;
  const last = points.at(-1) as Point;
  return `M${r1(first[0])},${H + 40}L${pt(first)}${through(points)}L${r1(last[0])},${H + 40}Z`;
}

/* ——— One drawing ——— */

type Stop = [number, string, number?];

export interface Wash {
  edge?: number;
  bloom?: number;
  rim?: number;
  soft?: number;
  seed?: number;
}

export interface Hill extends Omit<Shape, 'fall'>, Omit<Wash, 'seed'> {
  top: string;
  bottom: string;
  opacity?: number;
  blend?: boolean;
  fall?: number;
  light?: { x: number; color: string; strength?: number };
}

export interface Wet {
  bleed?: number;
  soft?: number;
  bloom?: number;
  grain?: number;
  line?: number;
  seed?: number;
}

export interface Layer extends Omit<Shape, 'fall'> {
  top: string;
  bottom: string;
  opacity?: number;
  wet?: Wet;
  blend?: boolean;
  fall?: number;
  glaze?: { x: number; color: string; strength?: number };
  /** A gentle hill rising out of the range (a fraction of the height), e.g. for Calvary. */
  bump?: { x: number; width: number; height: number };
}

/** A colour part-way between two hex colours. */
function mixColour(a: string, b: string, t: number) {
  const n = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [n(a), n(b)];
  return `#${x
    .map((v, i) =>
      Math.round(v + ((y[i] ?? v) - v) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

export class Picture {
  readonly H: number;
  readonly kind: Kind;
  readonly defs: string[] = [];
  readonly body: string[] = [];
  /** The skyline of every layer painted so far, front-most last. */
  readonly ridges: Point[][] = [];
  id = 0;

  constructor(kind: Kind) {
    this.kind = kind;
    this.H = HEIGHTS[kind];
  }

  get band() {
    return this.kind === 'band';
  }

  /** y as a fraction of the picture's height */
  y(f: number) {
    return f * this.H;
  }

  /** A watercolour filter: wobbly edges, pigment blooms and the darker rim where paint dries. */
  wash({ edge = 18, bloom = 0.006, rim = 3, soft = 0.8, seed }: Wash = {}) {
    const id = `w${++this.id}`;
    const s = seed ?? this.id * 13;
    this.defs
      .push(`<filter id="${id}" x="-6%" y="-45%" width="112%" height="190%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.009 0.022" numOctaves="3" seed="${s}" result="warp"/>
<feDisplacementMap in="SourceGraphic" in2="warp" scale="${edge}" xChannelSelector="R" yChannelSelector="G" result="shape"/>
<feGaussianBlur in="shape" stdDeviation="${soft}" result="soft"/>
<feTurbulence type="fractalNoise" baseFrequency="${bloom} ${bloom * 2.6}" numOctaves="4" seed="${s + 7}" result="pig"/>
<feColorMatrix in="pig" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.25 0 0 0 0.2" result="pigA"/>
<feComposite in="soft" in2="pigA" operator="in" result="mottled"/>
<feMorphology in="soft" operator="erode" radius="${rim}" result="inner"/>
<feComposite in="soft" in2="inner" operator="out" result="edge"/>
<feGaussianBlur in="edge" stdDeviation="1.6" result="edgeSoft"/>
<feComponentTransfer in="edgeSoft" result="edgeDark"><feFuncR type="linear" slope="0.84"/><feFuncG type="linear" slope="0.84"/><feFuncB type="linear" slope="0.86"/><feFuncA type="linear" slope="0.45"/></feComponentTransfer>
<feMerge><feMergeNode in="mottled"/><feMergeNode in="edgeDark"/></feMerge>
</filter>`);
    return id;
  }

  /** A soft blur, for glows and mist. */
  blur(amount: number) {
    const id = `b${++this.id}`;
    this.defs.push(
      `<filter id="${id}" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="${amount}"/></filter>`,
    );
    return id;
  }

  /** A vertical gradient from the top of a shape to its bottom. */
  gradient(stops: Stop[]) {
    const id = `g${++this.id}`;
    const s = stops
      .map(
        ([offset, color, opacity = 1]) =>
          `<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`,
      )
      .join('');
    this.defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${s}</linearGradient>`);
    return `url(#${id})`;
  }

  radial(stops: Stop[], { cx = 0.5, cy = 0.5, r = 0.5 } = {}) {
    const id = `r${++this.id}`;
    const s = stops
      .map(
        ([offset, color, opacity = 1]) =>
          `<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`,
      )
      .join('');
    this.defs.push(
      `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${s}</radialGradient>`,
    );
    return `url(#${id})`;
  }

  add(element: string) {
    this.body.push(element);
  }

  /** A hill or mountain range in watercolour, darker at its top edge and fading downwards. */
  hill({ top, bottom, opacity = 1, edge, rim, bloom, soft, blend = true, light, ...shape }: Hill) {
    const points = skyline({
      ...shape,
      base: this.y(shape.base),
      amp: this.y(shape.amp),
      fall: this.y(shape.fall ?? 0),
    });
    const fill = this.gradient([
      [0, top],
      [1, bottom],
    ]);
    const filter = this.wash({ edge, rim, bloom, soft });
    const d = land(points, this.H);
    this.add(
      `<path d="${d}" fill="${fill}" opacity="${opacity}" filter="url(#${filter})"${blend ? ' style="mix-blend-mode:multiply"' : ''}/>`,
    );
    // Sunlight on the slopes facing the light: a soft lighter glaze clipped to the shape.
    if (light) {
      const clip = `k${++this.id}`;
      this.defs.push(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`);
      const glow = this.radial(
        [
          [0, light.color, light.strength ?? 0.55],
          [1, light.color, 0],
        ],
        { cx: light.x / W, cy: 0.3, r: 0.45 },
      );
      this.add(
        `<rect x="-40" y="0" width="${W + 80}" height="${this.H}" fill="${glow}" clip-path="url(#${clip})" filter="url(#${this.blur(6)})" style="mix-blend-mode:screen"/>`,
      );
    }
    return points;
  }

  /** A band of morning mist laid over what is behind it. */
  mist(atFraction: number, depth: number, color = '#f7f2e8', opacity = 0.75) {
    const fill = this.gradient([
      [0, color, 0],
      [0.45, color, opacity],
      [1, color, 0],
    ]);
    this.add(
      `<rect x="-40" y="${r1(this.y(atFraction - depth / 2))}" width="${W + 80}" height="${r1(this.y(depth))}" fill="${fill}" filter="url(#${this.blur(10)})"/>`,
    );
  }

  /** A soft glow of light (sun, dawn). */
  glow(cx: number, cyFraction: number, radius: number, color: string, opacity = 0.6) {
    const fill = this.radial([
      [0, color, opacity],
      [0.55, color, opacity * 0.35],
      [1, color, 0],
    ]);
    this.add(
      `<ellipse cx="${cx}" cy="${r1(this.y(cyFraction))}" rx="${radius * 1.6}" ry="${radius}" fill="${fill}"/>`,
    );
  }

  /** A painted sun disc. */
  sun(cx: number, cyFraction: number, radius: number, color: string, edgeColor: string) {
    const fill = this.radial([
      [0, color],
      [1, edgeColor],
    ]);
    const filter = this.wash({ edge: 6, rim: 2, bloom: 0.02 });
    this.add(
      `<circle cx="${cx}" cy="${r1(this.y(cyFraction))}" r="${radius}" fill="${fill}" filter="url(#${filter})"/>`,
    );
  }

  /** Shapes (any path) painted in one colour. */
  paint(
    d: string,
    fill: string,
    { opacity = 1, edge = 8, rim = 2, bloom = 0.012, blend = true } = {},
  ) {
    const filter = this.wash({ edge, rim, bloom });
    this.add(
      `<path d="${d}" fill="${fill}" opacity="${opacity}" filter="url(#${filter})"${blend ? ' style="mix-blend-mode:multiply"' : ''}/>`,
    );
  }

  /** A soft, wet-in-wet cloud: no hard outline, lighter on top and greyer underneath. */
  cloudWash(d: string, top: string, bottom: string, opacity = 0.6) {
    const id = `c${++this.id}`;
    const s = this.id * 17;
    this.defs
      .push(`<filter id="${id}" x="-20%" y="-60%" width="140%" height="220%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.006 0.014" numOctaves="4" seed="${s}" result="warp"/>
<feDisplacementMap in="SourceGraphic" in2="warp" scale="46" xChannelSelector="R" yChannelSelector="G" result="shape"/>
<feGaussianBlur in="shape" stdDeviation="9" result="soft"/>
<feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="3" seed="${s + 5}" result="pig"/>
<feColorMatrix in="pig" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.3 0 0 0 0.15" result="pigA"/>
<feComposite in="soft" in2="pigA" operator="in"/>
</filter>`);
    const fill = this.gradient([
      [0, top],
      [1, bottom],
    ]);
    this.add(`<path d="${d}" fill="${fill}" opacity="${opacity}" filter="url(#${id})"/>`);
  }

  /** Lines painted with a brush (strokes). */
  strokes(
    d: string,
    color: string,
    width: number,
    { opacity = 1, edge = 4, blurAmount = 0.6 } = {},
  ) {
    const filter = this.wash({ edge, rim: 1, bloom: 0.02, soft: blurAmount });
    this.add(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" filter="url(#${filter})"/>`,
    );
  }

  /**
   * A wet-in-wet watercolour wash, like the chapel's PowerPoint decks: soft bleeding edges, pigment
   * blooms, fine granulation, and a gentle darker line where the wash dried at its top edge.
   */
  wet({ bleed = 26, soft = 2.2, bloom = 0.0035, grain = 0.5, line = 0.5, seed }: Wet = {}) {
    const id = `v${++this.id}`;
    const s = seed ?? this.id * 19;
    this.defs
      .push(`<filter id="${id}" x="-8%" y="-60%" width="116%" height="220%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.006 0.016" numOctaves="4" seed="${s}" result="warp"/>
<feDisplacementMap in="SourceGraphic" in2="warp" scale="${bleed}" xChannelSelector="R" yChannelSelector="G" result="shape"/>
<feGaussianBlur in="shape" stdDeviation="${soft}" result="soft"/>
<feTurbulence type="fractalNoise" baseFrequency="${bloom} ${bloom * 3}" numOctaves="4" seed="${s + 3}" result="pig"/>
<feColorMatrix in="pig" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.1 0 0 0 0.3" result="pigA"/>
<feComposite in="soft" in2="pigA" operator="in" result="mottled"/>
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${s + 5}" result="fine"/>
<feColorMatrix in="fine" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -${grain} 0 0 0 ${grain * 0.62}" result="grainA"/>
<feComposite in="mottled" in2="grainA" operator="out" result="grained"/>
<feMorphology in="soft" operator="erode" radius="2" result="inner"/>
<feComposite in="soft" in2="inner" operator="out" result="edge"/>
<feGaussianBlur in="edge" stdDeviation="2.2" result="edgeSoft"/>
<feComponentTransfer in="edgeSoft" result="edgeDark"><feFuncR type="linear" slope="0.86"/><feFuncG type="linear" slope="0.84"/><feFuncB type="linear" slope="0.86"/><feFuncA type="linear" slope="${line}"/></feComponentTransfer>
<feMerge><feMergeNode in="grained"/><feMergeNode in="edgeDark"/></feMerge>
</filter>`);
    return id;
  }

  /** A band of land (or water) in a wet wash, darker along its top and fading downwards. */
  layer({ top, bottom, opacity = 1, wet: w, blend = true, glaze, bump, ...shape }: Layer) {
    const raised = skyline({
      ...shape,
      base: this.y(shape.base),
      amp: this.y(shape.amp),
      fall: this.y(shape.fall ?? 0),
    });
    const points = bump
      ? raised.map(([x, y]): Point => [
          x,
          y - this.y(bump.height) * Math.exp(-(((x - bump.x) / bump.width) ** 2) * 2.2),
        ])
      : raised;
    const fill = this.gradient([
      [0, top],
      [0.5, mixColour(top, bottom, 0.55)],
      [1, bottom],
    ]);
    const d = land(points, this.H);
    this.add(
      `<path d="${d}" fill="${fill}" opacity="${opacity}" filter="url(#${this.wet(w)})"${blend ? ' style="mix-blend-mode:multiply"' : ''}/>`,
    );
    if (glaze) {
      const clip = `k${++this.id}`;
      this.defs.push(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`);
      const g = this.radial(
        [
          [0, glaze.color, glaze.strength ?? 0.5],
          [1, glaze.color, 0],
        ],
        { cx: glaze.x / W, cy: 0.3, r: 0.5 },
      );
      this.add(
        `<rect x="-40" y="0" width="${W + 80}" height="${this.H}" fill="${g}" clip-path="url(#${clip})" filter="url(#${this.blur(8)})" style="mix-blend-mode:screen"/>`,
      );
    }
    this.ridges.push(points);
    return points;
  }

  /**
   * A sun slotted in at `at` (where the picture stood before the land was painted), so it sits
   * behind the land. Given the land's first ridge, it rises from behind that ridge: seated on the
   * ridge, with only the part above it showing.
   */
  sunBehind(
    at: number,
    ridge: Point[] | undefined,
    cx: number,
    cyFraction: number,
    radius: number,
    color: string,
    edgeColor: string,
  ) {
    const from = this.body.length;
    let disc: string;
    if (ridge?.length) {
      const [, crest] = ridge.reduce((a, b) => (Math.abs(b[0] - cx) < Math.abs(a[0] - cx) ? b : a));
      const clip = `k${++this.id}`;
      const below = ridge
        .map(([x, y]) => `L${r1(x)},${r1(y + 8)}`)
        .reverse()
        .join('');
      const x0 = ridge[0]?.[0] ?? -40;
      const x1 = ridge.at(-1)?.[0] ?? W + 40;
      this.defs.push(
        `<clipPath id="${clip}"><path d="M${r1(x0)},-60L${r1(x1)},-60${below}Z"/></clipPath>`,
      );
      this.sun(cx, (crest - radius * 0.3) / this.H, radius, color, edgeColor);
      disc = `<g clip-path="url(#${clip})">${this.body.splice(from).join('')}</g>`;
    } else {
      this.sun(cx, cyFraction, radius, color, edgeColor);
      disc = this.body.splice(from).join('');
    }
    this.body.splice(at, 0, disc);
  }

  /** Still water: a broad wash with soft horizontal streaks of cloud and light, like the decks. */
  water(topFraction: number, top: string, bottom: string, shimmer: string, seed: number) {
    const y = this.y(topFraction);
    const id = `q${++this.id}`;
    this.defs
      .push(`<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.0016 0.011" numOctaves="4" seed="${seed}" result="streak"/>
<feColorMatrix in="streak" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2.4 0 0 0 -0.55" result="streakA"/>
<feComposite in="SourceGraphic" in2="streakA" operator="in" result="body"/>
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed + 1}" result="fine"/>
<feColorMatrix in="fine" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.4 0 0 0 0.25" result="grainA"/>
<feComposite in="body" in2="grainA" operator="out"/>
</filter>`);
    const fill = this.gradient([
      [0, top],
      [1, bottom],
    ]);
    this.add(
      `<rect x="-40" y="${r1(y)}" width="${W + 80}" height="${r1(this.H - y + 40)}" fill="${this.gradient(
        [
          [0, mixColour(top, '#ffffff', 0.25)],
          [1, mixColour(top, bottom, 0.45)],
        ],
      )}"/>`,
    );
    this.add(
      `<rect x="-40" y="${r1(y)}" width="${W + 80}" height="${r1(this.H - y + 40)}" fill="${fill}" filter="url(#${id})"/>`,
    );
    // Pale streaks of reflected sky drifting across the water.
    const sheen = `l${++this.id}`;
    this.defs.push(
      `<filter id="${sheen}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.0012 0.02" numOctaves="3" seed="${seed + 4}" result="s"/><feColorMatrix in="s" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 2.2 0 0 0 -1.15"/><feGaussianBlur stdDeviation="1.2"/></filter>`,
    );
    this.add(
      `<rect x="-40" y="${r1(y + 6)}" width="${W + 80}" height="${r1(this.H - y + 40)}" fill="#fff" filter="url(#${sheen})" opacity="0.75"/>`,
    );
    // A soft light line along the horizon.
    this.add(
      `<rect x="-40" y="${r1(y - 2)}" width="${W + 80}" height="6" fill="${shimmer}" opacity="0.7" filter="url(#${this.blur(2)})"/>`,
    );
  }

  toString() {
    // Everything fades out towards the top of the picture, so glows and rays never end in a line.
    const fade = `<linearGradient id="fadeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${this.band ? 0.12 : 0.22}" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="fade" maskUnits="userSpaceOnUse" x="-40" y="0" width="${W + 80}" height="${this.H}"><rect x="-40" y="0" width="${W + 80}" height="${this.H}" fill="url(#fadeG)"/></mask>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${this.H}" preserveAspectRatio="xMidYMax slice"><defs>${fade}${this.defs.join('')}</defs><g mask="url(#fade)">${this.body.join('')}</g></svg>\n`;
  }
}
