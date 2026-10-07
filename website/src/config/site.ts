/**
 * Structural site configuration (navigation, URLs).
 * Contact details, meeting times and other editable content live in src/content/
 * so volunteers can change them from the admin panel.
 */

export interface NavLink {
  label: string;
  href: string;
  /** "nofollow" for pages search engines should not visit (the members-only hymns). */
  rel?: string;
}

export const SITE_URL = 'https://colonialhills-biblechapel.com';

/** Main navigation (the logo links home). */
export const primaryNav: NavLink[] = [
  { label: 'About', href: '/about/' },
  { label: 'Gospel', href: '/gospel/' },
  { label: 'Doctrines', href: '/doctrines/' },
  { label: 'Ministries', href: '/ministries/' },
  { label: 'Media', href: '/media/' },
  { label: 'Resources', href: '/resources/' },
];

export const visitLink: NavLink = { label: 'Visit', href: '/#visit' };

export const footerNav: NavLink[] = [
  { label: 'About Us', href: '/about/' },
  { label: 'The Gospel', href: '/gospel/' },
  { label: 'Doctrines & Practices', href: '/doctrines/' },
  { label: 'Ministries', href: '/ministries/' },
  { label: 'Media Library', href: '/media/' },
  { label: 'Helpful Resources', href: '/resources/' },
  { label: 'Hymns', href: '/hymns/', rel: 'nofollow' },
  { label: 'Upcoming Events', href: '/#events' },
];

export const legalNav: NavLink[] = [
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Accessibility', href: '/accessibility/' },
  { label: 'Credits & Licenses', href: '/credits/' },
];

/** True when `href` is the current page (or a parent section of it). */
export function isCurrent(href: string, pathname: string): boolean {
  const [path = href] = href.split('#');
  return path === '/' ? pathname === '/' : pathname.startsWith(path);
}
