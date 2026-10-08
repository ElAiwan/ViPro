import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { AuthError, normalizeEmail } from './validation.mjs';
import { createCompanyMethods } from './companies.mjs';
export { AuthError, normalizeEmail } from './validation.mjs';

const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const digest = value => createHash('sha256').update(value).digest('hex');
const randomToken = () => randomBytes(32).toString('base64url');
const dummyHash = `scrypt$${'0'.repeat(32)}$${'0'.repeat(64)}`;
const basePublicUser = row => ({ id: row.id, email: row.email, name: row.name,
  role: row.role, companyId: row.company_id ?? null, mustChangePassword: Boolean(row.must_change_password) });

export const unauthorized = () => new AuthError(401, 'UNAUTHENTICATED', 'Bitte melden Sie sich erneut an.');
export const invalidReset = () => new AuthError(400, 'INVALID_RESET', 'Dieser Link ist ungültig oder abgelaufen. Fordern Sie einen neuen Link an.');
export function validatePassword(password, confirmation) {
  if (typeof password !== 'string' || password.length < 15 || password.length > 128 || !password.trim()) {
    throw new AuthError(400, 'INVALID_PASSWORD', 'Verwenden Sie ein Passwort mit 15 bis 128 Zeichen.');
  }
  if (password !== confirmation) throw new AuthError(400, 'PASSWORD_MISMATCH', 'Die Passwörter stimmen nicht überein.');
}
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const result = await derive(password, salt, 32, options);
  return `scrypt$${salt}$${result.toString('hex')}`;
}
async function matches(password, encoded) {
  const [, salt, key] = encoded.split('$');
  const actual = await derive(password, salt, 32, options);
  return timingSafeEqual(actual, Buffer.from(key, 'hex'));
}

export function createAuthStore({ filename, origin, deliverReset, now = Date.now }) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  if (filename !== ':memory:') chmodSync(filename, 0o600);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = DELETE;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'brudello_admin',
      must_change_password INTEGER NOT NULL DEFAULT 1, temporary_expires INTEGER,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS resets_user ON password_resets(user_id);
  `);
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function cleanup() {
    db.prepare('DELETE FROM sessions WHERE expires <= ?').run(now());
    db.prepare('DELETE FROM password_resets WHERE expires <= ?').run(now());
  }
  function session(token) {
    if (!token || !/^[\w-]{43}$/.test(token)) throw unauthorized();
    const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.expires>? AND u.active=1`).get(digest(token), now());
    if (!row) throw unauthorized();
    return row;
  }
  function replacePassword(userId, hash) {
    db.prepare('UPDATE users SET password_hash=?, must_change_password=0, temporary_expires=NULL WHERE id=?').run(hash, userId);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM password_resets WHERE user_id=?').run(userId);
  }
  function requireReady(token) {
    const row = session(token);
    if (row.must_change_password) throw new AuthError(403, 'PASSWORD_CHANGE_REQUIRED', 'Bitte ändern Sie zuerst Ihr temporäres Passwort.');
    return row;
  }
  function requireAdmin(token) {
    const row = requireReady(token);
    if (row.role !== 'brudello_admin') throw new AuthError(403, 'FORBIDDEN', 'Sie haben keinen Zugriff auf diesen Bereich.');
    return row;
  }
  const companies = createCompanyMethods({ db, now, transaction, requireAdmin, requireReady, hashPassword });
  const companySlugFor = row => row.company_id ? db.prepare('SELECT portal_slug FROM companies WHERE id=?').get(row.company_id)?.portal_slug ?? null : null;
  const publicUser = row => ({...basePublicUser(row),companySlug:companySlugFor(row)});
  const belongsToPortal = (row,slug) => slug===undefined || (typeof slug==='string' && row?.role==='company_user' && companySlugFor(row)===slug);
  function scopedSession(token,slug) { const row=session(token); if(!belongsToPortal(row,slug)) throw unauthorized(); return row; }
  return {
    ...companies,
    db, close: () => db.close(),
    async createUser({ email, name, password, mustChangePassword = true }) {
      email = normalizeEmail(email);
      validatePassword(password, password);
      if (typeof name !== 'string' || !name.trim() || name.length > 120) throw new Error('Invalid name');
      const hash = await hashPassword(password);
      db.prepare(`INSERT INTO users (id,email,name,password_hash,role,must_change_password,temporary_expires)
        VALUES (?,?,?,?,'brudello_admin',?,?)`).run(randomUUID(), email, name.trim(), hash, Number(mustChangePassword),
          mustChangePassword ? now() + 72 * 60 * 60_000 : null);
    },
    async login(email, password, remember = false, companySlug) {
      email = normalizeEmail(email);
      if (typeof password !== 'string' || !password || password.length > 128) {
        throw new AuthError(400, 'INVALID_INPUT', 'Bitte geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein.');
      }
      cleanup();
      const before = db.prepare('SELECT * FROM users WHERE email=?').get(email);
      const valid = await matches(password, before?.password_hash ?? dummyHash);
      // Re-read after hashing: a concurrent reset or deactivation must win.
      const row = db.prepare('SELECT * FROM users WHERE email=?').get(email);
      if (!valid || !row?.active || row.password_hash !== before?.password_hash ||
          (row.must_change_password && row.temporary_expires <= now()) || !belongsToPortal(row,companySlug)) {
        throw new AuthError(401, 'INVALID_CREDENTIALS', 'E-Mail-Adresse oder Passwort ist ungültig. Prüfen Sie Ihre Angaben oder setzen Sie Ihr Passwort zurück.');
      }
      const seconds = row.must_change_password ? 900 : remember === true ? 1209600 : 28800;
      const token = randomToken();
      db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token), row.id, now() + seconds * 1000);
      return { user: publicUser(row), token, seconds, persistent: remember === true && !row.must_change_password };
    },
    getSession: (token,companySlug) => publicUser(scopedSession(token,companySlug)),
    // Identifier-first routing (Iván, 7.10.2026): a company e-mail opens its own login page.
    // Brudello and unknown addresses get the same answer, so only company membership is disclosed.
    identify(email) {
      email = normalizeEmail(email);
      const row = db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email);
      const slug = row?.role === 'company_user' ? companySlugFor(row) : null;
      return slug ? companies.getPublicPortal(slug) : null;
    },
    home(token) {
      const row = requireReady(token);
      if (row.role === 'brudello_admin') return { user: publicUser(row), companies: companies.listCompanies(token) };
      if (row.role === 'company_user' && row.company_id) return { user: publicUser(row), company: companies.getCompany(token, row.company_id) };
      throw new AuthError(403, 'FORBIDDEN', 'Sie haben keinen Zugriff auf diesen Bereich.');
    },
    logout(token) { if (typeof token === 'string') db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token)); },
    async changePassword(token, password, confirmation, companySlug) {
      const row = scopedSession(token,companySlug);
      if (!row.must_change_password) throw new AuthError(403, 'FORBIDDEN', 'Verwenden Sie zum Ändern Ihres Passworts die Passwort-Wiederherstellung.');
      validatePassword(password, confirmation);
      if (await matches(password, row.password_hash)) throw new AuthError(400, 'SAME_PASSWORD', 'Wählen Sie ein anderes Passwort als Ihr temporäres Passwort.');
      const hash = await hashPassword(password);
      transaction(() => {
        const current = session(token);
        if (current.password_hash !== row.password_hash) throw unauthorized();
        replacePassword(row.id, hash);
      });
    },
    async forgotPassword(email, companySlug) {
      email = normalizeEmail(email);
      cleanup();
      const row = db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email);
      if (!row || !belongsToPortal(row,companySlug)) return;
      const token = randomToken();
      db.prepare('INSERT INTO password_resets VALUES (?,?,?)').run(digest(token), row.id, now() + 30 * 60_000);
      // Existing links stay usable until expiry or a successful reset, avoiding mail-order races.
      try { await deliverReset({ email: row.email, name: row.name,
        url: companySlugFor(row) ? `${origin}/portal/${companySlugFor(row)}/passwort-zuruecksetzen?token=${token}` : `${origin}/#/passwort-zuruecksetzen?token=${token}` }); }
      catch (error) {
        db.prepare('DELETE FROM password_resets WHERE token_hash=?').run(digest(token));
        throw error;
      }
    },
    async resetPassword(token, password, confirmation, companySlug) {
      if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) throw invalidReset();
      const tokenHash = digest(token);
      const getReset = () => db.prepare(`SELECT u.* FROM password_resets r JOIN users u ON u.id=r.user_id
        WHERE r.token_hash=? AND r.expires>? AND u.active=1`).get(tokenHash, now());
      const row = getReset();
      if (!row || !belongsToPortal(row,companySlug)) throw invalidReset();
      validatePassword(password, confirmation);
      if (await matches(password, row.password_hash)) throw new AuthError(400, 'SAME_PASSWORD', 'Wählen Sie ein anderes Passwort als Ihr bisheriges Passwort.');
      const hash = await hashPassword(password);
      transaction(() => {
        if (!getReset()) throw invalidReset();
        replacePassword(row.id, hash);
      });
    },
  };
}
