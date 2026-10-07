/**
 * Pure helpers for the media library: searching, filtering, sorting, labels and avatars.
 * No React, no DOM — easy to reason about and to test.
 */
import { CATEGORY_LABELS, type Category, type MediaItem } from '@/lib/media-shared';

export type Sort = 'newest' | 'oldest' | 'title';

export interface Filters {
  query: string;
  category: Category | 'all';
  series: string;
  /** Conference edition, e.g. "105". */
  conference: string;
  speaker: string;
  sort: Sort;
}

export const DEFAULT_FILTERS: Filters = {
  query: '',
  category: 'all',
  series: '',
  conference: '',
  speaker: '',
  sort: 'newest',
};

export const SORT_LABELS: Record<Sort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'Title A–Z',
};

const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** "Bro Paul Moffitt" → "Paul Moffitt" */
export const plainName = (speaker: string) => speaker.replace(/^(Bro\.?|Br\.|Dr\.?)\s+/, '');

/** One key per person, whatever the honorific: "Br. Mike Attwood" and "Mike Attwood" match. */
export const speakerKey = (speaker: string) => normalize(plainName(speaker));

const ordinal = (n: number) => {
  const suffix = ['th', 'st', 'nd', 'rd'][
    (n % 100 >= 11 && n % 100 <= 13) || n % 10 > 3 ? 0 : n % 10
  ];
  return `${n}${suffix}`;
};

const conferenceLabel = (edition: number) => `${ordinal(edition)} Houston Bible Conference`;

/** What kind of message this is, for the line under a title. */
export const kindLabel = (item: MediaItem) =>
  item.series?.title ??
  (item.conference ? conferenceLabel(item.conference) : CATEGORY_LABELS[item.category]);

/** The small badge in the corner of a thumbnail. */
export function badgeLabel(item: MediaItem) {
  if (item.episode) return `Episode ${item.episode}`;
  if (item.conference) return `${ordinal(item.conference)} Conference`;
  return item.category === 'sunday' ? 'Sunday' : 'Special';
}

/** Searchable text for an item (title, speaker, series, conference, description, date). */
const haystack = (item: MediaItem) =>
  normalize(
    [
      item.title,
      item.speaker,
      item.series?.title,
      item.episode ? `episode ${item.episode}` : '',
      item.conference ? conferenceLabel(item.conference) : '',
      item.description,
      item.dateLabel,
      CATEGORY_LABELS[item.category],
    ].join(' '),
  );

export function applyFilters(items: MediaItem[], filters: Filters): MediaItem[] {
  const words = normalize(filters.query).split(' ').filter(Boolean);
  const result = items.filter(
    (item) =>
      (filters.category === 'all' || item.category === filters.category) &&
      (!filters.series || item.series?.id === filters.series) &&
      (!filters.conference || String(item.conference ?? '') === filters.conference) &&
      (!filters.speaker || speakerKey(item.speaker) === filters.speaker) &&
      words.every((word) => haystack(item).includes(word)),
  );
  if (filters.sort === 'title') {
    return result.sort((a, b) => a.title.localeCompare(b.title, 'en', { numeric: true }));
  }
  // A series reads like a playlist: first episode first.
  if (filters.series) result.sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0));
  return filters.sort === 'oldest' ? result.reverse() : result; // items arrive newest first
}

export interface Option {
  key: string;
  label: string;
  count: number;
}

/** One entry per person, most messages first. */
export function speakerOptions(items: MediaItem[]): Option[] {
  const counts = new Map<string, Option>();
  for (const item of items) {
    const key = speakerKey(item.speaker);
    const label = plainName(item.speaker);
    const entry = counts.get(key) ?? { key, label, count: 0 };
    entry.count += 1;
    if (label.length > entry.label.length) entry.label = label;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function seriesOptions(items: MediaItem[]): Option[] {
  const counts = new Map<string, Option>();
  for (const item of items) {
    if (!item.series) continue;
    const entry = counts.get(item.series.id) ?? {
      key: item.series.id,
      label: item.series.title,
      count: 0,
    };
    entry.count += 1;
    counts.set(item.series.id, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function conferenceOptions(items: MediaItem[]): Option[] {
  const counts = new Map<number, number>();
  for (const item of items) {
    if (item.conference) counts.set(item.conference, (counts.get(item.conference) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([edition, count]) => ({ key: String(edition), label: conferenceLabel(edition), count }));
}

export function categoryCounts(items: MediaItem[]): Record<Category, number> {
  const counts: Record<Category, number> = { sunday: 0, conference: 0, special: 0 };
  for (const item of items) counts[item.category] += 1;
  return counts;
}

/** "Today", "3 days ago", "2 weeks ago", "5 months ago", "1 year ago" — as on YouTube. */
export function timeAgo(isoDate: string, now: Date): string {
  const days = Math.floor(
    (now.getTime() - new Date(`${isoDate}T12:00:00Z`).getTime()) / 86_400_000,
  );
  if (days <= 0) return 'Today';
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'} ago`;
  if (days < 7) return unit(days, 'day');
  if (days < 30) return unit(Math.floor(days / 7), 'week');
  if (days < 365) return unit(Math.floor(days / 30), 'month');
  return unit(Math.floor(days / 365), 'year');
}

/** "Bro Johnson John" → "JJ"; "Ali F." → "AF". */
export function initials(speaker: string) {
  const words = plainName(speaker)
    .replace(/[^A-Za-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

const AVATAR_TONES = ['bg-chapel', 'bg-pew', 'bg-gold-ink', 'bg-chapel-mid', 'bg-ink-soft'];

/** A stable colour for each speaker's avatar, from the chapel palette. */
export function avatarTone(speaker: string) {
  let hash = 0;
  for (const char of speakerKey(speaker)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length] ?? 'bg-chapel';
}

/** Filters ⇄ URL search params, so any view of the library can be shared or bookmarked. */
export function filtersFromParams(params: URLSearchParams): Filters {
  const category = params.get('category');
  const sort = params.get('sort');
  return {
    query: params.get('q') ?? '',
    category: category && category in CATEGORY_LABELS ? (category as Category) : 'all',
    series: params.get('series') ?? '',
    conference: params.get('conference') ?? '',
    speaker: params.get('speaker') ?? '',
    sort: sort && sort in SORT_LABELS ? (sort as Sort) : 'newest',
  };
}

export function filtersToParams(filters: Filters, params: URLSearchParams) {
  const set = (key: string, value: string, fallback: string) =>
    value && value !== fallback ? params.set(key, value) : params.delete(key);
  set('q', filters.query.trim(), '');
  set('category', filters.category, 'all');
  set('series', filters.series, '');
  set('conference', filters.conference, '');
  set('speaker', filters.speaker, '');
  set('sort', filters.sort, 'newest');
}
