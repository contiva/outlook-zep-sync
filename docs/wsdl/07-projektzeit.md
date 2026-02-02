# Projektzeit-API

Operationen und Typen für Zeitbuchungen

---

## Operationen

### createProjektzeit

- **Request:** `createProjektzeitRequest`
- **Response:** `createProjektzeitResponse`

### deleteProjektzeit

- **Request:** `deleteProjektzeitRequest`
- **Response:** `deleteProjektzeitResponse`

### readProjektzeiten

- **Request:** `readProjektzeitenRequest`
- **Response:** `readProjektzeitenResponse`

### updateProjektzeit

- **Request:** `updateProjektzeitRequest`
- **Response:** `updateProjektzeitResponse`

## Komplexe Typen

### CreateProjektzeitRequestType

Die Parameter zur Anlage einer neuen Zeitbuchung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `projektzeit` | `ProjektzeitType` | Ja | Die Daten der Zeitbuchung. |

### CreateProjektzeitResponseType

Das Antwort-Objekt der Projektzeit-Anlage.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `ids` | `string` | Nein | Die Liste der Ids der angelegten Projektzeiten durch Komma getrennt. |

### DeleteProjektzeitRequestType

Die Parameter zum Löschen einer Zeitbuchung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `id` | `int` | Ja | Die Id der zu löschenden Zeitbuchung. |

### DeleteProjektzeitResponseType

Das Antwort-Objekt beim Löschen einer Zeitbuchung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |

### ProjektzeitType

Die Daten einer Zeitbuchung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `id` | `string` | Nein | Die eindeutige Id der Zeitbuchung. Leer bei Anlage, Pflicht bei Update und Lösch... |
| `userId` | `String32` | Nein | Der Anmeldename des Benutzers, dem die Zeitbuchung zugeordnet ist. Pflicht bei A... |
| `datum` | `IsoDate` | Nein | Das Datum der Zeitbuchung. Pflicht bei Anlage. Format: JJJJ-MM-TT. |
| `von` | `IsoTime` | Nein | Die Anfangszeit der Zeitbuchung. Diese muss dem aktuell eingestellten Raster ent... |
| `bis` | `IsoTime` | Nein | Die Ende-Zeit der Zeitbuchung. Diese muss dem aktuell eingestellten Raster entsp... |
| `dauer` | `string` | Nein | Die Dauer der Zeitbuchung. Format: HH:MM. |
| `istFakturierbar` | `boolean` | Nein | Flagge, ob die Zeitbuchung fakturierbar ist. |
| `istOrtProjektRelevant` | `boolean` | Nein | Flagge, ob der Arbeitsort der Zeitbuchung projektrelevant ist. |
| `ort` | `String32` | Nein | Der Arbeitsort der Zeitbuchung. |
| `bemerkung` | `string` | Nein | Die Bemerkung zur Zeitbuchung. |
| `projektNr` | `String64` | Nein | Die Nummer des Projektes, auf das sich die Zeitbuchung bezieht. Pflicht bei Anla... |
| `vorgangNr` | `String64` | Nein | Die Nummer des Vorgangs, auf den sich die Zeitbuchung bezieht. Pflicht bei Anlag... |
| `taetigkeit` | `String32` | Nein | Die Tätigkeit der Zeitbuchung. Pflicht bei Anlage. |
| `start` | `string` | Nein | Bei Reise-Buchungen: der Startort der Reise. Pflicht bei Anlage von Reisebuchung... |
| `ziel` | `string` | Nein | Bei Reise-Buchungen: der Zielort der Reise. Pflicht bei Anlage von Reisebuchunge... |
| `km` | `int` | Nein | Bei Reise-Buchungen: die gefahrenen Kilometer. |
| `anzahlMitfahrer` | `int` | Nein | Bei Reise-Buchungen: die Anzahl der Mitfahrer. |
| `fahrzeug` | `string` | Nein | Bei Reise-Buchungen: das verwendete Fahrzeug. |
| `ticketNr` | `int` | Nein | Die Nummer des Tickets, auf das sich die Zeitbuchung bezieht. |
| `teilaufgabeNr` | `String32` | Nein | Die Nummer der Teilaufgabe, auf die sich die Zeitbuchung bezieht. |
| `reiseRichtung` | `string` | Nein | Bei Reise-Buchungen. Die Richtung der Reise (Wertebereich: "hin", "weiter", "rue... |
| `istPrivatFahrzeug` | `boolean` | Nein | Bei Reise-Buchungen: Flagge, ob die Fahrt mit einem Privat-Fahrzeug unternommen ... |
| `vorgangId` | `int` | Nein | Die technische Id des Vorgangs (nur Lesen). |
| `projektId` | `int` | Nein | Die technische Id des Projekts (nur Lesen). |
| `rechnungspositionId` | `int` | Nein |  |
| `created` | `IsoDateTime` | Nein | Der Zeitpunkt der Anlage des Objekts. |
| `modified` | `IsoDateTime` | Nein | Der Zeitpunkt der letzten Änderung des Objekts. |
| `freigabestatus` | `int0_1` | Nein | 1=freigegeben 0 oder leer: zu prüfen |
| `freigabestatusSeit` | `IsoDateTime` | Nein |  |
| `freigabestatusUserid` | `String32` | Nein |  |
| `attributes` | `AttributesType` | Nein | Liste von Attributen für kundenspezifische Erweiterungen. |

### ProjektzeitUndBelegeType

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `minutenraster` | `int` | Nein |  |

### ProjektzeitenListeType

Eine Liste von Zeitbuchungen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `projektzeiten` | `ProjektzeitType` | Nein | Die einzelnen Zeitbuchungen. |

#### Attribute

- `length` (int): Die Anzahl der Zeitbuchungen in der Liste.

### ReadProjektzeitenRequestType

Die Parameter zum Lesen von Projektzeiten.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `readProjektzeitenSearchCriteria` | `ReadProjektzeitenSearchCriteriaType` | Ja | Die Suchkriterien zur Suche von Zeitbuchungen. |

### ReadProjektzeitenResponseType

Ergebnis der Projektzeiten-Abfrage.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `projektzeitListe` | `ProjektzeitenListeType` | Ja | Die Liste der gelesenen Zeitbuchungen. |

### ReadProjektzeitenSearchCriteriaType

Suchkriterien für die Suche von Projektzeiten.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `id` | `int` | Nein |  |
| `von` | `IsoDate` | Nein | Das Datum, ab dem Projektzeiten geliefert werden sollen. Falls keine anderen Suc... |
| `bis` | `IsoDate` | Nein | Das Datum, bis zu dem Projektzeiten geliefert werden sollen. Falls keine anderen... |
| `projektNrListe` | `ProjektNrListeType` | Nein | Liste der Projekt-Nummern der zu berücksichtigenden Projekte. |
| `userIdListe` | `UserIdListeType` | Nein | Liste der Benutzernamen. |
| `modifiedSince` | `IsoDateTime` | Nein |  |
| `projektId` | `int` | Nein |  |
| `fakturierbar` | `int0_2` | Nein | 2=fakturierbare, 1=nicht fakturierbare, 0 oder leer = alle |
| `createdSince` | `IsoDateTime` | Nein |  |
| `attributes` | `AttributesType` | Nein | Liste von Attributen für kundenspezifische Erweiterungen. |

### UpdateProjektzeitRequestType

Die Parameter zur Aktualisierung einer Zeitbuchung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `projektzeit` | `ProjektzeitType` | Ja | Die Daten zur Aktualisierung der Zeitbuchung. |

### UpdateProjektzeitResponseType

Die Antwort bei der Aktualisierung einer Zeitbuchung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `ids` | `string` | Ja | Die Liste der id der aktualisierte Projektzeit und ids der eventuell durch Split... |

