import { test, expect } from '@playwright/test';
import { mockFirebase, signIn } from './helpers/firebase';

const checks = new WeakMap();
const matchingNames = [
  'John Doe',
  'Ethan Gonzalez',
  'Ava Cooper',
  'Sophie Davis',
];

async function monitor(page) {
  const errors = [];
  const firebase = await mockFirebase(page);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return { errors, firebase };
}

test.beforeEach(async ({ page }) => {
  checks.set(page, [await monitor(page)]);
});

test.afterEach(async ({ page }) => {
  for (const { errors, firebase } of checks.get(page)) {
    expect(errors, 'Browser console and runtime errors').toEqual([]);
    expect(firebase.unexpectedRequests, 'Unexpected Firebase requests').toEqual(
      [],
    );
  }
});

async function expectFilteredTeachers(page) {
  await expect(
    page.getByRole('combobox', { name: 'Languages', exact: true }),
  ).toHaveValue('English');
  await expect(
    page.getByRole('combobox', { name: 'Level of knowledge' }),
  ).toHaveValue('B2 Upper-Intermediate');
  await expect(
    page.getByRole('combobox', { name: 'Price / hour' }),
  ).toHaveValue('30');
  await expect(
    page.getByRole('article').getByRole('heading', { level: 2 }),
  ).toHaveText(matchingNames);
}

test('copied filter links restore selections after reload and in a fresh browser session', async ({
  page,
  context,
  browser,
}) => {
  await page.goto('/teachers?utm_source=mentor#main-content');
  await expect(page.getByRole('article')).toHaveCount(4);
  await expect(
    page.getByRole('button', { name: 'Copy filter link', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('combobox', { name: 'Languages', exact: true })
    .selectOption('English');
  await page
    .getByRole('combobox', { name: 'Level of knowledge' })
    .selectOption('B2 Upper-Intermediate');
  await page.getByRole('combobox', { name: 'Price / hour' }).selectOption('30');
  await expectFilteredTeachers(page);
  const selectedURL = new URL(page.url());
  expect(selectedURL.searchParams.get('utm_source')).toBe('mentor');
  expect(selectedURL.hash).toBe('#main-content');
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: selectedURL.origin,
  });
  await page
    .getByRole('button', { name: 'Copy filter link', exact: true })
    .click();
  await expect(
    page.getByText(
      'Filter link copied. Share it to show the same teacher filters.',
      { exact: true },
    ),
  ).toBeVisible();
  const copiedLink = await page.evaluate(() => navigator.clipboard.readText());
  const copiedURL = new URL(copiedLink);
  expect(copiedURL.origin).toBe(selectedURL.origin);
  expect(copiedURL.pathname).toBe('/teachers');
  expect(Object.fromEntries(copiedURL.searchParams)).toEqual({
    language: 'English',
    level: 'B2 Upper-Intermediate',
    maxPrice: '30',
  });
  expect(copiedURL.hash).toBe('');
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(5);
  await page.reload();
  await expectFilteredTeachers(page);

  const sharedContext = await browser.newContext();
  try {
    const sharedPage = await sharedContext.newPage();
    checks.get(page).push(await monitor(sharedPage));
    await sharedPage.goto(copiedLink);
    await expectFilteredTeachers(sharedPage);
  } finally {
    await sharedContext.close();
  }
});

test('invalid and repeated filters are normalized while changes and reset preserve other URL data', async ({
  page,
}) => {
  await page.goto(
    '/teachers?utm_source=mentor&language=English&language=French&level=unknown&maxPrice=abc#main-content',
  );
  await expect(page.getByRole('article')).toHaveCount(4);
  await expect(page).toHaveURL((url) => {
    return (
      url.searchParams.getAll('language').length === 1 &&
      url.searchParams.get('language') === 'English' &&
      !url.searchParams.has('level') &&
      !url.searchParams.has('maxPrice') &&
      url.searchParams.get('utm_source') === 'mentor' &&
      url.hash === '#main-content'
    );
  });
  await expect(
    page.getByRole('combobox', { name: 'Languages', exact: true }),
  ).toHaveValue('English');
  await expect(
    page.getByRole('combobox', { name: 'Level of knowledge' }),
  ).toHaveValue('');
  await expect(
    page.getByRole('combobox', { name: 'Price / hour' }),
  ).toHaveValue('');
  await page
    .getByRole('combobox', { name: 'Level of knowledge' })
    .selectOption('B2 Upper-Intermediate');
  await page.getByRole('combobox', { name: 'Price / hour' }).selectOption('30');
  await expectFilteredTeachers(page);
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page).toHaveURL('/teachers?utm_source=mentor#main-content');
  for (const name of ['Languages', 'Level of knowledge', 'Price / hour']) {
    await expect(page.getByRole('combobox', { name, exact: true })).toHaveValue(
      '',
    );
  }
  await expect(page.getByRole('article')).toHaveCount(4);
  await expect(
    page.getByRole('button', { name: 'Copy filter link', exact: true }),
  ).toHaveCount(0);
});

for (const clipboardState of ['unavailable', 'rejected']) {
  test(`copying gives a useful fallback when the clipboard is ${clipboardState}`, async ({
    page,
  }) => {
    await page.addInitScript((state) => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value:
          state === 'unavailable'
            ? undefined
            : {
                writeText: () => Promise.reject(new Error('Copy denied')),
              },
      });
    }, clipboardState);
    await page.goto('/teachers?language=English');
    await expect(page.getByRole('article')).toHaveCount(4);
    const copy = page.getByRole('button', {
      name: 'Copy filter link',
      exact: true,
    });
    await copy.click();
    await expect(
      page.getByText(
        'We could not copy the link. Copy the address from your browser instead.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(copy).toBeEnabled();
    await expect(page).toHaveURL('/teachers?language=English');
  });
}

test('copy remains disabled until the clipboard request finishes', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((resolve) => {
            window.finishClipboardCopy = resolve;
          }),
      },
    });
  });
  await page.goto('/teachers?language=English');
  await expect(page.getByRole('article')).toHaveCount(4);
  await page
    .getByRole('button', { name: 'Copy filter link', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Copying…', exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => window.finishClipboardCopy());
  await expect(
    page.getByRole('button', { name: 'Copy filter link', exact: true }),
  ).toBeEnabled();
});

test('favorite filters stay private without a copy action', async ({
  page,
}) => {
  await page.goto('/teachers');
  await expect(page.getByRole('article')).toHaveCount(4);
  await signIn(page);
  await expect(page.locator('.user-name')).toHaveText('Taylor Example');
  await page.getByRole('button', { name: 'Add John Doe to favorites' }).click();
  await page.getByRole('link', { name: 'Favorites', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page
    .getByRole('combobox', { name: 'Languages', exact: true })
    .selectOption('English');
  await expect(
    page.getByRole('button', { name: 'Reset filters' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Copy filter link', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(
    page.getByRole('combobox', { name: 'Languages', exact: true }),
  ).toHaveValue('English');
});

for (const width of [375, 768]) {
  test(`filter actions fit and remain usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(
      '/teachers?language=English&level=B2+Upper-Intermediate&maxPrice=30',
    );
    await expectFilteredTeachers(page);
    for (const name of ['Copy filter link', 'Reset filters']) {
      const action = page.getByRole('button', { name, exact: true });
      await expect(action).toBeVisible();
      const bounds = await action.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    }
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page).toHaveURL('/teachers');
    await expect(page.getByRole('article')).toHaveCount(4);
  });
}
