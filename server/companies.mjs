import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { AuthError, normalizeEmail } from './validation.mjs';
import { brandTheme, defaultAppearance, validateAppearance } from './appearance.mjs';

const fail = (message, status = 400, code = 'INVALID_COMPANY') => { throw new AuthError(status, code, message); };
function text(value, label, maximum, required = false) {
  if (typeof value !== 'string' || value.length > maximum || (required && !value.trim()) || /[\u0000-\u001f]/.test(value)) {
    fail(`Bitte prüfen Sie das Feld „${label}“ (maximal ${maximum} Zeichen).`);
  }
  return value.trim().replace(/\s+/g, ' ');
}
function validate(input) {
  if (!input || typeof input.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId)) fail('Die Anfrage ist ungültig. Öffnen Sie das Formular erneut.');
  const name = text(input.name, 'Unternehmensname', 120, true);
  const contactName = text(input.contactName ?? '', 'Kontaktperson', 120);
  const contactEmail = input.contactEmail === '' || input.contactEmail === undefined ? '' : normalizeEmail(input.contactEmail);
  if (!Number.isInteger(input.userLimit) || input.userLimit < 1 || input.userLimit > 1000) fail('Das Benutzerlimit muss zwischen 1 und 1.000 liegen.');
  if (typeof input.brandColor !== 'string' || !/^#[a-f\d]{6}$/i.test(input.brandColor)) fail('Bitte wählen Sie eine gültige Markenfarbe.');
  if (!Array.isArray(input.users) || input.users.length > 50 || input.users.length > input.userLimit) fail('Die Anzahl der Benutzer überschreitet das Limit. Pro Anlage sind bis zu 50 Benutzer möglich.');
  const users = input.users.map(user => {
    if (!user || typeof user !== 'object') fail('Bitte prüfen Sie die Benutzerangaben.');
    return { name: text(user.name, 'Name des Benutzers', 120, true), email: normalizeEmail(user.email) };
  });
  if (new Set(users.map(u => u.email)).size !== users.length) fail('Jede E-Mail-Adresse darf nur einmal verwendet werden.');
  return { brandTheme: brandTheme(input.brandTheme), name, contactName, contactEmail, userLimit: input.userLimit, brandColor: input.brandColor.toLowerCase(), users };
}

export function createCompanyMethods({ db, now, transaction, requireAdmin, requireReady, hashPassword }) {
  db.exec(`CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, normalized_name TEXT NOT NULL UNIQUE,
    contact_name TEXT NOT NULL, contact_email TEXT NOT NULL, brand_color TEXT NOT NULL,
    user_limit INTEGER NOT NULL CHECK(user_limit BETWEEN 1 AND 1000), created_at INTEGER NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id), request_id TEXT NOT NULL UNIQUE,
    request_fingerprint TEXT NOT NULL
  );`);
  function allocateSlug(name) {
    const base = name.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55).replace(/-$/,'') || 'unternehmen';
    let slug=base, suffix=2;
    while(db.prepare('SELECT 1 FROM companies WHERE portal_slug=?').get(slug)) slug=`${base}-${suffix++}`;
    return slug;
  }
  transaction(() => {
    const columns=db.prepare('PRAGMA table_info(companies)').all();
    if(!columns.some(column=>column.name==='brand_theme')) {
      db.exec("ALTER TABLE companies ADD COLUMN brand_theme TEXT NOT NULL DEFAULT 'default';");
      // One-time assignment to the existing partner only; names never resolve themes at runtime.
      db.exec("UPDATE companies SET brand_theme='schramm' WHERE normalized_name IN ('schramm','schramm test');");
    }
    if(!columns.some(column=>column.name==='appearance_json')) db.exec('ALTER TABLE companies ADD COLUMN appearance_json TEXT;');
    if(!columns.some(column=>column.name==='portal_slug')) db.exec('ALTER TABLE companies ADD COLUMN portal_slug TEXT;');
    for(const row of db.prepare('SELECT id,name FROM companies WHERE portal_slug IS NULL ORDER BY rowid').all()) db.prepare('UPDATE companies SET portal_slug=? WHERE id=?').run(allocateSlug(row.name),row.id);
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS companies_portal_slug ON companies(portal_slug);');
  });
  if (!db.prepare('PRAGMA table_info(users)').all().some(column => column.name === 'company_id')) {
    db.exec('ALTER TABLE users ADD COLUMN company_id TEXT REFERENCES companies(id);');
  }
  db.exec('CREATE INDEX IF NOT EXISTS users_company ON users(company_id);');
  function company(row, includeUsers = false) {
    const result = { id: row.id, portalSlug: row.portal_slug, name: row.name, contactName: row.contact_name, contactEmail: row.contact_email,
      brandColor: row.brand_color, brandTheme: row.brand_theme,
      appearance: row.appearance_json ? JSON.parse(row.appearance_json) : defaultAppearance(row.brand_theme,row.brand_color), userLimit: row.user_limit, createdAt: row.created_at,
      userCount: db.prepare('SELECT COUNT(*) AS n FROM users WHERE company_id=? AND active=1').get(row.id).n };
    if (includeUsers) result.users = db.prepare('SELECT id,name,email,must_change_password FROM users WHERE company_id=? AND active=1 ORDER BY name').all(row.id)
      .map(user => ({ id: user.id, name: user.name, email: user.email, mustChangePassword: Boolean(user.must_change_password) }));
    return result;
  }
  function previous(requestId, adminId, fingerprint) {
    const row = db.prepare('SELECT * FROM companies WHERE request_id=?').get(requestId);
    if (!row) return null;
    if (row.created_by !== adminId || row.request_fingerprint !== fingerprint) fail('Diese Anfrage wurde bereits verarbeitet. Laden Sie die Unternehmensübersicht neu.', 409, 'REQUEST_CONFLICT');
    return { company: company(row, true), credentials: [], replayed: true };
  }
  function checkDuplicates(data) {
    if (db.prepare('SELECT id FROM companies WHERE normalized_name=?').get(data.name.normalize('NFKC').toLowerCase())) {
      fail('Ein Unternehmen mit diesem Namen existiert bereits.', 409, 'DUPLICATE_COMPANY');
    }
    for (const user of data.users) if (db.prepare('SELECT id FROM users WHERE email=?').get(user.email)) {
      fail(`Die E-Mail-Adresse ${user.email} wird bereits verwendet.`, 409, 'DUPLICATE_EMAIL');
    }
  }
  return {
    getPublicPortal(slug) {
      if(typeof slug!=='string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length>80) fail('Dieses Unternehmensportal wurde nicht gefunden.',404,'PORTAL_NOT_FOUND');
      const row=db.prepare('SELECT * FROM companies WHERE portal_slug=?').get(slug);
      if(!row) fail('Dieses Unternehmensportal wurde nicht gefunden.',404,'PORTAL_NOT_FOUND');
      return {portalSlug:row.portal_slug,name:row.name,brandColor:row.brand_color,brandTheme:row.brand_theme,
        appearance:row.appearance_json ? JSON.parse(row.appearance_json) : defaultAppearance(row.brand_theme,row.brand_color)};
    },
    listCompanies(token) {
      requireAdmin(token);
      return db.prepare('SELECT * FROM companies ORDER BY created_at DESC, name').all().map(row => company(row));
    },
    getCompany(token, id) {
      const user = requireReady(token);
      if (user.role !== 'brudello_admin' && !(user.role === 'company_user' && user.company_id === id)) {
        fail('Dieses Unternehmen wurde nicht gefunden.', 404, 'NOT_FOUND');
      }
      const row = db.prepare('SELECT * FROM companies WHERE id=?').get(id);
      if (!row) fail('Dieses Unternehmen wurde nicht gefunden.', 404, 'NOT_FOUND');
      return company(row, user.role === 'brudello_admin');
    },
    updateAppearance(token, id, input) {
      requireAdmin(token);
      // No default here: a missing template must not silently reset the company to neutral.
      const theme=brandTheme(input.brandTheme ?? '');
      const appearance=validateAppearance(input.appearance);
      return transaction(() => {
        const row=db.prepare('SELECT * FROM companies WHERE id=?').get(id);
        if(!row) fail('Dieses Unternehmen wurde nicht gefunden.',404,'NOT_FOUND');
        db.prepare('UPDATE companies SET brand_theme=?,appearance_json=?,brand_color=? WHERE id=?').run(theme,JSON.stringify(appearance),appearance.primary,id);
        return company(db.prepare('SELECT * FROM companies WHERE id=?').get(id),true);
      });
    },
    async createCompany(token, input) {
      const admin = requireAdmin(token);
      const data = validate(input);
      // Preserve the fingerprint of older default-theme requests.
      const {brandTheme: theme, ...legacyData}=data;
      const fingerprint = createHash('sha256').update(JSON.stringify(theme === 'default' ? legacyData : data)).digest('hex');
      const replay = previous(input.requestId, admin.id, fingerprint);
      if (replay) return replay;
      checkDuplicates(data);
      const credentials = [];
      const accounts = [];
      // Sequential hashing bounds memory when multiple users are provisioned.
      for (const user of data.users) {
        const password = randomBytes(18).toString('base64url');
        accounts.push({ ...user, id: randomUUID(), hash: await hashPassword(password) });
        credentials.push({ ...user, password });
      }
      return transaction(() => {
        requireAdmin(token);
        const concurrentReplay = previous(input.requestId, admin.id, fingerprint);
        if (concurrentReplay) return concurrentReplay;
        checkDuplicates(data);
        const id = randomUUID();
        db.prepare(`INSERT INTO companies (id,name,normalized_name,contact_name,contact_email,brand_color,user_limit,created_at,created_by,request_id,request_fingerprint,brand_theme,portal_slug) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, data.name,
          data.name.normalize('NFKC').toLowerCase(), data.contactName, data.contactEmail,
          data.brandColor, data.userLimit, now(), admin.id, input.requestId, fingerprint, data.brandTheme, allocateSlug(data.name));
        for (const user of accounts) db.prepare(`INSERT INTO users
          (id,email,name,password_hash,role,must_change_password,temporary_expires,company_id)
          VALUES (?,?,?,?,'company_user',1,?,?)`).run(user.id, user.email, user.name, user.hash, now() + 72 * 60 * 60_000, id);
        return { company: company(db.prepare('SELECT * FROM companies WHERE id=?').get(id), true), credentials, replayed: false };
      });
    },
  };
}
