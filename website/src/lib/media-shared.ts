/** Media-library types and constants shared by the build and the browser (no Astro imports). */

export type Category = 'sunday' | 'conference' | 'special';

export const CATEGORY_LABELS: Record<Category, string> = {
  sunday: 'Sunday Messages',
  conference: 'Conference',
  special: 'Special Topics',
};

export interface Thumbnail {
  avif: string;
  webp: string;
  src: string;
}

export interface MediaItem {
  id: string;
  title: string;
  speaker: string;
  /** ISO date, when known. */
  date?: string;
  year?: number;
  /** "September 27, 2026", "2023", or "" when not known. */
  dateLabel: string;
  category: Category;
  series?: { id: string; title: string };
  episode?: number;
  conference?: number;
  description?: string;
  slides?: string;
  /** Channel credit for videos published by others. */
  credit?: { name: string; url: string };
  /** Self-hosted thumbnail; when absent a designed cover is shown. */
  thumbnail?: Thumbnail;
}
