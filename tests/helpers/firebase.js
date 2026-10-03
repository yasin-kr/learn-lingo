import { readFile } from 'node:fs/promises';

const { teachers } = JSON.parse(
  await readFile(
    new URL('../../firebase/teachers.import.json', import.meta.url),
  ),
);

export const testAccounts = {
  taylor: {
    uid: 'uid-test-taylor',
    email: 'taylor@example.com',
    password: 'Example-only-987',
    displayName: 'Taylor Example',
  },
  robin: {
    uid: 'uid-test-robin',
    email: 'robin@example.com',
    password: 'Example-only-654',
    displayName: 'Robin Example',
  },
};

function idToken(user) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'RS256', typ: 'JWT' }),
    encode({
      iss: 'https://securetoken.google.com/learnlingo-test',
      aud: 'learnlingo-test',
      auth_time: issuedAt,
      user_id: user.uid,
      sub: user.uid,
      iat: issuedAt,
      exp: issuedAt + 3600,
      email: user.email,
      email_verified: false,
      name: user.displayName,
      firebase: {
        identities: { email: [user.email] },
        sign_in_provider: 'password',
      },
    }),
    'test-signature',
  ].join('.');
}

function tokenUser(token, users) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    );
    return [...users.values()].find((user) => user.uid === payload.sub);
  } catch {
    return undefined;
  }
}

function accountResponse(user) {
  return {
    localId: user.uid,
    email: user.email,
    displayName: user.displayName,
    idToken: idToken(user),
    refreshToken: `refresh-${user.uid}`,
    expiresIn: '3600',
    registered: true,
  };
}

export async function mockFirebase(page) {
  const users = new Map(
    Object.values(testAccounts).map((user) => [user.email, { ...user }]),
  );
  const authRequests = [];
  const databaseRequests = [];
  const expectedFailures = new Set();
  const unexpectedRequests = [];
  let databaseFailures = 0;
  const passwordResetFailures = [];
  let passwordResetGate = null;

  const respond = (route, body, status = 200) => {
    if (status >= 400) expectedFailures.add(route.request().url());
    return route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(body),
    });
  };
  const rejectAuth = (route, message) =>
    respond(route, { error: { code: 400, message } }, 400);

  await page.route(
    'https://identitytoolkit.googleapis.com/**',
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === 'OPTIONS') return respond(route, {});
      const action = url.pathname.split(':').pop();
      const body = request.postDataJSON() || {};
      authRequests.push({ action, body });

      if (action === 'sendOobCode') {
        if (body.requestType !== 'PASSWORD_RESET') {
          unexpectedRequests.push(
            `Unexpected email action: ${body.requestType}`,
          );
          return rejectAuth(route, 'INVALID_REQ_TYPE');
        }
        const gate = passwordResetGate;
        passwordResetGate = null;
        if (gate) await gate;
        const failure = passwordResetFailures.shift();
        if (failure === 'NETWORK_FAILURE') {
          expectedFailures.add(request.url());
          return route.abort('failed');
        }
        if (failure) return rejectAuth(route, failure);
        if (!users.has(body.email.trim().toLowerCase())) {
          return rejectAuth(route, 'EMAIL_NOT_FOUND');
        }
        return respond(route, { email: body.email });
      }

      if (action === 'signUp') {
        const email = body.email.trim().toLowerCase();
        if (users.has(email)) return rejectAuth(route, 'EMAIL_EXISTS');
        const user = {
          uid: `uid-test-created-${users.size + 1}`,
          email,
          password: body.password,
          displayName: '',
        };
        users.set(email, user);
        return respond(route, accountResponse(user));
      }

      if (action === 'signInWithPassword') {
        const user = users.get(body.email.trim().toLowerCase());
        if (!user || user.password !== body.password)
          return rejectAuth(route, 'INVALID_LOGIN_CREDENTIALS');
        return respond(route, accountResponse(user));
      }

      if (action === 'update') {
        const user = tokenUser(body.idToken, users);
        if (!user) return rejectAuth(route, 'INVALID_ID_TOKEN');
        if (body.displayName !== undefined) user.displayName = body.displayName;
        return respond(route, accountResponse(user));
      }

      if (action === 'lookup') {
        const user = tokenUser(body.idToken, users);
        if (!user) return rejectAuth(route, 'INVALID_ID_TOKEN');
        return respond(route, {
          users: [
            {
              localId: user.uid,
              email: user.email,
              displayName: user.displayName,
              emailVerified: false,
              passwordHash: 'test-password-hash',
              createdAt: '1700000000000',
              lastLoginAt: String(Date.now()),
              providerUserInfo: [
                {
                  providerId: 'password',
                  rawId: user.email,
                  email: user.email,
                  displayName: user.displayName,
                },
              ],
            },
          ],
        });
      }

      unexpectedRequests.push(
        `${request.method()} ${url.origin}${url.pathname}`,
      );
      return respond(route, { error: 'Unexpected test Auth endpoint' }, 501);
    },
  );

  await page.route('https://securetoken.googleapis.com/**', async (route) => {
    const request = route.request();
    const body = new URLSearchParams(request.postData());
    const user = [...users.values()].find(
      (account) => body.get('refresh_token') === `refresh-${account.uid}`,
    );
    authRequests.push({ action: 'refresh', body: Object.fromEntries(body) });
    if (!user) return rejectAuth(route, 'INVALID_REFRESH_TOKEN');
    return respond(route, {
      access_token: idToken(user),
      id_token: idToken(user),
      refresh_token: `refresh-${user.uid}`,
      expires_in: '3600',
      token_type: 'Bearer',
      user_id: user.uid,
      project_id: 'learnlingo-test',
    });
  });

  await page.route(
    /^https:\/\/[^/]+\.(?:firebasedatabase\.app|firebaseio\.com)\//,
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() !== 'GET') {
        unexpectedRequests.push(`${request.method()} ${url.pathname}`);
        return respond(route, { error: 'Unexpected database mutation' }, 501);
      }
      if (databaseFailures > 0) {
        databaseFailures -= 1;
        databaseRequests.push({ path: url.pathname, failed: true });
        return respond(route, { error: 'Temporarily unavailable' }, 503);
      }
      if (url.pathname === '/teachers.json') {
        const startAt = url.searchParams.has('startAt')
          ? JSON.parse(url.searchParams.get('startAt'))
          : null;
        const limit = Number(url.searchParams.get('limitToFirst'));
        const orderBy = url.searchParams.has('orderBy')
          ? JSON.parse(url.searchParams.get('orderBy'))
          : null;
        databaseRequests.push({ path: url.pathname, startAt, limit, orderBy });
        const entries = Object.entries(teachers)
          .sort(([first], [second]) => first.localeCompare(second))
          .filter(([key]) => startAt === null || key >= startAt);
        const result = limit ? entries.slice(0, limit) : entries;
        return respond(
          route,
          result.length ? Object.fromEntries(result) : null,
        );
      }
      const teacherId = url.pathname.match(/^\/teachers\/(teacher-\d+)\.json$/);
      if (teacherId) {
        databaseRequests.push({ path: url.pathname, id: teacherId[1] });
        return respond(route, teachers[teacherId[1]] || null);
      }
      unexpectedRequests.push(`${request.method()} ${url.pathname}`);
      return respond(route, { error: 'Unexpected database endpoint' }, 501);
    },
  );

  return {
    users,
    authRequests,
    databaseRequests,
    expectedFailures,
    unexpectedRequests,
    failNextDatabaseRequest() {
      databaseFailures += 1;
    },
    failNextPasswordResetRequest(message) {
      passwordResetFailures.push(message);
    },
    holdNextPasswordResetRequest() {
      let release;
      passwordResetGate = new Promise((resolve) => {
        release = resolve;
      });
      return release;
    },
  };
}

export async function signIn(page, account = testAccounts.taylor) {
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Log in', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Log In', exact: true });
  await dialog.getByLabel('Email', { exact: true }).fill(account.email);
  await dialog.getByLabel('Password', { exact: true }).fill(account.password);
  await dialog.getByRole('button', { name: 'Log In', exact: true }).click();
}

export async function readPersistedAuth(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('firebaseLocalStorageDb');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains('firebaseLocalStorage')) {
            database.close();
            resolve([]);
            return;
          }
          const transaction = database.transaction('firebaseLocalStorage');
          const values = transaction
            .objectStore('firebaseLocalStorage')
            .getAll();
          values.onsuccess = () => resolve(values.result);
          values.onerror = () => reject(values.error);
          transaction.oncomplete = () => database.close();
        };
      }),
  );
}
