import type { Page } from '@playwright/test';

export const SITE = 'https://colonialhills-biblechapel.com';

/** Every public, indexable page of the site. */
export const PAGES = [
  '/',
  '/about/',
  '/gospel/',
  '/doctrines/',
  '/ministries/',
  '/media/',
  '/resources/',
  '/privacy/',
  '/accessibility/',
  '/credits/',
];

/** Pages for members only: checked like the others, but kept out of search engines. */
export const PRIVATE_PAGES = ['/hymns/', '/hymns/screen/'];

/** Records requests to other servers and console/page errors while a page is open. */
export function watchPage(page: Page) {
  const thirdParty: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol !== 'data:' && url.hostname !== 'localhost') thirdParty.push(request.url());
  });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return { thirdParty, errors };
}
