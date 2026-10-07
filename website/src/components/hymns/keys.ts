/**
 * Keys for presenting, as in PowerPoint's slide show — so every presentation clicker works.
 * Clickers are keyboards: most send Page Down / Page Up (Logitech, Kensington, Targus, Amazon
 * Basics), some the arrow keys, Space or Enter, N / P, the media "next / previous track" keys, and
 * a "start / stop" button sends F5 (or Shift+F5) and Esc. "B" or "." blacks the screen, "W" or
 * "," whitens it. A slide's number, then Enter, goes straight to it.
 */
import type { ProjectorKey as KeyLike } from './display';

export type Action =
  | 'next'
  | 'previous'
  | 'nextPart'
  | 'previousPart'
  | 'first'
  | 'last'
  | 'black'
  | 'white'
  | 'fullscreen'
  | 'list'
  | 'end'
  | 'start';

const NEXT = new Set([
  'ArrowRight',
  'ArrowDown',
  'PageDown',
  ' ',
  'Enter',
  'n',
  'N',
  'MediaTrackNext',
]);
const PREVIOUS = new Set([
  'ArrowLeft',
  'ArrowUp',
  'PageUp',
  'Backspace',
  'p',
  'P',
  'MediaTrackPrevious',
]);

export function actionFor(event: KeyLike): Action | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  const { key, shiftKey } = event;
  if (key === 'F5') return 'start';
  if (shiftKey && (key === 'ArrowRight' || key === 'ArrowDown')) return 'nextPart';
  if (shiftKey && (key === 'ArrowLeft' || key === 'ArrowUp')) return 'previousPart';
  if (NEXT.has(key)) return 'next';
  if (PREVIOUS.has(key)) return 'previous';
  if (key === 'Home') return 'first';
  if (key === 'End') return 'last';
  if (key === 'b' || key === 'B' || key === '.') return 'black';
  if (key === 'w' || key === 'W' || key === ',') return 'white';
  if (key === 'f' || key === 'F') return 'fullscreen';
  if (key === 'l' || key === 'L') return 'list';
  if (key === 'Escape' || key === '-') return 'end';
  return null;
}

/** The plain parts of a key press, to send to the other window. */
export const keyOf = (e: KeyLike): KeyLike => ({
  key: e.key,
  shiftKey: e.shiftKey,
  metaKey: e.metaKey,
  ctrlKey: e.ctrlKey,
  altKey: e.altKey,
});

/**
 * A mouse wheel or trackpad, as clickers that act as a mouse send it: one slide per turn of the
 * wheel, however many events one swipe makes. Returns +1, -1 or 0.
 */
export function wheelStepper() {
  let total = 0;
  let resting = 0;
  return (event: WheelEvent): 1 | -1 | 0 => {
    const now = performance.now();
    if (now < resting) return 0;
    total += event.deltaY;
    if (Math.abs(total) < 40) return 0;
    const by = total > 0 ? 1 : -1;
    total = 0;
    resting = now + 450;
    return by;
  };
}
