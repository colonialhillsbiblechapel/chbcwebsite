/**
 * The icons a volunteer can choose for a Resources category or link (Phosphor Icons, light weight,
 * MIT License — the SVG files are in src/assets/icons). Add a name here and its file there to
 * offer a new one.
 */
export const ICONS = [
  'book-open-text',
  'scroll',
  'handshake',
  'users-three',
  'music-notes',
  'sun-horizon',
  'cross',
  'heart',
  'clock-counter-clockwise',
  'archive',
  'globe-hemisphere-west',
  'tent',
  'hand-heart',
  'church',
  'arrow-up-right',
  'arrow-right',
  'lock-simple',
] as const;

export type IconName = (typeof ICONS)[number];
