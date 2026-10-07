/**
 * Paints a hymn background from a short recipe — the colour mood, the landscape, the light, and
 * (only when the hymn's words call for it) water, a path, trees, flowers or one small feature —
 * in wet-in-wet watercolour washes like the chapel's PowerPoint decks.
 *
 * The same recipe gives the full scene for the title slide and a low strip of the same scene for
 * the words, so every slide of a hymn belongs together.
 */
import { W, random, r1, through, type Picture, type Point } from './painter.ts';
import { PALETTES, type Palette, type PaletteName } from './palettes.ts';
import { cloudShape, clusters, palm, pines, roundTrees, city } from './parts.ts';
import * as F from './features.ts';

export const LANDS = [
  'hills',
  'mountains',
  'valley',
  'shore',
  'sea',
  'waves',
  'coast',
  'fields',
  'meadow',
  'desert',
  'snow',
  'forest',
  'clouds',
  'garden',
] as const;
export const LIGHTS = [
  'none',
  'glow',
  'sun',
  'rising',
  'moon',
  'crescent',
  'star',
  'stars',
] as const;
export const CLOUDS = ['none', 'wisps', 'soft', 'bank'] as const;
export const WATERS = ['none', 'river', 'stream', 'lake'] as const;
export const TREES = [
  'none',
  'pines',
  'round',
  'olives',
  'blossom',
  'autumn',
  'palms',
  'cypress',
] as const;
export const FLOWERS = ['none', 'meadow', 'lilies', 'roses'] as const;
export const FEATURES = [
  'none',
  'calvary',
  'cross',
  'tomb',
  'stable',
  'chapel',
  'cottage',
  'city',
  'sheep',
  'boat',
  'lighthouse',
  'bridge',
  'tent',
  'rainbow',
] as const;

export interface Recipe {
  palette: PaletteName;
  land: (typeof LANDS)[number];
  light?: (typeof LIGHTS)[number];
  /** Where the light is, across the picture (0 left … 1 right). */
  lightX?: number;
  rays?: boolean;
  clouds?: (typeof CLOUDS)[number];
  water?: (typeof WATERS)[number];
  path?: boolean;
  trees?: (typeof TREES)[number];
  flowers?: (typeof FLOWERS)[number];
  feature?: (typeof FEATURES)[number];
  /** Where the feature stands (0 left … 1 right). */
  featureX?: number;
  birds?: boolean;
  /** Varies the shapes; defaults to the hymn's number, so no two hymns are alike. */
  seed?: number;
}

/** Lands whose far ridges rise well above the horizon. */
const PEAKED = new Set(['mountains', 'valley', 'snow']);
/** Lands whose own water is part of the scene (so a boat can sail). */
const WATERY = new Set(['shore', 'sea', 'waves', 'coast']);
export const hasWater = (r: Recipe) => WATERY.has(r.land) || (r.water ?? 'none') === 'lake';

interface Surfaces {
  /** Where the sky meets the land, as a fraction of the height. */
  horizon: number;
  mid: Point[];
  near: Point[];
  /** Top of open water in pixels, if the land has it. */
  water?: number;
  /** The headland of a coast (for a lighthouse). */
  headland?: Point[];
}

type Hook = (s: Partial<Surfaces>) => void;

/* ——— The landscapes ——— */

function landscape(
  p: Picture,
  r: Recipe,
  pal: Palette,
  s: number,
  between: Hook,
  bump?: { x: number; width: number; height: number },
): Surfaces {
  const rand = random(s);
  const j = (v: number, by = 0.02) => v + (rand() - 0.5) * 2 * by;
  const lx = (r.lightX ?? 0.72) * W;
  const glaze = (strength = 0.5) =>
    r.light && r.light !== 'none' ? { x: lx, color: pal.glaze, strength } : undefined;
  const layer = (
    pair: [string, string],
    base: number,
    amp: number,
    scale: number,
    more: Partial<Parameters<Picture['layer']>[0]> = {},
  ) =>
    p.layer({
      seed: s + Math.round(base * 1000),
      base,
      amp,
      scale,
      top: pair[0],
      bottom: pair[1],
      ...more,
    });

  switch (r.land) {
    case 'mountains': {
      layer(pal.far, j(0.42), j(0.3, 0.03), j(420, 60), {
        peaks: true,
        opacity: 0.95,
        glaze: glaze(0.55),
      });
      p.mist(0.48, 0.2, pal.mist, 0.7);
      const mid = layer(pal.mid, j(0.58), j(0.22, 0.03), j(330, 40), {
        bump,
        peaks: true,
        glaze: glaze(0.45),
      });
      p.mist(0.66, 0.16, pal.mist, 0.55);
      between({ mid });
      const near = layer(pal.near, j(0.78), 0.08, 460);
      layer(pal.ground, 0.9, 0.05, 560);
      return { horizon: 0.4, mid, near };
    }
    case 'valley': {
      layer(pal.far, j(0.44), j(0.22, 0.03), 420, { peaks: true, opacity: 0.9, glaze: glaze(0.5) });
      p.mist(0.52, 0.18, pal.mist, 0.7);
      const left = layer(pal.mid, 0.7, j(0.34, 0.03), 300, {
        peaks: true,
        from: -80,
        to: 780,
        fall: 0.08,
      });
      layer(pal.mid, 0.7, j(0.3, 0.03), 300, { peaks: true, from: 1140, to: W + 80, fall: 0.08 });
      const mid = layer(pal.near, 0.8, 0.04, 520, { bump, opacity: 0.9 });
      between({ mid });
      const near = layer(pal.ground, 0.9, 0.03, 600);
      return { horizon: 0.44, mid: mid.length ? mid : left, near };
    }
    case 'shore': {
      // A soft treeline across the horizon, and broad, still water beneath (Hymn 488's deck).
      const horizon = j(0.42, 0.03);
      layer(pal.far, horizon - 0.04, 0.1, 130, {
        octaves: 5,
        opacity: 0.75,
        wet: { bleed: 30, soft: 3 },
      });
      const mid = layer(pal.near, horizon + 0.01, 0.15, 70, {
        bump,
        octaves: 6,
        wet: { bleed: 34, soft: 2.8, line: 0.35 },
      });
      layer(pal.ground, horizon + 0.012, 0.04, 40, {
        octaves: 6,
        opacity: 0.55,
        wet: { bleed: 20, soft: 2 },
      });
      p.water(horizon + 0.01, pal.water[0], pal.water[1], pal.shimmer, s + 9);
      // its faint reflection
      p.add(
        `<path d="M-40,${r1(p.y(horizon + 0.01))}${through(mid.map(([x, y]): Point => [x, 2 * p.y(horizon + 0.01) - y]))}L${W + 40},${r1(p.y(horizon + 0.01))}Z" fill="${pal.near[0]}" opacity="0.28" filter="url(#${p.blur(7)})"/>`,
      );
      between({ mid });
      return { horizon, mid, near: mid, water: p.y(horizon + 0.01) };
    }
    case 'sea':
    case 'waves': {
      const horizon = j(0.44, 0.02);
      const mid = layer(pal.far, horizon + 0.01, 0.05, 260, {
        bump,
        from: -80,
        to: j(560, 120),
        fall: 0.01,
        opacity: 0.8,
      });
      p.water(horizon, pal.water[0], pal.water[1], pal.shimmer, s + 9);
      if (r.land === 'waves') {
        for (const [k, base] of [0.6, 0.74, 0.88].entries()) {
          layer([pal.water[1], pal.water[0]], base, 0.06 + k * 0.01, 260 + k * 60, {
            opacity: 0.55,
            wet: { bleed: 34, soft: 3 },
          });
        }
        let foam = '';
        const rr = random(s + 3);
        for (let i = 0; i < 16; i++) {
          const x = rr() * W;
          const y = p.y(0.58 + rr() * 0.36);
          const w = 70 + rr() * 140;
          foam += `M${r1(x)},${r1(y)}q${r1(w / 4)},-7 ${r1(w / 2)},0t${r1(w / 2)},0`;
        }
        p.strokes(foam, pal.shimmer, 3, { opacity: 0.8 });
      } else if (!p.band) {
        let glints = '';
        const rr = random(s + 3);
        for (let i = 0; i < 12; i++) {
          const y = p.y(horizon + 0.04 + (0.5 * i) / 12);
          const half = 30 + i * 20 + rr() * 30;
          glints += `M${r1(lx - half)},${r1(y)}q${r1(half * 0.5)},-3 ${r1(half)},0t${r1(half * (0.2 + rr() * 0.6))},0`;
        }
        if (r.light && r.light !== 'none') p.strokes(glints, pal.sun[1], 3.5, { opacity: 0.7 });
      }
      between({ mid });
      return { horizon, mid, near: mid, water: p.y(horizon) };
    }
    case 'coast': {
      const sea = j(0.62, 0.02);
      const left = (r.lightX ?? 0.72) > 0.5;
      const span = left ? { from: -80, to: j(1180, 120) } : { from: j(740, 120), to: W + 80 };
      const headland = layer(pal.far, sea + 0.01, j(0.36, 0.04), 380, {
        peaks: true,
        ...span,
        opacity: 0.95,
        glaze: glaze(0.5),
      });
      const near = layer(pal.mid, sea + 0.01, 0.2, 300, {
        peaks: true,
        ...(left ? { from: -80, to: span.to - 380 } : { from: span.from + 380, to: W + 80 }),
      });
      p.water(sea, pal.water[0], pal.water[1], pal.shimmer, s + 9);
      between({ mid: headland });
      return { horizon: sea, mid: headland, near, water: p.y(sea), headland: near };
    }
    case 'fields': {
      layer(pal.far, j(0.46), 0.1, 480, { opacity: 0.95, glaze: glaze(0.55) });
      const mid = layer(pal.mid, j(0.6), 0.11, 420, { bump, glaze: glaze(0.45) });
      if (!p.band) {
        let rows = '';
        for (let k = 1; k <= 6; k++) {
          const off = p.y(0.07) + p.y(0.28) * (k / 7) ** 1.3;
          rows +=
            `M-40,${r1((mid[0] as Point)[1] + off)}` +
            through(mid.map(([x, y]): Point => [x, y + off + Math.sin(x / 260 + k) * 4]));
        }
        p.strokes(rows, pal.near[0], 3, { opacity: 0.3 });
      }
      between({ mid });
      const near = layer(pal.near, j(0.82), 0.07, 520);
      return { horizon: 0.46, mid, near };
    }
    case 'meadow':
    case 'garden': {
      layer(pal.far, j(0.5), 0.1, 460, { opacity: 0.95, glaze: glaze(0.5) });
      const mid = layer(pal.mid, j(0.66), 0.1, 380, { bump, glaze: glaze(0.45) });
      between({ mid });
      const near = layer(pal.near, j(0.84), 0.06, 520);
      return { horizon: 0.5, mid, near };
    }
    case 'desert': {
      layer(pal.far, j(0.5), 0.12, 760, { octaves: 2, opacity: 0.9, glaze: glaze(0.55) });
      const mid = layer(pal.mid, j(0.64), 0.12, 680, { bump, octaves: 2, glaze: glaze(0.45) });
      between({ mid });
      const near = layer(pal.near, j(0.8), 0.1, 620, { octaves: 2 });
      return { horizon: 0.5, mid, near };
    }
    case 'snow': {
      layer(pal.far, j(0.4), j(0.34, 0.03), 400, { peaks: true, opacity: 0.95, glaze: glaze(0.6) });
      p.mist(0.46, 0.18, pal.mist, 0.75);
      const mid = layer(pal.mid, j(0.56), j(0.24, 0.03), 320, {
        bump,
        peaks: true,
        glaze: glaze(0.5),
      });
      p.mist(0.64, 0.16, pal.mist, 0.6);
      between({ mid });
      const near = layer(pal.near, 0.8, 0.06, 520);
      layer(pal.ground, 0.92, 0.04, 600);
      return { horizon: 0.4, mid, near };
    }
    case 'forest': {
      layer(pal.far, j(0.48), 0.1, 460, { opacity: 0.9, glaze: glaze(0.5) });
      p.mist(0.54, 0.14, pal.mist, 0.6);
      const mid = layer(pal.mid, j(0.64), 0.09, 400, { bump });
      if (!p.band)
        p.paint(
          pines(mid, { seed: s + 1, H: p.H, from: -40, to: W + 40, min: 0.06, max: 0.13 }),
          pal.foliage,
          { edge: 5, rim: 2, opacity: 0.6 },
        );
      between({ mid });
      const near = layer(pal.near, j(0.82), 0.07, 520);
      if (!p.band)
        p.paint(pines(near, { seed: s + 2, H: p.H, from: -40, to: 640 }), pal.foliage, {
          edge: 5,
          rim: 2,
          opacity: 0.9,
        });
      if (!p.band)
        p.paint(pines(near, { seed: s + 3, H: p.H, from: 1300, to: W + 40 }), pal.foliage, {
          edge: 5,
          rim: 2,
          opacity: 0.9,
        });
      return { horizon: 0.48, mid, near };
    }
    case 'clouds': {
      if (!p.band) {
        p.cloudWash(
          cloudShape(lx - 520, p.y(0.56), 760, p.y(0.22), s + 1) +
            cloudShape(lx + 380, p.y(0.5), 680, p.y(0.2), s + 2) +
            cloudShape(W / 2, p.y(0.66), 1300, p.y(0.18), s + 3),
          pal.cloud[0],
          pal.cloud[1],
          1,
        );
        p.cloudWash(
          cloudShape(lx - 120, p.y(0.62), 900, p.y(0.14), s + 4),
          pal.cloud[0],
          pal.cloud[1],
          0.85,
        );
      } else {
        // The low strip under the words: one soft bank, so the glory still shows there.
        p.cloudWash(
          cloudShape(lx - 420, p.y(0.5), 900, p.y(0.36), s + 1) +
            cloudShape(lx + 460, p.y(0.46), 820, p.y(0.34), s + 2) +
            cloudShape(W / 2, p.y(0.62), 1700, p.y(0.3), s + 3),
          pal.cloud[0],
          pal.cloud[1],
          0.95,
        );
      }
      const mid = layer(pal.mid, j(p.band ? 0.52 : 0.76), p.band ? 0.09 : 0.06, 520, {
        bump,
        opacity: 0.9,
        glaze: glaze(0.5),
      });
      between({ mid });
      const near = layer(pal.near, p.band ? 0.8 : 0.9, p.band ? 0.06 : 0.04, 600);
      return { horizon: 0.7, mid, near };
    }
    case 'hills':
    default: {
      // Layered rolling washes, deepening towards the front (Hymn 251's deck).
      layer(pal.far, j(0.42), 0.1, 620, { opacity: 0.9, glaze: glaze(0.55) });
      p.mist(0.48, 0.12, pal.mist, 0.5);
      const mid = layer(pal.mid, j(0.56), 0.12, 520, { bump, glaze: glaze(0.45) });
      between({ mid });
      const near = layer(pal.near, j(0.7), 0.11, 460);
      layer(pal.ground, j(0.86), 0.08, 560);
      return { horizon: 0.44, mid, near };
    }
  }
}

/* ——— The whole picture ——— */

export function compose(p: Picture, recipe: Recipe, fallbackSeed = 1) {
  const pal: Palette = PALETTES[recipe.palette] ?? PALETTES.dawn;
  const s = (recipe.seed ?? fallbackSeed) * 97 + 13;
  const rand = random(s + 50);
  const band = p.band;
  const u = band ? 0.42 : 1;
  const light = recipe.light ?? 'glow';
  const lx = (recipe.lightX ?? 0.72) * W;
  const fx = (recipe.featureX ?? 0.5) * W;
  const feature = recipe.feature ?? 'none';
  const trees = recipe.trees ?? 'none';
  const flowers =
    recipe.flowers ??
    (recipe.land === 'meadow' ? 'meadow' : recipe.land === 'garden' ? 'lilies' : 'none');
  const water = recipe.water ?? (recipe.land === 'valley' ? 'river' : 'none');

  // Sky: the light first, then a rainbow, rays and clouds.
  const skyY = band ? 0.32 : 0.22;
  if (light !== 'none')
    p.glow(
      lx,
      light === 'rising' ? 0.42 : skyY,
      band ? 90 : 230,
      pal.glow,
      light === 'moon' || light === 'crescent' || light === 'stars' ? 0.35 : 0.6,
    );
  if (!band) {
    if (light === 'sun') p.sun(lx, skyY, 52, pal.sun[0], pal.sun[1]);
    if (light === 'moon') p.sun(lx, skyY, 44, '#f4f2ee', '#dde2ea');
    if (light === 'crescent') {
      p.defs.push(
        `<mask id="crescent"><rect x="-40" y="-40" width="${W + 80}" height="${p.H + 80}" fill="#fff"/><circle cx="${r1(lx + 26)}" cy="${r1(p.y(skyY) - 8)}" r="44" fill="#000"/></mask>`,
      );
      p.add(
        `<circle cx="${r1(lx)}" cy="${r1(p.y(skyY))}" r="46" fill="#dfe4ec" mask="url(#crescent)" filter="url(#${p.wash({ edge: 3, rim: 2, bloom: 0.02 })})"/>`,
      );
    }
    if (light === 'star') F.star(p, lx, skyY, 1, pal);
    if (light === 'stars') F.stars(p, 1, pal, s, lx);
    if (feature === 'rainbow') F.rainbow(p, fx, 1);
    if (recipe.rays && light !== 'none') {
      let rays = '';
      const oy = p.y(light === 'rising' ? 0.5 : skyY + 0.06);
      for (let i = 0; i < 11; i++) {
        const a = Math.PI * (0.1 + (0.8 * i) / 10);
        const tip = (o: number) =>
          `${r1(lx - Math.cos(a + o) * 640)},${r1(oy - Math.sin(a + o) * 380)}`;
        rays += `M${r1(lx)},${r1(oy)}L${tip(-0.035)}L${tip(0.035)}Z`;
      }
      p.add(`<path d="${rays}" fill="${pal.sun[1]}" opacity="0.3" filter="url(#${p.blur(10)})"/>`);
    }
    const clouds = recipe.clouds ?? 'none';
    if (clouds === 'wisps') {
      p.cloudWash(
        cloudShape(lx - 640, p.y(0.18), 620, p.y(0.06), s + 11) +
          cloudShape(lx + 520, p.y(0.12), 520, p.y(0.05), s + 12),
        pal.cloud[0],
        pal.cloud[1],
        0.7,
      );
    } else if (clouds === 'soft' || clouds === 'bank') {
      p.cloudWash(
        cloudShape(380 + rand() * 200, p.y(0.3), 600, p.y(0.16), s + 13) +
          cloudShape(1420 + rand() * 200, p.y(0.24), 520, p.y(0.14), s + 14),
        pal.cloud[0],
        pal.cloud[1],
        clouds === 'bank' ? 0.9 : 0.75,
      );
    }
    if (recipe.birds) {
      const bx = lx > W / 2 ? lx - 220 : lx + 120;
      p.strokes(
        `M${bx},96q14,-12 28,0q14,-12 28,0M${bx + 86},132q10,-9 20,0q10,-9 20,0M${bx - 60},142q9,-8 18,0q9,-8 18,0`,
        pal.roof,
        3,
        { opacity: 0.55, edge: 1 },
      );
    }
  }
  // The rising sun goes behind the land's first ridge, so it is painted once that ridge is known.
  const sunAt = p.body.length;
  const ridgeFrom = p.ridges.length;

  const keepClear = (x: number) =>
    Math.abs(x - fx) > (feature === 'none' ? 0 : 240) &&
    (!recipe.path || Math.abs(x - W / 2) > 200);

  // Land, with whatever stands in the middle distance painted between its layers.
  const hill =
    feature === 'calvary' || feature === 'cross'
      ? { x: fx, width: 260 * u, height: 0.09 }
      : undefined;
  const surfaces = landscape(
    p,
    recipe,
    pal,
    s,
    (sf) => {
      const mid = sf.mid;
      if (!mid) return;
      if (water === 'lake' && !WATERY.has(recipe.land)) {
        const top = Math.max(...mid.map(([, y]) => y)) - p.y(0.01);
        p.water(top / p.H, pal.water[0], pal.water[1], pal.shimmer, s + 21);
      }
      const at = (x: number) => F.crestAt(mid, x);
      const distant = {
        calvary: F.calvary,
        cross: F.cross,
        chapel: F.chapel,
        cottage: F.cottage,
        stable: F.stable,
        tomb: F.tomb,
      };
      if (feature in distant)
        distant[feature as keyof typeof distant](
          p,
          fx,
          at(fx) + 4 * u,
          u * (feature === 'calvary' || feature === 'cross' ? 0.9 : 0.85),
          pal,
        );
      if (feature === 'city') {
        const town = city(fx, at(fx), band ? 0.42 : 0.9);
        p.paint(town.walls, pal.walls, { edge: 2, rim: 2, opacity: 0.98, blend: false });
        p.paint(town.shade, pal.shade, { edge: 2, rim: 1, opacity: 0.7 });
      }
      if (!band && (trees === 'olives' || trees === 'cypress' || recipe.land === 'garden')) {
        const spots: [number, number, number][] = [];
        for (const x of [520, 610, 1310, 1400, 700, 1220])
          if (keepClear(x)) spots.push([x + (rand() - 0.5) * 40, at(x) + 14, 0.65 + rand() * 0.3]);
        paintTrees(p, trees === 'none' ? 'olives' : trees, spots, 52, pal, s);
      }
    },
    hill,
  );

  // Behind high ridges the rising sun is only its glow; a disc would hang on the mountainside.
  // Over rolling land it rises from behind the first ridge; over water it sits on the horizon.
  if (light === 'rising' && !PEAKED.has(recipe.land)) {
    const open = WATERY.has(recipe.land) || recipe.land === 'clouds';
    const ridge = open ? undefined : p.ridges[ridgeFrom];
    p.sunBehind(sunAt, ridge, lx, band ? 0.4 : 0.42, band ? 30 : 60, pal.sun[0], pal.sun[1]);
  }

  // Water and the way through the land.
  if (water === 'river' || water === 'stream') {
    const w = water === 'river' ? 1 : 0.5;
    const top = F.crestAt(surfaces.mid, W * 0.52) + 6;
    const d = band
      ? `M-40,${p.y(0.86)}C500,${p.y(0.8)} 1300,${p.y(0.94)} ${W + 40},${p.y(0.84)}L${W + 40},${p.y(0.84 + 0.1 * w)}C1300,${p.y(0.94 + 0.1 * w)} 500,${p.y(0.8 + 0.1 * w)} -40,${p.y(0.86 + 0.1 * w)}Z`
      : `M${W * 0.52 - 8 * w},${top}C${W * 0.5},${p.y(0.7)} ${W * 0.6},${p.y(0.76)} ${W * 0.55},${p.y(0.84)}C${W * 0.5},${p.y(0.92)} ${W * 0.44},${p.y(0.96)} ${W * 0.41},${p.y(1.1)}L${W * 0.41 + 360 * w},${p.y(1.1)}C${W * 0.6},${p.y(0.96)} ${W * 0.58},${p.y(0.92)} ${W * 0.57 + 20 * w},${p.y(0.84)}C${W * 0.62 + 16 * w},${p.y(0.76)} ${W * 0.53},${p.y(0.7)} ${W * 0.52 + 8 * w},${top}Z`;
    p.paint(d, pal.water[0], { opacity: 0.95, edge: 8, blend: false });
    p.strokes(
      band
        ? `M220,${p.y(0.9)}h170M900,${p.y(0.88)}h230M1500,${p.y(0.9)}h150`
        : `M${W * 0.53},${p.y(0.86)}h70M${W * 0.47},${p.y(0.96)}h120M${W * 0.55},${p.y(0.77)}h34`,
      pal.shimmer,
      3,
      { opacity: 0.9 },
    );
    if (feature === 'bridge' && !band) F.bridge(p, W * 0.555, p.y(0.84), 1, pal);
  }
  // The path is left out of the low strip, where it would only show as a pale wedge.
  if (recipe.path && !band && !WATERY.has(recipe.land)) {
    const tx = feature === 'none' ? W * 0.5 : fx;
    const top = F.crestAt(surfaces.near, tx) + 4;
    const d = `M${W * 0.42},${p.H + 20}C${W * 0.46},${p.y(0.9)} ${W * 0.56},${p.y(0.86)} ${tx - 10},${top + p.y(0.04)}C${tx - 30},${top + 8} ${tx - 6},${top} ${tx - 3},${top}L${tx + 3},${top}C${tx + 8},${top} ${tx + 40},${top + 10} ${tx + 22},${top + p.y(0.04)}C${W * 0.6},${p.y(0.86)} ${W * 0.56},${p.y(0.92)} ${W * 0.58},${p.H + 20}Z`;
    p.paint(d, pal.path, { opacity: 0.95, edge: 6, blend: false });
  }

  // Things in the foreground.
  if (feature === 'boat' && surfaces.water !== undefined)
    F.boat(p, fx, surfaces.water + p.y(band ? 0.3 : 0.22), u, pal);
  if (feature === 'lighthouse') {
    const ground = surfaces.headland ?? surfaces.mid;
    const peak = ground.reduce((m, q) => (q[1] < m[1] ? q : m));
    F.lighthouse(p, peak[0], peak[1] + 6, u, pal);
  }
  if (feature === 'tent') F.tent(p, fx, F.crestAt(surfaces.near, fx) + 10 * u, u, pal);
  if (!band) {
    if (feature === 'sheep') F.sheep(p, surfaces.near, fx - 320, fx + 320, 1, pal, s);
    if (trees !== 'none' && trees !== 'olives' && trees !== 'cypress' && recipe.land !== 'forest') {
      const spots: [number, number, number][] = [];
      for (const x of [170, 300, 1640, 1780])
        if (keepClear(x))
          spots.push([
            x + (rand() - 0.5) * 50,
            F.crestAt(surfaces.near, x) + 12,
            0.85 + rand() * 0.3,
          ]);
      paintTrees(p, trees, spots, 64, pal, s);
    }
  }
  if (flowers !== 'none') paintFlowers(p, flowers, surfaces, pal, s, band);
}

function paintTrees(
  p: Picture,
  kind: Recipe['trees'],
  spots: [number, number, number][],
  size: number,
  pal: Palette,
  seed: number,
) {
  if (!spots.length) return;
  if (kind === 'pines') {
    p.paint(
      pines(
        spots.map(([x, y]): Point => [x, y]),
        { seed, H: p.H, from: -40, to: W + 40, min: 0.1, max: 0.16 },
      ),
      pal.foliage,
      { edge: 5, rim: 2, opacity: 0.92 },
    );
    return;
  }
  if (kind === 'palms') {
    for (const [i, [x, y, k]] of spots.entries()) {
      const tree = palm(x, y + 30, 240 * k, (i % 2 ? -1 : 1) * 24, seed + i);
      p.paint(tree.trunk, pal.trunk, { edge: 3, rim: 1, opacity: 0.95 });
      p.paint(tree.fronds, pal.foliage, { edge: 4, rim: 2, opacity: 0.95 });
    }
    return;
  }
  if (kind === 'cypress') {
    let d = '';
    for (const [x, y, k] of spots) {
      const h = size * 2.2 * k;
      const w = size * 0.34 * k;
      d += `M${r1(x)},${r1(y - h)}C${r1(x + w)},${r1(y - h * 0.7)} ${r1(x + w * 0.9)},${r1(y - h * 0.2)} ${r1(x + w * 0.3)},${r1(y)}L${r1(x - w * 0.3)},${r1(y)}C${r1(x - w * 0.9)},${r1(y - h * 0.2)} ${r1(x - w)},${r1(y - h * 0.7)} ${r1(x)},${r1(y - h)}Z`;
    }
    p.paint(d, pal.foliage, { edge: 4, rim: 2, opacity: 0.92 });
    return;
  }
  const canopy =
    kind === 'blossom'
      ? '#efc6d2'
      : kind === 'autumn'
        ? '#e6b67e'
        : kind === 'olives'
          ? mixFoliage(pal.foliage)
          : pal.foliage;
  const t = roundTrees(spots, size);
  p.paint(t.trunks, pal.trunk, { edge: 2, rim: 1 });
  p.paint(t.canopy, canopy, { edge: 8, opacity: 0.92 });
  if (kind === 'blossom' || kind === 'autumn') {
    const dots = clusters(
      spots.map(([x, y, k]): Point => [x, y - size * k * 1.1]),
      { seed, clusters: spots.length * 2, per: 6, size: 4, spread: 0.02, H: p.H },
    );
    p.paint(dots, kind === 'blossom' ? '#fbe4ea' : '#f3cf98', {
      edge: 2,
      rim: 1,
      opacity: 0.9,
      blend: false,
    });
  }
}

const mixFoliage = (c: string) => {
  const n = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  return `#${n
    .map((v) =>
      Math.round(v + (210 - v) * 0.35)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
};

function paintFlowers(
  p: Picture,
  kind: Recipe['flowers'],
  s: Surfaces,
  pal: Palette,
  seed: number,
  band: boolean,
) {
  const colours: string[] =
    kind === 'lilies'
      ? ['#fdfaf3', '#f6ecc4', '#fdfaf3', '#efe6d0']
      : kind === 'roses'
        ? ['#eba3ae', '#f4c4c8', '#e88f9c', '#fdf2f2']
        : pal.flowers;
  for (const [i, colour] of colours.entries()) {
    const sz = kind === 'lilies' ? 1.25 : 1;
    p.paint(
      clusters(s.mid, {
        seed: seed + i * 7,
        clusters: band ? 3 : 6,
        per: 8,
        size: (band ? 3 : 4.5) * sz,
        spread: 0.1,
        H: p.H,
      }),
      colour,
      { edge: 3, rim: 1, opacity: 0.95, blend: false },
    );
    p.paint(
      clusters(s.near, {
        seed: seed + 50 + i * 7,
        clusters: band ? 4 : 7,
        per: 10,
        size: (band ? 4 : 6.5) * sz,
        spread: 0.08,
        H: p.H,
      }),
      colour,
      { edge: 3, rim: 1, opacity: 0.95, blend: false },
    );
  }
}
