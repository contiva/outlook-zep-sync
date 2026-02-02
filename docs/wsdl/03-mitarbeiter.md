# Mitarbeiter-API

Operationen und Typen für die Verwaltung von Mitarbeitern

---

## Operationen

### createMitarbeiter

- **Request:** `createMitarbeiterRequest`
- **Response:** `createMitarbeiterResponse`

### deleteMitarbeiter

- **Request:** `deleteMitarbeiterRequest`
- **Response:** `deleteMitarbeiterResponse`

### readMitarbeiter

- **Request:** `readMitarbeiterRequest`
- **Response:** `readMitarbeiterResponse`

### updateMitarbeiter

- **Request:** `updateMitarbeiterRequest`
- **Response:** `updateMitarbeiterResponse`

## Komplexe Typen

### CreateMitarbeiterRequestType

Die Parameter zur Anlage eines neuen Mitarbeiters.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `mitarbeiter` | `MitarbeiterType` | Ja | Die Daten des Mitarbeiters. |

### CreateMitarbeiterResponseType

Das Antwort-Objekt der Mitarbeiter-Anlage.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `userId` | `String32` | Nein |  |

### DeleteMitarbeiterRequestType

Die Parameter zum Löschen eines Mitarbeiters.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `userId` | `String32` | Ja | Der Benutzername des zu löschenden Benutzers. |

### DeleteMitarbeiterResponseType

Das Antwort-Objekt beim Löschen eines Mitarbeiters.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |

### MitarbeiterListeType

Eine Liste von Mitarbeitern.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `mitarbeiter` | `MitarbeiterType` | Nein | Die in der Liste enthaltenen Mitarbeiter. |

#### Attribute

- `length` (int): Die Anzahl der Mitarbeiter in der Liste.

### MitarbeiterType

Die Daten eines Mitarbeiters.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `userId` | `String32` | Nein | Der Benutzername. Pflicht bei Anlage, Update und Löschen. |
| `nachname` | `String64` | Nein | Der Nachname des Mitarbeiters. Pflicht bei der Anlage. |
| `vorname` | `String32` | Nein | Der Vorname des Mitarbeiters. Pflicht bei der Anlage. |
| `email` | `String64` | Nein | Der EMail-Adresse des Mitarbeiters. Pflicht bei der Anlage. |
| `personalNr` | `String32` | Nein | Die Personalnummer des Mitarbeiters. |
| `strasse` | `String64` | Nein | Die Strasse der Adresse des Mitarbeiters. |
| `plz` | `String32` | Nein | Die PLZ der Adresse des Mitarbeiters. |
| `ort` | `String64` | Nein | Der Ort der Adresse des Mitarbeiters. |
| `land` | `String64` | Nein |  |
| `telefon` | `String32` | Nein | Die Telefonnummer des Mitarbeiters. |
| `fax` | `String32` | Nein | Die Faxnummer des Mitarbeiters. |
| `mobil` | `String32` | Nein | Die Mobilnummer des Mitarbeiters. |
| `telefonPrivat` | `String32` | Nein | Die private Telefonnummer des Mitarbeiters. |
| `bemerkung` | `string` | Nein | Eine Bemerkung zum Mitarbeiter. |
| `sprache` | `String32` | Nein | Die (ZEP-)Sprache des Mitarbeiters. Muss bei Anlage und Updates eine der in ZEP ... |
| `anrede` | `String20` | Nein | Die Anrede des Mitarbeiters |
| `geburtsdatum` | `IsoDate` | Nein | Das Geburtsdatum des Mitarbeiter (Format: JJJJ-MM-TT) |
| `kostentraeger` | `String32` | Nein | Der dem Mitarbeiter zugeordnete Kostentraeger (bei Einsatz des Moduls Buchhaltun... |
| `iban` | `String34` | Nein | Die IBAN des Kontos des Mitarbeiters |
| `bic` | `String11` | Nein | Die BIC des Kontos des Mitarbeiters |
| `kontoNr` | `String32` | Nein | Die Kontonummer des Mitarbeiters. Pflicht bei Anlage und Update falls die BLZ ge... |
| `blz` | `String32` | Nein | Die BLZ des Kontos des Mitarbeiters. Pflicht bei Anlage falls die Kontonummer ge... |
| `bankname` | `String64` | Nein | Der Name der Bank des Kontos des Mitarbeiters |
| `abteilung` | `String64` | Nein | Die Abteilung, der der Mitarbeiter zugeordnet ist (mit dem Abteilungs-Modul). Mu... |
| `preisgruppe` | `String32` | Nein | Die Preisgruppe des Mitarbeiters. Pflicht bei der Anlage. |
| `beschaeftigungszeitListe` | `BeschaeftigungszeitListeType` | Nein | Eine Liste von Beschäftigungszeiträumen. |
| `regelarbeitszeitListe` | `RegelarbeitszeitListeType` | Nein | Eine Liste von Regelarbeitszeit-Definitionen. |
| `freigabedatum` | `IsoDate` | Nein | Das Datum, bis zu dem der Mitarbeiter seine Zeiten und Belege freigegeben hat. |
| `titel` | `String32` | Nein | Der Titel des Mitarbeiters. |
| `internersatzListe` | `InternersatzListeType` | Nein | Liste von internen Stunden-/Tagessätzen. |
| `waehrung` | `String32` | Nein | Bei Freelancern mit Gutschrift: Währung für Gutschrift. |
| `mwst` | `Decimal6_4` | Nein | Bei Freelancern mit Gutschrift: MwSt-Satz für Gutschrift. |
| `freelancer` | `int0_2` | Nein | 0 oder leer=Mitarbeiter, 1=Freelancer, 2=Freelancer mit Gutschrift. |
| `created` | `IsoDateTime` | Nein | Der Zeitpunkt der Anlage des Objekts. |
| `modified` | `IsoDateTime` | Nein | Der Zeitpunkt der letzten Änderung des Objekts. |
| `kurzzeichen` | `String32` | Nein | Das Kurzzeichen des Mitarbeiters. |
| `rechte` | `int0_3` | Nein | Die Rolle des Mitarbeiters. 0 oder leer=User, 1=Admin, 2=Controller, 3=User mit ... |
| `kategorieListe` | `KategorieListeType` | Nein |  |
| `abgeglicheneZeitenListe` | `AbgeglicheneZeitenListeType` | Nein |  |
| `ueberstundenBerechnenUndAnzeigen` | `boolean` | Nein |  |
| `personioId` | `String32` | Nein | Die Employee-Id des Benutzers in Personio |
| `attributes` | `AttributesType` | Nein | Liste von Attributen für kundenspezifische Erweiterungen. |

### ReadMitarbeiterRequestType

Die Parameter zum Lesen von Mitarbeitern.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `readMitarbeiterSearchCriteria` | `ReadMitarbeiterSearchCriteriaType` | Ja | Die Suchkriterien zur Suche von Mitarbeitern. |

### ReadMitarbeiterResponseType

Die Antwort beim Lesen eines Mitarbeiters.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `mitarbeiterListe` | `MitarbeiterListeType` | Ja | Die Liste der gelesenen Mitarbeiter. |

### ReadMitarbeiterSearchCriteriaType

Kriterien für die Suche nach Mitarbeitern.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `userId` | `String32` | Nein | Der Benutzername des zu liefernden Mitarbeiters. |
| `von` | `IsoDate` | Nein | Das Startdatum des Intervalls, in dem die zu liefernden Mitarbeiter beschäftigt ... |
| `bis` | `IsoDate` | Nein | Das Endedatum des Intervalls, in dem die zu liefernden Mitarbeiter beschäftigt s... |
| `abteilung` | `String64` | Nein | Die Abteilung der zu liefernden Mitarbeiter. |
| `inklusiveUnterabteilung` | `boolean` | Nein | Flagge, ob Mitarbeiter, die untergeordneten Abteilungen zugeordnet sind, ebenfal... |
| `modifiedSince` | `IsoDateTime` | Nein |  |
| `email` | `String64` | Nein |  |
| `attributes` | `AttributesType` | Nein | Liste von Attributen für kundenspezifische Erweiterungen. |

### UpdateMitarbeiterRequestType

Die Parameter zum Aktualisieren eines Mitarbeiters.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `mitarbeiter` | `MitarbeiterType` | Ja | Die Daten zur Aktualisierung des Mitarbeiters. |

### UpdateMitarbeiterResponseType

Die Antwort bei der Aktualisierung eines Mitarbeiters.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |

