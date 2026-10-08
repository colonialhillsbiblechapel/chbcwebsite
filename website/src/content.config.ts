import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { FEED_URL, parseFeed } from './lib/youtube-feed';
import { ICONS } from './config/icons';
import { youtubeId } from './lib/youtube-id';

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM, e.g. 09:30 or 19:00');
const day = z.coerce.date(); // YYYY-MM-DD in the YAML; read as a calendar day (UTC midnight)
const translation = z.enum(['KJV', 'NKJV', 'NASB1995']);

/** Empty, as the admin panel saves a box left blank: '' or null, or an object of blanks. */
const isBlank = (value: unknown): boolean =>
  value === '' ||
  value === null ||
  (typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    Object.values(value).every(isBlank));
/** An optional field: left blank (in the admin panel) means not given. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (isBlank(value) ? undefined : value), schema.optional());

/** Church-wide details (one file: settings/site.yaml). Editable in the admin panel. */
const settings = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/settings' }),
  schema: z.object({
    name: z.string(),
    shortName: z.string(),
    tagline: z.string(),
    description: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      region: z.string(),
      postalCode: z.string(),
    }),
    phone: z.string(),
    email: z.email(),
    footerVerse: z.object({
      text: z.string(),
      reference: z.string(),
      translation,
    }),
    geo: z.object({ latitude: z.number(), longitude: z.number() }),
    /** How the church appears in search engines (titles, descriptions, keywords). */
    seo: z.object({
      homeTitle: z.string().max(65),
      homeDescription: z.string().min(50).max(160),
      keywords: z.array(z.string()).min(1),
    }),
  }),
});

/** Regular weekly meetings, one file per day. Feeds the homepage, About page, footer and SEO data. */
const meetings = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/meetings' }),
  schema: z.object({
    day: z.string(),
    label: z.string(),
    order: z.number().int(),
    /** Held online (via WebEx) instead of at the chapel. */
    online: z.boolean().default(false),
    groups: z
      .array(
        z.object({
          heading: optional(z.string()),
          /** Held only on this week of the month (e.g. 2 = the second Saturday) instead of weekly. */
          monthlyWeek: optional(z.number().int().min(1).max(5)),
          items: z
            .array(
              z.object({
                start: time,
                end: optional(time),
                title: z.string(),
                /** Show this meeting in the footer's short list of service times. */
                inFooter: z.boolean().default(false),
                footerLabel: optional(z.string()),
              }),
            )
            .min(1),
        }),
      )
      .min(1),
  }),
});

/** Special events, one file per event. Past events drop off the site automatically. */
const events = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    date: day,
    endDate: optional(day),
    start: optional(time),
    end: optional(time),
    location: optional(z.string()),
    summary: optional(z.string()),
  }),
});

/** A series of messages (e.g. “Light from the Word”). `credit` marks videos from another channel. */
const series = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/series' }),
  schema: z.object({
    title: z.string(),
    credit: optional(z.object({ name: z.string(), url: z.url() })),
  }),
});

/**
 * Recorded messages, one file per video. A message's ID is its YouTube video ID: from its
 * `youtube` link (as added in the admin panel), or else its file name (the older files).
 */
const sermons = defineCollection({
  loader: glob({
    pattern: '*.yaml',
    base: './src/content/sermons',
    generateId: ({ entry, data }) => youtubeId(data.youtube) ?? entry.replace(/\.yaml$/, ''),
  }),
  schema: z
    .object({
      /** The video's YouTube link (or ID). */
      youtube: optional(
        z.string().refine((link) => youtubeId(link), 'Paste the link to the video on YouTube'),
      ),
      title: z.string(),
      speaker: z.string(),
      date: optional(day),
      /** When only the year is known. */
      year: optional(z.number().int()),
      category: z.enum(['sunday', 'conference', 'special']),
      series: optional(reference('series')),
      episode: optional(z.number().int().positive()),
      /** Houston Bible Conference edition, e.g. 105. */
      conference: optional(z.number().int()),
      description: optional(z.string()),
      slides: optional(z.url()),
    })
    .refine((s) => s.date || s.year || s.series, {
      message: 'Give the date of the message (or at least its year, or its series)',
    }),
});

/**
 * New messages from the church YouTube channel's public feed, read at build time (the nightly
 * rebuild picks up new uploads). A file in src/content/sermons with the same ID takes precedence.
 * If YouTube can't be reached the build continues with the messages already on file.
 */
const uploads = defineCollection({
  loader: {
    name: 'youtube-uploads',
    load: async ({ store, parseData, logger }) => {
      let xml: string;
      try {
        const response = await fetch(FEED_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        xml = await response.text();
      } catch (error) {
        logger.warn(
          `Could not read the YouTube feed (${String(error)}); using saved messages only.`,
        );
        return;
      }
      store.clear();
      for (const { id, ...upload } of parseFeed(xml)) {
        store.set({ id, data: await parseData({ id, data: upload }) });
      }
    },
  },
  schema: z.object({
    title: z.string(),
    speaker: z.string(),
    date: day,
    category: z.enum(['sunday', 'conference', 'special']),
    conference: z.number().int().optional(),
    description: z.string().optional(),
  }),
});

/** YouTube videos to leave off the website (e.g. full conference live streams). */
const hiddenVideos = defineCollection({
  loader: file('src/content/hidden-videos.yaml'),
  schema: z.object({ note: z.string() }),
});

/** Long-form page text kept exactly as approved (welcome, history, gospel). The body is Markdown. */
const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
  }),
});

/**
 * The Statement of Doctrines & Practices, one Markdown file per topic, kept exactly as approved.
 * The file name is the topic's anchor on the page (scripture.md → /doctrines/#scripture), and each
 * subsection is a ### heading. The introduction is src/content/pages/doctrines.md.
 */
const doctrines = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/doctrines' }),
  schema: z.object({
    title: z.string(),
    order: z.number().int().positive(),
  }),
});

/** "What we believe" on the About page, one file per statement. */
const beliefs = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/beliefs' }),
  schema: z.object({
    order: z.number().int(),
    statement: z.string(),
    references: z.array(z.string()).min(1),
  }),
});

/** Missionaries and workers on the Ministries page, one Markdown file each (the body is the bio). */
const missionaries = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/missionaries' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string(),
      order: z.number().int(),
      /** Serving the Lord here in the Houston area. */
      local: z.boolean().default(false),
      photo: image(),
      photoAlt: z.string(),
      website: optional(z.object({ label: z.string(), url: z.url() })),
    }),
});

/** Helpful resources, one file per category. */
const links = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/links' }),
  schema: z.object({
    order: z.number().int(),
    title: z.string(),
    /** Shown beside the category title (see src/config/icons.ts for the choices). */
    icon: z.enum(ICONS),
    links: z
      .array(
        z.object({ label: z.string(), description: z.string(), url: z.url(), icon: z.enum(ICONS) }),
      )
      .min(1),
  }),
});

export const collections = {
  settings,
  meetings,
  events,
  series,
  sermons,
  uploads,
  hiddenVideos,
  pages,
  doctrines,
  beliefs,
  missionaries,
  links,
};
