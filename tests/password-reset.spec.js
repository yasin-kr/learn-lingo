import { test, expect } from '@playwright/test';
import {
  mockFirebase,
  readPersistedAuth,
  testAccounts,
} from './helpers/firebase';

const fixtures = new WeakMap();
const consoleErrors = new WeakMap();
const confirmation =
  'If an account exists for this email address, you will receive a password reset link.';

test.beforeEach(async ({ page }) => {
  fixtures.set(page, await mockFirebase(page));
  const errors = [];
  consoleErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push({ message: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push({ message: message.text(), url: message.location().url });
    }
  });
});

test.afterEach(async ({ page }) => {
  const firebase = fixtures.get(page);
  expect(firebase.unexpectedRequests).toEqual([]);
  expect(
    consoleErrors
      .get(page)
      .filter(
        (error) =>
          !(
            error.message.startsWith('Failed to load resource:') &&
            firebase.expectedFailures.has(error.url)
          ),
      ),
  ).toEqual([]);
});

async function openReset(page) {
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Log in', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Forgot password?', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Reset password',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  return dialog;
}

function resetRequests(page) {
  return fixtures
    .get(page)
    .authRequests.filter(({ action }) => action === 'sendOobCode');
}

test('password reset validates email, sends one request, and returns to login on mobile', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const dialog = await openReset(page);
  await expect(dialog.getByLabel('Password', { exact: true })).toHaveCount(0);
  const submit = dialog.getByRole('button', {
    name: 'Send reset link',
    exact: true,
  });
  await submit.click();
  await expect(
    dialog.getByText('Email is required.', { exact: true }),
  ).toBeVisible();
  await dialog.getByLabel('Email', { exact: true }).fill('invalid-email');
  await submit.click();
  await expect(
    dialog.getByText('Enter a valid email address.', { exact: true }),
  ).toBeVisible();
  expect(resetRequests(page)).toHaveLength(0);
  await dialog
    .getByLabel('Email', { exact: true })
    .fill(` ${testAccounts.taylor.email} `);
  const release = fixtures.get(page).holdNextPasswordResetRequest();
  try {
    await submit.click();
    await expect(
      dialog.getByRole('button', { name: 'Sending…', exact: true }),
    ).toBeDisabled();
    await dialog.getByLabel('Email', { exact: true }).press('Enter');
    await expect.poll(() => resetRequests(page).length).toBe(1);
    expect(resetRequests(page)[0].body).toMatchObject({
      requestType: 'PASSWORD_RESET',
      email: testAccounts.taylor.email,
    });
  } finally {
    release();
  }
  const success = page.getByRole('dialog', {
    name: 'Check your email',
    exact: true,
  });
  await expect(success.getByText(confirmation, { exact: true })).toBeVisible();
  await expect(
    success.getByRole('heading', { name: 'Check your email', exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  expect((await success.boundingBox()).width).toBeLessThanOrEqual(375);
  await page.screenshot({
    path: testInfo.outputPath('password-reset-mobile.png'),
  });
  await success
    .getByRole('button', { name: 'Back to log in', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Log In', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Log out', exact: true }),
  ).toHaveCount(0);
  expect(await readPersistedAuth(page)).toEqual([]);
});

test('password reset gives the same acknowledgment for registered and unknown emails', async ({
  page,
}) => {
  await page.goto('/');
  for (const email of [testAccounts.taylor.email, 'unknown@example.com']) {
    const dialog = await openReset(page);
    await dialog.getByLabel('Email', { exact: true }).fill(email);
    await dialog
      .getByRole('button', { name: 'Send reset link', exact: true })
      .click();
    const success = page.getByRole('dialog', {
      name: 'Check your email',
      exact: true,
    });
    await expect(
      success.getByText(confirmation, { exact: true }),
    ).toBeVisible();
    await success.getByRole('button', { name: 'Close dialog' }).click();
  }
  expect(resetRequests(page)).toHaveLength(2);
  expect(fixtures.get(page).users.size).toBe(2);
  expect(await readPersistedAuth(page)).toEqual([]);
});

for (const [failure, message] of [
  [
    'TOO_MANY_ATTEMPTS_TRY_LATER',
    'Too many attempts. Please wait a few minutes before trying again.',
  ],
  [
    'NETWORK_FAILURE',
    'We could not connect. Please check your connection and try again.',
  ],
]) {
  test(`password reset recovers from ${failure} without losing the email`, async ({
    page,
  }) => {
    await page.goto('/');
    const dialog = await openReset(page);
    const firebase = fixtures.get(page);
    firebase.failNextPasswordResetRequest(failure);
    await dialog
      .getByLabel('Email', { exact: true })
      .fill(testAccounts.taylor.email);
    const submit = dialog.getByRole('button', {
      name: 'Send reset link',
      exact: true,
    });
    await submit.click();
    await expect(dialog.getByRole('alert')).toHaveText(message);
    await expect(dialog.getByLabel('Email', { exact: true })).toHaveValue(
      testAccounts.taylor.email,
    );
    await expect(submit).toBeEnabled();
    await expect(
      page.getByRole('dialog', { name: 'Check your email', exact: true }),
    ).toHaveCount(0);
    await submit.click();
    await expect(
      page.getByRole('dialog', { name: 'Check your email', exact: true }),
    ).toBeVisible();
    expect(resetRequests(page)).toHaveLength(2);
  });
}

test('password reset supports close, backdrop, Escape, and returning before submission', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  for (const method of ['close', 'backdrop', 'escape', 'back']) {
    const dialog = await openReset(page);
    if (method === 'close') {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: testInfo.outputPath('password-reset-desktop.png'),
      });
      await dialog.getByRole('button', { name: 'Close dialog' }).click();
    }
    if (method === 'backdrop')
      await page.locator('.modal-backdrop').click({ position: { x: 8, y: 8 } });
    if (method === 'escape') await page.keyboard.press('Escape');
    if (method === 'back') {
      await dialog
        .getByRole('button', { name: 'Back to log in', exact: true })
        .click();
      await expect(
        page.getByRole('dialog', { name: 'Log In', exact: true }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  }
  expect(resetRequests(page)).toHaveLength(0);
});

test('a completed reset request cannot replace a new modal after being dismissed', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = await openReset(page);
  await dialog
    .getByLabel('Email', { exact: true })
    .fill(testAccounts.taylor.email);
  const release = fixtures.get(page).holdNextPasswordResetRequest();
  try {
    await dialog
      .getByRole('button', { name: 'Send reset link', exact: true })
      .click();
    await expect(
      dialog.getByRole('button', { name: 'Sending…', exact: true }),
    ).toBeDisabled();
    await page.keyboard.press('Escape');
    await page
      .getByRole('banner')
      .getByRole('button', { name: 'Log in', exact: true })
      .click();
    const response = page.waitForResponse((r) =>
      r.url().includes('/accounts:sendOobCode'),
    );
    release();
    await response;
    await expect(
      page.getByRole('dialog', { name: 'Log In', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('dialog', { name: 'Check your email', exact: true }),
    ).toHaveCount(0);
  } finally {
    release();
  }
});
