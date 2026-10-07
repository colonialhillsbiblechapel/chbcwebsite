/**
 * Reads the church YouTube channel's public video feed (no API key, fetched at build time only)
 * so new messages appear on the site by themselves. A message file in src/content/sermons with
 * the same YouTube ID always takes precedence, so any detail can be corrected by hand.
 */

const CHANNEL_ID = 'UCQQ-wyI4pCg48O6Z_itgVvQ'; // youtube.com/@ColonialHillsBibleChapel
export const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

export interface Upload {
  id: string;
  title: string;
  speaker: string;
  /** YYYY-MM-DD */
  date: string;
  category: 'sunday' | 'conference' | 'special';
  conference?: number;
  description?: string;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': '’',
  '&apos;': '’',
};
const decode = (text: string) =>
  text
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (e) => ENTITIES[e] ?? e)
    .replace(/(?<=[A-Za-z])'(?=[A-Za-z])/g, '’')
    .trim();

const tag = (xml: string, name: string) =>
  xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1];

/**
 * Works out a message's details from the channel's naming habits:
 * "Bro Johnson John 09/27/2026" → a Sunday message by Bro Johnson John on 27 September 2026;
 * "106th Annual Houston Bible Conference — Sunday Morning — Mark Kolchin" → 106th conference.
 */
function describeUpload(
  id: string,
  title: string,
  published: string,
  description?: string,
): Upload {
  const base = { id, title, description: description || undefined };

  const dated = title.match(/^(.+?)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dated) {
    const [, speaker = '', month = '', day = '', year = ''] = dated;
    return {
      ...base,
      speaker,
      date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      category: 'sunday',
    };
  }

  const conference = title.match(
    /\b(\d{3})(?:st|nd|rd|th)?\s+(?:Annual\s+)?Houston Bible Conference/i,
  );
  if (conference) {
    const parts = title.split(/\s+[—–-]\s+/);
    return {
      ...base,
      speaker: parts.length > 2 ? (parts.at(-1) ?? '') : 'Houston Bible Conference',
      date: published.slice(0, 10),
      category: 'conference',
      conference: Number(conference[1]),
    };
  }

  return {
    ...base,
    speaker: 'Colonial Hills Bible Chapel',
    date: published.slice(0, 10),
    category: 'special',
  };
}

export function parseFeed(xml: string): Upload[] {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap(([, entry = '']) => {
    const id = tag(entry, 'yt:videoId');
    const title = tag(entry, 'title');
    const published = tag(entry, 'published');
    if (!id || !title || !published) return [];
    // Keep the first paragraph of the description (the rest is usually links and notices).
    const description = decode(tag(entry, 'media:description') ?? '')
      .split(/\n\s*\n/)[0]
      ?.trim();
    return [describeUpload(id, decode(title), published, description)];
  });
}
