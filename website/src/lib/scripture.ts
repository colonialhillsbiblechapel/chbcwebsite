/**
 * Bible translations quoted on the site and the copyright notice each publisher requires.
 * Every quote carries its translation; pages pass the translations they quote to the layout,
 * and the footer prints the matching notices automatically.
 */

export type Translation = 'KJV' | 'NKJV' | 'NASB1995';

interface TranslationInfo {
  abbr: string;
  name: string;
  /** Required notice when quoting on a website, or null when in the public domain (US). */
  notice: string | null;
  link?: { href: string; label: string };
}

export const translations: Record<Translation, TranslationInfo> = {
  KJV: {
    abbr: 'KJV',
    name: 'King James Version',
    notice: null,
  },
  NKJV: {
    abbr: 'NKJV',
    name: 'New King James Version',
    notice:
      'Scripture taken from the New King James Version®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.',
  },
  NASB1995: {
    abbr: 'NASB',
    name: 'New American Standard Bible (1995)',
    notice:
      'Scripture taken from the NEW AMERICAN STANDARD BIBLE®, Copyright © 1960, 1962, 1963, 1968, 1971, 1972, 1973, 1975, 1977, 1995 by The Lockman Foundation. Used by permission.',
    link: { href: 'https://www.lockman.org', label: 'www.Lockman.org' },
  },
};

/** Notices to print for a set of quoted translations (public-domain ones are skipped). */
export function noticesFor(used: Iterable<Translation>) {
  return [...new Set(used)].map((t) => translations[t]).filter((t) => t.notice !== null);
}
