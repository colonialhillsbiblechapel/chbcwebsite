// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Unicode range of the self-hosted Latin subset (from the Fontsource build of each OFL font).
// Covers English plus Western European accents, curly quotes, dashes, ©, ® and ™.
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'.split(
    ',',
  ) as [string, ...string[]];

/**
 * Builds the @font-face variants (normal + italic, Latin subset) for a
 * variable font whose files live in src/assets/fonts/<slug>/.
 */
function localVariableFont(slug: string, weight: string) {
  const variant = (style: 'normal' | 'italic') => ({
    src: [`./src/assets/fonts/${slug}/${slug}-latin-wght-${style}.woff2`] as [string],
    weight,
    style,
    unicodeRange: LATIN,
  });
  return {
    variants: [variant('normal'), variant('italic')] as [
      ReturnType<typeof variant>,
      ...ReturnType<typeof variant>[],
    ],
  };
}

export default defineConfig({
  site: 'https://colonialhills-biblechapel.com',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  // No code blocks on this site; Shiki's inline styles would also conflict with the CSP.
  markdown: { syntaxHighlight: false },
  integrations: [preact(), sitemap({ filter: (page) => !/\/(404|styleguide|hymns)\//.test(page) })],
  // Every font is a committed WOFF2 file (SIL OFL 1.1, licenses in public/licenses/fonts).
  // Nothing is ever requested from Google Fonts or any other third party.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-cormorant',
      fallbacks: ['Times New Roman', 'serif'],
      options: localVariableFont('cormorant-garamond', '300 700'),
    },
    {
      provider: fontProviders.local(),
      name: 'EB Garamond',
      cssVariable: '--font-ebgaramond',
      fallbacks: ['Times New Roman', 'serif'],
      options: localVariableFont('eb-garamond', '400 800'),
    },
    {
      // Interface type for the media library (titles, chips, details).
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-inter',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/inter/inter-latin-wght-normal.woff2'],
            weight: '100 900',
            style: 'normal',
            unicodeRange: LATIN,
          },
        ],
      },
    },
  ],
  image: {
    // Thumbnails of the church's own YouTube videos are downloaded at build time and served from
    // this site, so visitors never contact YouTube while browsing.
    remotePatterns: [{ protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' }],
    layout: 'constrained',
    // Sizing is done with Tailwind classes on each image (Astro's global styles would sit outside
    // Tailwind's cascade layers and override them).
    responsiveStyles: false,
  },
  prefetch: {
    defaultStrategy: 'hover',
  },
  security: {
    // Emitted as a <meta> CSP on every page at build time (GitHub Pages can't send headers).
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        // The only third party: YouTube's privacy-enhanced player, inserted after a click.
        'frame-src https://www.youtube-nocookie.com',
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
        'upgrade-insecure-requests',
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Lists every npm package bundled into browser JS, with its license text.
      license: { fileName: 'third-party-licenses.json' },
    },
  },
});
