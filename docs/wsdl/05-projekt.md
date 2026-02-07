# Projekt-API

Operationen und Typen für die Projektverwaltung

---

## Operationen

### createProjekt

- **Request:** `createProjektRequest`
- **Response:** `createProjektResponse`

### deleteProjekt

- **Request:** `deleteProjektRequest`
- **Response:** `deleteProjektResponse`

### filterProjekte

- **Request:** `filterProjekteRequest`
- **Response:** `filterProjekteResponse`

### getProjekt

- **Request:** `getProjektRequest`
- **Response:** `getProjektResponse`

### readProjekte

- **Request:** `readProjekteRequest`
- **Response:** `readProjekteResponse`

### updateProjekt

- **Request:** `updateProjektRequest`
- **Response:** `updateProjektResponse`

## Komplexe Typen

### CreateProjektRequestType

Die Parameter zur Anlage eines neuen Projekts.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                       |
| --------------- | ------------------- | ------- | ---------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header. |
| `projekt`       | `ProjektType`       | Ja      | Die Daten des neuen Projekts.      |

### CreateProjektResponseType

Das Antwort-Objekt der Projekt-Anlage.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |
| `projektNr`      | `String64`           | Nein    |                                     |
| `id`             | `int`                | Nein    |                                     |

### DeleteProjektRequestType

Die Parameter zum Löschen eines Projekts.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                            |
| --------------- | ------------------- | ------- | --------------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header.      |
| `id`            | `int`               | Nein    |                                         |
| `projektNr`     | `String64`          | Nein    | Die Nummer des zu löschenden Projektes. |

### DeleteProjektResponseType

Das Antwort-Objekt beim Löschen eines Projektes.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### FilterProjekteRequestType

Die Paramater zum Filtern von Projekten.

#### Felder

| Feld                           | Typ                                | Pflicht | Beschreibung |
| ------------------------------ | ---------------------------------- | ------- | ------------ |
| `requestHeader`                | `RequestHeaderType`                | Ja      |              |
| `filterProjekteSearchCriteria` | `FilterProjekteSearchCriteriaType` | Ja      |              |

### FilterProjekteResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld               | Typ                    | Pflicht | Beschreibung |
| ------------------ | ---------------------- | ------- | ------------ |
| `responseHeader`   | `ResponseHeaderType`   | Ja      |              |
| `projektDataListe` | `ProjektDataListeType` | Ja      |              |

### FilterProjekteSearchCriteriaType

Die Suchkriterien zur Suche nach Projekten.

#### Felder

| Feld                      | Typ                      | Pflicht | Beschreibung                                                                        |
| ------------------------- | ------------------------ | ------- | ----------------------------------------------------------------------------------- |
| `id`                      | `int`                    | Nein    |                                                                                     |
| `von`                     | `IsoDate`                | Nein    | Das Anfangsdatum des Zeitraums, in dem die zu liefernden Projekte liegen müssen.... |
| `bis`                     | `IsoDate`                | Nein    | Das Enddatum des Zeitraums, in dem die zu liefernden Projekte liegen müssen. For... |
| `projektNrListe`          | `ProjektNrListeType`     | Nein    | Liste der Projekt-Nummern der zu berücksichtigenden Projekte.                       |
| `abteilung`               | `String64`               | Nein    | Die Abteilung, der die zu liefernden Projekte zugeordnet sein müssen.               |
| `inklusiveUnterabteilung` | `boolean`                | Nein    | default = false                                                                     |
| `statusListe`             | `ProjektstatusListeType` | Nein    | Der Status der zu liefernden Projekte.                                              |
| `schlagworteFilter`       | `SchlagworteFilterType`  | Nein    | Das Schlagwort kann hier egal in welcher Sprachen eingeben werden. -ohne- oder -... |
| `kategorieFilter`         | `KategorieFilterType`    | Nein    | -ohne- oder -without- oder -sans- lieferen Objekte Ohne Schlagworte                 |
| `kundenNrListe`           | `KundenNrListeType`      | Nein    |                                                                                     |
| `suchbegriff`             | `string`                 | Nein    | Durch den in das Suchfeld eingebebenen Text wird die Ergebnistabelle nach: Kurzf... |
| `modifiedSince`           | `IsoDateTime`            | Nein    |                                                                                     |
| `attributes`              | `AttributesType`         | Nein    | Liste von Attributen für kundenspezifische Erweiterungen.                           |

### GetProjektRequestType

Die Parameter zur Abfrage eines Projektes

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Ja      |              |
| `id`            | `int`               | Ja      |              |

### GetProjektResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |
| `projekt`        | `ProjektType`        | Nein    |              |

### ProjektDataListeType

Liste von Projekt-Daten.

#### Felder

| Feld          | Typ               | Pflicht | Beschreibung |
| ------------- | ----------------- | ------- | ------------ |
| `projektData` | `ProjektDataType` | Nein    |              |

#### Attribute

- `length` (int):

### ProjektDataType

Daten eines Projektes.

#### Felder

| Feld                       | Typ                    | Pflicht | Beschreibung                                                                        |
| -------------------------- | ---------------------- | ------- | ----------------------------------------------------------------------------------- |
| `id`                       | `int`                  | Nein    | Eindeutig und nicht änderbar, es wird in Datenbank automatisch angelegt.            |
| `projektNr`                | `String64`             | Nein    | Die Nummer des Projekts.                                                            |
| `kundenNr`                 | `String32`             | Nein    | Die Nummer des Kunden, dem dieses Projekt zugeordnet ist. Pflicht bei der Anlage... |
| `bezeichnung`              | `String255`            | Nein    | Die Bezeichnung des Projektes. Pflicht beim Anlegen.                                |
| `abteilung`                | `String64`             | Nein    | Die Abteilung, der das Projekt zugeordnet ist.                                      |
| `startDatum`               | `IsoDate`              | Nein    | Das Start-Datum des Projekts. Format: JJJJ-MM-TT                                    |
| `endeDatum`                | `IsoDate`              | Nein    | Das Ende-Datum des Projekts. Format: JJJJ-MM-TT                                     |
| `bemerkung`                | `string`               | Nein    | Eine Bemerkung zum Projekt.                                                         |
| `planKosten`               | `Decimal12_2`          | Nein    | Die geplanten Kosten des Projekts.                                                  |
| `planStunden`              | `Decimal12_2`          | Nein    | Die geplanten Stunden des Projekts.                                                 |
| `planArbeitsentgelt`       | `Decimal12_2`          | Nein    | Plan Arbeitsentgelt.                                                                |
| `planPauschal`             | `Decimal12_2`          | Nein    | Der geplante Pauschalpreis des Projekts.                                            |
| `kostenstelle`             | `String32`             | Nein    | Die Kostenstelle des Projekts (bei Einsatz des Moduls 'Export für Buchhaltung').    |
| `kundenAuftrag`            | `String64`             | Nein    | Die Aufragsnummer des Kunden für dieses Projekt.                                    |
| `kostentraeger`            | `String32`             | Nein    | Der Kostenträger des Projekts (bei Einsatz des Moduls 'Export für Buchhaltung').    |
| `status`                   | `String64`             | Nein    | Der Status des Projekts. Dieses ist die Kurzbezeichnung eines der in den Stammda... |
| `rechenArt`                | `int1_3`               | Nein    | 1=Abrechnung Stundensatz 2=Abrechnung Tagessatz 3=Abrechnung Pauschal               |
| `ueberbuchung`             | `int0_4`               | Nein    | 0=Überbuchung nicht verhindern. 1=Überbuchung verhindern nur für fakturierbare Z... |
| `waehrung`                 | `String32`             | Nein    | Die Projektwährung.                                                                 |
| `projektbundesland`        | `String64`             | Nein    |                                                                                     |
| `projektland`              | `String32`             | Nein    |                                                                                     |
| `voreinstFakturierbarkeit` | `int1_4`               | Nein    | 1=Voreinstellung Fakturierbar, durch den Mitarbeiter änderbar 2=Voreinstellung F... |
| `istStunden`               | `Decimal8_10`          | Nein    |                                                                                     |
| `istStundenFakt`           | `Decimal8_10`          | Nein    |                                                                                     |
| `created`                  | `IsoDateTime`          | Nein    | Der Zeitpunkt der Anlage des Objekts.                                               |
| `modified`                 | `IsoDateTime`          | Nein    | Der Zeitpunkt der letzten Änderung des Objekts.                                     |
| `kategorieListe`           | `KategorieListeType`   | Nein    |                                                                                     |
| `schlagworteListe`         | `SchlagworteListeType` | Nein    |                                                                                     |
| `attributes`               | `AttributesType`       | Nein    | Liste von Attributen für kundenspezifische Erweiterungen.                           |

### ProjektListeType

Eine Liste von Projekten.

#### Felder

| Feld      | Typ           | Pflicht | Beschreibung                              |
| --------- | ------------- | ------- | ----------------------------------------- |
| `projekt` | `ProjektType` | Nein    | Die in dieser Liste enthaltenen Projekte. |

#### Attribute

- `length` (int): Die Anzahl der Projekte in dieser Liste.

### ProjektMitarbeiterListeType

Eine Liste von Projektmitarbeitern.

#### Felder

| Feld                 | Typ                      | Pflicht | Beschreibung                      |
| -------------------- | ------------------------ | ------- | --------------------------------- |
| `projektmitarbeiter` | `ProjektMitarbeiterType` | Nein    | Die Liste der Projektmitarbeiter. |

### ProjektMitarbeiterType

Die Zuordnung eines Mitarbeiters zu einem Projekt.

#### Felder

| Feld                              | Typ              | Pflicht | Beschreibung                                                                        |
| --------------------------------- | ---------------- | ------- | ----------------------------------------------------------------------------------- |
| `id`                              | `int`            | Nein    |                                                                                     |
| `projektNr`                       | `String64`       | Nein    | Die Nummer des Projekts.                                                            |
| `userId`                          | `String32`       | Nein    | Der Benutzername des Mitarbeiters. Pflicht bei Anlage.                              |
| `von`                             | `IsoDate`        | Nein    | Das Datum, ab dem der Mitarbeiter dem Projekt zugeordnet ist. Format: JJJJ-MM-TT... |
| `bis`                             | `IsoDate`        | Nein    | Das Datum, bis zu dem der Mitarbeiter dem Projekt zugeordnet ist. Format: JJJJ-M... |
| `preisgruppe`                     | `String32`       | Nein    | Die Bezeichnung der Preisgruppe, in der der Mitarbeiter dem Projekt zugeordnet i... |
| `bemerkung`                       | `string`         | Nein    | Eine Bemerkung zur Zuordnung.                                                       |
| `istProjektleiter`                | `int0_2`         | Nein    | Flagge, ob der Mitarbeiter dem Projekt als Projektleiter zugeordnet ist: 0 => Pr... |
| `internersatz`                    | `Decimal12_2`    | Nein    |                                                                                     |
| `satztype`                        | `int0_2`         | Ja      | Steuert den 'internersatz': 1 = Stundensatz 2 = Tagessatz (Dies gilt nur beim Fr... |
| `verfuegbarkeit`                  | `int0_100`       | Nein    | dies gilt nur für Resourceplanung Module                                            |
| `projektId`                       | `int`            | Nein    |                                                                                     |
| `wennUeberlapptAndereBeschneiden` | `boolean`        | Nein    |                                                                                     |
| `action`                          | `string`         | Nein    | Aktion. Um den Mitarbeiter im Rahmen eines Updates aus dem Projekt zu entfernen ... |
| `attributes`                      | `AttributesType` | Nein    | Liste von Attributen für kundenspezifische Erweiterungen.                           |

### ProjektNrListeType

Eine Liste von Projektnummern.

#### Felder

| Feld        | Typ        | Pflicht | Beschreibung                                |
| ----------- | ---------- | ------- | ------------------------------------------- |
| `projektNr` | `String64` | Nein    | Die in der Liste enthaltenen Projektnummer. |

### ProjektType

Die Daten eines Projektes.

#### Felder

| Feld                           | Typ                           | Pflicht | Beschreibung                                                                        |
| ------------------------------ | ----------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `id`                           | `int`                         | Nein    |                                                                                     |
| `projektNr`                    | `String64`                    | Nein    | Die Nummer des Projekts. Wenn die Nummernkreis in der Projekt-Einstellungen defi... |
| `kundenNr`                     | `String32`                    | Nein    | Die Nummer des Kunden, dem dieses Projekt zugeordnet ist. Pflicht bei der Anlage... |
| `bezeichnung`                  | `String255`                   | Nein    | Die Bezeichnung des Projektes. Pflicht beim Anlegen.                                |
| `abteilung`                    | `String64`                    | Nein    | Die Abteilung, der das Projekt zugeordnet ist.                                      |
| `startDatum`                   | `IsoDate`                     | Nein    | Das Start-Datum des Projekts. Format: JJJJ-MM-TT                                    |
| `endeDatum`                    | `IsoDate`                     | Nein    | Das Ende-Datum des Projekts. Format: JJJJ-MM-TT                                     |
| `bemerkung`                    | `string`                      | Nein    | Eine Bemerkung zum Projekt.                                                         |
| `planKosten`                   | `Decimal12_2`                 | Nein    | Die geplanten Kosten des Projekts.                                                  |
| `dynamischePlanKosten`         | `Decimal12_2`                 | Nein    |                                                                                     |
| `planStunden`                  | `Decimal12_2`                 | Nein    | Die geplanten Stunden des Projekts.                                                 |
| `dynamischePlanStunden`        | `Decimal12_2`                 | Nein    | Die geplanten Stunden des Projekts, wenn es vorhanden, sonst von dessen Vorgänge    |
| `planArbeitsentgelt`           | `Decimal12_2`                 | Nein    | Plan Arbeitsentgelt des Projectes.                                                  |
| `dynamischePlanArbeitsentgelt` | `Decimal12_2`                 | Nein    | Plan Arbeitsentgelt des Projectes, wenn vorhanden, sonst von dessen Vorgänge.       |
| `planPauschal`                 | `Decimal12_2`                 | Nein    | Der geplante Pauschalpreis (Plan VMA bzw. Anreisepauschalen) des Projekts.          |
| `kostenstelle`                 | `String32`                    | Nein    | Die Kostenstelle des Projekts (bei Einsatz des Moduls 'Export für Buchhaltung').    |
| `kundenAuftrag`                | `String64`                    | Nein    | Die Aufragsnummer des Kunden für dieses Projekt.                                    |
| `kostentraeger`                | `String32`                    | Nein    | Der Kostenträger des Projekts (bei Einsatz des Moduls 'Export für Buchhaltung').    |
| `status`                       | `String64`                    | Nein    | Der Status des Projekts. Dieses ist die Kurzbezeichnung eines der in den Stammda... |
| `projektortListe`              | `ProjektortListeType`         | Nein    | Die Liste der Projektorte.                                                          |
| `vorgangListe`                 | `VorgangListeType`            | Nein    | Die Liste der Vorgänge des Projekts.                                                |
| `projektmitarbeiterListe`      | `ProjektMitarbeiterListeType` | Nein    | Die Liste der Projektmitarbeiter.                                                   |
| `projekttaetigkeitListe`       | `ProjekttaetigkeitListeType`  | Nein    | Die Liste der projektspezifischen Tätigkeiten.                                      |
| `preistabelleListe`            | `PreistabelleListeType`       | Nein    | Die Liste der Projekte-Preistabellen, der Kunden-Preistabellen oder der Basis-Pr... |
| `defaultFakt`                  | `int1_4`                      | Nein    | 1=Fakturierbar änderbar(durchMitarbeiter ) 2=Fakturierbar nicht änderbar (durch ... |
| `rechenArt`                    | `int1_3`                      | Nein    | 1=Abrechnung Stundensatz 2=Abrechnung Tagessatz 3=Abrechnung Pauschal               |
| `ueberbuchung`                 | `int0_4`                      | Nein    | 0=Überbuchung nicht verhindern. 1=Überbuchung verhindern nur für fakturierbare Z... |
| `waehrung`                     | `String32`                    | Nein    | Die Projektwährung.                                                                 |
| `projektbundesland`            | `String64`                    | Nein    |                                                                                     |
| `projektland`                  | `String32`                    | Nein    |                                                                                     |
| `projekttagessatzListe`        | `TagessatzanteilListeType`    | Nein    |                                                                                     |
| `kundenansprechpartner`        | `AnsprechpartnerType`         | Nein    | Dieser soll der Benutzername von Kundenansprechpartner sein, wenn nicht vorhande... |
| `voreinstFakturierbarkeit`     | `int1_4`                      | Nein    | 1=Voreinstellung Fakturierbar, durch den Mitarbeiter änderbar 2=Voreinstellung F... |
| `projektzusatzfelder`          | `ZusatzfelderType`            | Nein    |                                                                                     |
| `kategorieListe`               | `KategorieListeType`          | Nein    |                                                                                     |
| `schlagworteListe`             | `SchlagworteListeType`        | Nein    |                                                                                     |
| `istStunden`                   | `Decimal8_10`                 | Nein    |                                                                                     |
| `istStundenFakt`               | `Decimal8_10`                 | Nein    |                                                                                     |
| `sprache`                      | `String32`                    | Nein    | Leer = ZEP-Standarsprache de : deutsch en : englisch fr : französisch de_at : de... |
| `url`                          | `String255`                   | Nein    |                                                                                     |
| `vorgaengeEinzelnAbrechnen`    | `boolean`                     | Nein    | Vorgänge werden einzeln abgerechnet                                                 |
| `belegeinstellungen`           | `BelegeinstellungenType`      | Nein    |                                                                                     |
| `reiseeinstellungen`           | `ReiseeinstellungenType`      | Nein    |                                                                                     |
| `bestellnummer`                | `String100`                   | Nein    |                                                                                     |
| `auftragsnummer`               | `String100`                   | Nein    |                                                                                     |
| `created`                      | `IsoDateTime`                 | Nein    | Der Zeitpunkt der Anlage des Objekts.                                               |
| `modified`                     | `IsoDateTime`                 | Nein    | Der Zeitpunkt der letzten Änderung des Objekts.                                     |
| `erloeskontoNr`                | `String32`                    | Nein    |                                                                                     |
| `attributes`                   | `AttributesType`              | Nein    | Liste von Attributen für kundenspezifische Erweiterungen.                           |

### ProjektortListeType

Eine Liste von Arbeitsorten, die einem Projekt zugeordnet sind.

#### Felder

| Feld  | Typ              | Pflicht | Beschreibung     |
| ----- | ---------------- | ------- | ---------------- |
| `ort` | `ProjektortType` | Nein    | Die Projektorte. |

### ProjektortType

Die Daten eines einzelnen, einem Projekt zugeordneten Arbeitsortes.

#### Felder

| Feld     | Typ        | Pflicht | Beschreibung                                                                        |
| -------- | ---------- | ------- | ----------------------------------------------------------------------------------- |
| `ort`    | `String32` | Nein    | Der Arbeitsort, der dem Projekt zugeordnet ist.                                     |
| `action` | `string`   | Nein    | Aktion. Um den Ort im Rahmen eines Updates aus dem Projekt zu entfernen muss hie... |

### ProjektstatusListeType

Liste von Projekt-Status.

#### Felder

| Feld     | Typ        | Pflicht | Beschreibung |
| -------- | ---------- | ------- | ------------ |
| `status` | `String64` | Nein    |              |

### ProjekttaetigkeitListeType

Eine Liste von Projekttätigkeiten.

#### Felder

| Feld         | Typ                     | Pflicht | Beschreibung                              |
| ------------ | ----------------------- | ------- | ----------------------------------------- |
| `taetigkeit` | `ProjekttaetigkeitType` | Nein    | Die in der Liste enthaltenen Tätigkeiten. |

### ProjekttaetigkeitType

Definiert eine einzelne, einem Projekt zugeordnete Tätigkeit.

#### Felder

| Feld          | Typ        | Pflicht | Beschreibung                                                                        |
| ------------- | ---------- | ------- | ----------------------------------------------------------------------------------- |
| `taetigkeit`  | `String32` | Nein    | Die Tätigkeit, die dem Projekt zugeordnet ist.                                      |
| `standard`    | `boolean`  | Nein    |                                                                                     |
| `defaultFakt` | `int0_4`   | Nein    | 0 oder leer = Es gilt die Einstellung des Vorgangs, auf den gebucht wird, 1=Fakt... |
| `action`      | `string`   | Nein    | Aktion. Um die Tätigkeit im Rahmen eines Updates aus dem Projekt zu entfernen mu... |

### ReadProjekteRequestType

Die Parameter zum Lesen von Projekten.

#### Felder

| Feld                         | Typ                              | Pflicht | Beschreibung                               |
| ---------------------------- | -------------------------------- | ------- | ------------------------------------------ |
| `requestHeader`              | `RequestHeaderType`              | Nein    | Der allgemeine ZEP Request-Header.         |
| `readProjekteSearchCriteria` | `ReadProjekteSearchCriteriaType` | Ja      | Die Suchkriterien zur Suche von Projekten. |

### ReadProjekteResponseType

Die Antwort beim Lesen von Projekten.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |
| `projektListe`   | `ProjektListeType`   | Nein    | Die Liste der gelesenen Projekte.   |

### ReadProjekteSearchCriteriaType

Die Suchkriterien zur Suche nach Projekten.

#### Felder

| Feld                | Typ                     | Pflicht | Beschreibung                                                                        |
| ------------------- | ----------------------- | ------- | ----------------------------------------------------------------------------------- |
| `id`                | `int`                   | Nein    |                                                                                     |
| `von`               | `IsoDate`               | Nein    | Das Anfangsdatum des Zeitraums, in dem die zu liefernden Projekte liegen müssen.... |
| `bis`               | `IsoDate`               | Nein    | Das Enddatum des Zeitraums, in dem die zu liefernden Projekte liegen müssen. For... |
| `projektNr`         | `String64`              | Nein    | Die Nummer des zu liefernden Projektes.                                             |
| `abteilung`         | `String64`              | Nein    | Die Abteilung, der die zu liefernden Projekte zugeordnet sein müssen.               |
| `status`            | `String64`              | Nein    | Der Status der zu liefernden Projekte.                                              |
| `modifiedSince`     | `IsoDateTime`           | Nein    |                                                                                     |
| `kundenNr`          | `String32`              | Nein    |                                                                                     |
| `schlagworteFilter` | `SchlagworteFilterType` | Nein    | BItte dies n SearchCriteria statt schlagworteListe benutzen. Das Schlagwort kann... |
| `userId`            | `String32`              | Nein    |                                                                                     |
| `beginntInZeitraum` | `boolean`               | Nein    | Liefert Projekte, welche in Zeitraum (von-bis) beginnen.                            |
| `endetInZeitraum`   | `boolean`               | Nein    | Liefert Projekte, welche in Zeitraum (von-bis) enden.                               |
| `attributes`        | `AttributesType`        | Nein    | Liste von Attributen für kundenspezifische Erweiterungen.                           |

### UpdateProjektRequestType

Die Parameter zur Aktualisierung eines Projekts.

#### Felder

| Feld                    | Typ                         | Pflicht | Beschreibung                               |
| ----------------------- | --------------------------- | ------- | ------------------------------------------ |
| `requestHeader`         | `RequestHeaderType`         | Nein    | Der allgemeine ZEP Request-Header.         |
| `projekt`               | `ProjektType`               | Ja      | Die Daten zur Aktualisierung des Projekts. |
| `onlyUpdateAssignments` | `OnlyUpdateAssignmentsType` | Nein    |                                            |

### UpdateProjektResponseType

Die Antwort der Aktualisierung eines Projektes.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### VorgangMitarbeiterListeType

Eine Liste der Mitarbeiter eines Vorgangs.

#### Felder

| Feld                     | Typ                      | Pflicht | Beschreibung                                                                        |
| ------------------------ | ------------------------ | ------- | ----------------------------------------------------------------------------------- |
| `vorgangMitarbeiter`     | `VorgangMitarbeiterType` | Nein    | Die in der Liste enthaltenen Vorgangsmitarbeiter.                                   |
| `action`                 | `string`                 | Nein    | Aktion. Um alle Vorgangsmitarbeiter im Rahmen eines Updates zu löschen muss hier... |
| `alleImplizitZugeordnet` | `boolean`                | Nein    |                                                                                     |

### VorgangMitarbeiterType

Die Daten eines Mitarbeiters, der einem Vorgang zugeordnet wird.

#### Felder

| Feld                              | Typ        | Pflicht | Beschreibung                                                                        |
| --------------------------------- | ---------- | ------- | ----------------------------------------------------------------------------------- |
| `id`                              | `int`      | Nein    |                                                                                     |
| `userId`                          | `String32` | Nein    | Pflicht beim Anlegen                                                                |
| `preisgruppe`                     | `String32` | Nein    | Die Preisgruppe, in der der Mitarbeiter dem Vorgang zugeordnet wird.                |
| `von`                             | `IsoDate`  | Nein    | Das Anfangsdatum des Zuordnungszeitraums. Format: JJJJ-MM-TT.                       |
| `bis`                             | `IsoDate`  | Nein    | Das Enddatum des Zuordnungszeitraums. Format: JJJJ-MM-TT.                           |
| `bemerkung`                       | `string`   | Nein    | Die bemerkung zur Zuordnung.                                                        |
| `vorgangNr`                       | `String64` | Nein    | Die Nummer des Vorgangs, dem der Mitarbeiter zugeordnet wird.                       |
| `projektNr`                       | `String64` | Nein    | Die Nummer des Projektes, dem der Mitarbeiter zugeordnet wird.                      |
| `wennUeberlapptAndereBeschneiden` | `boolean`  | Nein    |                                                                                     |
| `action`                          | `string`   | Nein    | Aktion. Um Vorgangsmitarbeiter im Rahmen eines Updates zu löschen muss hier "del... |
