# Colonial Hills Bible Chapel — website

The new church website, built with [Astro](https://astro.build) and Tailwind CSS and hosted on GitHub Pages.
It ships plain HTML and CSS, loads nothing from other servers, and is checked automatically for
accessibility, SEO, licensing and broken links before anything is published.

## Everyday commands

Run these inside `website/` (Node 22.12 or newer):

| Command          | What it does                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| `npm install`    | Install everything (once)                                                    |
| `npm run dev`    | Live preview at http://localhost:4321 — updates as you save                  |
| `npm run build`  | Production build into `dist/`, plus the third-party and license checks       |
| `npm run verify` | Everything CI runs: types, lint, dead-code check, build and end-to-end tests |
| `npm run format` | Tidy all code with Prettier                                                  |

## Where things live

| Path                             | Contents                                                               |
| -------------------------------- | ---------------------------------------------------------------------- |
| `src/content/settings/site.yaml` | Church name, address, phone, email, footer verse                       |
| `src/content/meetings/*.yaml`    | Weekly meeting times (homepage, footer and search data use these)      |
| `src/content/events/*.yaml`      | Special events — past ones drop off automatically                      |
| `src/content/sermons/*.yaml`     | Recorded messages (file name = YouTube video ID) — see below           |
| `src/content/series/*.yaml`      | Series such as “Light from the Word” (with channel credit if external) |
| `src/content/timeline.yaml`      | The history timeline on the About page                                 |
| `src/content/beliefs/*.yaml`     | “What we believe” on the About page                                    |
| `src/content/doctrines/*.md`     | Statement of Doctrines & Practices, one file per topic — see below     |
| `src/content/missionaries/*.md`  | Missionary profiles on the Ministries page (body = bio)                |
| `src/content/links/*.yaml`       | Link categories on the Resources page                                  |
| `src/pages/`                     | One file per page                                                      |
| `src/components/`                | Layout pieces (header, footer, SEO) and reusable design components     |
| `src/styles/global.css`          | Colors, fonts and design tokens                                        |
| `src/assets/`                    | Photos, emblem and the self-hosted fonts (optimized at build time)     |
| `public/`                        | Files served as-is: favicon, social image, documents, license texts    |
| `tests/`                         | End-to-end tests (Playwright + axe accessibility audits)               |
| `scripts/`                       | Build checks: no third-party requests, permissive licenses only        |

The style guide is at `/styleguide/` (not linked or indexed).

## What updates by itself

- **New messages:** every build reads the church YouTube channel’s public feed and adds new uploads to the
  media library and the homepage’s “Recent Messages” (speaker and date come from titles like
  “Bro Johnson John 09/27/2026” or “106th Annual Houston Bible Conference — Sunday Morning — Mark Kolchin”).
  The site rebuilds every night and on Sunday afternoon, so nothing needs to be done by hand.
- **Next gathering:** worked out in each visitor’s browser from the meeting times, in Houston time,
  including monthly meetings such as the second Saturday.
- **Upcoming events:** each event disappears after its day has passed.

To keep a video off the site (for example the full live-stream recording of a conference session
when the individual messages are posted), add its YouTube ID to `src/content/hidden-videos.yaml`.

## Adding or correcting a message

A file in `src/content/sermons/` always wins over the YouTube feed, so use one to correct a title or
category, add slides, or add an older message.

Create `src/content/sermons/<YouTube video ID>.yaml`, for example `src/content/sermons/VFV2cf6aDSU.yaml`:

```yaml
title: 'Bro Johnson John'
speaker: 'Bro Johnson John'
date: '2026-09-27'
category: 'sunday' # sunday | conference | special
description: 'Sunday message by Bro Johnson John' # optional
```

Optional fields: `series` (a file name from `src/content/series/`), `episode`, `conference` (edition, e.g. `106`),
`slides` (link). Then run `npm run thumbnails` to save the message’s thumbnail into
`src/assets/thumbnails/` (if you forget, the build fetches it from YouTube instead). Thumbnails are always
served from this site.
`node scripts/migrate-media.mjs` re-imports everything from the old site’s `media-page.html` on `master`.

## Doctrines & Practices

The statement is kept **word for word** as the elders approved it. Each topic is one Markdown file in
`src/content/doctrines/` — the file name is its link on the page (`church.md` → `/doctrines/#church`)
and `order` sets its place. Inside, paragraphs are separated by a blank line and each subsection
starts with `### `. The Declaration of Faith introduction is `src/content/pages/doctrines.md`.

The page adds only presentation: the topic list, reading progress, quieter Bible references and
a link for every subsection (`/doctrines/#church-reception`). A test checks that every word on the
page matches these files. `node scripts/migrate-doctrines.mjs` re-imports the text from the old
site’s `doctrines-practices-page.html` on `master`.

## Hymns (members only)

`/hymns/` holds both hymnals — the index and the words — behind a password. Nothing is published
readably: only sealed files are published and committed (`public/hymns/vault.json` for the index,
`public/hymns/lyrics-<book>.json` for the words; AES-256-GCM, with the key locked by the password
using PBKDF2-SHA-256, 600,000 rounds). The browser opens them locally once the right password is
entered. The pages are kept out of search engines (noindex, robots.txt, sitemap), and a test fails
the build if any first line, tune or line of the words ever appears in the published files.

- **On a phone:** choose a hymnal, tap a hymn to read it (larger or smaller text with A/A).
- **In the chapel:** tick hymns (the circle) to build the service list, put it in order, then
  **Present** (or a clicker's start button, F5). Each hymn shows a title slide, then its verses and
  refrains, like the chapel's PowerPoint decks. With a second screen connected (an extended
  display), Chrome and Edge open the slides full screen on it by themselves — the browser asks once
  to "manage windows on all your displays" — and this window becomes the presenter view: what's
  on, what's next and every slide. With one screen the slides fill it, and the controls appear
  only when the mouse moves. The keys are PowerPoint's, so every clicker works: → ↓ Page Down,
  Space, Enter or N for the next slide; ← ↑ Page Up, Backspace or P to go back; Home and End; a
  slide's number then Enter; Shift + → for the next hymn; **B** or **.** black, **W** or **,**
  white; Esc ends. A click goes on, a right click or the wheel goes back or on. The clicker works
  in either window, but (as for any web page) only while the browser is the program in front. Each hymn can have a background of its own, following its words: a soft
  watercolour scene in light colours, painted in the browser from a small recipe
  (`src/components/hymns/art/`). The title slide shows the hymn's name, a verse from the King James
  Version and who wrote it above the full scene; the words sit on clear paper above a low strip of
  it. Recipes, names and verses live in `private/scenes/`; `node scripts/scenes.mjs` checks every
  verse word for word against the KJV, finds verses, and draws contact sheets for review (`check`,
  `verse`, `find`, `used`, `render`, `merge`). They are sealed with the words by `seal-hymns.mjs`,
  since the names would tell which hymns are in the book.
- **Sunday welcome (on a computer):** on the hymnal shelf. Choose the welcome picture (by the time
  of day, with the date, or one of the chapel's welcome pictures) and the week's chorus — find it
  by its title or words, or present without one — then **Present**: the welcome, the chorus, our
  welcome song, and the birthday and anniversary songs, each on its own watercolour from the
  chapel's welcome deck. A chorus's words can be changed, or a chorus written, for this device
  only; **Clear** forgets it. The choruses come from the chapel's chorus PowerPoints, divided by
  hand and checked word for word against them (`private/choruses/`, see `CHORUSES.md` there);
  `node scripts/sunday.mjs` makes their slides (`private/choruses/sunday.json`), which
  `seal-hymns.mjs` seals into `public/hymns/lyrics-sunday.json`. The pictures in
  `public/hymns/welcome/` are made by `node scripts/welcome-art.mjs <folder>` from the deck and the
  4K welcome pictures.
- **Where the words come from:** `node scripts/migrate-hymns.mjs` copies the old site's hymns into
  `website/private/source/`. Each hymn was then divided into slides **by hand**, the way it is sung
  (a refrain added only where it was really missing); `node scripts/review-hymns.mjs` checks that
  not a word was changed and writes `website/private/lyrics/`. Reviewers' notes for the church are
  in `private/review/notes.md`.
- **Private files:** `website/private/` (the readable hymns) and `website/.env` (the password) are
  never committed. Keep a backup of `private/`. The password may be an email address (currently
  the chapel's), and several can be listed, separated by commas; they are not case-sensitive.
- **After changing the words or the password:** run `node scripts/seal-hymns.mjs` and commit the
  files in `public/hymns/`. A new password signs out every device that chose “Remember on this device”.

## Legal by design

- Fonts (Cormorant Garamond and EB Garamond, SIL Open Font License) are committed as files and served
  from this site — never Google Fonts. Their licenses are published at `/licenses/fonts/`.
- Photographs are the church's own; the page-top images for Gospel, Doctrines and Ministries were
  created with Adobe Firefly. Every image is listed in `src/config/photo-credits.ts` and on the
  Credits page.
- `THIRD-PARTY-NOTICES.txt` is generated on every build; the build fails on any non-permissive license.
- The build fails if any page would contact another server when it loads.
- Each Bible quotation is labelled with its translation, and the publisher's required notice appears in the footer.
