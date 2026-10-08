/**
 * A YouTube video's ID from whatever a volunteer pastes: the ID itself, or any link to the video —
 * youtube.com/watch?v=…, youtu.be/…, /live/…, /shorts/…, /embed/…, with or without extra parts.
 */
const ID = /^[A-Za-z0-9_-]{11}$/;

export function youtubeId(text: unknown): string | undefined {
  if (typeof text !== 'string') return undefined;
  const value = text.trim();
  if (ID.test(value)) return value;
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
    const candidate =
      host === 'youtu.be'
        ? url.pathname.split('/')[1]
        : host === 'youtube.com' || host === 'youtube-nocookie.com'
          ? (url.searchParams.get('v') ??
            url.pathname.match(/^\/(?:live|shorts|embed|v)\/([^/?#]+)/)?.[1])
          : undefined;
    return candidate && ID.test(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}
