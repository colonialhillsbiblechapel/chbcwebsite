/**
 * The projector, on the chapel's second screen. With a second screen connected (an extended
 * display), Chrome and Edge can open the slides there, full screen, by themselves (the Window
 * Management API; the browser asks once for permission to "manage windows on all your displays").
 * Elsewhere the projector window opens beside this one, to be dragged across and clicked.
 */
import { DISPLAY_URL } from './display';

interface Placed {
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
  isInternal?: boolean;
}
type Detailed = { screens: Placed[]; currentScreen: Placed };
type Multi = Window & { getScreenDetails?: () => Promise<Detailed> };

/** Whether another screen is connected, as an extended display. */
export const hasSecondScreen = () =>
  typeof window !== 'undefined' &&
  !!(window.screen as Screen & { isExtended?: boolean }).isExtended;

/** The screen to show the slides on: one that isn't this window's, the projector if it can tell. */
async function otherScreen(): Promise<Placed | null> {
  const multi = window as Multi;
  if (!hasSecondScreen() || !multi.getScreenDetails) return null;
  try {
    const details = await multi.getScreenDetails();
    const others = details.screens.filter((s) => s !== details.currentScreen);
    return others.find((s) => s.isInternal === false) ?? others[0] ?? null;
  } catch {
    return null; // permission refused
  }
}

/** Opens the projector window: full screen on the second screen if there is one. */
export async function openProjector(): Promise<Window | null> {
  const screen = await otherScreen();
  const features = screen
    ? `popup,fullscreen,left=${screen.availLeft},top=${screen.availTop},width=${screen.availWidth},height=${screen.availHeight}`
    : 'popup,width=1280,height=720';
  return window.open(DISPLAY_URL, 'chbc-hymns-display', features);
}
