/**
 * The projector, on the chapel's second screen. With a second screen connected (an extended
 * display), Chrome and Edge can open the slides there by themselves, once the site may "manage
 * windows on all your displays" (the Window Management API). They fill it straight away if the site
 * may also go full screen by itself (Chrome's "Automatic full screen" site setting, Chrome 126+);
 * otherwise the first press of the clicker, or a click, on that screen fills it. Elsewhere (Safari,
 * Firefox) the projector window opens beside this one, to be dragged across and clicked.
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
const hasSecondScreen = () =>
  typeof window !== 'undefined' &&
  !!(window.screen as Screen & { isExtended?: boolean }).isExtended;

/**
 * Where things stand with a second screen: none connected (or the browser can't tell), connected
 * and the site may use it, connected but the browser must ask first, or connected and refused.
 */
export async function secondScreen(): Promise<'none' | 'ready' | 'ask' | 'refused'> {
  if (!hasSecondScreen() || !(window as Multi).getScreenDetails) return 'none';
  try {
    const status = await navigator.permissions.query({
      name: 'window-management' as PermissionName,
    });
    return status.state === 'granted' ? 'ready' : status.state === 'denied' ? 'refused' : 'ask';
  } catch {
    return 'ask';
  }
}

/** Asks the browser, once, for the second screen (it shows its own question). */
export async function allowSecondScreen() {
  try {
    await (window as Multi).getScreenDetails?.();
  } catch {
    // Refused: the slides open in this window.
  }
  return secondScreen();
}

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

/** Opens the projector window: filling the second screen if there is one. */
export async function openProjector(): Promise<Window | null> {
  const screen = await otherScreen();
  const features = screen
    ? `popup,left=${screen.availLeft},top=${screen.availTop},width=${screen.availWidth},height=${screen.availHeight}`
    : 'popup,width=1280,height=720';
  return window.open(DISPLAY_URL, 'chbc-hymns-display', features);
}
