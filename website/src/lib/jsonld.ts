/**
 * schema.org structured data (JSON-LD) for search engines.
 * The homepage describes the church and the website; every other page gets a breadcrumb trail.
 */
import { SITE_URL } from '@/config/site';
import { directionsLinks, type getSettings } from './data';

type Settings = Awaited<ReturnType<typeof getSettings>>;

const CHURCH_ID = `${SITE_URL}/#church`;
const YOUTUBE_CHANNEL = 'https://www.youtube.com/@ColonialHillsBibleChapel';

export function homeGraph(settings: Settings) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: settings.name,
        description: settings.seo.homeDescription,
        inLanguage: 'en-US',
        publisher: { '@id': CHURCH_ID },
      },
      {
        '@type': 'Church',
        '@id': CHURCH_ID,
        name: settings.name,
        url: `${SITE_URL}/`,
        description: settings.seo.homeDescription,
        slogan: settings.tagline,
        keywords: settings.seo.keywords.join(', '),
        areaServed: { '@type': 'City', name: 'Houston, Texas' },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: settings.geo.latitude,
          longitude: settings.geo.longitude,
        },
        telephone: settings.phone,
        email: settings.email,
        logo: `${SITE_URL}/apple-touch-icon.png`,
        image: `${SITE_URL}/og.png`,
        hasMap: directionsLinks(settings.address).google,
        sameAs: [YOUTUBE_CHANNEL],
        address: {
          '@type': 'PostalAddress',
          streetAddress: settings.address.street,
          addressLocality: settings.address.city,
          addressRegion: settings.address.region,
          postalCode: settings.address.postalCode,
          addressCountry: 'US',
        },
      },
    ],
  };
}

export function breadcrumbs(title: string, pathname: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: title, item: `${SITE_URL}${pathname}` },
    ],
  };
}

/** schema.org VideoObject list for the media library (dated videos with our own thumbnail). */
export function videoList(
  videos: { id: string; title: string; description?: string; date?: string; thumbnail?: string }[],
) {
  return {
    '@type': 'ItemList',
    itemListElement: videos
      .filter((v) => v.date && v.thumbnail)
      .map((v, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'VideoObject',
          name: v.title,
          description: v.description ?? v.title,
          uploadDate: v.date,
          thumbnailUrl: new URL(v.thumbnail ?? '', SITE_URL).href,
          embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}`,
          url: `${SITE_URL}/media/?v=${v.id}`,
          publisher: { '@id': CHURCH_ID },
        },
      })),
  };
}
