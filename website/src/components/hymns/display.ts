/**
 * Talks between the presenting window and a second window shown on the projector (same site only,
 * via BroadcastChannel — nothing leaves the computer).
 */
import type { ServiceItem } from './service';
import type { SlideData } from './slides';

export const CHANNEL = 'chbc-hymns-display';
/** The projector screen's own page (no site header or footer). */
export const DISPLAY_URL = '/hymns/screen/';

/** The screen blanked, as in PowerPoint: black (B) or white (W). */
export type Blank = false | 'black' | 'white';

/** A key press, mouse click or wheel turn in the projector window, passed to the presenter. */
export interface ProjectorKey {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

export type DisplayMessage =
  /** The projector window has opened and asks what to show. */
  | { type: 'hello' }
  /**
   * What to show: a hymn and which of its slides, or (`content`) a slide that isn't a hymn's, such
   * as the Sunday welcome. `key` (the unlock key) answers "hello" only.
   */
  | {
      type: 'state';
      item?: ServiceItem;
      content?: SlideData;
      slide: number;
      blank: Blank;
      key?: string;
    }
  /** The clicker (or the mouse) was used on the projector window: the presenter acts on it. */
  | { type: 'press'; press: ProjectorKey }
  /** Presenting has finished. */
  | { type: 'end' };
