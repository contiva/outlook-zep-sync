# Einplanungs-API

Operationen und Typen für die Ressourcenplanung

---

## Operationen

### createEinplanung

- **Request:** `createEinplanungRequest`
- **Response:** `createEinplanungResponse`

### deleteEinplanung

- **Request:** `deleteEinplanungRequest`
- **Response:** `deleteEinplanungResponse`

### readEinplanung

- **Request:** `readEinplanungRequest`
- **Response:** `readEinplanungResponse`

### updateEinplanung

- **Request:** `updateEinplanungRequest`
- **Response:** `updateEinplanungResponse`

## Komplexe Typen

### CreateEinplanungRequestType

Die Parameter zur Anlage einer Einplanung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Ja |  |
| `einplanung` | `EinplanungType` | Nein |  |

### CreateEinplanungResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja |  |

### DeleteEinplanungRequestType

Die Parameter zum Löschen einer Einplanung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Ja |  |
| `id` | `int` | Ja |  |

### DeleteEinplanungResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja |  |

### EinplanungListeType

Liste von Einplanungen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `einplanung` | `EinplanungType` | Nein |  |

#### Attribute

- `length` (int): 

### EinplanungType

Daten einer Einplanung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `id` | `int` | Nein |  |
| `datum` | `IsoDate` | Ja |  |
| `userId` | `String32` | Ja |  |
| `projektNr` | `String64` | Nein |  |
| `kundenNr` | `String32` | Nein |  |
| `anzahlStunden` | `Decimal7_11` | Nein | entwider anzahlStunden (decimal) oder prozentDerVerfuegbarkeit (decimal zwischen... |
| `prozentDerVerfuegbarkeit` | `double` | Nein | entwider anzahlStunden (decimal) oder prozentDerVerfuegbarkeit (decimal zwischen... |
| `vonZeit` | `IsoTime` | Nein | entwider anzahlStunden (decimal) oder prozentDerVerfuegbarkeit (decimal zwischen... |
| `bisZeit` | `IsoTime` | Nein | entwider anzahlStunden (decimal) oder prozentDerVerfuegbarkeit (decimal zwischen... |
| `projektId` | `int` | Nein |  |
| `stundenEffektiv` | `Decimal7_11` | Nein |  |

### ReadEinplanungRequestType

Die Parameter zum Lesen von Einplanungen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Ja |  |
| `readEinplanungSearchCriteria` | `ReadEinplanungSearchCriteriaType` | Nein |  |

### ReadEinplanungResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja |  |
| `einplanungListe` | `EinplanungListeType` | Nein |  |

### ReadEinplanungSearchCriteriaType

Suchkriterien zur Abfrage von Einplanungen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `vonDatum` | `IsoDate` | Nein |  |
| `bisDatum` | `IsoDate` | Nein |  |
| `userIdListe` | `UserIdListeType` | Nein |  |
| `projektNrListe` | `ProjektNrListeType` | Nein |  |
| `projektId` | `int` | Nein |  |
| `defaultEinplanungAnzeigen` | `boolean` | Nein |  |

### UpdateEinplanungRequestType

Die Parameter zur Aktualisierung einer Einplanung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Ja |  |
| `einplanung` | `EinplanungType` | Ja |  |

### UpdateEinplanungResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja |  |

