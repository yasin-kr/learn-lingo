import { test, expect } from '@playwright/test';
import {
  mockFirebase,
  readPersistedAuth,
  signIn,
  testAccounts,
} from './helpers/firebase';

const browserErrors = new WeakMap();
const firebaseFixtures = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  browserErrors.set(page, errors);
  firebaseFixtures.set(page, await mockFirebase(page));
  page.on('pageerror', (error) => errors.push({ message: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error')
      errors.push({ message: message.text(), url: message.location().url });
  });
});

test.afterEach(async ({ page }) => {
  const firebase = firebaseFixtures.get(page);
  const unexpectedErrors = browserErrors
    .get(page)
    .filter(
      (error) =>
        !(
          error.message.startsWith('Failed to load resource:') &&
          firebase.expectedFailures.has(error.url)
        ),
    );
  expect(unexpectedErrors, 'Browser console and runtime errors').toEqual([]);
  expect(firebase.unexpectedRequests, 'Unexpected Firebase requests').toEqual(
    [],
  );
});

async function openTeachers(page) {
  await page.goto('/teachers');
  await expect(page.getByRole('article')).toHaveCount(4);
}

async function openBooking(page) {
  await openTeachers(page);
  const card = page.getByRole('article', { name: 'John Doe, language tutor' });
  await card.getByRole('button', { name: 'Read more', exact: true }).click();
  await expect(
    card.getByRole('list', { name: 'Student reviews for John Doe' }),
  ).toBeVisible();
  await card
    .getByRole('button', { name: 'Book trial lesson', exact: true })
    .click();
  return page.getByRole('dialog', { name: 'Book trial lesson' });
}

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
}

async function capture(page, testInfo, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll((images) => {
    images.forEach((image) => {
      image.loading = 'eager';
    });
  });
  await expect
    .poll(
      () =>
        page
          .locator('img')
          .evaluateAll((images) =>
            images.every((image) => image.complete && image.naturalWidth > 0),
          ),
      {
        message: 'All screenshot images have finished loading',
        timeout: 15000,
      },
    )
    .toBe(true);
  const dialogOpen = await page.getByRole('dialog').isVisible();
  await page.screenshot({
    path: testInfo.outputPath(name),
    fullPage: !dialogOpen,
    animations: 'disabled',
  });
}

test('initial four teachers expand to eight after a new data request', async ({
  page,
}, testInfo) => {
  await openTeachers(page);
  await capture(page, testInfo, 'teachers-desktop.png');
  const firstNames = await page
    .getByRole('article')
    .getByRole('heading', { level: 2 })
    .allTextContents();
  const nextResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/teachers.json' &&
      new URL(response.url()).searchParams.has('startAt') &&
      response.request().method() === 'GET',
  );
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  const response = await nextResponse;
  expect(response.ok()).toBeTruthy();
  const query = new URL(response.url()).searchParams;
  expect(JSON.parse(query.get('orderBy'))).toBe('$key');
  expect(JSON.parse(query.get('startAt'))).toMatch(/^teacher-\d{3}$/);
  expect(Number(query.get('limitToFirst'))).toBeLessThanOrEqual(6);
  await expect(page.getByRole('article')).toHaveCount(8);
  const nextNames = await page
    .getByRole('article')
    .getByRole('heading', { level: 2 })
    .allTextContents();
  expect(nextNames.slice(0, 4)).toEqual(firstNames);
  expect(new Set(nextNames).size).toBe(8);
  const firstCard = page.getByRole('article').first();
  await firstCard
    .getByRole('button', { name: 'Read more', exact: true })
    .click();
  await firstCard.screenshot({
    path: testInfo.outputPath('expanded-teacher.png'),
    animations: 'disabled',
  });
});

test('language, level and maximum price combine and reset', async ({
  page,
}) => {
  await openTeachers(page);
  await page
    .getByRole('combobox', { name: 'Languages', exact: true })
    .selectOption('English');
  await page
    .getByRole('combobox', { name: 'Level of knowledge' })
    .selectOption('B2 Upper-Intermediate');
  await page.getByRole('combobox', { name: 'Price / hour' }).selectOption('30');
  await expect(
    page.getByRole('article').getByRole('heading', { level: 2 }),
  ).toHaveText(['John Doe', 'Ethan Gonzalez', 'Ava Cooper', 'Sophie Davis']);
  await expect(page.getByRole('status')).toContainText('Showing 4 teachers.');
  const requestsBeforeMore = firebaseFixtures.get(page).databaseRequests.length;
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(5);
  await expect(
    page.getByRole('article').last().getByRole('heading', { level: 2 }),
  ).toHaveText('James Robinson');
  await expect(
    page.getByRole('button', { name: 'Load more', exact: true }),
  ).toHaveCount(0);
  expect(firebaseFixtures.get(page).databaseRequests.length).toBeGreaterThan(
    requestsBeforeMore,
  );
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(
    page.getByRole('combobox', { name: 'Languages', exact: true }),
  ).toHaveValue('');
  await expect(
    page.getByRole('combobox', { name: 'Level of knowledge' }),
  ).toHaveValue('');
  await expect(
    page.getByRole('combobox', { name: 'Price / hour' }),
  ).toHaveValue('');
  await expect(page.getByRole('article')).toHaveCount(4);
  await expect(page.getByRole('status')).toContainText('Showing 4 teachers.');
});

test('a failed next page preserves teachers and retries without duplicates', async ({
  page,
}) => {
  await openTeachers(page);
  const firstNames = await page
    .getByRole('article')
    .getByRole('heading', { level: 2 })
    .allTextContents();
  firebaseFixtures.get(page).failNextDatabaseRequest();
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'We could not load the teachers.',
  );
  await expect(page.getByRole('article')).toHaveCount(4);
  await expect(
    page.getByRole('article').getByRole('heading', { level: 2 }),
  ).toHaveText(firstNames);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(8);
  await expect(page.getByRole('alert')).toHaveCount(0);
  const allNames = await page
    .getByRole('article')
    .getByRole('heading', { level: 2 })
    .allTextContents();
  expect(allNames.slice(0, 4)).toEqual(firstNames);
  expect(new Set(allNames).size).toBe(8);
});

test('favorites require a session and remain saved after refresh', async ({
  page,
}) => {
  await openTeachers(page);
  await page.getByRole('button', { name: 'Add John Doe to favorites' }).click();
  const accessDialog = page.getByRole('dialog', {
    name: 'Keep your favorites close',
  });
  await expect(accessDialog).toBeVisible();
  await accessDialog.getByRole('button', { name: 'Create an account' }).click();
  const registration = page.getByRole('dialog', { name: 'Registration' });
  await expect(registration.getByText(/Preview mode/)).toHaveCount(0);
  await registration
    .getByRole('button', { name: 'Sign Up', exact: true })
    .click();
  for (const field of ['Name', 'Email', 'Password']) {
    await expect(
      registration.getByLabel(field, { exact: true }),
    ).toHaveAttribute('aria-invalid', 'true');
  }
  await registration.getByLabel('Name', { exact: true }).fill('Taylor Example');
  await registration.getByLabel('Email', { exact: true }).fill('not-an-email');
  await registration.getByLabel('Password', { exact: true }).fill('123');
  await registration
    .getByRole('button', { name: 'Sign Up', exact: true })
    .click();
  await expect(
    registration.getByText('Enter a valid email address.'),
  ).toBeVisible();
  await expect(
    registration.getByText('Use at least 6 characters.'),
  ).toBeVisible();
  await registration
    .getByLabel('Email', { exact: true })
    .fill('taylor.new@example.com');
  await registration
    .getByLabel('Password', { exact: true })
    .fill('Example-only-987');
  await registration.getByRole('button', { name: 'Show password' }).click();
  await expect(
    registration.getByLabel('Password', { exact: true }),
  ).toHaveAttribute('type', 'text');
  await registration.getByRole('button', { name: 'Hide password' }).click();
  await registration
    .getByRole('button', { name: 'Sign Up', exact: true })
    .click();
  await expect(registration).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Log out', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.user-name')).toHaveText('Taylor Example');
  const firebase = firebaseFixtures.get(page);
  expect(firebase.authRequests.map(({ action }) => action)).toContain('signUp');
  expect(firebase.authRequests.map(({ action }) => action)).toContain('update');
  const account = firebase.users.get('taylor.new@example.com');
  await expect
    .poll(async () =>
      (await readPersistedAuth(page)).some(
        (entry) => entry.value?.uid === account.uid,
      ),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Add John Doe to favorites' }).click();
  await expect(
    page.getByRole('button', { name: 'Remove John Doe from favorites' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('.user-name')).toHaveText('Taylor Example');
  await expect(
    page.getByRole('button', { name: 'Remove John Doe from favorites' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Favorites', exact: true }).click();
  await expect(page).toHaveURL('/favorites');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'John Doe', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Remove John Doe from favorites' })
    .click();
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Find a teacher you connect with' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Find a teacher you connect with' }),
  ).toBeVisible();
  const savedValues = await page.evaluate(() =>
    JSON.stringify({ ...localStorage }),
  );
  expect(savedValues).not.toContain('Example-only-987');
  expect(JSON.stringify(await readPersistedAuth(page))).not.toContain(
    'Example-only-987',
  );
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your favorite tutors, all together' }),
  ).toBeVisible();
});

test('Firebase rejects duplicate email and a wrong password before accepting login', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Registration', exact: true }).click();
  const registration = page.getByRole('dialog', { name: 'Registration' });
  await registration.getByLabel('Name', { exact: true }).fill('Taylor Example');
  await registration
    .getByLabel('Email', { exact: true })
    .fill(testAccounts.taylor.email);
  await registration
    .getByLabel('Password', { exact: true })
    .fill(testAccounts.taylor.password);
  await registration
    .getByRole('button', { name: 'Sign Up', exact: true })
    .click();
  await expect(registration.getByRole('alert')).toHaveText(
    'This email is already registered. Please log in instead.',
  );
  await expect(page.getByRole('button', { name: 'Log out' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  const login = page.getByRole('dialog', { name: 'Log In', exact: true });
  await login.getByRole('button', { name: 'Log In', exact: true }).click();
  for (const field of ['Email', 'Password']) {
    await expect(login.getByLabel(field, { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  }
  await login
    .getByLabel('Email', { exact: true })
    .fill(testAccounts.taylor.email);
  await login
    .getByLabel('Password', { exact: true })
    .fill('Wrong-password-999');
  await login.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(login.getByRole('alert')).toHaveText(
    'The email or password is incorrect. Please try again.',
  );
  await expect(page.getByRole('button', { name: 'Log out' })).toHaveCount(0);
  await login
    .getByLabel('Password', { exact: true })
    .fill(testAccounts.taylor.password);
  await login.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(login).toHaveCount(0);
  await expect(page.locator('.user-name')).toHaveText('Taylor Example');
  expect(
    firebaseFixtures
      .get(page)
      .authRequests.filter(({ action }) => action === 'signInWithPassword'),
  ).toHaveLength(2);
});

test('favorites are isolated by Firebase UID across sign out and account changes', async ({
  page,
}) => {
  await openTeachers(page);
  await signIn(page);
  await expect(page.locator('.user-name')).toHaveText('Taylor Example');
  await page.getByRole('button', { name: 'Add John Doe to favorites' }).click();
  await expect(
    page.getByRole('button', { name: 'Remove John Doe from favorites' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Favorites', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your favorite tutors, all together' }),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect
    .poll(async () =>
      (await readPersistedAuth(page)).some((entry) =>
        Boolean(entry.value?.uid),
      ),
    )
    .toBe(false);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Your favorite tutors, all together' }),
  ).toBeVisible();
  await signIn(page, testAccounts.robin);
  await expect(page.locator('.user-name')).toHaveText('Robin Example');
  await expect(
    page.getByRole('heading', { name: 'Find a teacher you connect with' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Teachers', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(4);
  await expect(
    page.getByRole('button', { name: 'Add John Doe to favorites' }),
  ).toHaveAttribute('aria-pressed', 'false');
  await page
    .getByRole('button', { name: 'Add Jane Smith to favorites' })
    .click();
  await page.getByRole('link', { name: 'Favorites', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(
    page.getByRole('article').getByRole('heading', { level: 2 }),
  ).toHaveText('Jane Smith');
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await signIn(page);
  await expect(page.locator('.user-name')).toHaveText('Taylor Example');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(
    page.getByRole('article').getByRole('heading', { level: 2 }),
  ).toHaveText('John Doe');
  const favorites = await page.evaluate(() =>
    Object.fromEntries(
      Object.entries(localStorage).filter(([key]) =>
        key.startsWith('learnlingo:favorites:'),
      ),
    ),
  );
  expect(
    JSON.parse(favorites[`learnlingo:favorites:${testAccounts.taylor.uid}`]),
  ).toEqual(['teacher-001']);
  expect(
    JSON.parse(favorites[`learnlingo:favorites:${testAccounts.robin.uid}`]),
  ).toEqual(['teacher-002']);
});

test('direct access to Favorites offers login without exposing cards', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'learnlingo:preview-user',
      JSON.stringify({
        id: 'taylor@example.com',
        name: 'Legacy preview',
        email: 'taylor@example.com',
      }),
    );
    localStorage.setItem(
      'learnlingo:favorites:taylor@example.com',
      JSON.stringify(['teacher-001']),
    );
  });
  await page.goto('/favorites');
  await expect(
    page.getByRole('heading', { name: 'Your favorite tutors, all together' }),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Log in', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Log In', exact: true }),
  ).toBeVisible();
});

test('booking validates fields and clearly confirms only a local preview', async ({
  page,
}, testInfo) => {
  const mutations = [];
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()))
      mutations.push(request.url());
  });
  const dialog = await openBooking(page);
  await capture(page, testInfo, 'booking-desktop.png');
  await expect(dialog.getByText('John Doe', { exact: true })).toBeVisible();
  await expect(
    dialog.getByText('Preview mode. This form does not send a booking.'),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Book', exact: true }).click();
  for (const field of ['Full Name', 'Email', 'Phone number']) {
    await expect(dialog.getByLabel(field, { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  }
  await dialog.getByLabel('Full Name', { exact: true }).fill('Taylor Example');
  await dialog.getByLabel('Email', { exact: true }).fill('invalid-email');
  await dialog.getByLabel('Phone number', { exact: true }).fill('abc');
  await dialog.getByRole('button', { name: 'Book', exact: true }).click();
  await expect(dialog.getByText('Enter a valid email address.')).toBeVisible();
  await expect(
    dialog.getByLabel('Phone number', { exact: true }),
  ).toHaveAttribute('aria-invalid', 'true');
  await dialog.getByLabel('Email', { exact: true }).fill('taylor@example.com');
  await dialog
    .getByLabel('Phone number', { exact: true })
    .fill('+90 555 123 45 67');
  await dialog.getByRole('radio', { name: 'Living abroad' }).check();
  await dialog.getByRole('button', { name: 'Book', exact: true }).click();
  const confirmation = page.getByRole('dialog', {
    name: 'Your lesson request is ready',
  });
  await expect(confirmation).toBeVisible();
  await expect(
    confirmation.getByText('Living abroad', { exact: true }),
  ).toBeVisible();
  await expect(
    confirmation.getByText(/This preview does not send a booking/),
  ).toBeVisible();
  expect(mutations).toEqual([]);
  await confirmation.getByRole('button', { name: 'Back to teachers' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const method of ['Escape', 'close button', 'backdrop']) {
  test(`modal closes with ${method} and returns focus`, async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Log in', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Log In', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Email', { exact: true }).click();
    await expect(dialog).toBeVisible();
    if (method === 'Escape') await page.keyboard.press('Escape');
    if (method === 'close button')
      await dialog.getByRole('button', { name: 'Close dialog' }).click();
    if (method === 'backdrop')
      await page.locator('.modal-backdrop').click({ position: { x: 8, y: 8 } });
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });
}

test('keyboard focus stays inside the modal in both directions', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Registration', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Registration' });
  await capture(page, testInfo, 'registration-desktop.png');
  const close = dialog.getByRole('button', { name: 'Close dialog' });
  const submit = dialog.getByRole('button', { name: 'Sign Up', exact: true });
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(submit).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Log In', exact: true }),
  ).toBeVisible();
  await capture(page, testInfo, 'login-desktop.png');
});

test('themes cycle on reload, menu navigation preserves them, and the logo reloads home', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'yellow');
  await capture(page, testInfo, 'home-yellow-desktop.png');
  await page.getByRole('link', { name: 'Get started', exact: true }).click();
  await expect(page).toHaveURL('/teachers');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'yellow');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'yellow');
  for (const theme of ['green', 'blue', 'pink', 'peach', 'yellow']) {
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(
      page.getByRole('img', { name: 'LearnLingo', exact: true }),
    ).toHaveAttribute('src', `/images/logo-${theme}.svg`);
    await expect(
      page.getByRole('img', {
        name: 'A friendly language tutor ready to meet you online',
      }),
    ).toHaveAttribute('src', `/images/hero-${theme}.png`);
    await capture(page, testInfo, `home-${theme}-desktop.png`);
  }

  await page.getByRole('link', { name: 'Teachers', exact: true }).click();
  await expect(page).toHaveURL('/teachers');

  for (const theme of ['green', 'blue']) {
    const documentRequest = page.waitForRequest(
      (request) =>
        request.isNavigationRequest() &&
        request.resourceType() === 'document' &&
        new URL(request.url()).pathname === '/',
    );
    await page.getByRole('link', { name: 'LearnLingo home' }).click();
    await documentRequest;
    await expect(page).toHaveURL('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Unlock your potential',
    );
  }
});

for (const density of [1, 2]) {
  test.describe(`screen density ${density}`, () => {
    test.use({ deviceScaleFactor: density });

    test('loads the matching hero image resolution', async ({ page }) => {
      await page.goto('/');
      const hero = page.getByRole('img', {
        name: 'A friendly language tutor ready to meet you online',
      });
      const expected =
        density === 2
          ? '/images/hero-yellow@2x.png'
          : '/images/hero-yellow.png';
      await expect
        .poll(() =>
          hero.evaluate(
            (element) =>
              element.complete &&
              element.naturalWidth > 0 &&
              new URL(element.currentSrc).pathname,
          ),
        )
        .toBe(expected);
    });
  });
}

for (const width of [375, 768]) {
  test(`layout and booking stay inside a ${width}px viewport`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, `home-${width}.png`);
    await page.getByRole('link', { name: 'Get started', exact: true }).click();
    await expect(page.getByRole('article')).toHaveCount(4);
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, `teachers-${width}.png`);
    const firstCard = page.getByRole('article').first();
    await firstCard
      .getByRole('button', { name: 'Read more', exact: true })
      .click();
    await expectNoHorizontalOverflow(page);
    await firstCard.getByRole('button', { name: 'Book trial lesson' }).click();
    const dialog = page.getByRole('dialog', { name: 'Book trial lesson' });
    await expect(dialog).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, `booking-${width}.png`);
    const bounds = await dialog.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
}
