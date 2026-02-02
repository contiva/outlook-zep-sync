# Stammdaten-API

Kategorien, Tätigkeiten, Schlagworte und andere Stammdaten

---

## Operationen

### readKategorie

- **Request:** `readKategorieRequest`
- **Response:** `readKategorieResponse`

### readSchlagworte

- **Request:** `readSchlagworteRequest`
- **Response:** `readSchlagworteResponse`

### readTaetigkeit

- **Request:** `readTaetigkeitRequest`
- **Response:** `readTaetigkeitResponse`

## Komplexe Typen

### KategorieFilterType

Filterkriterien zur Abfrage von Kategorien.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `kategorie` | `String32` | Nein |  |

#### Attribute

- `verknuepfung_und` (boolean): 

### KategorieListeType

Eine Liste von Kategorien.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `kategorie` | `KategorieType` | Nein | Die Liste der Kategorien. |
| `alteUeberschreiben` | `boolean` | Nein |  |

### KategorieType

für Update oder Create ist nur Kurzform einzugeben

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `kurzform` | `String32` | Ja |  |
| `bezeichnung_de` | `string` | Nein | beim Esrtellen oder Bearbeiten wird ignoriert |
| `bezeichnung_en` | `string` | Nein | beim Esrtellen oder Bearbeiten wird ignoriert |
| `bezeichnung_fr` | `string` | Nein | beim Esrtellen oder Bearbeiten wird ignoriert |
| `bezeichnung_es` | `string` | Nein |  |
| `bezeichnung_pl` | `string` | Nein |  |
| `action` | `string` | Nein | Aktion. Um die Kategorie-Zuordnung zum Object im Rahmen eines Updates zu entfern... |

### ReadKategorieRequestType

Die Parameter zur Abfrage von Kategorien.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `kategorieArt` | `string` | Ja | kategorieArt muss ein Wert haben (Klein oder Groß geschrieben): mitarbeiter, pro... |
| `readKategorieSearchCriteria` | `ReadKategorieSearchCriteriaType` | Nein |  |

### ReadKategorieResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `kategorieListe` | `KategorieListeType` | Nein |  |

### ReadKategorieSearchCriteriaType

Die Kriterien zum Lesen von Kategorien.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `kurzform` | `string` | Nein | mehrere Kategorien können mit Komma getrennt abgefargt werden |

### ReadSchlagworteSerachCriteriaType

Die Suchkriterien zum Lesen von Schlagworten.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `schlagwortArt` | `string` | Ja |  |

### ReadTaetigkeitRequestType

Der Request zum Lesen von Tätigkeiten.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `readTaetigkeitSearchCriteria` | `ReadTaetigkeitSearchCriteriaType` | Nein |  |

### ReadTaetigkeitResponseType

Der allgemeine ZEP Response-Header.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Nein | Der allgemeine ZEP Response-Header. |
| `taetigkeitListe` | `TaetigkeitListeType` | Nein | Die Liste der gefundenen Tätigkeiten. |

### ReadTaetigkeitSearchCriteriaType

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `taetigkeit` | `String32` | Nein |  |

### SchlagwortType

Es reicht ein Schlagwort einer Sprache einzugeben bei der Suche. Beim Anlegen bzw. Bearbeiten es ist zu empfehlen die Synonyme in der 3 Sprachen einzegeben wenn das Schlagwort noch nicht in Stammdaten definiert.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `de` | `string` | Nein |  |
| `en` | `string` | Nein |  |
| `fr` | `string` | Nein |  |
| `es` | `string` | Nein |  |
| `pl` | `string` | Nein |  |

### SchlagworteFilterType

Filterkriterien zur Abfrage von Schlagworten.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `schlagwort` | `String64` | Nein |  |

#### Attribute

- `verknuepfung_und` (boolean): 

### SchlagworteListeType

Die Liste von Schlagworten.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `schlagwort` | `SchlagwortType` | Nein |  |

#### Attribute

- `verknuepfung_und` (boolean): ist relevant nur fürs Lesen. Wenn =true dann werden Objekte geliefert die alle nachgefragten Kategorien enthalten. Default =false.

### TaetigkeitListeType

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `taetigkeit` | `TaetigkeitType` | Nein |  |

#### Attribute

- `length` (int): 

### TaetigkeitType

true : darf sich mit anderen überschneiden, ist nicht arbeitsteitrelevant, nicht VMA-relevant und darf mit Dauer 0 gebucht werden. z.B. Rufbereitschaft

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `taetigkeit` | `String32` | Nein |  |
| `bezeichnung` | `string` | Nein |  |
| `bemerkung` | `string` | Nein |  |
| `istReise` | `boolean` | Nein |  |
| `darfUeberschneiden` | `boolean` | Nein | true : darf sich mit anderen überschneiden, ist nicht arbeitsteitrelevant, nicht... |
| `nichFakturierbarAuswertbar` | `boolean` | Nein | true : auch 'nicht fakturierbar' gebuchte Projektzeiten sind auf Projektzeitnach... |

