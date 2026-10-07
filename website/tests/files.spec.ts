/**
 * Site-level files: robots.txt, sitemap, icons, social image, and the license files
 * the site must publish (font licenses and third-party notices).
 */
import { expect, test } from '@playwright/test';
import { PAGES, SITE } from './helpers';

test('robots.txt allows crawling (except the members-only hymns) and points to the sitemap', async ({
  request,
}) => {
  const body = await (await request.get('/robots.txt')).text();
  expect(body).toContain('Allow: /');
  expect(body).toContain('Disallow: /hymns/');
  expect(body).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
});

test('sitemap lists every public page and nothing private', async ({ request }) => {
  const index = await (await request.get('/sitemap-index.xml')).text();
  expect(index).toContain(`${SITE}/sitemap-0.xml`);
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(urls.sort()).toEqual(PAGES.map((p) => `${SITE}${p}`).sort());
});

test('icons and social preview image are served', async ({ request }) => {
  for (const [path, type] of [
    ['/favicon.ico', 'image/x-icon'],
    ['/icon-192.png', 'image/png'],
    ['/apple-touch-icon.png', 'image/png'],
    ['/og.png', 'image/png'],
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toContain(type);
  }
});

test('font licenses and third-party notices are published', async ({ request }) => {
  for (const font of ['cormorant-garamond', 'eb-garamond', 'inter']) {
    const text = await (await request.get(`/licenses/fonts/${font}-OFL.txt`)).text();
    expect(text, font).toContain('SIL Open Font License, Version 1.1');
  }
  const notices = await request.get('/THIRD-PARTY-NOTICES.txt');
  expect(notices.status()).toBe(200);
  expect(await notices.text()).toContain('EB Garamond');
});

test('the old conference brochure link still works', async ({ request }) => {
  const response = await request.get('/documents/106th-Annual-Houston-Bible-Conference.pdf');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
});

test('“Add to calendar” files are valid recurring events in Houston time', async ({ request }) => {
  for (const [day, rule] of [
    ['sunday', 'RRULE:FREQ=WEEKLY;BYDAY=SU'],
    ['wednesday', 'RRULE:FREQ=WEEKLY;BYDAY=WE'],
    ['saturday', 'RRULE:FREQ=MONTHLY;BYDAY=2SA'],
  ] as const) {
    const response = await request.get(`/calendar/${day}.ics`);
    expect(response.status(), day).toBe(200);
    expect(response.headers()['content-type'], day).toContain('text/calendar');
    const body = await response.text();
    expect(body.startsWith('BEGIN:VCALENDAR\r\n'), day).toBe(true);
    expect(body, day).toContain(rule);
    expect(body, day).toContain('DTSTART;TZID=America/Chicago:');
    expect(body, day).toContain('BEGIN:VTIMEZONE');
    for (const line of body.split('\r\n')) {
      expect(new TextEncoder().encode(line).length, `${day}: ${line}`).toBeLessThanOrEqual(75);
    }
  }
});
