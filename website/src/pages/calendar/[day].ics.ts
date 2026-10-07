/**
 * "Add to calendar" files: one .ics per meeting day, with every meeting as a recurring event
 * in Houston time (weekly, or monthly for meetings such as the second Saturday).
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { cityLine, getMeetings, getSettings } from '@/lib/data';
import { DAYS } from '@/lib/schedule';

type Meeting = Awaited<ReturnType<typeof getMeetings>>[number];

export const getStaticPaths = (async () =>
  (await getMeetings()).map((meeting) => ({
    params: { day: meeting.day.toLowerCase() },
    props: { meeting },
  }))) satisfies GetStaticPaths;

const ICAL_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** America/Chicago, so calendars keep the local time through daylight saving changes. */
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:America/Chicago',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0600',
  'TZOFFSETTO:-0500',
  'TZNAME:CDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0600',
  'TZNAME:CST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

/** Escape text values (RFC 5545 §3.3.11). */
const text = (value: string) => value.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (new TextEncoder().encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** The first date in January 2026 that falls on the meeting's weekday (and week of the month). */
function anchorDate(dow: number, monthlyWeek?: number): string {
  const firstOfJanuary = new Date(Date.UTC(2026, 0, 1));
  const offset = (dow - firstOfJanuary.getUTCDay() + 7) % 7;
  const day = 1 + offset + ((monthlyWeek ?? 1) - 1) * 7;
  return `202601${String(day).padStart(2, '0')}`;
}

const at = (date: string, hhmm: string) => `${date}T${hhmm.replace(':', '')}00`;

function addHour(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const GET: APIRoute<{ meeting: Meeting }> = async ({ props, site }) => {
  const { meeting } = props;
  const settings = await getSettings();
  const dow = DAYS.indexOf(meeting.day);
  const location = meeting.online
    ? 'Online via WebEx (ask the chapel for the link)'
    : `${settings.name}, ${settings.address.street}, ${cityLine(settings.address)}`;

  const events = meeting.groups.flatMap((group) =>
    group.items.map((item) => {
      const date = anchorDate(dow, group.monthlyWeek);
      const rule = group.monthlyWeek
        ? `RRULE:FREQ=MONTHLY;BYDAY=${group.monthlyWeek}${ICAL_DAYS[dow]}`
        : `RRULE:FREQ=WEEKLY;BYDAY=${ICAL_DAYS[dow]}`;
      const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return [
        'BEGIN:VEVENT',
        `UID:${meeting.day.toLowerCase()}-${item.start.replace(':', '')}-${slug}@colonialhills-biblechapel.com`,
        'DTSTAMP:20260101T000000Z',
        `DTSTART;TZID=America/Chicago:${at(date, item.start)}`,
        `DTEND;TZID=America/Chicago:${at(date, item.end ?? addHour(item.start))}`,
        rule,
        `SUMMARY:${text(item.title)} · ${text(settings.shortName)}`,
        `LOCATION:${text(location)}`,
        `URL:${new URL('/', site)}`,
        'END:VEVENT',
      ];
    }),
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Colonial Hills Bible Chapel//Meetings//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${text(`${settings.name} · ${meeting.day}`)}`,
    'X-WR-TIMEZONE:America/Chicago',
    ...VTIMEZONE,
    ...events.flat(),
    'END:VCALENDAR',
  ];

  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
