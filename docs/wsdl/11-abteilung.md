# Abteilungs-API

Operationen und Typen für die Abteilungsverwaltung

---

## Operationen

### createAbteilung

- **Request:** `createAbteilungRequest`
- **Response:** `createAbteilungResponse`

### deleteAbteilung

- **Request:** `deleteAbteilungRequest`
- **Response:** `deleteAbteilungResponse`

### readAbteilung

- **Request:** `readAbteilungRequest`
- **Response:** `readAbteilungResponse`

### updateAbteilung

- **Request:** `updateAbteilungRequest`
- **Response:** `updateAbteilungResponse`

## Komplexe Typen

### AbteilungListeType

Liste von Abteilungen.

#### Felder

| Feld        | Typ             | Pflicht | Beschreibung               |
| ----------- | --------------- | ------- | -------------------------- |
| `abteilung` | `AbteilungType` | Nein    | Die Abteilungen der Liste. |

#### Attribute

- `length` (int): Anzahl der Abteilungen in der Liste.

### AbteilungType

Die Parameter einer Abteilung.

#### Felder

| Feld                    | Typ                         | Pflicht | Beschreibung                                                                        |
| ----------------------- | --------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `id`                    | `int`                       | Nein    |                                                                                     |
| `kurzform`              | `String64`                  | Ja      | Die Kurzbezeichnung der Abteilung.                                                  |
| `bezeichnung`           | `String255`                 | Nein    | Die Bezeichnung der Abteilung.                                                      |
| `waehrung`              | `String32`                  | Nein    | Die Währung der Abteilung.                                                          |
| `inaktiv`               | `boolean`                   | Nein    | Kennung, ob die Abteilung aktiv oder inaktiv ist.                                   |
| `rechnungsnummerPrefix` | `String32`                  | Nein    | Der Präfix des Rechnungsnummernkreises dieser Abteilung für die Rechnunngsnummer... |
| `rechnungsnummerSuffix` | `String32`                  | Nein    | Der Suffix des Rechnungsnummernkreises dieser Abteilung für die Rechnunngsnummer... |
| `rechnungsnummerLaenge` | `int`                       | Nein    | Die Stelelnanzahlen der Nummerirung im Rechnungsnummernkreis dieser Abteilung fü... |
| `oberAbteilung`         | `String64`                  | Nein    | Die übergeorndete Abteilung.                                                        |
| `abteilungsleiterListe` | `AbteilungsleiterListeType` | Nein    |                                                                                     |
| `parentId`              | `int`                       | Nein    |                                                                                     |
| `bemerkung`             | `string`                    | Nein    |                                                                                     |

### AbteilungsleiterListeType

Liste von Abteilungsleitern.

#### Felder

| Feld               | Typ                    | Pflicht | Beschreibung                                                                        |
| ------------------ | ---------------------- | ------- | ----------------------------------------------------------------------------------- |
| `abteilungsleiter` | `AbteilungsleiterType` | Nein    | Wegen neue Feature create/update Abteilung wird empfolen das AbteilungsleiterTyp... |

### AbteilungsleiterType

Daten eines Abteilungsleiters.

#### Felder

| Feld         | Typ              | Pflicht | Beschreibung                                                                        |
| ------------ | ---------------- | ------- | ----------------------------------------------------------------------------------- |
| `userId`     | `String32`       | Nein    |                                                                                     |
| `action`     | `string`         | Nein    | Aktion. Um die Abteilungsleiter-Zuordnung zum Object im Rahmen eines Updates zu ... |
| `attributes` | `AttributesType` | Nein    | Liste von Attributen für kundenspezifische Erweiterungen.                           |

### CreateAbteilungRequestType

Die Parameter zur Anlage einer Abteilung.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Ja      |              |
| `abteilung`     | `AbteilungType`     | Nein    |              |

### CreateAbteilungResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |
| `id`             | `int`                | Nein    |              |

### DeleteAbteilungRequestType

Die Parameter zum Löschen einer Abteilung.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                       |
| --------------- | ------------------- | ------- | ---------------------------------- |
| `requestHeader` | `RequestHeaderType` | Ja      |                                    |
| `id`            | `int`               | Nein    | entweder id oder kurzform eingeben |
| `kurzform`      | `string`            | Nein    | entweder id oder kurzform eingeben |

### DeleteAbteilungResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |

### ReadAbteilungRequestType

Die Request-Struktur zum Lesen einer Abteilung.

#### Felder

| Feld                          | Typ                               | Pflicht | Beschreibung                              |
| ----------------------------- | --------------------------------- | ------- | ----------------------------------------- |
| `requestHeader`               | `RequestHeaderType`               | Nein    | Der allgemeine ZEP Request-Header.        |
| `readAbteilungSearchCriteria` | `ReadAbteilungSearchCriteriaType` | Ja      | Die Kriterien zur Suche nach Abteilungen. |

### ReadAbteilungResponseType

Die Antwort-Struktur mit den gelesenen Abteilungen.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      |                                     |
| `abteilungListe` | `AbteilungListeType` | Ja      | Der allgemeine ZEP Response-Header. |

### ReadAbteilungSearchCriteriaType

Die Suchkriterien zum Lesen von Abteilungen.

#### Felder

| Feld                                                          | Typ        | Pflicht | Beschreibung                                                                        |
| ------------------------------------------------------------- | ---------- | ------- | ----------------------------------------------------------------------------------- |
| `kurzform`                                                    | `String64` | Nein    |                                                                                     |
| `oberAbteilung`                                               | `String64` | Nein    |                                                                                     |
| `inaktiv`                                                     | `boolean`  | Nein    |                                                                                     |
| `id`                                                          | `int`      | Nein    | Technische Id der Abteilung.                                                        |
| `parentId`                                                    | `int`      | Nein    | Technische Id der übergeordneten Abteilung.                                         |
| `beiAbteilungsleiterAuchNichtAktuellBeschaeftigteMitarbeiter` | `boolean`  | Nein    | Liefert auch Abteilungsleiter die aktuell nicht beschaeftigte Mitarbeiter sind. ... |

### UpdateAbteilungRequestType

Die Parameter zur Aktualisierung einer Abteilung.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Ja      |              |
| `abteilung`     | `AbteilungType`     | Nein    |              |

### UpdateAbteilungResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |
| `id`             | `int`                | Nein    |              |
