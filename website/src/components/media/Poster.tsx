import type { MediaItem } from '@/lib/media-shared';

interface Props {
  item: MediaItem;
  sizes: string;
  eager?: boolean;
  /** The main image of the page: fetched first. */
  priority?: boolean;
}

/**
 * The picture for a message: our own self-hosted thumbnail, or — for videos published by another
 * channel — a typographic cover in the chapel's colours (we don't copy other channels' images).
 */
export function Poster({ item, sizes, eager = false, priority = false }: Props) {
  if (item.thumbnail) {
    return (
      <picture className="block size-full">
        <source type="image/avif" srcset={item.thumbnail.avif} sizes={sizes} />
        <source type="image/webp" srcset={item.thumbnail.webp} sizes={sizes} />
        <img
          src={item.thumbnail.src}
          alt=""
          width={1280}
          height={720}
          loading={eager || priority ? 'eager' : 'lazy'}
          fetchpriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="size-full object-cover"
        />
      </picture>
    );
  }

  const subtitle = item.title.replace(/^Episode \d+:\s*/, '');
  // Sizes are fractions of the cover's own width (container query units), so it looks the same
  // in the grid, on the watch page and as a small "up next" thumbnail.
  return (
    <div className="bg-chapel text-paper @container size-full">
      <div className="flex size-full flex-col justify-between bg-[radial-gradient(90%_120%_at_100%_0%,var(--color-chapel-mid),transparent_70%)] p-[6cqw]">
        <span className="font-ui text-gold-light text-[3.6cqw] leading-none font-semibold tracking-[0.2em] uppercase">
          {item.series?.title}
        </span>
        <span className="flex items-end gap-[4cqw]">
          {item.episode && (
            <span className="gilded font-display shrink-0 text-[24cqw] leading-[0.74]">
              {item.episode}
            </span>
          )}
          <span className="font-display text-paper line-clamp-3 pb-[1cqw] text-[6.6cqw] leading-[1.1]">
            {subtitle}
          </span>
        </span>
      </div>
    </div>
  );
}
