/**
 * Navigation and interaction: header links, the phone menu dialog, the skip link,
 * every internal link and #anchor on the site, and the 404 page.
 */
import { expect, test } from '@playwright/test';
import { PAGES } from './helpers';

test('desktop navigation reaches every section and marks the current page', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The full navigation bar is shown on wide screens');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const label of ['About', 'Gospel', 'Doctrines', 'Ministries', 'Media', 'Resources']) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  }
  await page
    .getByRole('link', { name: /Colonial Hills Bible Chapel — home/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
});

test('phone menu opens, closes with Escape, returns focus and navigates', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'The menu button is shown on narrow screens');
  await page.goto('/');
  const open = page.getByRole('button', { name: 'Open menu' });
  const menu = page.getByRole('dialog', { name: 'Site menu' });

  await expect(menu).toBeHidden();
  await open.click();
  await expect(menu).toBeVisible();
  await expect(open).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await expect(open).toBeFocused();

  await open.click();
  await menu.getByRole('link', { name: 'Ministries' }).click();
  await expect(page).toHaveURL(/\/ministries\/$/);
  await expect(menu).toBeHidden();
});

test('phone menu close button works', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The menu button is shown on narrow screens');
  await page.goto('/about/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Site menu' })).toBeHidden();
});

test('skip link is the first stop for keyboard users and jumps to the content', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Keyboard navigation');
  await page.goto('/gospel/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('every internal link and #anchor on the site resolves', async ({ page, request }) => {
  const links = new Set<string>();
  for (const path of PAGES) {
    await page.goto(path);
    for (const href of await page
      .locator('a[href^="/"]')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''))) {
      links.add(href);
    }
  }
  for (const href of links) {
    const [path = '/', hash] = href.split('#');
    const response = await request.get(path);
    expect(response.status(), href).toBe(200);
    if (hash) {
      await page.goto(path);
      await expect(page.locator(`[id="${hash}"]`), `${href} has a target`).toHaveCount(1);
    }
  }
});

test('footer contact links are correct and outbound links are safe', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer.locator('a[href="tel:+12819311120"]')).toHaveCount(1);
  await expect(footer.locator('a[href="mailto:info@colonialhills-biblechapel.com"]')).toHaveCount(
    1,
  );
  for (const link of await page.locator('a[target="_blank"]').all()) {
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await expect(footer.getByRole('link', { name: /Google Maps/ })).toHaveAttribute(
    'href',
    /destination=14643%20Henry%20Rd/,
  );
});

test('unknown addresses show the friendly 404 page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/moved or no longer exists/i);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});

test('welcome video loads from YouTube (privacy-enhanced) only after pressing play', async ({
  page,
}) => {
  const youtube: string[] = [];
  await page.route(/youtube/, (route) => {
    youtube.push(route.request().url());
    return route.abort();
  });
  await page.goto('/');
  const player = page.locator('#welcome [data-video]');
  await expect(player.locator('iframe')).toHaveCount(0);
  expect(youtube).toEqual([]);

  await page.getByRole('button', { name: /Play video/ }).click();
  await expect(player.locator('iframe')).toHaveAttribute(
    'src',
    /^https:\/\/www\.youtube-nocookie\.com\/embed\/J-lXFELzsIA/,
  );
});

test('the next weekly gathering is marked in the meeting times', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#services [data-next-badge]:not([hidden])')).toHaveCount(1);
  await expect(page.locator('#services [data-next-bar][data-on]')).toHaveCount(1);
});
