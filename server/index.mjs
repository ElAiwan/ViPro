import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createAuthStore } from './auth-store.mjs';
import { createAuthServer } from './http.mjs';

// This bootstrap is intentionally local-only. Public deployment needs HTTPS and real mail delivery.
if (process.env.NODE_ENV === 'production') throw new Error('Dieser lokale Server ist nicht für öffentliche Bereitstellung konfiguriert.');
process.umask(0o077);
const origin = 'http://localhost:5173';
const directory = resolve('storage/private/auth');
const outbox = join(directory, 'outbox');
mkdirSync(outbox, { recursive: true, mode: 0o700 });
const store = createAuthStore({ filename: join(directory, 'auth.sqlite'), origin,
  deliverReset: async ({ email, name, url }) => {
    const file = join(outbox, `${Date.now()}-${randomBytes(4).toString('hex')}.txt`);
    writeFileSync(file, `Lokales Testpostfach – keine E-Mail versendet\nAn: ${email}\nBetreff: Ihr Brudello-Passwort zurücksetzen\n\nHallo ${name},\n\nüber diesen Link können Sie ein neues Passwort festlegen:\n${url}\n\nDer Link ist 30 Minuten gültig und kann einmal verwendet werden.\nFalls Sie dies nicht angefordert haben, ignorieren Sie diese Nachricht.\n\nIhr Brudello-Team\n`, { mode: 0o600 });
    console.log(`Passwort-Mail im lokalen Testpostfach: ${file}`);
  },
});
if (store.db.prepare('SELECT COUNT(*) AS total FROM users').get().total === 0) {
  const password = randomBytes(18).toString('base64url');
  const email = 'admin@brudello.local';
  await store.createUser({ email, name: 'Brudello Admin', password });
  writeFileSync(join(directory, 'erstzugang.txt'), `Brudello – lokaler Erstzugang\n\nAdresse: ${origin}\nE-Mail: ${email}\nTemporäres Passwort: ${password}\n\nGültig für 72 Stunden. Beim ersten Anmelden muss das Passwort geändert werden.\nNach der Änderung ist dieses Passwort ungültig. Für eine Wiederherstellung\n„Passwort vergessen?“ nutzen und den Link unter storage/private/auth/outbox öffnen.\nDiese Datei enthält Zugangsdaten; nicht teilen oder veröffentlichen.\n`, { mode: 0o600 });
  console.log('Erstzugang erstellt: storage/private/auth/erstzugang.txt');
}
const server = createAuthServer({ store, origin });
server.on('error', error => { console.error(`API konnte nicht starten: ${error.code}`); store.close(); process.exitCode = 1; });
server.listen(3001, '127.0.0.1', () => console.log('Brudello API: http://127.0.0.1:3001 (lokal)'));
function stop() { server.close(() => { store.close(); process.exit(0); }); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
