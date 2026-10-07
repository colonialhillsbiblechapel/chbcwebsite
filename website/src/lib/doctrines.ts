/**
 * Reads a doctrines Markdown file (src/content/doctrines) into blocks for the reading page. The
 * files hold only paragraphs, "### " subsection headings and "> " quotations, so this small reader
 * keeps every word exactly as written while giving the page full control of the markup:
 *
 * - each subsection gets an id prefixed with its topic, so it can be linked to
 *   (/doctrines/#scripture-authority-of-scripture) without clashing across topics;
 * - Bible references in parentheses — "(2 Peter 1:20–21)" — are marked so they can be set more
 *   quietly than the sentences they support.
 */

export type Block =
  { kind: 'p' | 'quote'; text: string } | { kind: 'h3'; text: string; id: string };

/** "(Matthew 5:18–19)", "(see 1 Corinthians 11:2–16; Acts 2:42)", "(Leviticus 26)" */
const REFERENCE =
  /\((?:see |cf\. |also )?(?:[1-3] )?[A-Z][a-z]+(?: of [A-Z][a-z]+)? \d+[\dA-Za-z :;,.–-]*\)/g;

/** Undoes the backslash escapes the migration adds so plain text isn't read as formatting. */
const unescape = (text: string) => text.replace(/\\([\\`*_<#>+.-])/g, '$1');

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function readDoctrine(body: string, topic?: string): Block[] {
  const used = new Set<string>();
  return body
    .split(/\n\s*\n/)
    .map((chunk) => chunk.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .map((chunk): Block => {
      if (chunk.startsWith('### ')) {
        const text = unescape(chunk.slice(4));
        const base = `${topic ?? 'doctrines'}-${slug(text)}`;
        let id = base;
        for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
        used.add(id);
        return { kind: 'h3', text, id };
      }
      if (chunk.startsWith('> ')) return { kind: 'quote', text: unescape(chunk.slice(2)) };
      return { kind: 'p', text: unescape(chunk) };
    });
}

/** Splits a sentence into plain runs and Bible references, in order. */
export function withReferences(text: string) {
  const parts: { text: string; reference: boolean }[] = [];
  let last = 0;
  for (const match of text.matchAll(REFERENCE)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), reference: false });
    parts.push({ text: match[0], reference: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), reference: false });
  return parts;
}
