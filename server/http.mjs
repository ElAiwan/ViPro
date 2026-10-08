import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { AuthError, normalizeEmail } from './auth-store.mjs';

const cookieName = 'brudello_session';
const recoveryMessage = 'Falls ein Konto mit dieser E-Mail-Adresse existiert, erhalten Sie einen Link zum Zurücksetzen Ihres Passworts. Der Link ist 30 Minuten gültig.';
function readCookie(req) {
  return (req.headers.cookie ?? '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
}
async function readBody(req, maximum = 4096) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > maximum) throw new AuthError(413, 'TOO_LARGE', 'Die Anfrage ist zu groß.');
    chunks.push(chunk);
  }
  try {
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error();
    return result;
  } catch { throw new AuthError(400, 'INVALID_INPUT', 'Die Anfrage konnte nicht gelesen werden.'); }
}

export function createAuthServer({ store, origin, now = Date.now }) {
  const limits = new Map();
  let activeMutations = 0;
  function limit(key, maximum, windowMs = 15 * 60_000) {
    for (const [k, v] of limits) if (v.until <= now()) limits.delete(k);
    let entry = limits.get(key);
    if (!entry) { entry = { count: 0, until: now() + windowMs }; limits.set(key, entry); }
    if (++entry.count > maximum) throw new AuthError(429, 'RATE_LIMITED', 'Zu viele Versuche. Bitte warten Sie 15 Minuten und versuchen Sie es erneut.');
  }
  function sessionCookie(value, maxAge) {
    return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict${origin.startsWith('https:') ? '; Secure' : ''}${maxAge === undefined ? '' : `; Max-Age=${maxAge}`}`;
  }
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const send = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
    let counted = false;
    try {
      const path = new URL(req.url, origin).pathname;
      const token = readCookie(req);
      const portalSlug=req.headers['x-brudello-portal'];
      if (req.method === 'GET') {
        if (/^\/api\/portals\/[^/]+$/.test(path)) {
          limit(`portal:${req.socket.remoteAddress}`,120);
          return send(200,{portal:store.getPublicPortal(path.split('/').at(-1))});
        }
        if(portalSlug!==undefined) store.getSession(token,portalSlug);
        if (path === '/api/auth/session') return send(200, { user: store.getSession(token) });
        if (path === '/api/home') return send(200, store.home(token));
        if (path === '/api/companies') return send(200, { companies: store.listCompanies(token) });
        if (/^\/api\/companies\/[^/]+$/.test(path)) return send(200, { company: store.getCompany(token, path.split('/').at(-1)) });
        throw new AuthError(404, 'NOT_FOUND', 'Diese Seite wurde nicht gefunden.');
      }
      if (req.method !== 'POST') throw new AuthError(405, 'METHOD_NOT_ALLOWED', 'Diese Anfrage ist nicht erlaubt.');
      if (req.headers.origin !== origin || req.headers['x-brudello-request'] !== '1' ||
          req.headers['content-type']?.split(';')[0] !== 'application/json') {
        throw new AuthError(403, 'INVALID_ORIGIN', 'Diese Anfrage ist nicht erlaubt. Laden Sie die Seite neu.');
      }
      // Signing out must remain available even when hashing/rate limits are exhausted.
      if (path === '/api/auth/logout') {
        store.logout(token);
        res.setHeader('Set-Cookie', sessionCookie('', 0));
        return send(200, { ok: true });
      }
      // Bound expensive password hashing even before per-account limits.
      limit(`ip:${req.socket.remoteAddress}`, 60);
      if (activeMutations >= 2) throw new AuthError(503, 'BUSY', 'Der Dienst ist gerade ausgelastet. Bitte versuchen Sie es gleich erneut.');
      activeMutations++; counted = true;
      const body = await readBody(req, path === '/api/companies' ? 65536 : 4096);
      if (/^\/api\/companies\/[^/]+\/appearance$/.test(path)) {
        return send(200, {company: store.updateAppearance(token,path.split('/')[3],body)});
      }
      if (path === '/api/companies') {
        const result = await store.createCompany(token, body);
        return send(result.replayed ? 200 : 201, result);
      }
      if (path === '/api/auth/identify') {
        limit(`identify:${req.socket.remoteAddress}`, 25);
        return send(200, { portal: store.identify(body.email) });
      }
      if (path === '/api/auth/login') {
        const email = normalizeEmail(body.email);
        limit(`login:${email}`, 10);
        const result = await store.login(email, body.password, body.remember, portalSlug);
        store.logout(token);
        // Company accounts using the main login keep their session; the client moves them to their own portal,
        // and every scoped request is still checked against the account's company.
        res.setHeader('Set-Cookie', sessionCookie(result.token, result.persistent ? result.seconds : undefined));
        return send(200, { user: result.user });
      }
      if (path === '/api/auth/change-password') {
        limit(`change:${token ?? 'none'}`, 5);
        await store.changePassword(token, body.password, body.confirmation, portalSlug);
        res.setHeader('Set-Cookie', sessionCookie('', 0));
        return send(200, { ok: true });
      }
      if (path === '/api/auth/forgot-password') {
        const email = normalizeEmail(body.email);
        const start = Date.now();
        // Account throttling stays invisible, as does whether the address exists.
        try { limit(`forgot:${email}`, 3); await store.forgotPassword(email,portalSlug); }
        catch (error) {
          if (!(error instanceof AuthError && error.code === 'RATE_LIMITED')) console.error('Lokale Passwort-Mail konnte nicht erstellt werden.');
        }
        await delay(Math.max(0, 350 - (Date.now() - start)));
        return send(200, { message: recoveryMessage });
      }
      if (path === '/api/auth/reset-password') {
        limit(`reset:${req.socket.remoteAddress}`, 10);
        await store.resetPassword(body.token, body.password, body.confirmation, portalSlug);
        res.setHeader('Set-Cookie', sessionCookie('', 0));
        return send(200, { ok: true });
      }
      throw new AuthError(404, 'NOT_FOUND', 'Diese Seite wurde nicht gefunden.');
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.status === 429) res.setHeader('Retry-After', '900');
        send(error.status, { error: error.message, code: error.code });
      } else {
        console.error('Interner Fehler im Anmeldedienst.');
        send(500, { error: 'Der Anmeldedienst ist gerade nicht verfügbar. Bitte versuchen Sie es erneut.', code: 'SERVER_ERROR' });
      }
    } finally { if (counted) activeMutations--; }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  return server;
}
