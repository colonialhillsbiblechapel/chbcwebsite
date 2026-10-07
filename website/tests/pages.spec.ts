/**
 * Every public page: loads cleanly, makes no third-party requests, has complete SEO metadata
 * and structured data, passes an automated WCAG 2.2 AA audit, and never scrolls sideways on any
 * phone.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PAGES, PRIVATE_PAGES, SITE, watchPage } from './helpers';

for (const path of [...PAGES, ...PRIVATE_PAGES]) {
  test.describe(`page ${path}`, () => {
    test('loads with no errors, CSP violations or third-party requests', async ({ page }) => {
      const watch = watchPage(page);
      const response = await page.goto(path, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(200);
      expect(watch.thirdParty, 'requests to other servers').toEqual([]);
      expect(watch.errors, 'console errors (CSP violations are reported here)').toEqual([]);
    });

    test('has complete SEO metadata and structured data', async ({ page }) => {
      test.skip(PRIVATE_PAGES.includes(path), 'Members-only pages are kept out of search engines');
      await page.goto(path);

      const title = await page.title();
      expect(title.length).toBeGreaterThanOrEqual(15);
      expect(title.length).toBeLessThanOrEqual(65);

      const description =
        (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
      expect(description.length).toBeGreaterThanOrEqual(50);
      expect(description.length).toBeLessThanOrEqual(160);

      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}${path}`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        /^index, follow/,
      );
      await expect(page.locator('meta[http-equiv="content-security-policy"]')).toHaveCount(1);
      for (const property of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt']) {
        await expect(page.locator(`meta[property="${property}"]`)).toHaveCount(1);
      }
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        'content',
        `${SITE}${path}`,
      );

      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(blocks).toHaveLength(1);
      const data = JSON.parse(blocks[0] ?? '{}');
      const nodes: { '@type': string; itemListElement?: { item: unknown }[] }[] = data[
        '@graph'
      ] ?? [data];
      if (path === '/') {
        expect(nodes.map((node) => node['@type'])).toEqual(['WebSite', 'Church']);
      } else {
        const trail = nodes.find((node) => node['@type'] === 'BreadcrumbList');
        expect(trail?.itemListElement?.at(-1)?.item).toBe(`${SITE}${path}`);
      }
    });

    test('passes an automated WCAG 2.2 AA audit', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' }); // audit the settled page, not mid-animation
      await page.goto(path, { waitUntil: 'networkidle' });
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      expect(
        violations.map(
          (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([]);
    });

    test('never scrolls sideways, even on the smallest phones', async ({ page }) => {
      for (const width of [320, 375, 430]) {
        // A fresh tab for each width: the projector page fills its screen by itself where the
        // browser allows it (as CI's Chromium does), and a full-screen window can't be resized.
        const tab = await page.context().newPage();
        await tab.setViewportSize({ width, height: 800 });
        await tab.goto(path);
        // Scroll to the end so lazily loaded content (more messages, images) is measured too.
        await tab.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 600) {
            scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
        });
        // Phone browsers zoom out to fit overflowing content, which widens innerWidth.
        const widest = await tab.evaluate(() =>
          Math.max(document.documentElement.scrollWidth, innerWidth),
        );
        expect(widest, `page width at ${width}px`).toBeLessThanOrEqual(width);
        await tab.close();
      }
    });
  });
}
