# Vorgang-API

Operationen und Typen für die Vorgangsverwaltung

---

## Operationen

### createVorgang

- **Request:** `createVorgangRequest`
- **Response:** `createVorgangResponse`

### deleteVorgang

- **Request:** `deleteVorgangRequest`
- **Response:** `deleteVorgangResponse`

### readVorgang

- **Request:** `readVorgangRequest`
- **Response:** `readVorgangResponse`

### updateVorgang

- **Request:** `updateVorgangRequest`
- **Response:** `updateVorgangResponse`

## Komplexe Typen

### CreateVorgangRequestType

Die Parameter zur Anlage von Vorgängen.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Ja      |              |
| `vorgang`       | `VorgangType`       | Nein    |              |

### CreateVorgangResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |
| `id`             | `int`                | Nein    |              |

### DeleteVorgangRequestType

Die Parameter zum Löschen von Vorgängen.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Ja      |              |
| `id`            | `int`               | Ja      |              |

### DeleteVorgangResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |

### ReadVorgangRequestType

Die Parameter zum Lesen von Vorgängen.

#### Felder

| Feld                        | Typ                             | Pflicht | Beschreibung |
| --------------------------- | ------------------------------- | ------- | ------------ |
| `requestHeader`             | `RequestHeaderType`             | Ja      |              |
| `readVorgangSearchCriteria` | `ReadVorgangSearchCriteriaType` | Nein    |              |

### ReadVorgangResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |
| `vorgangListe`   | `VorgangListeType`   | Nein    |              |

### ReadVorgangSearchCriteriaType

Suchkriterien zur Abfrage von Vorgängen.

#### Felder

| Feld          | Typ                      | Pflicht | Beschreibung                                                                        |
| ------------- | ------------------------ | ------- | ----------------------------------------------------------------------------------- |
| `projektNr`   | `String64`               | Ja      |                                                                                     |
| `id`          | `int`                    | Nein    |                                                                                     |
| `vorgangNr`   | `String64`               | Nein    |                                                                                     |
| `parentId`    | `int`                    | Nein    | bitte mit 0 belegen falls nach Vorgaenge ohne Parents gesucht wird.                 |
| `parent`      | `String64`               | Nein    | VorgangNr des übergeordneten Vorgang. Bitte mit 0 belegen falls nach Vorgaenge o... |
| `startDatum`  | `IsoDate`                | Nein    |                                                                                     |
| `endeDatum`   | `IsoDate`                | Nein    |                                                                                     |
| `statusListe` | `VorgangStatusListeType` | Nein    |                                                                                     |
| `projektId`   | `int`                    | Nein    |                                                                                     |

### UpdateVorgangRequestType

Die Parameter zur Aktualisierung von Vorgängen.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Ja      |              |
| `vorgang`       | `VorgangType`       | Ja      |              |

### UpdateVorgangResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |

### VorgangListeType

Eine Liste von Vorgängen.

#### Felder

| Feld      | Typ           | Pflicht | Beschreibung  |
| --------- | ------------- | ------- | ------------- |
| `vorgang` | `VorgangType` | Nein    | Die Vorgänge. |

### VorgangStatusListeType

Liste von Vorgangs-Status.

#### Felder

| Feld     | Typ        | Pflicht | Beschreibung |
| -------- | ---------- | ------- | ------------ |
| `status` | `String64` | Nein    |              |

### VorgangType

Die Daten eines Vorgangs.

#### Felder

| Feld                                                | Typ                           | Pflicht | Beschreibung                                                                        |
| --------------------------------------------------- | ----------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `vorgangNr`                                         | `String64`                    | Nein    | Die Nummer des Vorgangs. Pflicht bei Anlage, Update und beim Löschen.               |
| `parent`                                            | `String64`                    | Nein    | Die Nummern der übergeordneten Vorgänge, dargestellt als Pfad in folgender Form:... |
| `projektNr`                                         | `String64`                    | Nein    | Die Nummer des Projekts, dem der Vorgang zugeordnet ist. Pflicht bei der Anlage.    |
| `vorgangName`                                       | `String255`                   | Nein    | Die Bezeichnung des Vorgangs.                                                       |
| `startDatum`                                        | `IsoDate`                     | Nein    | Das Start-Datum des Vorgangs. Format: JJJJ-MM-TT                                    |
| `endeDatum`                                         | `IsoDate`                     | Nein    | Das Ende-Datum des Vorgangs. Format: JJJJ-MM-TT                                     |
| `planStunden`                                       | `Decimal10_2`                 | Nein    | Der geplante Aufwand (in Stunden) für den Vorgang.                                  |
| `dynamischePlanStunden`                             | `Decimal12_2`                 | Nein    |                                                                                     |
| `planArbeitsentgelt`                                | `Decimal12_2`                 | Nein    | Das geplante Arbeitsentgelt für den Vorgang.                                        |
| `dynamischePlanArbeitsentgelt`                      | `Decimal12_2`                 | Nein    |                                                                                     |
| `planBelege`                                        | `Decimal12_2`                 | Nein    | Der eingeplante Betrag für Belege und VMA für diesen Vorgang.                       |
| `dynamischePlanKosten`                              | `Decimal12_2`                 | Nein    |                                                                                     |
| `bemerkung`                                         | `string`                      | Nein    | Eine Bemerkung zum Vorgang.                                                         |
| `status`                                            | `String64`                    | Nein    | Der Status des Vorgangs.                                                            |
| `sortierung`                                        | `int`                         | Nein    | Ein Zahl zur Festlegung der Sortier-Reihenfolge.                                    |
| `kostentraeger`                                     | `String32`                    | Nein    | Der diesem Vorgang zugeordnete Kostenträger.                                        |
| `kostenstelle`                                      | `String32`                    | Nein    | Die diesem Vorgang zugeordnete Kostenstelle.                                        |
| `vorgangMitarbeiterListe`                           | `VorgangMitarbeiterListeType` | Nein    | Die Liste der dem Vorgang zugeordneten Mitarbeiter.                                 |
| `defaultFakt`                                       | `int0_4`                      | Nein    | 0 = Fakturierbarkeit geerbt vom Projekt 1=Fakturierbar änderbar(durch Mitarbeite... |
| `rechenArt`                                         | `int0_3`                      | Nein    | 0=wie Projekt 1=Abrechnung Stundensatz 2=Abrechnung Tagessatz 3=Abrechnung Pausc... |
| `ueberbuchung`                                      | `int0_4`                      | Nein    | 0=Überbuchung nicht verhindern. 1=Überbuchung verhindern nur für fakturierbare Z... |
| `vorgangstaetigkeitListe`                           | `VorgangstaetigkeitListeType` | Nein    |                                                                                     |
| `istStunden`                                        | `Decimal8_10`                 | Nein    |                                                                                     |
| `istStundenFakt`                                    | `Decimal8_10`                 | Nein    |                                                                                     |
| `id`                                                | `int`                         | Nein    | NUR für updateVorgang bzw. deleteVorgang Operationen, vor allem um den übergeord... |
| `parentId`                                          | `int`                         | Nein    | NUR für Operationen createVorgang bzw. updateVorgang. Wenn Vorgang kein Parent h... |
| `projektId`                                         | `int`                         | Nein    |                                                                                     |
| `belegErfassung`                                    | `boolean`                     | Nein    |                                                                                     |
| `bestellnummer`                                     | `String100`                   | Nein    |                                                                                     |
| `auftragsnummer`                                    | `String100`                   | Nein    |                                                                                     |
| `alleProjektmitarbeiterSindAuchVorgangsmitarbeiter` | `boolean`                     | Nein    |                                                                                     |
| `action`                                            | `string`                      | Nein    | Aktion. Um den Vorgang im Rahmen eines Updates zu löschen muss hier "delete" ang... |
| `attributes`                                        | `AttributesType`              | Nein    | Liste von Attributen für kundenspezifische Erweiterungen                            |

### VorgangstaetigkeitListeType

Liste von Vorgangstätigkeiten

#### Felder

| Feld         | Typ                      | Pflicht | Beschreibung |
| ------------ | ------------------------ | ------- | ------------ |
| `taetigkeit` | `VorgangstaetigkeitType` | Nein    |              |

### VorgangstaetigkeitType

Daten zur Zuordnung einer Vorgangstätigkeit

#### Felder

| Feld         | Typ        | Pflicht | Beschreibung |
| ------------ | ---------- | ------- | ------------ |
| `taetigkeit` | `String32` | Nein    |              |
| `standard`   | `boolean`  | Nein    |              |
| `action`     | `string`   | Nein    |              |
