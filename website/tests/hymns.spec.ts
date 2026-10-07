/**
 * The members-only hymn index: nothing readable is ever published, search engines are kept out,
 * a wrong password opens nothing, and the right one opens the index. (The password is read from
 * HYMNS_PASSWORD in website/.env; without it the unlocking test is skipped, as in CI.)
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { buildEntries, search, sections } from '../src/components/hymns/hymn-index';
import { drawScene } from '../src/components/hymns/art/scene.ts';
import type { Hymnal, Words } from '../src/components/hymns/vault';

if (existsSync('.env')) process.loadEnvFile('.env');
const PASSWORD = process.env.HYMNS_PASSWORD;

test('the published site never contains the hymns in readable form', ({ isMobile }) => {
  test.skip(isMobile, 'Checked once');
  test.skip(!existsSync('private/hymns.json'), 'Needs the private copy of the hymns to compare');
  const { books } = JSON.parse(readFileSync('private/hymns.json', 'utf8')) as { books: Hymnal[] };
  const words = books.flatMap(({ id }) => {
    const { hymns } = JSON.parse(readFileSync(`private/lyrics/${id}.json`, 'utf8')) as {
      hymns: Words[];
    };
    return hymns.flatMap((h) => h.slides.flatMap((s) => s.lines));
  });
  const secrets = [...books.flatMap((b) => b.hymns.flatMap((h) => [h.title, h.tune])), ...words];
  // Words of Scripture that a hymn quotes and the public pages quote too (John 10:27 in hymn 379
  // and on the doctrines page) are the Bible's, not the hymn's, so they may appear.
  const scripture = new Set(['“My sheep hear My voice,']);
  // Every distinctive line: first lines and tunes, and one in five lines of the words.
  const telling = [...new Set(secrets)].filter(
    (s, i) => !scripture.has(s) && (s.length >= 24 || (s.length >= 12 && i % 5 === 0)),
  );

  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(html|js|json|xml|txt|css|ics|webmanifest)$/.test(name)) files.push(path);
    }
  };
  walk('dist');
  const leaks = files.flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return telling.filter((s) => text.includes(s)).map((s) => `${file}: ${s}`);
  });
  expect(leaks).toEqual([]);
});

test('is kept out of search engines', async ({ page, request }) => {
  await page.goto('/hymns/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow, noarchive',
  );
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap).not.toContain('/hymns/');
  await expect(page.locator('a[href="/hymns/"]').first()).toHaveAttribute('rel', 'nofollow');
});

test('a wrong password opens nothing', async ({ page }) => {
  await page.goto('/hymns/');
  await page.getByLabel('Password', { exact: true }).fill('not the password');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('alert')).toHaveText('That password isn’t right. Please try again.');
  await expect(page.getByRole('searchbox')).toHaveCount(0);
});

test('the right password opens the hymnals, and Lock closes them', async ({ page }) => {
  test.skip(!PASSWORD, 'Set HYMNS_PASSWORD in website/.env to test unlocking');
  await page.goto('/hymns/');
  // Like an email address, the access key is not case-sensitive and spaces around it are ignored.
  const key = (PASSWORD ?? '').split(/[,\n]/)[0] ?? '';
  await page.getByLabel('Password', { exact: true }).fill(`  ${key.toUpperCase()} `);
  await page.getByRole('button', { name: 'Unlock' }).click();

  await expect(
    page.getByRole('button', { name: /Hymns of Worship and Remembrance/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Hymns of Truth and Praise/ })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search hymns' }).fill('amazing grace');
  await expect(page.getByText(/1 hymn found/)).toBeVisible();

  // Still open after a reload (this visit only), closed again after Lock.
  await page.reload();
  await expect(page.getByRole('searchbox', { name: 'Search hymns' })).toBeVisible();
  await page.getByRole('button', { name: 'Lock' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
});

test('builds a service list and presents it on the screen', async ({ page }) => {
  test.skip(!PASSWORD, 'Set HYMNS_PASSWORD in website/.env to test unlocking');
  await page.goto('/hymns/');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD?.split(/[,\n]/)[0] ?? '');
  await page.getByRole('button', { name: 'Unlock' }).click();

  await page.getByRole('button', { name: /Hymns of Truth and Praise/ }).click();
  await expect(page).toHaveURL(/#book=praise$/);
  const searchbox = page.getByRole('searchbox', { name: 'Search hymns' });
  for (const number of ['332', '2']) {
    await searchbox.fill(number);
    await page
      .getByRole('button', { name: /add to the service list/ })
      .first()
      .click();
  }
  const tray = page.getByRole('region', { name: 'Service list' });
  await expect(tray).toContainText('332 · 2');

  // Put "2" first, then present.
  await tray.getByRole('button', { name: /Service list/ }).click();
  await tray.getByRole('button', { name: 'Move up' }).nth(1).click();
  await expect(tray).toContainText('2 · 332');
  await tray.getByRole('button', { name: 'Present', exact: true }).click();

  // Each hymn: its title slide, then its verses and refrains, slide by slide.
  const presenting = page.getByRole('dialog', { name: 'Presenting hymns' });
  // The title slide, as in the chapel's decks: the hymn's name, a verse and its reference.
  await expect(presenting).toContainText(/Great is Thy faithfulness/i);
  await expect(presenting.locator('figcaption')).toHaveText(/^[1-3 A-Za-z]+ \d+:\d+(-\d+)?$/);
  // Hymn 2 has its own background: the full scene on the title, a strip under the words.
  const picture = presenting.locator('img[src^="data:image/svg+xml"]');
  await expect(picture).toBeVisible();
  await expect(presenting).toContainText('Hymn 1 of 2 · 1/');
  await page.keyboard.press('ArrowRight');
  await expect(presenting).toContainText('Hymn 1 of 2 · 2/');
  await expect(presenting).toContainText('There is no shadow of turning with Thee;');
  await expect(picture).toBeVisible();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(presenting).toContainText(/Amazing grace/i);
  await page.keyboard.press('ArrowRight');
  await expect(presenting).toContainText('That saved a wretch like me!');
  await page.keyboard.press('b');
  await expect(presenting.getByLabel('Blank screen')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(presenting).toHaveCount(0);

  // The list is kept on this device for the next visit.
  await page.reload();
  await expect(page.getByRole('region', { name: 'Service list' })).toContainText('2 · 332');
});

test('second screen: the projector window follows the controls', async ({ page, isMobile }) => {
  test.skip(!PASSWORD, 'Set HYMNS_PASSWORD in website/.env to test unlocking');
  test.skip(isMobile, 'A projector is driven from a computer');
  await page.goto('/hymns/');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD?.split(/[,\n]/)[0] ?? '');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await page.getByRole('button', { name: /Hymns of Truth and Praise/ }).click();
  for (const number of ['2', '332']) {
    await page.getByRole('searchbox', { name: 'Search hymns' }).fill(number);
    await page
      .getByRole('button', { name: /add to the service list/ })
      .first()
      .click();
  }
  const tray = page.getByRole('region', { name: 'Service list' });
  await tray.getByRole('button', { name: 'Present', exact: true }).click();

  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: /Second screen/ }).click();
  const screen = await popup;
  await expect(screen).toHaveURL(/\/hymns\/screen\/$/);
  await expect(screen.locator('header, footer')).toHaveCount(0);
  await expect(screen.getByRole('heading', { name: /Great is Thy faithfulness/i })).toBeVisible();

  // This window is now the control panel: Next shows the first verse on the projector.
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(screen.getByText('There is no shadow of turning with Thee;')).toBeVisible();
  await page.getByRole('button', { name: 'End', exact: true }).click();
  await expect(screen.getByLabel('Blank screen')).toBeVisible();
});

test('reads a hymn: its words as sung, with the refrain after each verse', async ({
  page,
  isMobile,
}) => {
  test.skip(!PASSWORD, 'Set HYMNS_PASSWORD in website/.env to test unlocking');
  await page.goto('/hymns/');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD?.split(/[,\n]/)[0] ?? '');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await page.getByRole('button', { name: /Hymns of Truth and Praise/ }).click();
  await page.getByRole('searchbox', { name: 'Search hymns' }).fill('2');
  // On a phone the list offers no Present button; a hymn is presented from inside it.
  const presentNow = page.getByRole('button', { name: 'Present hymn 2 now' });
  await (isMobile ? expect(presentNow).toBeHidden() : expect(presentNow).toBeVisible());
  await page.getByRole('button', { name: /^2 Great is Thy faithfulness/ }).click();
  await expect(page).toHaveURL(/#book=praise&hymn=2$/);

  const reader = page.getByRole('article', { name: /Great is Thy faithfulness/ });
  await expect(reader.getByText('Hymn 2', { exact: false }).first()).toBeVisible();
  await expect(reader.getByRole('button', { name: 'Present', exact: true })).toBeVisible();
  const verses = reader.getByRole('region', { name: /^Verse \d$/ });
  const refrains = reader.getByRole('region', { name: 'Refrain' });
  await expect(verses.first()).toBeVisible(); // the words open a moment after the page
  await expect(refrains).toHaveCount(await verses.count());

  await reader.getByRole('button', { name: 'Add to service list' }).click();
  await expect(page.getByRole('region', { name: 'Service list' })).toContainText('2');
  await reader.getByRole('button', { name: /Hymn 3/ }).click();
  await expect(page).toHaveURL(/hymn=3$/);
  await page.goBack();
  await expect(page).toHaveURL(/hymn=2$/);
});

test.describe('search and sections', () => {
  test.skip(({ isMobile }) => isMobile, 'Logic tests run once');
  const books: Hymnal[] = [
    {
      id: 'worship',
      title: 'Book A',
      book: 'Book One',
      cover: 'Black Hymnal',
      verse: { text: '', reference: '' },
      hymns: [
        { number: '10', title: 'Come, Thou Fount of ev’ry blessing', tune: 'NETTLETON' },
        { number: '45', title: 'Christ, the Lord is ris’n indeed', tune: 'ANGLIA' },
        { number: '30', title: 'Did you think to pray?', tune: '[Did You Think to Pray?]' },
        { number: 'FC 1', title: 'Glory to God on high!', tune: 'OLIVET' },
      ],
    },
  ];
  const entries = buildEntries(books);

  test('finds shortened words, numbers first and tunes', () => {
    expect(search(entries, 'every blessing').map((e) => e.hymn.number)).toEqual(['10']);
    expect(search(entries, 'risen').map((e) => e.hymn.number)).toEqual(['45']);
    expect(search(entries, '3').map((e) => e.hymn.number)[0]).toBe('30');
    expect(search(entries, 'nettleton').map((e) => e.hymn.number)).toEqual(['10']);
  });

  test('hymn backgrounds are painted the same every time', () => {
    const scene = { palette: 'crimson', land: 'hills', light: 'glow', clouds: 'soft' } as const;
    for (const kind of ['title', 'band'] as const) {
      const picture = drawScene(scene, kind, 251);
      expect(picture).toMatch(/^<svg[^>]+viewBox="0 0 1920 /);
      expect(drawScene(scene, kind, 251)).toBe(picture);
    }
    expect(drawScene({ preset: 'harvest' }, 'title')).toContain('<svg');
  });

  test('splits a hymnal into sections of 25, front cover first', () => {
    expect(sections(entries).map((s) => s.label)).toEqual([
      'Front cover',
      'Hymns 1–25',
      'Hymns 26–45',
    ]);
  });
});
