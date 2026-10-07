/**
 * The ten hand-composed backgrounds for Truth and Praise 1–10. Each follows its hymn's words;
 * light, airy colours only — never dark.
 */
import { W, r1, random, through, type Picture, type Point } from './painter.ts';
import { city, clusters, cloudShape, palm, pines, roundTrees } from './parts.ts';

export const PRESETS: Record<string, (p: Picture) => void> = {
  /** How Great Thou Art — mountain grandeur and forest glades. */
  mountains(p: Picture) {
    p.glow(1450, 0.18, p.band ? 80 : 200, '#fdf0d6', 0.6);
    p.hill({
      seed: 11,
      base: 0.38,
      amp: 0.32,
      scale: 420,
      peaks: true,
      top: '#c4cde0',
      bottom: '#eceff5',
      opacity: 0.95,
      edge: 12,
      soft: 1.6,
      light: { x: 1450, color: '#fff6e4', strength: 0.55 },
    });
    p.mist(0.44, 0.22);
    p.hill({
      seed: 23,
      base: 0.52,
      amp: 0.25,
      scale: 330,
      peaks: true,
      top: '#a9b6d0',
      bottom: '#dde3ee',
      edge: 14,
      soft: 1.2,
      light: { x: 1450, color: '#fff3dc', strength: 0.5 },
    });
    p.mist(0.62, 0.2, '#f7f3ea', 0.65);
    const forest = p.hill({
      seed: 37,
      base: 0.72,
      amp: 0.08,
      scale: 420,
      top: '#a3b9b8',
      bottom: '#d9e4e1',
      edge: 18,
    });
    if (!p.band) {
      p.paint(pines(forest, { seed: 5, H: p.H, from: -40, to: 700 }), '#8aa7a8', {
        edge: 5,
        rim: 2,
        opacity: 0.95,
      });
      p.paint(pines(forest, { seed: 9, H: p.H, from: 1340, to: W + 40, max: 0.14 }), '#89a5a6', {
        edge: 5,
        rim: 2,
        opacity: 0.88,
      });
      p.strokes(
        'M1460,96q14,-12 28,0q14,-12 28,0M1546,132q10,-9 20,0q10,-9 20,0M1400,142q9,-8 18,0q9,-8 18,0',
        '#7d8aa3',
        3,
        { opacity: 0.55, edge: 1 },
      );
    }
    p.hill({
      seed: 39,
      base: 0.88,
      amp: 0.05,
      scale: 560,
      top: '#b3c6c4',
      bottom: '#e1e9e6',
      edge: 20,
    });
  },

  /** Great Is Thy Faithfulness — morning by morning: the sun rising over fields in harvest. */
  harvest(p: Picture) {
    p.glow(1360, 0.36, p.band ? 90 : 240, '#f9df9f', 0.6);
    p.sun(1360, p.band ? 0.4 : 0.38, p.band ? 32 : 66, '#fbe9b9', '#f3cf80');
    p.hill({
      seed: 41,
      base: 0.44,
      amp: 0.1,
      scale: 480,
      top: '#d8ddb2',
      bottom: '#eff1dc',
      blend: false,
      soft: 1.4,
      light: { x: 1360, color: '#fff1cf', strength: 0.6 },
    });
    const field = p.hill({
      seed: 43,
      base: 0.58,
      amp: 0.11,
      scale: 420,
      top: '#ebcd88',
      bottom: '#f7e9c6',
      edge: 20,
      light: { x: 1360, color: '#fff4d6', strength: 0.5 },
    });
    if (!p.band) {
      let rows = '';
      for (let k = 1; k <= 6; k++) {
        const off = p.y(0.07) + p.y(0.3) * (k / 7) ** 1.3;
        rows +=
          `M-40,${r1((field[0] as Point)[1] + off)}` +
          through(field.map(([x, y]) => [x, y + off + Math.sin(x / 260 + k) * 4]));
      }
      p.strokes(rows, '#dcb36a', 3, { opacity: 0.32 });
      const trees = roundTrees(
        [
          [210, (field[18] as Point)[1] + 6, 1],
          [330, (field[28] as Point)[1] + 6, 0.8],
          [1690, (field[141] as Point)[1] + 6, 1.1],
          [1820, (field[152] as Point)[1] + 6, 0.85],
        ],
        64,
      );
      p.paint(trees.trunks, '#b39a76', { edge: 2, rim: 1 });
      p.paint(trees.canopy, '#b6c38c', { edge: 8, opacity: 0.92 });
    }
    p.hill({
      seed: 47,
      base: 0.8,
      amp: 0.07,
      scale: 520,
      top: '#e6c27c',
      bottom: '#f5e2b9',
      edge: 22,
    });
  },

  /** To God Be the Glory — rays of glory over rose-gold hills. */
  glory(p: Picture) {
    p.glow(960, 0.64, p.band ? 120 : 320, '#fce6b0', 0.8);
    if (!p.band) {
      let rays = '';
      for (let i = 0; i < 11; i++) {
        const a = Math.PI * (0.12 + (0.76 * i) / 10);
        const tip = (o: number) =>
          `${r1(960 - Math.cos(a + o) * 640)},${r1(p.y(0.68) - Math.sin(a + o) * 380)}`;
        rays += `M960,${r1(p.y(0.68))}L${tip(-0.035)}L${tip(0.035)}Z`;
      }
      p.add(`<path d="${rays}" fill="#f5d898" opacity="0.34" filter="url(#${p.blur(10)})"/>`);
      p.cloudWash(
        cloudShape(470, p.y(0.4), 560, p.y(0.16), 7) +
          cloudShape(1470, p.y(0.34), 480, p.y(0.14), 8),
        '#fbeee4',
        '#f0d2c2',
        0.75,
      );
    }
    p.hill({
      seed: 51,
      base: 0.54,
      amp: 0.12,
      scale: 460,
      top: '#efd2c4',
      bottom: '#f9ece4',
      opacity: 0.95,
      soft: 1.4,
    });
    p.mist(0.62, 0.12, '#fcf2e6', 0.55);
    p.hill({
      seed: 53,
      base: 0.7,
      amp: 0.11,
      scale: 380,
      top: '#e2b2a3',
      bottom: '#f3dbd0',
      edge: 20,
      light: { x: 960, color: '#fff0d8', strength: 0.55 },
    });
    p.hill({
      seed: 59,
      base: 0.86,
      amp: 0.06,
      scale: 520,
      top: '#d79f92',
      bottom: '#efcdc2',
      edge: 22,
    });
  },

  /** Immortal, Invisible — light breaking through high clouds over the mountains. */
  clouds(p: Picture) {
    p.glow(1180, 0.3, p.band ? 110 : 280, '#fdf6e4', 0.95);
    if (!p.band) {
      p.cloudWash(
        cloudShape(380, p.y(0.34), 700, p.y(0.2), 21) +
          cloudShape(1580, p.y(0.28), 600, p.y(0.18), 22) +
          cloudShape(980, p.y(0.42), 520, p.y(0.14), 23),
        '#f6f7fa',
        '#c3cee0',
        0.95,
      );
    }
    p.hill({
      seed: 61,
      base: 0.6,
      amp: 0.3,
      scale: 300,
      peaks: true,
      top: '#b7c2d7',
      bottom: '#e4e9f1',
      opacity: 0.95,
      soft: 1.4,
      light: { x: 1180, color: '#fff8e8', strength: 0.6 },
    });
    p.mist(0.66, 0.16, '#f7f5f0', 0.8);
    p.cloudWash(
      cloudShape(700, p.y(0.7), 980, p.y(0.12), 24) +
        cloudShape(1620, p.y(0.74), 760, p.y(0.1), 25),
      '#eef1f6',
      '#c9d2e1',
      0.75,
    );
    p.hill({
      seed: 67,
      base: 0.88,
      amp: 0.06,
      scale: 460,
      top: '#b7c2d5',
      bottom: '#e1e6ee',
      edge: 22,
    });
  },

  /** O God, Our Help in Ages Past — the ancient hills and time's ever-rolling stream. */
  ages(p: Picture) {
    p.glow(1500, 0.2, p.band ? 70 : 180, '#fcefd4', 0.55);
    if (!p.band)
      p.cloudWash(
        cloudShape(330, p.y(0.2), 520, p.y(0.1), 31) +
          cloudShape(880, p.y(0.14), 380, p.y(0.08), 32),
        '#f2f2f0',
        '#d6d9da',
        0.7,
      );
    p.hill({
      seed: 71,
      base: 0.42,
      amp: 0.2,
      scale: 420,
      peaks: true,
      top: '#d2d8c9',
      bottom: '#eef0e9',
      opacity: 0.95,
      soft: 1.6,
    });
    p.mist(0.48, 0.14);
    p.hill({
      seed: 73,
      base: 0.58,
      amp: 0.15,
      scale: 340,
      peaks: true,
      top: '#b9c4b3',
      bottom: '#e1e6db',
      edge: 16,
      soft: 1.2,
      light: { x: 1500, color: '#fff6e2', strength: 0.5 },
    });
    const stream = p.band
      ? `M-40,${p.y(0.84)}C500,${p.y(0.76)} 1300,${p.y(0.92)} ${W + 40},${p.y(0.82)}L${W + 40},${p.y(0.96)}C1300,${p.y(1.04)} 500,${p.y(0.9)} -40,${p.y(0.98)}Z`
      : `M1012,${p.y(0.62)}C990,${p.y(0.7)} 1110,${p.y(0.75)} 1050,${p.y(0.83)}C980,${p.y(0.9)} 860,${p.y(0.95)} 800,${p.y(1.1)}L1150,${p.y(1.1)}C1130,${p.y(0.95)} 1100,${p.y(0.9)} 1086,${p.y(0.83)}C1150,${p.y(0.75)} 1036,${p.y(0.7)} 1026,${p.y(0.62)}Z`;
    p.hill({
      seed: 79,
      base: 0.76,
      amp: 0.09,
      scale: 340,
      top: '#a8bba9',
      bottom: '#dbe4d8',
      edge: 18,
    });
    p.paint(stream, '#cfe0e9', { opacity: 0.95, edge: 8, blend: false });
    p.strokes(
      p.band
        ? `M220,${p.y(0.88)}h170M900,${p.y(0.86)}h230M1500,${p.y(0.88)}h150`
        : `M1000,${p.y(0.87)}h70M930,${p.y(0.96)}h120M1062,${p.y(0.77)}h34`,
      '#f4f8fa',
      3,
      { opacity: 0.9 },
    );
  },

  /** Holy, Holy, Holy — early morning over the glassy sea. */
  sea(p: Picture) {
    const horizon = p.band ? 0.34 : 0.42;
    p.glow(960, horizon, p.band ? 120 : 280, '#f9e0aa', 0.85);
    p.sun(960, horizon + 0.004, p.band ? 26 : 54, '#fcecc2', '#f4d08a');
    p.hill({
      seed: 81,
      base: horizon + 0.012,
      amp: 0.05,
      scale: 300,
      top: '#d3dbe6',
      bottom: '#e6ebf2',
      from: -80,
      to: 640,
      fall: 0.02,
      opacity: 0.85,
    });
    const seaFill = p.gradient([
      [0, '#dbe5ee'],
      [0.4, '#bccde0'],
      [1, '#a3bad3'],
    ]);
    p.add(
      `<rect x="-40" y="${r1(p.y(horizon) + 3)}" width="${W + 80}" height="${r1(p.y(1.2 - horizon))}" fill="#c8d6e5"/>`,
    );
    p.add(
      `<rect x="-40" y="${r1(p.y(horizon))}" width="${W + 80}" height="${r1(p.y(1.2 - horizon))}" fill="${seaFill}" filter="url(#${p.wash({ edge: 6, bloom: 0.004, rim: 1 })})"/>`,
    );
    let gold = '';
    let white = '';
    const r = random(83);
    const rows = p.band ? 7 : 14;
    for (let i = 0; i < rows; i++) {
      const y = p.y(horizon + 0.03 + ((1 - horizon) * i) / rows);
      const half = 30 + i * (p.band ? 30 : 22) + r() * 30;
      gold += `M${r1(960 - half)},${r1(y)}q${r1(half * 0.5)},-3 ${r1(half)},0t${r1(half * (0.2 + r() * 0.6))},0`;
      for (let k = 0; k < 3; k++) {
        const x = r() * W;
        const w = 50 + r() * 120;
        white += `M${r1(x)},${r1(y + 6)}q${r1(w / 4)},-4 ${r1(w / 2)},0t${r1(w / 2)},0`;
      }
    }
    p.strokes(gold, '#f5d690', p.band ? 3 : 4, { opacity: 0.9 });
    p.strokes(white, '#f6f9fb', 2.5, { opacity: 0.8 });
  },

  /** Give to Our God Immortal Praise — the King of kings: gold light over royal hills. */
  royal(p: Picture) {
    p.glow(960, 0.52, p.band ? 120 : 320, '#f8dc9c', 0.75);
    if (!p.band) {
      let rays = '';
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.22 + (0.56 * i) / 6);
        const tip = (o: number) =>
          `${r1(960 - Math.cos(a + o) * 540)},${r1(p.y(0.6) - Math.sin(a + o) * 320)}`;
        rays += `M960,${p.y(0.6)}L${tip(-0.03)}L${tip(0.03)}Z`;
      }
      p.add(`<path d="${rays}" fill="#f4d58f" opacity="0.3" filter="url(#${p.blur(9)})"/>`);
    }
    p.hill({
      seed: 91,
      base: 0.5,
      amp: 0.13,
      scale: 420,
      top: '#dcd2e8',
      bottom: '#f2eef7',
      opacity: 0.95,
      soft: 1.4,
    });
    p.mist(0.58, 0.12, '#faf4ec', 0.6);
    p.hill({
      seed: 93,
      base: 0.66,
      amp: 0.12,
      scale: 360,
      top: '#c7b8dc',
      bottom: '#e8e1f1',
      edge: 18,
      light: { x: 960, color: '#fff2d6', strength: 0.55 },
    });
    p.hill({
      seed: 97,
      base: 0.84,
      amp: 0.07,
      scale: 480,
      top: '#b29fcf',
      bottom: '#e0d7ec',
      edge: 22,
    });
  },

  /** Praise, My Soul, the King of Heaven — sun and moon bow down over a meadow in flower. */
  meadow(p: Picture) {
    if (!p.band) {
      p.glow(300, 0.3, 150, '#fae6b0', 0.75);
      p.sun(300, 0.3, 48, '#fcebbe', '#f4d389');
      const moon = p.wash({ edge: 3, rim: 2, bloom: 0.02 });
      p.defs.push(
        `<mask id="crescent"><rect x="-40" y="-40" width="${W + 80}" height="${p.H + 80}" fill="#fff"/><circle cx="1646" cy="${r1(p.y(0.22) - 8)}" r="44" fill="#000"/></mask>`,
      );
      p.add(
        `<circle cx="1620" cy="${r1(p.y(0.22))}" r="46" fill="#dfe4ec" mask="url(#crescent)" filter="url(#${moon})"/>`,
      );
    }
    p.hill({
      seed: 101,
      base: 0.5,
      amp: 0.1,
      scale: 460,
      top: '#d3dec0',
      bottom: '#eef2e5',
      opacity: 0.95,
      soft: 1.4,
    });
    const mid = p.hill({
      seed: 103,
      base: 0.66,
      amp: 0.1,
      scale: 380,
      top: '#bccf9f',
      bottom: '#e2ead2',
      edge: 18,
      light: { x: 300, color: '#fff5d8', strength: 0.55 },
    });
    const near = p.hill({
      seed: 107,
      base: 0.84,
      amp: 0.06,
      scale: 520,
      top: '#a9c38c',
      bottom: '#dbe7cc',
      edge: 20,
    });
    const flowers = [
      ['#e6a8b6', 111],
      ['#f0d27e', 113],
      ['#fdfaf3', 117],
      ['#cdb9e2', 119],
    ];
    for (const [color, seed] of flowers as [string, number][]) {
      p.paint(
        clusters(mid, {
          seed,
          clusters: p.band ? 4 : 7,
          per: 9,
          size: p.band ? 3 : 4.5,
          spread: 0.1,
          H: p.H,
        }),
        color,
        { edge: 3, rim: 1, opacity: 0.95, blend: false },
      );
      p.paint(
        clusters(near, {
          seed: seed + 50,
          clusters: p.band ? 5 : 8,
          per: 11,
          size: p.band ? 4 : 6.5,
          spread: 0.08,
          H: p.H,
        }),
        color,
        { edge: 3, rim: 1, opacity: 0.95, blend: false },
      );
    }
  },

  /** I Sing the Mighty Power of God — mountains rising from the flowing seas. */
  coast(p: Picture) {
    if (!p.band) {
      p.glow(1640, 0.2, 130, '#f9e0a4', 0.7);
      p.sun(1640, 0.2, 40, '#fcebbe', '#f3cf84');
      p.cloudWash(cloudShape(1300, p.y(0.3), 420, p.y(0.1), 41), '#f5f7f8', '#d7e0e5', 0.75);
    }
    const sea = p.band ? 0.58 : 0.62;
    p.hill({
      seed: 121,
      base: (p.band ? 0.58 : 0.62) + 0.01,
      amp: 0.36,
      scale: 380,
      peaks: true,
      top: '#c3d7d3',
      bottom: '#e7efed',
      opacity: 0.95,
      from: -80,
      to: 1320,
      fall: 0,
      soft: 1.4,
      light: { x: 1640, color: '#fff4dc', strength: 0.55 },
    });
    p.hill({
      seed: 123,
      base: (p.band ? 0.58 : 0.62) + 0.01,
      amp: 0.22,
      scale: 300,
      peaks: true,
      top: '#abc7c2',
      bottom: '#d9e7e3',
      from: -80,
      to: 940,
      fall: 0,
      edge: 16,
    });
    const seaFill = p.gradient([
      [0, '#d3e5eb'],
      [1, '#a0c4d2'],
    ]);
    const top = p.y(sea);
    p.add(
      `<rect x="-40" y="${r1(top + 3)}" width="${W + 80}" height="${r1(p.H - top + 40)}" fill="#c3dbe3"/>`,
    );
    p.add(
      `<rect x="-40" y="${r1(top)}" width="${W + 80}" height="${r1(p.H - top + 40)}" fill="${seaFill}" filter="url(#${p.wash({ edge: 8, bloom: 0.005, rim: 1 })})"/>`,
    );
    let waves = '';
    const r = random(127);
    const rows = p.band ? 4 : 8;
    for (let i = 0; i < rows; i++) {
      const y = top + ((p.H - top) * (i + 0.6)) / rows;
      for (let k = 0; k < 4; k++) {
        const x = r() * W;
        const w = 80 + r() * 160;
        waves += `M${r1(x)},${r1(y)}q${r1(w / 4)},-8 ${r1(w / 2)},0t${r1(w / 2)},0`;
      }
    }
    p.strokes(waves, '#fafcfc', 3, { opacity: 0.85 });
  },

  /** Hosanna, Loud Hosanna — palms along the road and the temple city beyond. */
  palms(p: Picture) {
    p.glow(960, 0.44, p.band ? 120 : 300, '#f8e3b7', 0.75);
    const hill = p.hill({
      seed: 131,
      base: 0.58,
      amp: 0.08,
      scale: 520,
      top: '#e6d7b8',
      bottom: '#f4ede0',
      opacity: 0.95,
      soft: 1.4,
      light: { x: 960, color: '#fff3d8', strength: 0.5 },
    });
    const crest = hill.reduce((m, [x, y]) =>
      Math.abs(x - 960) < Math.abs(m[0] - 960) ? ([x, y] as Point) : m,
    )[1];
    const town = city(960, crest, p.band ? 0.42 : 1);
    p.paint(town.walls, '#ead8b6', { edge: 2, rim: 2, opacity: 0.98, blend: false });
    p.paint(town.shade, '#dcc49c', { edge: 2, rim: 1, opacity: 0.7 });
    if (!p.band) {
      const olives = roundTrees(
        [
          [560, crest + 14, 0.9],
          [650, crest + 18, 0.7],
          [1290, crest + 16, 0.85],
          [1380, crest + 12, 0.7],
        ],
        52,
      );
      p.paint(olives.trunks, '#c2ab88', { edge: 2, rim: 1 });
      p.paint(olives.canopy, '#c5cba4', { edge: 8, opacity: 0.95 });
    }
    p.hill({
      seed: 137,
      base: 0.86,
      amp: 0.05,
      scale: 520,
      top: '#dccaa2',
      bottom: '#f1e8d4',
      edge: 22,
    });
    if (!p.band) {
      for (const [x, h, lean, seed] of [
        [170, 330, 30, 141],
        [300, 250, -20, 143],
        [1700, 340, -36, 147],
        [1820, 260, 18, 149],
      ] as [number, number, number, number][]) {
        const tree = palm(x, p.H + 10, h, lean, seed);
        p.paint(tree.trunk, '#bfa27d', { edge: 3, rim: 1, opacity: 0.95 });
        p.paint(tree.fronds, '#a5b577', { edge: 4, rim: 2, opacity: 0.95 });
      }
    }
  },
};
