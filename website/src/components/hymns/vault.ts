/**
 * Opens the sealed hymns (public/hymns/vault.json and lyrics-<book>.json, made by
 * scripts/seal-hymns.mjs) in the browser with the Web Crypto API. Nothing is sent anywhere: the
 * password only ever unlocks the files on this device.
 */
import type { Scene } from './art/scene.ts';

export interface Hymn {
  number: string;
  title: string;
  tune: string;
}

export interface Hymnal {
  id: string;
  title: string;
  book: string;
  cover: string;
  verse: { text: string; reference: string };
  hymns: Hymn[];
}

export interface HymnIndexData {
  books: Hymnal[];
}

/**
 * The words of one hymn, divided into slides by hand the way the chapel sings it (verses in order,
 * each refrain where it is sung). A verse on two slides has the same number on both.
 */
export interface Words {
  number: string;
  author?: string;
  copyright?: string;
  note?: string;
  slides: { kind: 'verse' | 'refrain'; verse?: number; lines: string[] }[];
  /** The hymn's background for the screen in the chapel, if it has one (scripts/scenes.mjs). */
  background?: Background;
}

export interface Background {
  /** The hymn's well-known name, shown on the title slide in place of its first line. */
  name?: string;
  /** A fitting verse, quoted word for word from the King James Version. */
  verse?: { ref: string; quote: string };
  /** What its watercolour picture is painted from (art/scene.ts). */
  scene: Scene;
}

/** A chorus for the Sunday welcome, as slides in the order it is sung (scripts/sunday.mjs). */
export interface Chorus {
  number: number;
  title: string;
  credits: string[];
  slides: { label: string; lines: string[] }[];
}

/** A fixed song of the welcome deck: our welcome song, the birthday and the anniversary song. */
interface ProgramSong {
  id: 'welcome' | 'birthday' | 'anniversary';
  eyebrow: string;
  title: string;
  /** Word for word from the deck; an empty line divides two stanzas. */
  lines: string[];
}

/** The words of the Sunday welcome slides, sealed with the hymns. */
export interface Sunday {
  program: { chorus: { eyebrow: string }; songs: ProgramSong[] };
  choruses: Chorus[];
}

interface Sealed {
  v: 2;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  /** The content key, locked once for each access key. */
  slots: { iv: string; key: string }[];
  iv: string;
  data: string;
}

const VAULT_URL = '/hymns/vault.json';
const CONTEXT = new TextEncoder().encode('chbc-hymns-v1');
const STORAGE_KEY = 'chbc-hymns-key';

/** A key or ciphertext as bytes (always backed by a plain ArrayBuffer, as Web Crypto expects). */
type Bytes = Uint8Array<ArrayBuffer>;
const bytes = (base64: string): Bytes => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
const base64 = (data: Uint8Array) => btoa(String.fromCharCode(...data));

let sealedFile: Promise<Sealed> | undefined;
/** Fetches the sealed file once (it is only ever ciphertext). */
export function fetchSealed() {
  sealedFile ??= fetch(VAULT_URL, { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('The hymn index could not be loaded.');
    return r.json() as Promise<Sealed>;
  });
  return sealedFile;
}

export class WrongPassword extends Error {}

/**
 * Tries an access key (a password or an email address — not case-sensitive, spaces ignored)
 * against the slots; returns the content key it unlocks.
 */
export async function unlock(accessKey: string): Promise<Bytes> {
  const sealed = await fetchSealed();
  const { salt, ...kdf } = sealed.kdf;
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(accessKey.trim().toLowerCase()),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const lockKey = await crypto.subtle.deriveKey(
    { ...kdf, salt: bytes(salt) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  for (const slot of sealed.slots) {
    try {
      const raw = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: bytes(slot.iv), additionalData: CONTEXT },
        lockKey,
        bytes(slot.key),
      );
      return new Uint8Array(raw);
    } catch {
      // Not this slot.
    }
  }
  throw new WrongPassword();
}

/** The key that opened the index, kept in memory so the words can be opened as they're needed. */
let openKey: CryptoKey | undefined;
const words = new Map<string, Promise<Map<string, Words>>>();

async function decrypt<T>(key: CryptoKey, file: { iv: string; data: string }, context: string) {
  const packed = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes(file.iv), additionalData: new TextEncoder().encode(context) },
    key,
    bytes(file.data),
  );
  const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text()) as T;
}

/** Decrypts and unpacks the index with a content key. */
export async function open(contentKey: Bytes): Promise<HymnIndexData> {
  const sealed = await fetchSealed();
  const key = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['decrypt']);
  const index = await decrypt<HymnIndexData>(key, sealed, 'chbc-hymns-v1');
  openKey = key;
  return index;
}

/** The words of every hymn in one hymnal, fetched and opened once (after the index is open). */
export function lyrics(bookId: string): Promise<Map<string, Words>> {
  let pending = words.get(bookId);
  if (!pending) {
    const key = openKey;
    if (!key) return Promise.reject(new Error('The hymns are locked.'));
    pending = fetch(`/hymns/lyrics-${bookId}.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('The words could not be loaded.');
        return r.json() as Promise<{ iv: string; data: string }>;
      })
      .then((file) => decrypt<{ hymns: Words[] }>(key, file, `chbc-hymns-v1:lyrics:${bookId}`))
      .then(({ hymns }) => new Map(hymns.map((h) => [h.number, h])));
    pending.catch(() => words.delete(bookId));
    words.set(bookId, pending);
  }
  return pending;
}

let sundayWords: Promise<Sunday> | undefined;
/** The Sunday welcome's songs and the choruses, fetched and opened once. */
export function sunday(): Promise<Sunday> {
  if (!sundayWords) {
    const key = openKey;
    if (!key) return Promise.reject(new Error('The hymns are locked.'));
    sundayWords = fetch('/hymns/lyrics-sunday.json', { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('The choruses could not be loaded.');
        return r.json() as Promise<{ iv: string; data: string }>;
      })
      .then((file) => decrypt<Sunday>(key, file, 'chbc-hymns-v1:lyrics:sunday'));
    sundayWords.catch(() => (sundayWords = undefined));
  }
  return sundayWords;
}

/* Keeping the page open: for this visit always, and on this device if the visitor asks. */

function storage(kind: 'local' | 'session') {
  try {
    return kind === 'local' ? localStorage : sessionStorage;
  } catch {
    return undefined;
  }
}

export function rememberKey(contentKey: Bytes, onDevice: boolean) {
  const value = base64(contentKey);
  storage('session')?.setItem(STORAGE_KEY, value);
  if (onDevice) storage('local')?.setItem(STORAGE_KEY, value);
}

export function rememberedKey(): Bytes | undefined {
  const value =
    storage('session')?.getItem(STORAGE_KEY) ?? storage('local')?.getItem(STORAGE_KEY) ?? null;
  try {
    return value ? bytes(value) : undefined;
  } catch {
    return undefined;
  }
}

export function forgetKey() {
  storage('session')?.removeItem(STORAGE_KEY);
  storage('local')?.removeItem(STORAGE_KEY);
  openKey = undefined;
  words.clear();
  sundayWords = undefined;
}
