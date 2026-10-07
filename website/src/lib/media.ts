/**
 * The media library, prepared at build time: every recorded message with its thumbnail
 * (optimised and served from this site), ready for the browsing and playing island on /media/.
 */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import { longDate } from './dates';
import type { MediaItem, Thumbnail } from './media-shared';

const THUMBNAIL_SIZES = ['maxresdefault', 'sddefault', 'hqdefault'];

/** Thumbnails saved in the project by `npm run thumbnails` (src/assets/thumbnails/<id>.jpg). */
const savedThumbnails = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/thumbnails/*.jpg',
  { eager: true },
);

/**
 * Fallback for a message added since thumbnails were last saved: the largest real thumbnail
 * YouTube has (it serves a tiny placeholder for missing sizes). Fetched at build time only.
 */
async function bestThumbnailUrl(id: string): Promise<string> {
  for (const size of THUMBNAIL_SIZES) {
    const url = `https://i.ytimg.com/vi/${id}/${size}.jpg`;
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok && Number(response.headers.get('content-length') ?? 0) > 3000) return url;
  }
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** 16:9 thumbnail in AVIF and WebP, cropped from the centre (which also removes letterboxing). */
async function thumbnail(id: string, external: boolean): Promise<Thumbnail | undefined> {
  const saved = savedThumbnails[`/src/assets/thumbnails/${id}.jpg`]?.default;
  // Another channel's video without a saved thumbnail gets a designed cover instead.
  if (!saved && external) return undefined;
  const src = saved ?? (await bestThumbnailUrl(id));
  const widths = [320, 480, 800, 1280];
  const [avif, webp] = await Promise.all(
    (['avif', 'webp'] as const).map((format) =>
      getImage({ src, width: 1280, height: 720, fit: 'cover', format, widths }),
    ),
  );
  if (!avif || !webp) throw new Error(`Could not prepare the thumbnail for ${id}`);
  return { avif: avif.srcSet.attribute, webp: webp.srcSet.attribute, src: webp.src };
}

export async function getMediaLibrary(): Promise<MediaItem[]> {
  const [allSermons, allUploads, seriesEntries, hiddenEntries] = await Promise.all([
    getCollection('sermons'),
    getCollection('uploads'),
    getCollection('series'),
    getCollection('hiddenVideos'),
  ]);
  const hidden = new Set(hiddenEntries.map((h) => h.id));
  const sermons = allSermons.filter(({ id }) => !hidden.has(id));
  const uploads = allUploads.filter(({ id }) => !hidden.has(id));
  const series = new Map(seriesEntries.map((s) => [s.id, s.data]));
  const onFile = new Set(sermons.map((s) => s.id));

  const fromFiles = sermons.map(async ({ id, data }): Promise<MediaItem> => {
    const seriesData = data.series ? series.get(data.series.id) : undefined;
    const credit = seriesData?.credit;
    return {
      id,
      title: data.title,
      speaker: data.speaker,
      date: data.date?.toISOString().slice(0, 10),
      year: data.date?.getUTCFullYear() ?? data.year,
      dateLabel: data.date ? longDate(data.date) : data.year ? String(data.year) : '',
      category: data.category,
      series:
        data.series && seriesData ? { id: data.series.id, title: seriesData.title } : undefined,
      episode: data.episode,
      conference: data.conference,
      description: data.description,
      slides: data.slides,
      credit,
      thumbnail: await thumbnail(id, !!credit),
    };
  });

  // New uploads from the YouTube channel that nobody has filed yet.
  const fromFeed = uploads
    .filter(({ id }) => !onFile.has(id))
    .map(async ({ id, data }): Promise<MediaItem> => ({
      id,
      title: data.title,
      speaker: data.speaker,
      date: data.date.toISOString().slice(0, 10),
      year: data.date.getUTCFullYear(),
      dateLabel: longDate(data.date),
      category: data.category,
      conference: data.conference,
      description: data.description,
      thumbnail: await thumbnail(id, false),
    }));

  const items = await Promise.all([...fromFiles, ...fromFeed]);

  // Newest first; undated series episodes after, latest episode first.
  return items.sort(
    (a, b) =>
      (b.date ?? String(b.year ?? '')).localeCompare(a.date ?? String(a.year ?? '')) ||
      (b.episode ?? 0) - (a.episode ?? 0),
  );
}
