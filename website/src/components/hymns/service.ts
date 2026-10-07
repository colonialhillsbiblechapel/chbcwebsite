/**
 * The service list (the hymns chosen for a meeting, in order), kept on this device only. Only hymnal and number are stored — never any hymn text.
 */
import type { Hymn, Hymnal, HymnIndexData } from './vault';

export interface ServiceItem {
  book: string;
  number: string;
}

export interface Chosen {
  hymn: Hymn;
  book: Hymnal;
}

const SERVICE_KEY = 'chbc-hymns-service';

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing: the list simply isn't kept.
  }
}

export function loadService(): ServiceItem[] {
  try {
    const items = JSON.parse(read(SERVICE_KEY) ?? '[]') as unknown;
    return Array.isArray(items)
      ? items.filter(
          (i): i is ServiceItem => typeof i?.book === 'string' && typeof i?.number === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

export const saveService = (items: ServiceItem[]) => write(SERVICE_KEY, JSON.stringify(items));

/**
 * The tune's name, or nothing when the hymnal gives none — it then prints the first line in
 * brackets ("[Would you be free…]"), which would only repeat the title.
 */
export const tuneName = (tune: string) => (/^\[.*\]$/.test(tune.trim()) ? '' : tune.trim());

export const sameItem = (a: ServiceItem, b: ServiceItem) =>
  a.book === b.book && a.number === b.number;

/** Looks the chosen numbers up in the index (skipping any that no longer exist). */
export function resolve(items: ServiceItem[], data: HymnIndexData): Chosen[] {
  return items.flatMap((item) => {
    const book = data.books.find((b) => b.id === item.book);
    const hymn = book?.hymns.find((h) => h.number === item.number);
    return book && hymn ? [{ book, hymn }] : [];
  });
}
