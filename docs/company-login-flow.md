# Unternehmensportal und Anmeldung

Stand: 7. Oktober 2026.

## Vereinbarter Ablauf

- Hauptanmeldung `/anmelden`: Das Brudello-Team meldet sich persönlich an.
- Ein gemeinsames Feld **E-Mail-Adresse oder Unternehmens-ID** nimmt die persönliche
  Brudello-Adresse oder die Firmen-ID entgegen. Keine Reiter oder Firmenauswahl.
  Zweistufig («Weiter»): Die E-Mail-Adresse eines Unternehmenskontos öffnet sofort die
  Anmeldeseite dieses Unternehmens, die Adresse ist dort bereits eingetragen (Übergabe
  per `sessionStorage`, nicht in der URL). Brudello- und unbekannte Adressen führen zum
  Passwortschritt (mit «Ändern»). Eine ID führt zur Anmeldeseite des Unternehmens. Leerzeichen und Großbuchstaben in der ID
  werden normalisiert («Schramm Test» → `schramm-test`).
- Eine Unternehmens-ID öffnet ohne Passwort die eigene Anmeldeseite. Der Code ist
  eine öffentliche Adresse, kein Passwort. Dort ist nur die persönliche Anmeldung
  möglich; es gibt keinen Link zur Auswahl anderer Unternehmen.
- Beispiel: `/portal/schramm-test/anmelden`. Jeder Benutzer meldet sich dort mit
  seiner eigenen E-Mail-Adresse und seinem Passwort an.
- Nach der Anmeldung: `/portal/schramm-test/home`. Temporäre Passwörter müssen zuerst
  auf `/portal/schramm-test/passwort-aendern` geändert werden.
- Abmelden, Sitzung abgelaufen und Passwort geändert führen zur Anmeldeseite derselben
  Firma. Auch Wiederherstellung und neue Wiederherstellungslinks tragen den Firmennamen
  und die gespeicherte Gestaltung.
- Ein persönliches Unternehmenskonto, das in der Hauptanmeldung verwendet wird, bleibt
  nach gültiger Prüfung angemeldet und wird direkt in das eigene Portal geleitet
  (`/home` oder zuerst `/passwort-aendern`). Kein zweites Passwort. Die Sitzung gilt
  nur für das eigene Unternehmen; jede Portalanfrage prüft weiter die Mitgliedschaft.

## Verwaltung durch Brudello

Der stabile Unternehmenscode und der direkte Link stehen in der Unternehmensansicht
unter **Eigener Unternehmenszugang**. Sie erscheinen auch nach dem Anlegen; der Download
mit temporären Zugangsdaten enthält bereits den passenden Link. Die vorhandene
Erscheinungsbild-Verwaltung steuert sowohl die Home als auch das Login der Firma.

Codes werden aus dem Namen erzeugt, mit nummeriertem Zusatz bei Kollisionen. Bestehende
Firmen werden einmalig migriert. Es gibt noch keine Umbenennung von Codes im UI und
keine kundeneigenen Domains. Im lokalen Demo gilt derselbe Host mit verschiedenen Pfaden.

## Sicherheitsgrenzen und Routing

- `GET /api/portals/:code` liefert nur Code, Namen und Gestaltung. Keine Kontakte,
  Benutzer, Kundendaten, Sitzungen oder Platzanzahl; keine öffentliche Firmenliste.
- Das Frontend sendet den Portalcode im Header `X-Brudello-Portal`. Der Server prüft
  bei der Anmeldung die tatsächliche Firmenmitgliedschaft unabhängig von der URL.
- Eine Anfrage ohne den Header gibt höchstens Zugriff auf das eigene authentifizierte
  Konto; Weglassen verleiht keine zusätzlichen Berechtigungen.
- Eine Person einer anderen Firma oder Brudello kann sich nicht im Firmenlogin als
  Firmenbenutzer anmelden. Brudello verwaltet weiter über seine eigene Oberfläche.
- Passwortwiederherstellung antwortet allgemein, auch für fremde/unbekannte Konten.
  Ein Token einer Firma wird in einer fremden Portalumgebung abgewiesen.
- Eine aktive Sitzung pro Browserprofil (ein gemeinsames Cookie). Der Wechsel auf
  ein anderes persönliches Konto ersetzt die vorherige Sitzung in diesem Profil.
- Pfad-Routing mit Legacy-Unterstützung für alte `#/...`-Links. Ein späterer Webserver
  muss App-Pfade auf `index.html` zurückführen (Vite macht das im lokalen Betrieb).
- Reset-Tokens bleiben nur im Speicher und werden sofort aus der URL entfernt.
- Mails werden weiterhin nur im privaten lokalen Testpostfach abgelegt.
- `POST /api/auth/identify` (Entscheidung Iván, 7. Oktober 2026) verrät bewusst, ob eine
  E-Mail-Adresse zu einem Unternehmenskonto gehört und zu welchem Unternehmen. Brudello-
  und unbekannte Adressen erhalten dieselbe Antwort. Begrenzung: 25 Abfragen pro IP in
  15 Minuten, Herkunftsprüfung wie bei allen POST-Anfragen. Es wird keine Sitzung erzeugt.

## Gestaltung

Die neue Loginseite übernimmt Claudes von Iván bestätigte SCHRAMM-Home A:
Outfit/Montserrat, organische Formen, Farbverlauf aus den gespeicherten Firmenfarben,
Soft-Black-Buttons. Neutral bleibt eigenständig. Keine Änderungen an Claudes Home-Layout.
Nohemi/Original-Logos bleiben ausstehende Markenassets, wie zuvor dokumentiert.
