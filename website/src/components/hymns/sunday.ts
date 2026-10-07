/**
 * The Sunday welcome: the welcome, a chorus (or none), our welcome song, and the birthday and
 * anniversary songs. What is chosen is kept on this device, so the slides are ready next time;
 * "Clear" forgets it. A chorus whose words were changed here, or one written here, is kept here
 * only — it is never sent anywhere.
 */
import type { DeckHymn } from './Presenter';
import type { SlideData, WelcomePicture } from './slides';
import type { Chorus, Sunday } from './vault';

export type PictureChoice = 'auto' | 'dated' | WelcomePicture;

/** A chorus from the collection, as it is or with its words changed here — or one written here. */
export type ChorusChoice =
  { number: number } | { number?: number; title: string; slides: string[][] };

export interface Plan {
  picture: PictureChoice;
  chorus: ChorusChoice | null;
}

export const PICTURES: { id: PictureChoice; name: string; note: string }[] = [
  { id: 'auto', name: 'By the time of day', note: 'Good Morning, Afternoon or Evening' },
  { id: 'dated', name: 'With the date', note: 'The welcome and the day’s date' },
  { id: 'morning', name: 'Good Morning', note: 'Lamentations 3:23' },
  { id: 'afternoon', name: 'Good Afternoon', note: 'Psalm 55:17' },
  { id: 'evening', name: 'Good Evening', note: 'Psalm 141:2' },
  { id: 'lily', name: 'Lilies', note: 'John 3:16' },
  { id: 'olive', name: 'Olive branches', note: 'Psalm 52:8' },
  { id: 'classic', name: 'The Lord’s Day', note: 'Psalm 118:24' },
];

const KEY = 'chbc-sunday-welcome';
const EMPTY: Plan = { picture: 'auto', chorus: null };

function storage() {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
}

const isLines = (slides: unknown): slides is string[][] =>
  Array.isArray(slides) &&
  slides.every((s) => Array.isArray(s) && s.every((l) => typeof l === 'string'));

export function loadPlan(): Plan {
  try {
    const saved = JSON.parse(storage()?.getItem(KEY) ?? 'null') as Partial<Plan> | null;
    if (!saved) return EMPTY;
    const picture = PICTURES.find((p) => p.id === saved.picture)?.id ?? 'auto';
    const c = saved.chorus as Record<string, unknown> | null | undefined;
    let chorus: ChorusChoice | null = null;
    if (c && typeof c.title === 'string' && isLines(c.slides))
      chorus = {
        title: c.title,
        slides: c.slides,
        ...(typeof c.number === 'number' ? { number: c.number } : {}),
      };
    else if (c && typeof c.number === 'number') chorus = { number: c.number };
    return { picture, chorus };
  } catch {
    return EMPTY;
  }
}

export function savePlan(plan: Plan) {
  try {
    storage()?.setItem(KEY, JSON.stringify(plan));
  } catch {
    // Private browsing: the choice simply isn't kept.
  }
}

export function clearPlan(): Plan {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Nothing was kept.
  }
  return EMPTY;
}

/* The time and day in Houston, whatever the computer's own clock is set to. */

const HOUSTON = 'America/Chicago';
const hourAt = (now: Date) =>
  Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: HOUSTON })
      .formatToParts(now)
      .find((p) => p.type === 'hour')?.value ?? 9,
  );
const partOfDay = (now: Date): 'morning' | 'afternoon' | 'evening' => {
  const hour = hourAt(now);
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
};
const GREETINGS = { morning: 'Good Morning', afternoon: 'Good Afternoon', evening: 'Good Evening' };
const dateAt = (now: Date) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: HOUSTON,
  }).format(now);

export function welcomeSlide(choice: PictureChoice, now: Date): SlideData {
  const part = partOfDay(now);
  return {
    kind: 'welcome',
    picture: choice === 'auto' ? part : choice,
    greeting: GREETINGS[part],
    date: dateAt(now),
  };
}

/* The chorus. */

export interface ChosenChorus {
  title: string;
  credits: string[];
  slides: { label: string; lines: string[] }[];
  /** The collection's chorus, when this is one of them (changed here or not). */
  from?: Chorus;
  kind: 'collection' | 'edited' | 'own';
}

export function chorusOf(choice: ChorusChoice | null, data: Sunday): ChosenChorus | null {
  if (!choice) return null;
  const from =
    choice.number === undefined ? undefined : data.choruses.find((c) => c.number === choice.number);
  if ('slides' in choice) {
    const slides = choice.slides.filter((lines) => lines.some((l) => l.trim()));
    return {
      title: choice.title.trim() || from?.title || 'Chorus',
      credits: from?.credits ?? [],
      slides: slides.map((lines, i) => ({ label: `Slide ${i + 1}`, lines })),
      from,
      kind: from ? 'edited' : 'own',
    };
  }
  return from ? { ...from, from, kind: 'collection' } : null;
}

/** The words as they are typed in the editor: a slide's lines, an empty line between slides. */
export const toText = (slides: { lines: string[] }[]) =>
  slides.map((s) => s.lines.join('\n')).join('\n\n');
export const fromText = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((l) => l.replace(/\s+$/, '')))
    .filter((lines) => lines.some((l) => l.trim()));

/** Finds choruses by title or words: every word typed must appear; titles first. */
const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘'`".,;:!?()[\]{}—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export function findChoruses(choruses: Chorus[], query: string) {
  const words = fold(query).split(' ').filter(Boolean);
  if (words.length === 0) return choruses;
  const scored = choruses.flatMap((c) => {
    const title = fold(c.title);
    const all = `${title} ${fold(c.slides.flatMap((s) => s.lines).join(' '))}`;
    if (!words.every((w) => all.includes(w))) return [];
    const phrase = words.join(' ');
    const score = title.startsWith(phrase)
      ? 0
      : title.includes(phrase)
        ? 1
        : words.every((w) => title.includes(w))
          ? 2
          : 3;
    return [{ c, score }];
  });
  return scored.sort((a, b) => a.score - b.score || a.c.number - b.c.number).map((s) => s.c);
}

/** The whole Sunday welcome, in order, ready for the presenter. */
export function deckFor(plan: Plan, data: Sunday, now = new Date()): DeckHymn[] {
  const deck: DeckHymn[] = [{ name: 'Welcome', slides: [welcomeSlide(plan.picture, now)] }];
  const chorus = chorusOf(plan.chorus, data);
  if (chorus && chorus.slides.length)
    deck.push({
      name: chorus.title,
      slides: chorus.slides.map((s, i) => ({
        kind: 'program',
        theme: 'chorus',
        eyebrow: data.program.chorus.eyebrow,
        title: chorus.title,
        label: s.label,
        lines: s.lines,
        first: i === 0,
        credits: i === 0 ? chorus.credits : undefined,
      })),
    });
  for (const song of data.program.songs)
    deck.push({
      // "Welcome" is also the first slide: the song goes by what the deck calls it.
      name: song.id === 'welcome' ? 'Our welcome song' : song.title,
      slides: [
        {
          kind: 'program',
          theme: song.id,
          eyebrow: song.eyebrow,
          title: song.title,
          label: song.title,
          lines: song.lines,
          first: true,
        },
      ],
    });
  return deck.map((part, i) => ({ ...part, badge: String(i + 1) }));
}
