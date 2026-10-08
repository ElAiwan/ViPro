# Erscheinungsbild je Unternehmen

Stand: 7. Oktober 2026.

## Bedienung

Als Brudello anmelden → Unternehmen öffnen → **Erscheinungsbild bearbeiten**.
Vorlage wählen, Hauptfarbe, Zusatzfarbe, hellen Hintergrund, Überschriftenfarbe und
Schriftkombination anpassen. Die Vorschau zeigt den Entwurf. Erst **Änderungen
speichern** veröffentlicht ihn für dieses Unternehmen; **Abbrechen** verwirft ihn.
Unternehmensbenutzer können das Design sehen, aber nicht bearbeiten.

Eine Vorlage liefert Anfangswerte. Änderungen überschreiben nur den eigenen
Unternehmensdatensatz, niemals die Vorlage oder andere Unternehmen. Die Brudello-
Übersicht und die gemeinsame Anmeldung behalten ihr eigenes Erscheinungsbild.
Offene Unternehmensseiten aktualisieren ihre gespeicherten Einstellungen beim
Fensterfokus und spätestens beim nächsten 60-Sekunden-Abruf, sofern sichtbar und online.

## SCHRAMM und das Manual

Quelle: `!2026-06 CD_Manual_CD_2026-1.pdf`, interner Stand 08/2026, insbesondere
Seiten 5–6, 9–15 und 26. Das Dokument ist der Styleguide von **bad & heizung**.
SCHRAMM erhält daraus Aqua Blue (#009CDC), Nature Green (#2BAD70), Soft Black
(#282727), weiße Grundflächen, schwarzen Fließtext und organische überlagerte Formen.
Stone Greige (#DFCEC0) ist die Wohnraumfarbe und kann im Editor verwendet werden.
Die Startseite nutzt bis zum Eingang der Original-Verlaufsdateien eine CSS-Annäherung,
die aus Haupt- und Zusatzfarbe des Unternehmens berechnet wird (Entscheidung vom
7. Oktober 2026 mit Freigabe des Mockups). Sie wird ersetzt, sobald brandcom die Dateien liefert.

Montserrat und Outfit sind lokal eingebunden, jeweils mit OFL-Lizenz. Herkunft:
https://github.com/google/fonts/tree/main/ofl/montserrat und
https://github.com/google/fonts/tree/main/ofl/outfit
Nohemi-Dateien fehlen; Outfit ist der Ersatz für Überschriften, Montserrat für
Fließtext. Das eigene SCHRAMM-Logo und die freigegebenen Logo-/Grafikdateien
liegen noch nicht vor. Der Unternehmensname wird als Text gezeigt, nicht als
Nachbau eines offiziellen Logos. Keine Bilder aus dem Manual werden als echte
SCHRAMM-Projektreferenzen ausgegeben.

## Umsetzung und Grenzen

- SQLite: `companies.brand_theme`, `companies.appearance_json` pro Unternehmen.
- Initiale Migration ordnet ausschließlich bestehende normalisierte Namen
  `schramm` und `schramm test` einmalig der SCHRAMM-Vorlage zu. Spätere Zuordnung
  erfolgt explizit im Brudello-Editor; keine Namensauswertung im Browser.
- Neue Unternehmen beginnen neutral. Brudello kann danach ihre Vorlage wählen.
- POST `/api/companies/:id/appearance`: nur Brudello mit endgültigem Passwort;
  bestehende Herkunftsprüfung und Cookie-Authentifizierung gelten weiter.
- Whitelist für Vorlagen, Schriftkombinationen und Hex-Farben; kein beliebiges CSS,
  JavaScript oder externe Ressourcen-URLs. Überschriften und Fließtext werden auf
  ausreichenden Kontrast geprüft; zunächst nur helle Hintergründe.
- CSS-Variablen am Unternehmenscontainer, ohne globale Änderung von `body`/`:root`.
- Keine Logo-/Font-Uploadfunktion oder frei konfigurierbare Seitenlayouts in diesem Schritt.
- Parallel speichernde Administratoren: die zuletzt gespeicherte Änderung gilt.

## Startseite der Vorlage SCHRAMM

Stand 7. Oktober 2026. Vorlage `schramm` zeigt die Startseite «Verlauf & Zonen»
(`src/companies/SchrammHome.tsx`, `schramm-home.css`); die neutrale Vorlage bleibt
unverändert. Referenz für das Zielbild: das freigegebene Mockup «Verlauf & Zonen» (lokal, nicht im Repository).

- Kopfzeile mit Navigation statt Seitenleiste, Unternehmensname als Platzhalter für das Logo.
- Verlaufsfläche über die volle Breite, weiße organische Form für die Begrüßung,
  zwei überlagerte Formen, Konturlinien und ein Störer mit der Platzbelegung.
- Beratungen und Kataloge als ehrliche Leerzustände («In Vorbereitung»), ohne
  erfundene Termine, Kunden oder Funktionen.
- Brudello sieht zusätzlich eine Verwaltungsleiste und die Benutzerkonten.
- Weiße Schrift steht nur auf Soft Black; kleiner Text nie direkt auf dem Verlauf.

