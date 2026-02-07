# Ticket-API

Operationen und Typen für das Ticket-System

---

## Operationen

### createTeilaufgabe

- **Request:** `createTeilaufgabeRequest`
- **Response:** `createTeilaufgabeResponse`

### createTicket

- **Request:** `createTicketRequest`
- **Response:** `createTicketResponse`

### deleteTeilaufgabe

- **Request:** `deleteTeilaufgabeRequest`
- **Response:** `deleteTeilaufgabeResponse`

### deleteTicket

- **Request:** `deleteTicketRequest`
- **Response:** `deleteTicketResponse`

### readTeilaufgabe

- **Request:** `readTeilaufgabeRequest`
- **Response:** `readTeilaufgabeResponse`

### readTeilaufgabeHistory

- **Request:** `readTeilaufgabeHistoryRequest`
- **Response:** `readTeilaufgabeHistoryResponse`

### readTicket

- **Request:** `readTicketRequest`
- **Response:** `readTicketResponse`

### readTicketHistory

- **Request:** `readTicketHistoryRequest`
- **Response:** `readTicketHistoryResponse`

### readTicketStatus

- **Request:** `readTicketStatusRequest`
- **Response:** `readTicketStatusResponse`

### updateTeilaufgabe

- **Request:** `updateTeilaufgabeRequest`
- **Response:** `updateTeilaufgabeResponse`

### updateTicket

- **Request:** `updateTicketRequest`
- **Response:** `updateTicketResponse`

## Komplexe Typen

### CreateTicketRequestType

Die Parameter zur Anlage eines neuen Tickets.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                       |
| --------------- | ------------------- | ------- | ---------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header. |
| `ticket`        | `TicketType`        | Ja      | Die Daten des neuen Tickets.       |

### CreateTicketResponseType

Das Antwort-Objekt der Ticket-Anlage.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |
| `ticketNr`       | `int`                | Nein    |                                     |

### DeleteTicketRequestType

Die Parameter zum Löschen eines Tickets.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                          |
| --------------- | ------------------- | ------- | ------------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header.    |
| `ticketNr`      | `int`               | Ja      | Die Nummer des zu löschenden Tickets. |

### DeleteTicketResponseType

Das Antwort-Objekt beim Löschen eines Tickets.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### ReadTeilaufgabeHistorySearchCriteriaType

Die Nummer des Tickets, zu der die Teilaufgabe gehört.

#### Felder

| Feld            | Typ        | Pflicht | Beschreibung                                           |
| --------------- | ---------- | ------- | ------------------------------------------------------ |
| `ticketNr`      | `int`      | Ja      | Die Nummer des Tickets, zu der die Teilaufgabe gehört. |
| `teilaufgabeNr` | `String32` | Nein    | Die Nummer der Teilaufgabe.                            |

### ReadTeilaufgabeSearchCriteriaType

Die Suchkriterien für das Lesen einer Teilaufgabe.

#### Felder

| Feld                | Typ                     | Pflicht | Beschreibung                                           |
| ------------------- | ----------------------- | ------- | ------------------------------------------------------ |
| `ticketNr`          | `int`                   | Ja      | Die Nummer des Tickets, zu der die Teilaufgabe gehört. |
| `teilaufgabeNr`     | `String32`              | Nein    | Die Nummer der Teilaufgabe.                            |
| `modifiedSince`     | `IsoDateTime`           | Nein    |                                                        |
| `schlagworteFilter` | `SchlagworteFilterType` | Nein    |                                                        |

### ReadTicketHistoryRequestType

Die Parameter zum Lesen einer Tciket-Historie.

#### Felder

| Feld                              | Typ                                   | Pflicht | Beschreibung                                  |
| --------------------------------- | ------------------------------------- | ------- | --------------------------------------------- |
| `requestHeader`                   | `RequestHeaderType`                   | Nein    | Der allgemeine ZEP Request-Header.            |
| `readTicketHistorySearchCriteria` | `ReadTicketHistorySearchCriteriaType` | Ja      | Die Suchkriterien zur Bestimmung des Tickets. |

### ReadTicketHistoryResponseType

Der Antwort-Typ der Ticket-Historien-Abfrage.

#### Felder

| Feld             | Typ                      | Pflicht | Beschreibung                        |
| ---------------- | ------------------------ | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType`     | Ja      | Der allgemeine ZEP Response-Header. |
| `historyListe`   | `TicketHistoryListeType` | Ja      | Die Liste der Historieneinträge.    |

### ReadTicketHistorySearchCriteriaType

Die Suchkriterien zum Lesen der Ticket-Historie.

#### Felder

| Feld       | Typ   | Pflicht | Beschreibung                      |
| ---------- | ----- | ------- | --------------------------------- |
| `ticketNr` | `int` | Ja      | Die Nummer des gesuchten Tickets. |

### ReadTicketRequestType

Die Parameter zum Lesen von Tickets.

#### Felder

| Feld                        | Typ                             | Pflicht | Beschreibung                         |
| --------------------------- | ------------------------------- | ------- | ------------------------------------ |
| `requestHeader`             | `RequestHeaderType`             | Nein    | Der allgemeine ZEP Request-Header.   |
| `readTicketsSearchCriteria` | `ReadTicketsSearchCriteriaType` | Ja      | Die Kriterien zur Suche von Tickets. |

### ReadTicketResponseType

Die Antwort beim Lesen von Tickets.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |
| `ticketListe`    | `TicketListeType`    | Ja      | Die Liste der gelesenen Tickets.    |

### ReadTicketStatusRequestType

Request-Struktur zur Abfrage einer Ticket-Status Definition aus den Stammdaten.

#### Felder

| Feld                             | Typ                                  | Pflicht | Beschreibung                                       |
| -------------------------------- | ------------------------------------ | ------- | -------------------------------------------------- |
| `requestHeader`                  | `RequestHeaderType`                  | Nein    | Der allgemeine ZEP Request-Header.                 |
| `readticketStatusSearchCriteria` | `ReadticketStatusSearchCriteriaType` | Ja      | Die Suchkriterien zur Abfrage eines Ticket-Status. |

### ReadTicketStatusResponseType

Der Antwort-Typ der Ticket-Status-Abfrage.

#### Felder

| Feld                | Typ                     | Pflicht | Beschreibung                        |
| ------------------- | ----------------------- | ------- | ----------------------------------- |
| `responseHeader`    | `ResponseHeaderType`    | Ja      | Der allgemeine ZEP Response-Header. |
| `ticketStatusListe` | `TicketStatusListeType` | Nein    | Der gelesene Ticket-Status.         |

### ReadTicketsSearchCriteriaType

Die Suchkriterien zur Suche von Ticket-Status in den Stammdaten.

#### Felder

| Feld                      | Typ                     | Pflicht | Beschreibung                                                                        |
| ------------------------- | ----------------------- | ------- | ----------------------------------------------------------------------------------- |
| `ticketNr`                | `int`                   | Nein    | Die Nummer des zu lesenden Tickets.                                                 |
| `kundenReferenz`          | `String255`             | Nein    | Die Kunden-Referenz der zu suchenden Tickets.                                       |
| `datum`                   | `IsoDate`               | Nein    | Das Datum der zu suchenden Tickets. Wenn 'bis' einen Wert hat, dann werden Ticke... |
| `kundenAnsprechpartner`   | `String32`              | Nein    | Der Name des Ansprechpartners beim Kunden.                                          |
| `ersteller`               | `String32`              | Nein    | Der Benutzername des Erstellers des Tickets.                                        |
| `bearbeiter`              | `String32`              | Nein    | Der Benutzername des Bearbeiters des Tickets.                                       |
| `projektNr`               | `String64`              | Nein    | Die Nummer des Projekts, dem das Ticket zugeordnet ist.                             |
| `vorgangNr`               | `String64`              | Nein    | Die Nummer des Vorgangs, dem das Ticket zugeordnet ist.                             |
| `betreff`                 | `string`                | Nein    | Betreff oder ein Teil vom Betreff der zu suchenden Tickets.                         |
| `prioritaet`              | `Int1_5`                | Nein    | Die Priorität des Tickets (1-5).                                                    |
| `modifiedSince`           | `IsoDateTime`           | Nein    |                                                                                     |
| `schlagworteFilter`       | `SchlagworteFilterType` | Nein    |                                                                                     |
| `benutzer`                | `String32`              | Nein    |                                                                                     |
| `bis`                     | `IsoDate`               | Nein    |                                                                                     |
| `statusListe`             | `StatusListeType`       | Nein    |                                                                                     |
| `vorgangId`               | `int`                   | Nein    |                                                                                     |
| `projektId`               | `int`                   | Nein    |                                                                                     |
| `abteilung`               | `String64`              | Nein    |                                                                                     |
| `inklusiveUnterabteilung` | `boolean`               | Nein    |                                                                                     |
| `mitTeilaufgaben`         | `boolean`               | Nein    |                                                                                     |
| `teilaufgabeStatusListe`  | `StatusListeType`       | Nein    |                                                                                     |
| `externeTicketnummer`     | `String255`             | Nein    |                                                                                     |
| `attributes`              | `AttributesType`        | Nein    | Liste von Attributen für kundenspezifische Erweiterungen.                           |

### ReadticketStatusSearchCriteriaType

Die Suchkriterien zur Suche nach Ticketsstatus.

#### Felder

| Feld     | Typ      | Pflicht | Beschreibung     |
| -------- | -------- | ------- | ---------------- |
| `status` | `Int1_7` | Nein    | Der Status-Code. |

### TeilaufgabeHistoryListeType

Eine Liste mit Historieneinträgen.

#### Felder

| Feld      | Typ                 | Pflicht | Beschreibung |
| --------- | ------------------- | ------- | ------------ |
| `history` | `TicketHistoryType` | Nein    |              |

#### Attribute

- `length` (int):

### TeilaufgabeListeType

Eine Liste von Teilaufgaben.

#### Felder

| Feld          | Typ               | Pflicht | Beschreibung      |
| ------------- | ----------------- | ------- | ----------------- |
| `teilaufgabe` | `TeilaufgabeType` | Nein    | Die Teilaufgaben. |

#### Attribute

- `length` (int): Anzahl der Teilaufgaben in der Liste.

### TeilaufgabeType

Die Daten einer Teilaufgabe.

#### Felder

| Feld                    | Typ                    | Pflicht | Beschreibung                                                                        |
| ----------------------- | ---------------------- | ------- | ----------------------------------------------------------------------------------- |
| `ticketNr`              | `int`                  | Ja      | Die Nummer des Tickets, zu dem die Teilaufgabe gehört.                              |
| `teilaufgabeNr`         | `String32`             | Ja      | Die Nummer der Teilaufgabe.                                                         |
| `betreff`               | `string`               | Ja      | Der Betreff der Teilaufgabe.                                                        |
| `kundenReferenz`        | `String255`            | Nein    | Die Kundenreferenz.                                                                 |
| `kundenAnsprechpartner` | `AnsprechpartnerType`  | Nein    | Die Id des Kundenansprechpartners.                                                  |
| `ersteller`             | `String32`             | Nein    | Der Benutzername des Erstellers.                                                    |
| `bearbeiter`            | `String32`             | Nein    | Der Benutzername des Bearbeiters.                                                   |
| `startdatum`            | `IsoDate`              | Nein    | Das Startdatum der Teilaufgabe.                                                     |
| `termin`                | `IsoDate`              | Nein    | Der Termin der Teilaufgabe.                                                         |
| `eingangsdatum`         | `IsoDateTime`          | Nein    | Das Eingangsdatum der Teilaufgabe.                                                  |
| `planstunden`           | `Decimal10_2`          | Nein    | Der geplante Aufwand der Teilaufgabe (in Stunden).                                  |
| `ueberbuchenVerhindern` | `int0_4`               | Nein    | 0: Nein 1: nur fakturierbare Zeiten (inkl. Reisezeiten) 2: fakturierbare und nic... |
| `bemerkung`             | `string`               | Nein    | Ene Bemerkung zur Teilaufgabe.                                                      |
| `anhangListe`           | `AnhangListeType`      | Nein    | Es werden nur die zwei ersten Dateien in dieser Liste pro Request gespeichert de... |
| `kategorieListe`        | `KategorieListeType`   | Nein    |                                                                                     |
| `created`               | `IsoDateTime`          | Nein    | Der Zeitpunkt der Anlage des Objekts.                                               |
| `modified`              | `IsoDateTime`          | Nein    | Der Zeitpunkt der letzten Änderung des Objekts.                                     |
| `inbearbeitungdatum`    | `IsoDateTime`          | Nein    | Nur fürs Lesen.                                                                     |
| `fertigdatum`           | `IsoDateTime`          | Nein    | Nur fürs Lesen.                                                                     |
| `historyUpdatedatum`    | `IsoDateTime`          | Nein    | Nur fürs Lesen.                                                                     |
| `schlagworteListe`      | `SchlagworteListeType` | Nein    |                                                                                     |
| `benutzer`              | `String32`             | Nein    | gilt als angemeldeter User für die Änderungshistorie., falls gesetzt, werden die... |
| `istStunden`            | `Decimal8_10`          | Nein    |                                                                                     |
| `istStundenFakt`        | `Decimal8_10`          | Nein    |                                                                                     |
| `status`                | `int1_20`              | Nein    | Der Status des Tickets (1=neu, 2=in Bearbeitung, 3=fertig, 4=abgelehnt, 5=abgeno... |
| `attribues`             | `AttributesType`       | Nein    | 0..1 Attribute für kundenspezifische Erweiterungen.                                 |

### TicketAenderungType

Daten einer Ticket-Änderungen.

#### Felder

| Feld    | Typ      | Pflicht | Beschreibung                  |
| ------- | -------- | ------- | ----------------------------- |
| `label` | `string` | Ja      | Das Feld, das geändert wurde. |
| `old`   | `string` | Nein    | Der alte Werte des Feldes.    |
| `new`   | `string` | Nein    | Der neue Wert des Feldes.     |

### TicketAenderungsListeType

Liste von Änderungen eines Tickets.

#### Felder

| Feld        | Typ                   | Pflicht | Beschreibung |
| ----------- | --------------------- | ------- | ------------ |
| `aenderung` | `TicketAenderungType` | Nein    |              |

### TicketHistoryListeType

Eine Liste mit Historieneinträgen.

#### Felder

| Feld      | Typ                 | Pflicht | Beschreibung                      |
| --------- | ------------------- | ------- | --------------------------------- |
| `history` | `TicketHistoryType` | Nein    | Die einzelnen Historien-Einträge. |

#### Attribute

- `length` (int): Anzahl der Einträge in der Liste.

### TicketHistoryType

Die Daten eines Historieneintrags zu einem Ticket.

#### Felder

| Feld              | Typ                         | Pflicht | Beschreibung                                           |
| ----------------- | --------------------------- | ------- | ------------------------------------------------------ |
| `bearbeiter`      | `String32`                  | Ja      | Veraltet, statt dessen ersteller benutzen.             |
| `datum`           | `IsoDateTime`               | Ja      | Das Datum des Eintrags.                                |
| `intern`          | `boolean`                   | Nein    | Kennung, ob es sich um eine interne Bemerkung handelt. |
| `aenderungsListe` | `TicketAenderungsListeType` | Nein    | Eine optionale Liste von Änderungen.                   |
| `anhangListe`     | `AnhangListeType`           | Nein    | Eine optionale Liste von Anhängen.                     |
| `ersteller`       | `String32`                  | Nein    |                                                        |

### TicketListeType

Eine Liste von Tickets.

#### Felder

| Feld     | Typ          | Pflicht | Beschreibung |
| -------- | ------------ | ------- | ------------ |
| `ticket` | `TicketType` | Nein    | Die Tickets. |

#### Attribute

- `length` (int): Die Anzahl der Tickets in der Liste.

### TicketStatusListeType

Liste von Ticket-Status.

#### Felder

| Feld           | Typ                | Pflicht | Beschreibung                 |
| -------------- | ------------------ | ------- | ---------------------------- |
| `ticketStatus` | `TicketStatusType` | Nein    | Die einzelnen Ticket-Status. |

#### Attribute

- `length` (int): Die Anzahl der Statuseinträge in der Liste.

### TicketStatusType

Die Daten zum Ticketstatus.

#### Felder

| Feld          | Typ        | Pflicht | Beschreibung                |
| ------------- | ---------- | ------- | --------------------------- |
| `status`      | `Int1_7`   | Ja      | Der Status-Code.            |
| `bezeichnung` | `String64` | Nein    | Die Bezeichnung des Status. |

### TicketType

Die Daten eines Tickerts.

#### Felder

| Feld                    | Typ                    | Pflicht | Beschreibung                                                                        |
| ----------------------- | ---------------------- | ------- | ----------------------------------------------------------------------------------- |
| `ticketNr`              | `int`                  | Nein    | Pflicht beim Bearbeiten. Wird bei der Ticket-Anlage nicht beachtet.                 |
| `ersteller`             | `String32`             | Nein    | Der Benurtzername des Erstellers des Tickets. Pflicht bei der Anlage.               |
| `projektNr`             | `String64`             | Nein    | Die Nummer des Projekts, dem das Ticket zugeordnet ist. Pflicht bei der Anlage.     |
| `vorgangNr`             | `String64`             | Nein    | Die Nummer des Vorgangs, dem das Ticket zugeordnet ist. Pflicht bei der Anlage.     |
| `betreff`               | `string`               | Nein    | Der Betreff des Tickets. Pflicht bei der Anlage.                                    |
| `kundenReferenz`        | `String255`            | Nein    | Die Kundenreferenz des Tickets.                                                     |
| `datum`                 | `IsoDateTime`          | Nein    |                                                                                     |
| `kundenAnsprechpartner` | `AnsprechpartnerType`  | Nein    |                                                                                     |
| `bearbeiter`            | `String32`             | Nein    | Der Benutzername des Bearbeiters des Tickets.                                       |
| `prioritaet`            | `Int1_5`               | Nein    | Die Priorität des Tickets (1-5).                                                    |
| `status`                | `int1_20`              | Nein    | Der Status des Tickets (1=neu, 2=in Bearbeitung, 3=fertig, 4=abgelehnt, 5=abgeno... |
| `bemerkung`             | `string`               | Nein    | Die Bemerkung zum Ticket.                                                           |
| `eingangsdatum`         | `IsoDateTime`          | Nein    | Das Eingangsdatum des Tickets. Format: JJJJ-MM-TT.                                  |
| `termin`                | `IsoDate`              | Nein    | Der Termin des Tickets. Format: JJJJ-MM-TT.                                         |
| `startdatum`            | `IsoDate`              | Nein    | Das Startdatum des Tickets. Format: JJJJ-MM-TT.                                     |
| `anhangListe`           | `AnhangListeType`      | Nein    | Es werden nur die zwei ersten Dateien in dieser Liste pro Request gespeichert de... |
| `planstunden`           | `Decimal10_2`          | Nein    |                                                                                     |
| `dynamischePlanstunden` | `Decimal12_2`          | Nein    |                                                                                     |
| `ueberbuchenVerhindern` | `int0_4`               | Nein    | 0: Nein 1: nur fakturierbare Zeiten (inkl. Reisezeiten) 2: fakturierbare und nic... |
| `kategorieListe`        | `KategorieListeType`   | Nein    |                                                                                     |
| `created`               | `IsoDateTime`          | Nein    | Der Zeitpunkt der Anlage des Objekts.                                               |
| `modified`              | `IsoDateTime`          | Nein    | Der Zeitpunkt der letzten Änderung des Objekts.                                     |
| `inbearbeitungdatum`    | `IsoDateTime`          | Nein    | Nur fürs Lesen.                                                                     |
| `fertigdatum`           | `IsoDateTime`          | Nein    | Nur fürs Lesen.                                                                     |
| `abgenommendatum`       | `IsoDateTime`          | Nein    | Nur fürs Lesen.                                                                     |
| `abgelehntdatum`        | `IsoDateTime`          | Nein    | Nur fürs Lesen.                                                                     |
| `historyUpdatedatum`    | `IsoDateTime`          | Nein    | Nur fürs Lesen.                                                                     |
| `schlagworteListe`      | `SchlagworteListeType` | Nein    |                                                                                     |
| `benutzer`              | `String32`             | Nein    | gilt als angemeldeter User für die Änderungshistorie., falls gesetzt, werden die... |
| `istStunden`            | `Decimal8_10`          | Nein    |                                                                                     |
| `istStundenFakt`        | `Decimal8_10`          | Nein    |                                                                                     |
| `vorgangId`             | `int`                  | Nein    |                                                                                     |
| `projektId`             | `int`                  | Nein    |                                                                                     |
| `teilaufgabeListe`      | `TeilaufgabeListeType` | Nein    |                                                                                     |
| `externeTicketnummer`   | `String255`            | Nein    |                                                                                     |
| `bemerkungIstIntern`    | `boolean`              | Nein    |                                                                                     |
| `attributes`            | `AttributesType`       | Nein    | Attribute für kundenspezifische Erweiterungen.                                      |

### UpdateTicketRequestType

Die Parameter zur Aktualisierung eines Tickets.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                              |
| --------------- | ------------------- | ------- | ----------------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header.        |
| `ticket`        | `TicketType`        | Ja      | Die Daten zur Aktualisierung des Tickets. |

### UpdateTicketResponseType

Die Antwort bei der Aktualisierung eines Tickets.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |
