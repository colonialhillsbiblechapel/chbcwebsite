/**
 * The media library: every message from the old site is listed with a self-hosted thumbnail or
 * cover, filters and search work and are kept in the address, and the watch page only contacts
 * YouTube (privacy-enhanced) once a message is chosen.
 */
import { expect, test, type Page } from '@playwright/test';

const card = '#all-messages [data-video-card]';
const watch = '[data-watch]';

test.beforeEach(async ({ page }) => {
  // Never reach YouTube from the tests; we only check what the page asks for.
  await page.route(/youtube/, (route) => route.abort());
});

/** Open the library and wait until it is interactive (it hydrates when the browser is idle). */
async function openLibrary(page: Page, path = '/media/') {
  await page.goto(path);
  await page.locator('astro-island:not([ssr])').waitFor({ state: 'attached' });
}

test('loads every message as you scroll, with thumbnails served from this site', async ({
  page,
}) => {
  await openLibrary(page);
  const summary = (await page.getByText(/^\d+ messages$/).textContent()) ?? '';
  const total = Number(summary.match(/\d+/)?.[0]);
  expect(total).toBeGreaterThanOrEqual(136); // every message from the old site, plus new uploads
  await expect(page.locator(card)).toHaveCount(24);
  for (let i = 0; i < 12 && (await page.locator(card).count()) < total; i++) {
    await page.locator(card).last().scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
  }
  await expect(page.locator(card)).toHaveCount(total);
  const sources = await page
    .locator(`${card} img`)
    .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src') ?? ''));
  expect(sources).toHaveLength(total);
  for (const src of sources) expect(src).toMatch(/^\/_astro\//);
});

test('chips, search and the sidebar filter the library and the address', async ({
  page,
  isMobile,
}) => {
  await openLibrary(page);
  await page
    .getByRole('group', { name: 'Filter' })
    .getByRole('button', { name: 'Conference', exact: true })
    .click();
  await expect(page).toHaveURL(/category=conference/);
  expect(await page.locator(card).count()).toBeGreaterThanOrEqual(17);
  for (const text of await page.locator(card).allTextContents())
    expect(text).toContain('Conference');

  await page
    .getByRole('group', { name: 'Filter' })
    .getByRole('button', { name: 'All', exact: true })
    .click();
  await page.getByPlaceholder('Search messages, speakers, series').fill('discipleship');
  await expect(page.locator(card)).toHaveCount(5);
  await expect(page).toHaveURL(/q=discipleship/);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByText(/^\d+ messages$/)).toBeVisible();

  if (!isMobile) {
    await page
      .getByRole('navigation', { name: 'Library' })
      .getByRole('button', { name: /Mark Swaim/ })
      .click();
    await expect(page).toHaveURL(/speaker=mark\+swaim/);
    await expect(page.locator(card)).toHaveCount(4);
  }
});

test('a series opens as a playlist, first episode first', async ({ page }) => {
  await openLibrary(page, '/media/?series=light-from-the-word');
  await expect(page.locator(card).first()).toContainText('Episode 1:');
});

test('a filtered view can be shared by its address', async ({ page }) => {
  await openLibrary(page, '/media/?category=special&q=episode%2057');
  await expect(page.locator(card)).toHaveCount(1);
  await expect(page.locator(card)).toContainText('LGBTQ: A Biblical Perspective Part Two');
});

test('choosing a message opens the watch page; back returns to the same place', async ({
  page,
}) => {
  await openLibrary(page);
  await expect(page.locator(`${watch} iframe`)).toHaveCount(0);
  await page.locator(card).nth(1).click();
  await expect(page.locator(watch)).toBeVisible();
  await expect(page).toHaveURL(/\?v=/);
  await expect(page.locator(`${watch} iframe`)).toHaveAttribute(
    'src',
    /^https:\/\/www\.youtube-nocookie\.com\/embed\//,
  );

  await page.locator(watch).getByRole('button', { name: 'Next', exact: true }).click();
  const second = page.url();
  await page.keyboard.press('Shift+N');
  await expect(page).not.toHaveURL(second);

  await page.goBack();
  await expect(page).toHaveURL(second);
  await page.getByRole('button', { name: '← Back to all messages' }).click();
  await expect(page.locator(watch)).toHaveCount(0);
  await expect(page).not.toHaveURL(/\?v=/);
  await expect(page.locator(`${card}[data-watched]`)).toHaveCount(3);
});

test('a link to a message opens it, with its slides', async ({ page }) => {
  await openLibrary(page, '/media/?v=D-snRs5ixDk');
  await expect(page.locator(watch)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('New Heaven and New Earth');
  await expect(page.locator(watch).getByRole('link', { name: /Slides/ })).toHaveAttribute(
    'href',
    /docs\.google\.com/,
  );
  await page.keyboard.press('Escape');
  await expect(page.locator(watch)).toHaveCount(0);
});

test('videos from another channel show their thumbnail and are credited', async ({ page }) => {
  await openLibrary(page, '/media/?v=25cjogMAu5I');
  await expect(page.locator(watch)).toContainText('Video by The Johnson’s Journey With Christ');
  await page.getByRole('button', { name: '← Back to all messages' }).click();
  await page.getByPlaceholder('Search messages, speakers, series').fill('episode 57');
  const thumbnail = page.locator(`${card}[data-video-card="25cjogMAu5I"] img`);
  await expect(thumbnail).toHaveAttribute('src', /^\/_astro\//);
});

test('videos on the hidden list never appear', async ({ page }) => {
  const hidden = ['qUbOQErr0bw', 'e3JOiEbEZcA', 'UlstszVw0QA']; // conference live streams
  await openLibrary(page, '/media/?conference=106');
  for (const id of hidden) {
    await expect(page.locator(`[data-video-card="${id}"]`)).toHaveCount(0);
  }
  await openLibrary(page, `/media/?v=${hidden[0]}`);
  await expect(page.locator(watch)).toHaveCount(0);
});
