/**
 * The Statement of Doctrines & Practices: every word on the page matches the approved Markdown,
 * the old anchors still work, and the contents follow the reader on wide screens and on phones.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const OLD_ANCHORS = [
  'introduction',
  'scripture',
  'god',
  'creation',
  'salvation',
  'sanctification',
  'family',
  'church',
  'elders',
  'deacons',
  'gifts',
  'teaching',
  'fellowship',
  'breaking-bread',
  'prayer',
  'evangelism',
  'future-events',
];

/** The approved text, block by block, straight from the Markdown files. */
function approvedText() {
  const read = (path: string) => readFileSync(path, 'utf8');
  const body = (file: string) => file.replace(/^---[\s\S]*?---\s*/, '');
  const title = (file: string) => file.match(/^title: ["']?(.*?)["']?$/m)?.[1] ?? '';
  const blocks = (file: string) =>
    body(file)
      .split(/\n\s*\n/)
      .map((chunk) =>
        chunk
          .replace(/^(### |> )/, '')
          .replace(/\\(.)/g, '$1')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter(Boolean);

  const intro = read('src/content/pages/doctrines.md');
  const topics = readdirSync('src/content/doctrines')
    .map((name) => read(`src/content/doctrines/${name}`))
    .sort(
      (a, b) => Number(a.match(/^order: (\d+)/m)?.[1]) - Number(b.match(/^order: (\d+)/m)?.[1]),
    );
  return [title(intro), ...blocks(intro), ...topics.flatMap((t) => [title(t), ...blocks(t)])];
}

test('shows the approved text word for word, in order', async ({ page }) => {
  await page.goto('/doctrines/');
  const shown = await page
    .locator('article')
    .locator('h2, h3, p:not(.label), blockquote')
    .evaluateAll((els) =>
      els
        .filter((el) => !el.closest('[data-topics-covered]'))
        .filter((el) => !el.closest('blockquote') || el.tagName === 'BLOCKQUOTE')
        .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
        .filter((text) => text !== 'Back to top'),
    );
  expect(shown).toEqual(approvedText());
});

test('lists the topics covered, as on the original page', async ({ page }) => {
  await page.goto('/doctrines/');
  const list = page.locator('[data-topics-covered]');
  await expect(list.getByRole('heading', { name: 'Topics Covered' })).toBeVisible();
  const titles = await page
    .locator('article section[data-topic] > h2')
    .evaluateAll((els) => els.slice(1).map((e) => (e.textContent ?? '').trim()));
  await expect(list.getByRole('listitem')).toHaveText(
    titles.map((title, i) => new RegExp(`^${i + 1}\\s*${title}$`)),
  );
});

test('keeps every anchor of the old page and links each subsection', async ({ page }) => {
  await page.goto('/doctrines/');
  const ids = await page.locator('article section[id]').evaluateAll((els) => els.map((e) => e.id));
  expect(ids).toEqual(OLD_ANCHORS);
  await expect(page.locator('article h3[id]')).toHaveCount(62);
  const subsectionIds = await page
    .locator('article h3[id]')
    .evaluateAll((els) => els.map((e) => e.id));
  expect(new Set(subsectionIds).size).toBe(subsectionIds.length);

  await page.goto('/doctrines/#breaking-bread');
  await expect(page.getByRole('heading', { level: 2, name: 'Breaking of Bread' })).toBeInViewport();
});

test('credits both translations it quotes', async ({ page }) => {
  await page.goto('/doctrines/');
  const footer = page.locator('footer');
  await expect(footer).toContainText('New King James Version®');
  await expect(footer).toContainText('NEW AMERICAN STANDARD BIBLE®');
});

test('wide screens: the contents follow the reader', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The side contents are shown on wide screens');
  await page.goto('/doctrines/');
  const contents = page.locator('[data-toc]');
  await contents.getByRole('link', { name: '06 Family', exact: true }).click();
  await expect(page).toHaveURL(/#family$/);
  await expect(contents.getByRole('link', { name: '06 Family', exact: true })).toHaveAttribute(
    'aria-current',
    'location',
  );
  await expect(contents.getByRole('link', { name: 'Divorce and Remarriage' })).toBeVisible();
  await expect(contents.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible();
});

test('phones: the contents bar shows where you are and takes you anywhere', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'The contents bar is shown on phones and tablets');
  await page.goto('/doctrines/#salvation');
  const bar = page.locator('[data-contents]');
  await expect(bar.locator('[data-current]')).toHaveText('Salvation');

  // Let fonts and images settle so only the tap itself could move the page.
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  const before = await page.evaluate(() => scrollY);
  await bar.locator('summary').tap();
  await expect(bar.getByRole('link', { name: /Elders/ })).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(before);

  await bar.getByRole('link', { name: /Elders/ }).click();
  await expect(page).toHaveURL(/#elders$/);
  await expect(bar).not.toHaveAttribute('open');
  await expect(bar.locator('[data-current]')).toHaveText('Elders');
});
