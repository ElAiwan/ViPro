import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAuthStore } from './auth-store.mjs';
import { createAuthServer } from './http.mjs';

const origin = 'http://localhost:5173';
const temporary = 'Startwort-nur-fuer-Test!';
const password = 'Mein neues sicheres Passwort!';

async function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'brudello-auth-'));
  const messages = [];
  let time = Date.now();
  const store = createAuthStore({ filename: join(directory, 'auth.sqlite'), origin,
    now: () => time, deliverReset: async message => messages.push(message) });
  await store.createUser({ email: 'admin@brudello.local', name: 'Brudello Admin', password: temporary });
  const server = createAuthServer({ store, origin, now: () => time });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, body, cookie = '', extra = {}) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Brudello-Request': '1', Cookie: cookie, ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
  }
  const login = (value = temporary, remember = false) => request('/api/auth/login', { email: ' ADMIN@BRUDELLO.LOCAL ', password: value, remember });
  return { store, request, login, messages, advance: ms => { time += ms; } };
}

test('login requires real credentials, uses a protected cookie and restricts temporary sessions', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/home')).status, 401);
  const invalid = await f.login('wrong');
  const unknown = await f.request('/api/auth/login', { email: 'unknown@example.org', password: 'wrong' });
  assert.equal(invalid.status, 401);
  assert.deepEqual(invalid.body, unknown.body);
  const signedIn = await f.login();
  assert.equal(signedIn.status, 200);
  assert.equal(signedIn.body.user.mustChangePassword, true);
  assert.match(signedIn.headers.get('set-cookie'), /HttpOnly/);
  assert.match(signedIn.headers.get('set-cookie'), /SameSite=Strict/);
  assert.equal((await f.request('/api/home', undefined, signedIn.cookie)).status, 403);
  assert.equal((await f.request('/api/auth/session', undefined, signedIn.cookie)).body.user.email, 'admin@brudello.local');
});

test('first password change validates and revokes existing sessions before permitting home', async t => {
  const f = await fixture(t);
  const first = await f.login();
  const second = await f.login();
  assert.equal((await f.request('/api/auth/change-password', { password: 'short', confirmation: 'short' }, first.cookie)).status, 400);
  assert.equal((await f.request('/api/auth/change-password', { password, confirmation: 'different' }, first.cookie)).status, 400);
  assert.equal((await f.request('/api/auth/change-password', { password: temporary, confirmation: temporary }, first.cookie)).status, 400);
  assert.equal((await f.request('/api/auth/change-password', { password, confirmation: password }, first.cookie)).status, 200);
  assert.equal((await f.request('/api/auth/session', undefined, second.cookie)).status, 401);
  assert.equal((await f.login()).status, 401);
  const permanent = await f.login(password, true);
  assert.equal(permanent.body.user.mustChangePassword, false);
  assert.match(permanent.headers.get('set-cookie'), /Max-Age=1209600/);
  assert.equal((await f.request('/api/home', undefined, permanent.cookie)).status, 200);
  await f.request('/api/auth/logout', {}, permanent.cookie);
  assert.equal((await f.request('/api/home', undefined, permanent.cookie)).status, 401);
});

test('recovery is generic, tokens expire, are single-use and revoke all sessions', async t => {
  const f = await fixture(t);
  const first = await f.login();
  const known = await f.request('/api/auth/forgot-password', { email: 'admin@brudello.local' });
  const unknown = await f.request('/api/auth/forgot-password', { email: 'absent@example.org' });
  assert.deepEqual(known.body, unknown.body);
  assert.equal(f.messages.length, 1);
  const token = new URLSearchParams(new URL(f.messages[0].url).hash.split('?')[1]).get('token');
  assert.equal(JSON.stringify(known.body).includes(token), false);
  assert.equal((await f.request('/api/auth/reset-password', { token: 'invalid', password, confirmation: password })).status, 400);
  assert.equal((await f.request('/api/auth/reset-password', { token, password, confirmation: password })).status, 200);
  assert.equal((await f.request('/api/auth/reset-password', { token, password, confirmation: password })).status, 400);
  assert.equal((await f.request('/api/home', undefined, first.cookie)).status, 401);
  assert.equal((await f.login(password)).status, 200);
  await f.request('/api/auth/forgot-password', { email: 'admin@brudello.local' });
  const expired = new URLSearchParams(new URL(f.messages[1].url).hash.split('?')[1]).get('token');
  f.advance(31 * 60_000);
  assert.equal((await f.request('/api/auth/reset-password', { token: expired, password: temporary, confirmation: temporary })).status, 400);
});

test('simultaneous use of a reset token permits exactly one password change', async t => {
  const f = await fixture(t);
  await f.request('/api/auth/forgot-password', { email: 'admin@brudello.local' });
  const token = new URLSearchParams(new URL(f.messages[0].url).hash.split('?')[1]).get('token');
  const results = await Promise.all([
    f.request('/api/auth/reset-password', { token, password, confirmation: password }),
    f.request('/api/auth/reset-password', { token, password: 'Ein anderes gutes Passwort!', confirmation: 'Ein anderes gutes Passwort!' }),
  ]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 400]);
});

test('expiry, origin checks, input validation and rate limits apply on the server', async t => {
  const f = await fixture(t);
  const signedIn = await f.login();
  f.advance(16 * 60_000);
  assert.equal((await f.request('/api/auth/session', undefined, signedIn.cookie)).status, 401);
  assert.equal((await f.request('/api/auth/login', { email: 'admin@brudello.local', password: temporary }, '', { Origin: 'http://evil.example' })).status, 403);
  assert.equal((await f.request('/api/auth/login', { email: [], password: {} })).status, 400);
  assert.equal((await f.request('/api/auth/login', null)).status, 400);
  for (let i = 0; i < 10; i++) await f.login('wrong');
  assert.equal((await f.login()).status, 429);
  f.advance(73 * 60 * 60_000);
  assert.equal((await f.login()).status, 401);
});

test('accounts persist across reopening and the database never stores the password', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'brudello-persist-'));
  const filename = join(directory, 'auth.sqlite');
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  let store = createAuthStore({ filename, origin, deliverReset: async () => {} });
  await store.createUser({ email: 'persist@example.org', name: 'Persistence', password, mustChangePassword: false });
  assert.throws(() => store.db.prepare('SELECT password FROM users').get());
  const row = store.db.prepare('SELECT password_hash FROM users').get();
  assert.notEqual(row.password_hash, password);
  assert.match(row.password_hash, /^scrypt\$/);
  store.close();
  store = createAuthStore({ filename, origin, deliverReset: async () => {} });
  assert.equal((await store.login('persist@example.org', password)).user.name, 'Persistence');
  store.close();
});

test('logout still revokes access when the request rate limit is exhausted', async t => {
  const f = await fixture(t);
  const signedIn = await f.login();
  for (let i = 0; i < 60; i++) await f.request('/api/not-found', {});
  assert.equal((await f.request('/api/auth/logout', {}, signedIn.cookie)).status, 200);
  assert.equal((await f.request('/api/auth/session', undefined, signedIn.cookie)).status, 401);
});
