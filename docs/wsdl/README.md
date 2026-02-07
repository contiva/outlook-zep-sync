# ZEP SOAP API Dokumentation

Diese Dokumentation beschreibt die ZEP (Zeiterfassung für Projekte) SOAP-Schnittstelle Version 10.

## Übersicht

Die ZEP API ermöglicht die programmatische Interaktion mit dem ZEP-System für:

- Zeiterfassung und Projektzeiten
- Projekt- und Vorgangsverwaltung
- Mitarbeiter- und Kundenverwaltung
- Ticket-System
- Belegerfassung und Reisekosten
- Rechnungswesen

## Authentifizierung

Alle Requests benötigen einen `RequestHeader` mit einem `authorizationToken`:

```xml
<requestHeader>
    <authorizationToken>IHR_TOKEN</authorizationToken>
</requestHeader>
```

Das Token wird in ZEP unter Administration > Einstellungen > SOAP konfiguriert.

## Response-Struktur

Alle Responses enthalten einen `ResponseHeader`:

```xml
<responseHeader>
    <version>10.x</version>
    <returnCode>0</returnCode>  <!-- 0 = Erfolg -->
    <message>Optional: Fehlermeldung</message>
</responseHeader>
```

## Dokumentations-Dateien

| Datei                                      | Bereich            | Beschreibung                               |
| ------------------------------------------ | ------------------ | ------------------------------------------ |
| [01-allgemein.md](01-allgemein.md)         | Allgemeine Typen   | Request/Response Header, Attribute         |
| [02-basis-typen.md](02-basis-typen.md)     | Basis-Datentypen   | String, Decimal, Date, Time Typen          |
| [03-mitarbeiter.md](03-mitarbeiter.md)     | Mitarbeiter-API    | CRUD für Mitarbeiter, Beschäftigungszeiten |
| [04-kunde.md](04-kunde.md)                 | Kunden-API         | CRUD für Kunden, Ansprechpartner, Adressen |
| [05-projekt.md](05-projekt.md)             | Projekt-API        | CRUD für Projekte, Projektmitarbeiter      |
| [06-vorgang.md](06-vorgang.md)             | Vorgang-API        | CRUD für Vorgänge (Arbeitspakete)          |
| [07-projektzeit.md](07-projektzeit.md)     | Projektzeit-API    | Zeitbuchungen erstellen, lesen, ändern     |
| [08-ticket.md](08-ticket.md)               | Ticket-API         | Ticket-System, Teilaufgaben                |
| [09-beleg.md](09-beleg.md)                 | Beleg-API          | Belege, Reisekosten, Spesen                |
| [10-rechnung.md](10-rechnung.md)           | Rechnungs-API      | Rechnungen lesen                           |
| [11-abteilung.md](11-abteilung.md)         | Abteilungs-API     | Organisationsstruktur                      |
| [12-stammdaten.md](12-stammdaten.md)       | Stammdaten-API     | Kategorien, Tätigkeiten, Schlagworte       |
| [13-einplanung.md](13-einplanung.md)       | Einplanungs-API    | Ressourcenplanung                          |
| [14-zeiterfassung.md](14-zeiterfassung.md) | Zeiterfassungs-API | Kommt/Geht-Buchungen                       |
| [99-sonstige.md](99-sonstige.md)           | Sonstige Typen     | Weitere Hilfstypen                         |

## Häufige Operationen

### Zeitbuchung erstellen

Siehe [07-projektzeit.md](07-projektzeit.md) - `createProjektzeit`

### Projekte lesen

Siehe [05-projekt.md](05-projekt.md) - `readProjekte`

### Mitarbeiter lesen

Siehe [03-mitarbeiter.md](03-mitarbeiter.md) - `readMitarbeiter`

## Datenformate

- **Datum:** `YYYY-MM-DD` (z.B. `2024-01-15`)
- **Zeit:** `HH:MM` (z.B. `08:30`)
- **DateTime:** `YYYY-MM-DDTHH:MM:SS` (z.B. `2024-01-15T08:30:00`)

## Namespace

- **Target Namespace:** `http://zep.provantis.de`
- **SOAP Namespace:** `http://schemas.xmlsoap.org/wsdl/soap/`
