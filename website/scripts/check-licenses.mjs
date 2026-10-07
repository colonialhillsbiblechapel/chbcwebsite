#!/usr/bin/env node
/**
 * Reads the list of npm packages bundled into browser JavaScript (written by Vite's
 * `build.license` option to dist/third-party-licenses.json), fails on any license that is
 * not permissive, and writes a human-readable dist/THIRD-PARTY-NOTICES.txt for the site.
 *
 * Usage: node scripts/check-licenses.mjs [distDir]
 */
import { readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const JSON_FILE = join(DIST, 'third-party-licenses.json');
const ALLOWED = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'Unlicense',
]);

/** Assets that are inlined or self-hosted rather than bundled from npm, so Vite can't see them. */
const EXTRA = [
  {
    name: 'Cormorant Garamond, EB Garamond and Inter typefaces',
    identifier: 'OFL-1.1',
    text: 'Licensed under the SIL Open Font License, Version 1.1. Full license texts: /licenses/fonts/cormorant-garamond-OFL.txt, /licenses/fonts/eb-garamond-OFL.txt and /licenses/fonts/inter-OFL.txt',
  },
  {
    name: 'Phosphor Icons (light weight), copied into src/assets/icons',
    identifier: 'MIT',
    text: 'Copyright (c) 2023 Phosphor Icons. Licensed under the MIT License. Full license text: /licenses/icons/phosphor-LICENSE.txt',
  },
];

let bundled = [];
try {
  bundled = JSON.parse(await readFile(JSON_FILE, 'utf8'));
} catch {
  console.log('• No bundled npm packages found (no browser JavaScript from npm).');
}

const bad = bundled.filter(
  (p) =>
    !p.identifier ||
    !p.identifier.split(/\s+OR\s+/i).some((id) => ALLOWED.has(id.replace(/[()]/g, ''))),
);
if (bad.length) {
  console.error(
    `✗ Non-permissive or unknown licenses in browser bundles:\n  ${bad.map((p) => `${p.name}@${p.version}: ${p.identifier ?? 'UNKNOWN'}`).join('\n  ')}`,
  );
  process.exit(1);
}

const entries = [...bundled.map((p) => ({ ...p, name: `${p.name}@${p.version}` })), ...EXTRA];
const notices = [
  'THIRD-PARTY NOTICES — colonialhills-biblechapel.com',
  'This website includes the following third-party software and assets.',
  '',
  ...entries.flatMap((p) => [
    '='.repeat(72),
    `${p.name} — ${p.identifier}`,
    '='.repeat(72),
    (p.text ?? '').trim(),
    '',
  ]),
].join('\n');

await writeFile(join(DIST, 'THIRD-PARTY-NOTICES.txt'), notices);
await rm(JSON_FILE, { force: true });
console.log(
  `✓ ${bundled.length} bundled package(s), all permissively licensed. Wrote ${join(DIST, 'THIRD-PARTY-NOTICES.txt')}.`,
);
