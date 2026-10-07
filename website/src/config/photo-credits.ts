/**
 * Where every photograph on the site comes from, and under which license.
 * Shown on the Credits & Licenses page. Add an entry whenever a photo is added.
 */

export interface PhotoCredit {
  file: string;
  subject: string;
  source: 'church' | 'firefly';
}

export const LICENSES = {
  church: 'Photograph © Colonial Hills Bible Chapel. All rights reserved.',
  firefly: 'Image created for Colonial Hills Bible Chapel with Adobe Firefly (generative AI).',
} as const;

export const photoCredits: PhotoCredit[] = [
  {
    file: 'photos/gospel-hero.jpg',
    subject: 'Sunrise over a path through an olive garden',
    source: 'firefly',
  },
  {
    file: 'photos/doctrines-hero.jpg',
    subject: 'An open Bible on a wooden lectern',
    source: 'firefly',
  },
  {
    file: 'photos/ministries-hero.jpg',
    subject: 'A path through a field of ripe wheat',
    source: 'firefly',
  },
  {
    file: 'home/sanctuary.jpg',
    subject: 'Our meeting room and the gold lettering of Romans 6:23',
    source: 'church',
  },
  { file: 'home/hero-2.jpg', subject: 'The chapel and its sign on Henry Road', source: 'church' },
  { file: 'about/bottom.jpg', subject: 'The chapel sign', source: 'church' },
  { file: 'about/henry-road.jpg', subject: 'The chapel on Henry Road', source: 'church' },
  { file: 'gospel/empty-tomb.jpg', subject: 'The empty tomb', source: 'church' },
  { file: 'ministries/hero.jpg', subject: 'The chapel entrance', source: 'church' },
];
