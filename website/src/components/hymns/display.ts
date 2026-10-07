/**
 * Talks between the presenting window and a second window shown on the projector (same site only,
 * via BroadcastChannel — nothing leaves the computer).
 */
import type { ServiceItem } from './service';

export const CHANNEL = 'chbc-hymns-display';
/** The projector screen's own page (no site header or footer). */
export const DISPLAY_URL = '/hymns/screen/';

export type DisplayMessage =
  /** The projector window has opened and asks what to show. */
  | { type: 'hello' }
  /** What to show: a hymn and which of its slides. `key` (the unlock key) answers "hello" only. */
  | { type: 'state'; item?: ServiceItem; slide: number; blank: boolean; key?: string }
  /** Presenting has finished. */
  | { type: 'end' };
