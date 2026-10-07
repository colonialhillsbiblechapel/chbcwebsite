#!/usr/bin/env node
/**
 * Seals the hymns for the website: private/hymns.json → public/hymns/vault.json (the index) and
 * private/lyrics/<book>.json → public/hymns/lyrics-<book>.json (the words, one file per hymnal,
 * opened only when that hymnal is used), and private/choruses/sunday.json → lyrics-sunday.json (the
 * Sunday welcome slides and choruses). A hymnal's backgrounds — each hymn's name, verse and
 * picture recipe, from private/scenes/<book>.json (scripts/scenes.mjs) — are sealed with its words.
 *
 * Each file is compressed and encrypted with the same fresh random 256-bit key (AES-256-GCM). That key is
 * then locked with each access key (PBKDF2-SHA-256, 600,000 rounds, random salt — the OWASP 2023
 * setting) and stored as one "slot" per key. Only the sealed file is published or committed:
 * without an access key it is unreadable noise, to people and to bots alike.
 *
 * Access keys are read from HYMNS_PASSWORD in website/.env (never committed): one key, or several
 * separated by commas or new lines — e.g. the chapel's email address, or a list of members' emails.
 * Keys are not case-sensitive and spaces around them are ignored, as with email addresses.
 * Every run makes a new key, so re-sealing also signs out every device that chose "Remember".
 *
 * Usage: node scripts/seal-hymns.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const { subtle } = globalThis.crypto;
const ITERATIONS = 600_000;
/** Ties the ciphertext to this purpose, so it can't be swapped with another sealed file. */
const CONTEXT = new TextEncoder().encode('chbc-hymns-v1');

if (existsSync('.env')) process.loadEnvFile('.env');
/** Same as the page does before unlocking: trimmed, lowercase. */
const normalize = (key) => key.trim().toLowerCase();
const keys = [
  ...new Set((process.env.HYMNS_PASSWORD ?? '').split(/[,\n]/).map(normalize).filter(Boolean)),
];
if (keys.length === 0) {
  console.error('Set HYMNS_PASSWORD (in website/.env) to seal the hymn index.');
  process.exit(1);
}

const b64 = (bytes) => Buffer.from(bytes).toString('base64');
const random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

// 1. Encrypt the index and the words with a new content key. Each file is bound to its own name,
//    so one sealed file can't be passed off as another.
const contentKey = random(32);
const dataKey = await subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']);
async function encrypt(content, context) {
  const iv = random(12);
  const plain = gzipSync(content);
  const data = await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) },
    dataKey,
    plain,
  );
  return { iv: b64(iv), data: b64(data), size: plain.length };
}
const index = await encrypt(readFileSync('private/hymns.json'), 'chbc-hymns-v1');

// 2. Lock the content key with each access key. One salt per sealing, so the page derives a key
//    once and then tries the slots (a fast check), however many keys there are.
const salt = random(16);
const slots = [];
for (const key of keys) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(key), 'PBKDF2', false, [
    'deriveKey',
  ]);
  const lockKey = await subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const slotIv = random(12);
  const wrapped = await subtle.encrypt(
    { name: 'AES-GCM', iv: slotIv, additionalData: CONTEXT },
    lockKey,
    contentKey,
  );
  slots.push({ iv: b64(slotIv), key: b64(wrapped) });
}
// Shuffle (Fisher–Yates) so the order of the slots says nothing about the order of the keys.
for (let i = slots.length - 1; i > 0; i--) {
  const j = globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
  [slots[i], slots[j]] = [slots[j], slots[i]];
}

const sealed = {
  v: 2,
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: b64(salt) },
  slots,
  iv: index.iv,
  data: index.data,
};
mkdirSync('public/hymns', { recursive: true });
writeFileSync('public/hymns/vault.json', `${JSON.stringify(sealed)}\n`);
console.log(
  `✓ Sealed the hymn index (${Math.round(index.size / 1024)} KB compressed) for ${keys.length} access ${keys.length === 1 ? 'key' : 'keys'} into public/hymns/vault.json.`,
);

const { books } = JSON.parse(readFileSync('private/hymns.json', 'utf8'));
for (const { id } of books) {
  const book = JSON.parse(readFileSync(`private/lyrics/${id}.json`, 'utf8'));
  const scenesFile = `private/scenes/${id}.json`;
  const scenes = existsSync(scenesFile)
    ? new Map(JSON.parse(readFileSync(scenesFile, 'utf8')).hymns.map((s) => [s.number, s]))
    : new Map();
  for (const hymn of book.hymns) {
    const found = scenes.get(hymn.number);
    if (found) {
      hymn.background = { ...found, number: undefined };
    }
  }
  const words = await encrypt(JSON.stringify(book), `chbc-hymns-v1:lyrics:${id}`);
  writeFileSync(
    `public/hymns/lyrics-${id}.json`,
    `${JSON.stringify({ v: 2, iv: words.iv, data: words.data })}\n`,
  );
  console.log(
    `✓ Sealed the words${scenes.size ? ` and ${scenes.size} backgrounds` : ''} (${Math.round(words.size / 1024)} KB compressed) into public/hymns/lyrics-${id}.json.`,
  );
}

// The Sunday welcome slides: the welcome deck's songs and the choruses (scripts/sunday.mjs).
if (existsSync('private/choruses/sunday.json')) {
  const sunday = await encrypt(
    readFileSync('private/choruses/sunday.json'),
    'chbc-hymns-v1:lyrics:sunday',
  );
  writeFileSync(
    'public/hymns/lyrics-sunday.json',
    `${JSON.stringify({ v: 2, iv: sunday.iv, data: sunday.data })}\n`,
  );
  console.log(
    `✓ Sealed the Sunday welcome and choruses (${Math.round(sunday.size / 1024)} KB compressed) into public/hymns/lyrics-sunday.json.`,
  );
}
