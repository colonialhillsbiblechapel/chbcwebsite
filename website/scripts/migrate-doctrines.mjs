#!/usr/bin/env node
/**
 * Moves the Statement of Doctrines & Practices from the old site's doctrines-practices-page.html
 * into Markdown: the Declaration of Faith introduction in src/content/pages/doctrines.md and one
 * file per topic in src/content/doctrines/<old anchor>.md, with each subsection as a ### heading.
 *
 * Every paragraph is copied exactly as written — nothing is corrected or reworded — and each topic
 * keeps its old anchor (#scripture, #god, …) so links to the old page still land in the right place.
 * Re-run it before launch if the old page changes (existing files are overwritten).
 *
 * Usage: node scripts/migrate-doctrines.mjs [path/to/doctrines-practices-page.html]
 *        (default: doctrines-practices-page.html on the master branch of this repository)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const OUT = 'src/content/doctrines';
const html = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : execFileSync('git', ['show', 'master:doctrines-practices-page.html'], { encoding: 'utf8' });

const text = (fragment = '') =>
  fragment
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const paragraphs = (fragment = '') =>
  [...fragment.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(([, p]) => text(p));

/** Keeps Markdown from reading plain text as formatting (a leading "1." or "-" and so on). */
const markdown = (line) =>
  line
    .replace(/[\\`*_<]/g, '\\$&')
    .replace(/^(\d+)\. /, '$1\\. ')
    .replace(/^([#>+-]) /, '\\$1 ');

const yaml = (value) => JSON.stringify(value);

// The Declaration of Faith introduction (its "Topics Covered" list is the page's own contents).
const intro = html.match(/<section id="introduction"[\s\S]*?<\/section>/)?.[0] ?? '';
const introText =
  intro.match(
    /<div class="intro-card intro-text">([\s\S]*?)<div class="intro-card intro-topics">/,
  )?.[1] ?? '';
const [before, after] = introText.split(/<div class="intro-quote">[\s\S]*?<\/div>/);
const quote = text(introText.match(/<div class="intro-quote">([\s\S]*?)<\/div>/)?.[1]);
writeFileSync(
  'src/content/pages/doctrines.md',
  [
    `---\ntitle: ${yaml(text(intro.match(/<h2 class="intro-title">([\s\S]*?)<\/h2>/)?.[1]))}\n---`,
    ...paragraphs(before).map(markdown),
    `> ${markdown(quote)}`,
    ...paragraphs(after).map(markdown),
  ].join('\n\n') + '\n',
);

// One file per topic, in page order.
mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(OUT)) rmSync(`${OUT}/${file}`);
const sections = [
  ...html.matchAll(/<section id="([^"]+)" class="doctrine-section">([\s\S]*?)<\/section>/g),
];
let subsectionCount = 0;
sections.forEach(([, id, body], index) => {
  const title = text(body.match(/<h2 class="section-title">([\s\S]*?)<\/h2>/)?.[1]);
  const opening = body.match(
    /<div class="rich-content">\s*<div class="prose">([\s\S]*?)<\/div>/,
  )?.[1];
  const subsections = [
    ...body.matchAll(
      /<h3 class="subsection-title">([\s\S]*?)<\/h3>\s*<div class="note-card prose">([\s\S]*?)<\/div>/g,
    ),
  ].map(([, heading, content]) => [
    `### ${markdown(text(heading))}`,
    ...paragraphs(content).map(markdown),
  ]);
  subsectionCount += subsections.length;
  writeFileSync(
    `${OUT}/${id}.md`,
    [
      `---\ntitle: ${yaml(title)}\norder: ${index + 1}\n---`,
      ...paragraphs(opening).map(markdown),
      ...subsections.flat(),
    ].join('\n\n') + '\n',
  );
});

console.log(
  `Wrote the introduction and ${sections.length} topics with ${subsectionCount} subsections.`,
);
