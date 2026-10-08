import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthStore } from './auth-store.mjs';
import { createAuthServer } from './http.mjs';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';

const origin = 'http://localhost:5173';
const password = 'Unternehmen Test Passwort!';
const input = (extra = {}) => ({ requestId: randomUUID(), name: 'SCHRAMM', contactName: '',
  contactEmail: '', brandColor: '#247b84', userLimit: 5, users: [], ...extra });
async function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'brudello-companies-'));
  const filename = join(directory, 'auth.sqlite');
  const store = createAuthStore({ filename, origin, deliverReset: async () => {} });
  await store.createUser({ email: 'admin@test.local', name: 'Admin', password, mustChangePassword: false });
  const auth = await store.login('admin@test.local', password);
  const server = createAuthServer({ store, origin });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); store.close(); rmSync(directory, { recursive: true, force: true }); });
  async function request(path, body, token = auth.token) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Brudello-Request': '1', Cookie: `brudello_session=${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }
  return { store, request, auth, filename };
}

test('admin creates a company and temporary accounts atomically; replays do not create duplicates', async t => {
  const f = await fixture(t);
  const data = input({ users: [{ name: 'Erika Test', email: ' ERIKA@TEST.LOCAL ' }] });
  const created = await f.request('/api/companies', data);
  assert.equal(created.status, 201);
  assert.equal(created.body.company.name, 'SCHRAMM');
  assert.equal(created.body.company.userCount, 1);
  assert.equal(created.body.credentials[0].email, 'erika@test.local');
  const temporary = created.body.credentials[0].password;
  assert.ok(temporary.length >= 15);
  const account = await f.store.login('erika@test.local', temporary);
  assert.equal(account.user.role, 'company_user');
  assert.equal(account.user.companyId, created.body.company.id);
  assert.equal(account.user.mustChangePassword, true);
  assert.equal((await f.request('/api/home', undefined, account.token)).status, 403);
  const replay = await f.request('/api/companies', data);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.company.id, created.body.company.id);
  assert.deepEqual(replay.body.credentials, []);
  assert.equal((await f.request('/api/companies')).body.companies.length, 1);
  assert.equal((await f.request('/api/companies', { ...data, name: 'Changed' })).status, 409);
  const reopened = createAuthStore({ filename: f.filename, origin, deliverReset: async () => {} });
  assert.equal(reopened.home(f.auth.token).companies.length, 1);
  reopened.close();
});

test('duplicate names/emails and exceeded limits leave no partial company or account', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/companies', input({ userLimit: 1, users: [{name:'A',email:'a@test.local'},{name:'B',email:'b@test.local'}] }))).status, 400);
  assert.equal((await f.request('/api/companies', input({ users: [{name:'A',email:'a@test.local'},{name:'B',email:' A@TEST.LOCAL '}] }))).status, 400);
  assert.equal((await f.request('/api/companies', input({ users: [{name:'A',email:'a@test.local'},{name:'Admin',email:'admin@test.local'}] }))).status, 409);
  assert.equal((await f.request('/api/companies')).body.companies.length, 0);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1);
  assert.equal((await f.request('/api/companies', input())).status, 201);
  assert.equal((await f.request('/api/companies', input({ name: ' schramm ' }))).status, 409);
  for (const invalid of [{name:''}, {userLimit:0}, {userLimit:1.5}, {brandColor:'red;display:none'}, {contactEmail:'invalid'}, {users:null}, {requestId:[randomUUID()]}, {requestId:'-'.repeat(36)}]) {
    assert.equal((await f.request('/api/companies', input({ name:'Other', ...invalid }))).status, 400);
  }
});

test('a revoked admin session cannot finish a pending company creation', async t => {
  const f = await fixture(t);
  const pending = f.store.createCompany(f.auth.token, input({users:[{name:'Erika',email:'pending@test.local'}]}));
  f.store.logout(f.auth.token);
  await assert.rejects(pending, error => error.status === 401);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM companies').get().n, 0);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1);
});

test('company users only see their company and cannot administer other companies', async t => {
  const f = await fixture(t);
  const first = (await f.request('/api/companies', input({ users: [{name:'Erika',email:'erika@test.local'}] }))).body;
  const second = (await f.request('/api/companies', input({name:'Andere Firma'}))).body;
  const provisional = await f.store.login('erika@test.local', first.credentials[0].password);
  assert.equal((await f.request(`/api/companies/${first.company.id}`, undefined, provisional.token)).status, 403);
  await f.store.changePassword(provisional.token, password, password);
  const user = await f.store.login('erika@test.local', password);
  const home = await f.request('/api/home', undefined, user.token);
  assert.equal(home.body.company.id, first.company.id);
  assert.equal(home.body.companies, undefined);
  assert.equal(home.body.company.users, undefined);
  assert.equal((await f.request('/api/companies', undefined, user.token)).status, 403);
  assert.equal((await f.request('/api/companies', input({name:'Forbidden'}), user.token)).status, 403);
  assert.equal((await f.request(`/api/companies/${second.company.id}`, undefined, user.token)).status, 404);
  assert.equal((await f.request(`/api/companies/${first.company.id}`, undefined, user.token)).status, 200);
  assert.equal((await f.request('/api/companies', input({name:'No session'}), '')).status, 401);
});

test('concurrent duplicate creation saves one company and one account', async t => {
  const f = await fixture(t);
  const data = input({users:[{name:'Erika',email:'erika@test.local'}]});
  const results = await Promise.all([f.request('/api/companies', data), f.request('/api/companies', data)]);
  assert.deepEqual(results.map(r=>r.status).sort(), [200,201]);
  assert.equal((await f.request('/api/companies')).body.companies.length, 1);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 2);
});

test('bootstrap accounts get an explicit admin role; company user lists match the active count', async t => {
  const f = await fixture(t);
  assert.equal(f.store.db.prepare("SELECT role FROM users WHERE email='admin@test.local'").get().role, 'brudello_admin');
  const created = (await f.request('/api/companies', input({ users: [{name:'A',email:'a@test.local'},{name:'B',email:'b@test.local'}] }))).body;
  f.store.db.prepare("UPDATE users SET active=0 WHERE email='b@test.local'").run();
  const company = (await f.request(`/api/companies/${created.company.id}`)).body.company;
  assert.equal(company.userCount, 1);
  assert.deepEqual(company.users.map(u => u.email), ['a@test.local']);
});

test('schema upgrade keeps existing accounts and adds company membership', () => {
  const directory = mkdtempSync(join(tmpdir(), 'brudello-migration-'));
  const filename = join(directory, 'old.sqlite');
  const db = new DatabaseSync(filename);
  db.exec(`CREATE TABLE users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'brudello_admin',must_change_password INTEGER NOT NULL DEFAULT 1,temporary_expires INTEGER,active INTEGER NOT NULL DEFAULT 1);
    INSERT INTO users (id,email,name,password_hash) VALUES ('existing','old@test.local','Existing','unchanged');`);
  db.close();
  const store = createAuthStore({ filename, origin, deliverReset: async () => {} });
  try {
    assert.equal(store.db.prepare('SELECT password_hash FROM users').get().password_hash, 'unchanged');
    assert.equal(store.db.prepare('SELECT company_id FROM users').get().company_id, null);
  } finally { store.close(); rmSync(directory,{recursive:true,force:true}); }
});

test('company identity persists, matches admin and member views, and stays isolated', async t => {
  const f = await fixture(t);
  const themed = (await f.request('/api/companies', input({brandTheme:'schramm',users:[{name:'Brand user',email:'brand@test.local'}]}))).body;
  assert.equal(themed.company.brandTheme, 'schramm');
  const other = (await f.request('/api/companies', input({name:'Other company',brandColor:'#009cdc'}))).body;
  assert.equal(other.company.brandTheme, 'default');
  const similar = (await f.request('/api/companies', input({name:'Schramm unrelated'}))).body;
  assert.equal(similar.company.brandTheme, 'default');
  const temporary = await f.store.login('brand@test.local',themed.credentials[0].password);
  await f.store.changePassword(temporary.token,password,password);
  const member = await f.store.login('brand@test.local',password);
  assert.equal((await f.request('/api/home',undefined,member.token)).body.company.brandTheme,'schramm');
  assert.equal((await f.request(`/api/companies/${themed.company.id}`)).body.company.brandTheme,'schramm');
  assert.equal((await f.request(`/api/companies/${other.company.id}`,undefined,member.token)).status,404);
  assert.equal((await f.request('/api/companies',input({name:'Invalid style',brandTheme:'arbitrary-css'}))).status,400);
  const reopened=createAuthStore({filename:f.filename,origin,deliverReset:async()=>{}});
  assert.equal(reopened.getCompany(f.auth.token,themed.company.id).brandTheme,'schramm');
  assert.equal(reopened.getCompany(f.auth.token,other.company.id).brandTheme,'default');
  reopened.close();
});

test('only Brudello can edit appearance; saves stay within one company and reject unsafe settings', async t => {
  const f=await fixture(t);
  const first=(await f.request('/api/companies',input({brandTheme:'schramm',users:[{name:'Member',email:'style@test.local'}]}))).body;
  const second=(await f.request('/api/companies',input({name:'Other brand',brandTheme:'schramm'}))).body;
  const path=`/api/companies/${first.company.id}/appearance`;
  const appearance={primary:'#ab342c',secondary:'#436f39',background:'#f6f6f3',heading:'#282727',font:'system'};
  const update={brandTheme:'schramm',appearance};
  const saved=await f.request(path,update);
  assert.equal(saved.status,200);
  assert.deepEqual(saved.body.company.appearance,appearance);
  assert.equal((await f.request(`/api/companies/${second.company.id}`)).body.company.appearance.primary,'#009cdc');
  const temp=await f.store.login('style@test.local',first.credentials[0].password);
  assert.equal((await f.request(path,update,temp.token)).status,403);
  await f.store.changePassword(temp.token,password,password);
  const member=await f.store.login('style@test.local',password);
  assert.equal((await f.request(path,update,member.token)).status,403);
  assert.deepEqual((await f.request('/api/home',undefined,member.token)).body.company.appearance,appearance);
  assert.equal((await f.request(path,update,'')).status,401);
  // #8a8a8a passes black text but leaves the fixed grey copy (#555) below 4.5:1.
  for(const invalid of [{...appearance,primary:'url(evil)'},{...appearance,font:'evil'},{...appearance,heading:'#ffffff'},{...appearance,background:'#000000'},{...appearance,background:'#8a8a8a',heading:'#000000'}]) {
    assert.equal((await f.request(path,{brandTheme:'schramm',appearance:invalid})).status,400);
  }
  assert.equal((await f.request(path,{appearance})).status,400);
  assert.equal((await f.request(`/api/companies/${first.company.id}`)).body.company.brandTheme,'schramm');
  const reopened=createAuthStore({filename:f.filename,origin,deliverReset:async()=>{}});
  assert.deepEqual(reopened.getCompany(f.auth.token,first.company.id).appearance,appearance);
  reopened.close();
});

test('appearance migration assigns only existing SCHRAMM records once and preserves accounts', async t => {
  const f=await fixture(t);
  const schramm=(await f.request('/api/companies',input({name:'SCHRAMM Test'}))).body.company;
  const other=(await f.request('/api/companies',input({name:'Other legacy partner'}))).body.company;
  const before=f.store.db.prepare('SELECT id,password_hash FROM users').all();
  f.store.db.exec('ALTER TABLE companies DROP COLUMN appearance_json; ALTER TABLE companies DROP COLUMN brand_theme;');
  const migrated=createAuthStore({filename:f.filename,origin,deliverReset:async()=>{}});
  assert.equal(migrated.getCompany(f.auth.token,schramm.id).brandTheme,'schramm');
  assert.equal(migrated.getCompany(f.auth.token,other.id).brandTheme,'default');
  assert.deepEqual(migrated.db.prepare('SELECT id,password_hash FROM users').all(),before);
  migrated.updateAppearance(f.auth.token,schramm.id,{brandTheme:'default',appearance:{primary:'#247b84',secondary:'#517d72',background:'#ffffff',heading:'#282727',font:'system'}});
  migrated.close();
  const again=createAuthStore({filename:f.filename,origin,deliverReset:async()=>{}});
  assert.equal(again.getCompany(f.auth.token,schramm.id).brandTheme,'default');
  again.close();
});
