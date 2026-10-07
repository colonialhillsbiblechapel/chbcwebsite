/**
 * Unit tests for the logic that keeps the site up to date by itself: the next gathering and
 * reading new messages from the YouTube channel feed. (No browser needed.)
 */
import { expect, test } from '@playwright/test';
import { nextSlot, type Slot } from '../src/lib/schedule';
import { parseFeed } from '../src/lib/youtube-feed';

test.skip(({ isMobile }) => isMobile, 'Logic tests run once');

const slots: Slot[] = [
  { dow: 0, day: 'Lord’s Day', start: '09:30', title: 'Breaking of Bread', online: false },
  { dow: 3, day: 'Wednesday', start: '19:00', title: 'Prayer Meeting', online: true },
  { dow: 6, day: 'Saturday', start: '09:00', title: 'Men’s Prayer Meeting', online: false },
  {
    dow: 6,
    day: 'Saturday',
    start: '09:00',
    title: 'Men’s Breakfast',
    online: false,
    monthlyWeek: 2,
  },
];
const next = (iso: string) => {
  const result = nextSlot(slots, new Date(iso));
  return result && `${result.slot.title} +${result.daysAway}`;
};

test('the next gathering is worked out in Houston time', () => {
  expect(next('2026-10-05T17:00:00Z')).toBe('Prayer Meeting +2'); // Monday noon
  expect(next('2026-10-07T23:00:00Z')).toBe('Prayer Meeting +0'); // Wednesday 6 pm, still today
  expect(next('2026-10-08T02:30:00Z')).toBe('Men’s Breakfast +3'); // Wednesday 9:30 pm Houston
  expect(next('2026-10-16T17:00:00Z')).toBe('Men’s Prayer Meeting +1'); // before a 3rd Saturday
  expect(next('2026-10-17T15:00:00Z')).toBe('Breaking of Bread +1'); // Saturday after 9 am
});

test('new uploads are read from the channel feed', () => {
  const entry = (id: string, title: string, published: string, description = '') =>
    `<entry><yt:videoId>${id}</yt:videoId><title>${title}</title><published>${published}</published><media:group><media:description>${description}</media:description></media:group></entry>`;
  const feed = [
    entry('aaaaaaaaaaa', 'Bro Johnson John 09/27/2026', '2026-09-28T03:00:00+00:00'),
    entry(
      'bbbbbbbbbbb',
      '106th Annual Houston Bible Conference — Sunday Morning — Mark Kolchin',
      '2026-10-05T01:00:00+00:00',
      'The Sunday morning gathering.\n\nSubscribe for more.',
    ),
    entry('ccccccccccc', 'Jim Fleming &amp; Mark Kolchin Q&amp;A', '2026-10-06T01:00:00+00:00'),
  ].join('');
  expect(parseFeed(feed)).toEqual([
    {
      id: 'aaaaaaaaaaa',
      title: 'Bro Johnson John 09/27/2026',
      speaker: 'Bro Johnson John',
      date: '2026-09-27',
      category: 'sunday',
      description: undefined,
    },
    {
      id: 'bbbbbbbbbbb',
      title: '106th Annual Houston Bible Conference — Sunday Morning — Mark Kolchin',
      speaker: 'Mark Kolchin',
      date: '2026-10-05',
      category: 'conference',
      conference: 106,
      description: 'The Sunday morning gathering.',
    },
    {
      id: 'ccccccccccc',
      title: 'Jim Fleming & Mark Kolchin Q&A',
      speaker: 'Colonial Hills Bible Chapel',
      date: '2026-10-06',
      category: 'special',
      description: undefined,
    },
  ]);
});
