# Zeiterfassungs-API

Kommt/Geht-Buchungen und Anwesenheitserfassung

---

## Operationen

### readKommtGeht

- **Request:** `readKommtGehtRequest`
- **Response:** `readKommtGehtResponse`

## Komplexe Typen

### KommtGehtListeType

#### Felder

| Feld        | Typ             | Pflicht | Beschreibung |
| ----------- | --------------- | ------- | ------------ |
| `kommtGeht` | `KommtGehtType` | Nein    |              |

#### Attribute

- `length` (int):

### KommtGehtType

wann kommt oder geht

#### Felder

| Feld         | Typ           | Pflicht | Beschreibung                                                               |
| ------------ | ------------- | ------- | -------------------------------------------------------------------------- |
| `userId`     | `String32`    | Ja      |                                                                            |
| `wann`       | `IsoDateTime` | Nein    | wann kommt oder geht                                                       |
| `typ`        | `string`      | Nein    | kommt oder geht                                                            |
| `bemerkung`  | `string`      | Nein    |                                                                            |
| `geraetTyp`  | `string`      | Nein    | Terminal , App , Web ( Web-Oberfläche) oder Task (Automatisch abgelmeldet) |
| `geraetName` | `String120`   | Nein    |                                                                            |

### ReadKommtGehtRequestType

Der allgemeine ZEP Response-Header.

#### Felder

| Feld                          | Typ                               | Pflicht | Beschreibung                        |
| ----------------------------- | --------------------------------- | ------- | ----------------------------------- |
| `requestHeader`               | `RequestHeaderType`               | Nein    | Der allgemeine ZEP Response-Header. |
| `readKommtGehtSearchCriteria` | `ReadKommtGehtSearchCriteriaType` | Ja      |                                     |

### ReadKommtGehtResponseType

Der allgemeine ZEP Response-Header.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Nein    | Der allgemeine ZEP Response-Header. |
| `kommtGehtListe` | `KommtGehtListeType` | Nein    |                                     |

### ReadKommtGehtSearchCriteriaType

#### Felder

| Feld     | Typ           | Pflicht | Beschreibung |
| -------- | ------------- | ------- | ------------ |
| `userId` | `String32`    | Nein    |              |
| `von`    | `IsoDateTime` | Ja      |              |
| `bis`    | `IsoDateTime` | Ja      |              |
