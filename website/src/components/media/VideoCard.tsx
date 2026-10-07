import type { MediaItem } from '@/lib/media-shared';
import { Avatar } from './Avatar';
import { badgeLabel, kindLabel, plainName, timeAgo } from './library';
import { Poster } from './Poster';

/** "2 weeks ago" once the browser knows today's date; the calendar date before that. */
export function whenLabel(item: MediaItem, now: Date | null) {
  if (item.date) return now ? timeAgo(item.date, now) : item.dateLabel;
  return item.year ? String(item.year) : '';
}

interface Props {
  item: MediaItem;
  now: Date | null;
  watched: boolean;
  eager: boolean;
  /** The first thumbnail on the page: fetched before anything else. */
  priority?: boolean;
  onPlay: (item: MediaItem) => void;
}

/** A message in the grid, laid out the way people know from YouTube. */
export function VideoCard({ item, now, watched, eager, priority = false, onPlay }: Props) {
  const when = whenLabel(item, now);
  const sameAsTitle = plainName(item.title) === plainName(item.speaker);
  return (
    <li>
      <a
        href={`/media/?v=${item.id}`}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey) return; // open in a new tab
          event.preventDefault();
          onPlay(item);
        }}
        className="group hover:bg-ink/[0.045] focus-visible:bg-ink/[0.045] -m-2 block rounded-2xl p-2 transition-colors duration-300"
        data-video-card={item.id}
        data-watched={watched || undefined}
      >
        <span className="bg-paper-shade relative block aspect-video overflow-hidden rounded-xl">
          <Poster
            item={item}
            eager={eager}
            priority={priority}
            sizes="(min-width: 1536px) 20rem, (min-width: 1024px) 26vw, (min-width: 640px) 46vw, 94vw"
          />
          <span className="bg-ink/85 font-ui text-paper absolute right-2 bottom-2 rounded-md px-1.5 py-0.5 text-[0.75rem] font-medium">
            {badgeLabel(item)}
          </span>
          {watched && (
            <span className="bg-pew absolute inset-x-0 bottom-0 h-1">
              <span className="sr-only">Watched</span>
            </span>
          )}
        </span>
        <span className="mt-3 flex gap-3">
          <Avatar speaker={item.speaker} />
          <span className="min-w-0">
            <span className="font-ui text-ink line-clamp-2 text-[0.98rem] leading-snug font-semibold">
              {item.title}
            </span>
            {/* The speaker plays the part of YouTube's channel name (unless the title already is it). */}
            <span className="font-ui text-muted mt-1 block truncate text-[0.86rem]">
              {sameAsTitle ? kindLabel(item) : plainName(item.speaker)}
            </span>
            <span className="font-ui text-muted block truncate text-[0.86rem]">
              {(sameAsTitle ? [when] : [kindLabel(item), when]).filter(Boolean).join(' · ')}
            </span>
          </span>
        </span>
      </a>
    </li>
  );
}
