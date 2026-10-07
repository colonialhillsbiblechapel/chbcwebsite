#!/usr/bin/env node
/**
 * Fails the build if any page would make the browser contact a third-party server on load
 * (stylesheets, scripts, fonts, images, iframes, media, preloads, CSS url()/@import).
 * Ordinary <a href> links to other sites are fine — they only load when a visitor clicks.
 *
 * Usage: node scripts/check-third-party.mjs [distDir]
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const OWN_ORIGIN = 'https://colonialhills-biblechapel.com';

// Resource-loading attributes per tag (anything here is fetched automatically by the browser).
const LOADING_ATTRS = {
  script: ['src'],
  img: ['src', 'srcset'],
  source: ['src', 'srcset'],
  video: ['src', 'poster'],
  audio: ['src'],
  track: ['src'],
  iframe: ['src'],
  embed: ['src'],
  object: ['data'],
  input: ['src'],
};
const LOADING_LINK_RELS =
  /\b(stylesheet|preload|modulepreload|prefetch|preconnect|dns-prefetch|icon|apple-touch-icon|manifest)\b/i;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const isExternal = (url) => {
  const u = url.trim();
  if (/^(data:|blob:|#|\/(?!\/))/i.test(u) || !/^([a-z]+:)?\/\//i.test(u)) return false;
  return !u.startsWith(OWN_ORIGIN);
};
const urlsIn = (value) => value.split(',').map((part) => part.trim().split(/\s+/)[0] ?? '');

const problems = [];
const report = (file, what, url) => problems.push(`${file}: ${what} → ${url}`);

function checkCss(file, css) {
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi))
    if (isExternal(m[1])) report(file, 'CSS url()', m[1]);
  for (const m of css.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/gi))
    if (isExternal(m[1])) report(file, 'CSS @import', m[1]);
}

for await (const file of walk(DIST)) {
  const ext = extname(file);
  if (ext === '.html') {
    const html = await readFile(file, 'utf8');
    for (const tag of html.matchAll(/<([a-z]+)\b([^>]*)>/gi)) {
      const name = tag[1].toLowerCase();
      const attrs = tag[2];
      const attr = (n) =>
        attrs
          .match(new RegExp(`\\s${n}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
          ?.slice(2)
          .find(Boolean);
      if (name === 'link') {
        const rel = attr('rel') ?? '';
        const href = attr('href');
        if (href && LOADING_LINK_RELS.test(rel) && isExternal(href))
          report(file, `<link rel="${rel}">`, href);
      }
      for (const a of LOADING_ATTRS[name] ?? []) {
        const v = attr(a);
        if (v)
          for (const url of urlsIn(v)) if (isExternal(url)) report(file, `<${name} ${a}>`, url);
      }
      const style = attr('style');
      if (style) checkCss(file, style);
    }
    for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) checkCss(file, m[1]);
  } else if (ext === '.css') {
    checkCss(file, await readFile(file, 'utf8'));
  } else if (ext === '.js' || ext === '.mjs') {
    const js = await readFile(file, 'utf8');
    for (const m of js.matchAll(
      /\bimport\s*(?:[\w{}*\s,]+from\s*)?\(?\s*['"`](https?:\/\/[^'"`]+)['"`]/g,
    ))
      report(file, 'JS import', m[1]);
  }
}

if (problems.length) {
  console.error(
    `✗ ${problems.length} third-party request(s) on page load:\n  ${problems.join('\n  ')}`,
  );
  process.exit(1);
}
console.log(
  '✓ No third-party requests on page load — every resource is served from our own domain.',
);
