/**
 * A hymn's background, drawn on demand: either one of the ten hand-composed presets (Truth and
 * Praise 1–10) or a recipe painted by the composer. Drawn pictures are kept, so each one is only
 * painted once per visit.
 */
import { compose, type Recipe } from './compose.ts';
import { Picture, type Kind } from './painter.ts';
import { PALETTES } from './palettes.ts';
import { PRESETS } from './presets.ts';

export type Scene = { preset: keyof typeof PRESETS } | Recipe;

/** The palette each preset was painted in, for its title colour. */
const PRESET_INK: Record<string, keyof typeof PALETTES> = {
  mountains: 'dawn',
  harvest: 'gold',
  glory: 'rose',
  clouds: 'mist',
  ages: 'sage',
  sea: 'sea',
  royal: 'lavender',
  meadow: 'spring',
  coast: 'teal',
  palms: 'sand',
};

export function drawScene(scene: Scene, kind: Kind, seed = 1): string {
  const p = new Picture(kind);
  if ('preset' in scene) PRESETS[scene.preset]?.(p);
  else compose(p, scene, seed);
  return p.toString();
}

/** The title colour that belongs with a scene. */
export function inkFor(scene: Scene): string {
  const name = 'preset' in scene ? PRESET_INK[scene.preset] : scene.palette;
  return PALETTES[name ?? 'rose']?.ink ?? '#4a1d26';
}

const drawn = new Map<string, string>();

/** The scene as an image address (a self-contained SVG), painted once and then reused. */
export function sceneUrl(scene: Scene, kind: Kind, seed: number): string {
  const key = `${kind}|${seed}|${JSON.stringify(scene)}`;
  let url = drawn.get(key);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawScene(scene, kind, seed))}`;
    drawn.set(key, url);
  }
  return url;
}
