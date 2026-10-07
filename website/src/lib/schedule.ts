/**
 * The rhythm of meetings, and which one comes next — worked out on real calendar dates in
 * Houston time, so it is always right without anyone updating it. Used at build time and in
 * the browser, so it has no runtime dependencies.
 */
import type { getMeetings } from './data';

type Meeting = Awaited<ReturnType<typeof getMeetings>>[number];

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface Slot {
  /** 0 = Sunday … 6 = Saturday */
  dow: number;
  /** Display name, e.g. "Lord’s Day" or "Wednesday". */
  day: string;
  start: string;
  title: string;
  online: boolean;
  /** Only on this week of the month (2 = the second Saturday); weekly when absent. */
  monthlyWeek?: number;
}

/** Every regular meeting, weekly and monthly. */
export function meetingSlots(meetings: Meeting[]): Slot[] {
  return meetings.flatMap((m) =>
    m.groups.flatMap((g) =>
      g.items.map((item) => ({
        dow: DAYS.indexOf(m.day),
        day: m.day === 'Sunday' ? 'Lord’s Day' : m.day,
        start: item.start,
        title: item.title,
        online: m.online,
        monthlyWeek: g.monthlyWeek,
      })),
    ),
  );
}

const minutesOf = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** The next meeting after `now` (Houston time), and how many days away it is (0 = today). */
export function nextSlot(slots: Slot[], now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const [year, month, day] = [Number(parts.year), Number(parts.month), Number(parts.day)];
  const minutesNow = Number(parts.hour) * 60 + Number(parts.minute);

  // Look ahead day by day (five weeks covers every monthly meeting).
  for (let daysAway = 0; daysAway < 36; daysAway++) {
    const date = new Date(Date.UTC(year, month - 1, day + daysAway));
    const weekOfMonth = Math.ceil(date.getUTCDate() / 7);
    const today = slots
      .filter(
        (s) =>
          s.dow === date.getUTCDay() &&
          (!s.monthlyWeek || s.monthlyWeek === weekOfMonth) &&
          (daysAway > 0 || minutesOf(s.start) > minutesNow),
      )
      // Earliest first; at the same hour the monthly meeting (e.g. the second-Saturday
      // breakfast) is the one to mention.
      .sort(
        (a, b) =>
          minutesOf(a.start) - minutesOf(b.start) ||
          Number(!!b.monthlyWeek) - Number(!!a.monthlyWeek),
      );
    if (today[0]) return { slot: today[0], daysAway };
  }
  return undefined;
}

/** "Today", "Tomorrow", or the day's name. */
export function whenLabel(daysAway: number, day: string): string {
  return daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : day;
}

/** "Wednesday · 7:00 PM · Prayer Meeting & Bible Study · online" */
export function describeSlot(slot: Slot, when: string, formatTime: (hhmm: string) => string) {
  return [when, formatTime(slot.start), slot.title, ...(slot.online ? ['online'] : [])].join(' · ');
}
