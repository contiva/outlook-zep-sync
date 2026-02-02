# Rechnungs-API

Operationen und Typen für die Rechnungsverwaltung

---

## Operationen

### createArtikelRechnungsposition

- **Request:** `createArtikelRechnungspositionRequest`
- **Response:** `createArtikelRechnungspositionResponse`

### createRechnungspositionFestpreis

- **Request:** `createRechnungspositionFestpreisRequest`
- **Response:** `createRechnungspositionFestpreisResponse`

### readRechnung

- **Request:** `readRechnungRequest`
- **Response:** `readRechnungResponse`

### readRechnungDatev

- **Request:** `readRechnungDatevRequest`
- **Response:** `readRechnungDatevResponse`

### readRechnungDatevXml

- **Request:** `readRechnungDatevXmlRequest`
- **Response:** `readRechnungDatevXmlResponse`

### readRechnungDokument

- **Request:** `readRechnungDokumentRequest`
- **Response:** `readRechnungDokumentResponse`

### readRechnungGeneric

- **Request:** `readRechnungGenericRequest`
- **Response:** `readRechnungGenericResponse`

### readRechnungLexware

- **Request:** `readRechnungLexwareRequest`
- **Response:** `readRechnungLexwareResponse`

### readRechnungsposition

- **Request:** `readRechnungspositionRequest`
- **Response:** `readRechnungspositionResponse`

### readRechnungspositionFestpreis

- **Request:** `readRechnungspositionFestpreisRequest`
- **Response:** `readRechnungspositionFestpreisResponse`

### updateRechnungspositionFestpreis

- **Request:** `updateRechnungspositionFestpreisRequest`
- **Response:** `updateRechnungspositionFestpreisResponse`

## Komplexe Typen

### ArtikelRechnungspositionType

Die Daten einer Festpreis-Rechnungsposition.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `id` | `int` | Nein |  |
| `projektNr` | `String64` | Nein | Die Nummer des Projektes. |
| `kundenNr` | `String32` | Nein | Die Nummer des Kunden. |
| `artikelnummer` | `String128` | Nein |  |
| `leistungszeitraumBeginn` | `IsoDate` | Nein | Das Anfagsdatum des Leistungszeitraumes. |
| `leistungszeitraumEnde` | `IsoDate` | Nein | Das Endedatum des Leistungszeitraumes. |
| `wiederholung` | `int0_4` | Nein | - leer bzw. nicht eingegeben=keine Wiederholung, - 0=Monatlich Ultimo, - 1=Monat... |
| `geplantesRechnungsdatumGleich` | `int0_2` | Nein | 0=leistungszeitraumBeginn, 1(default)=leistungszeitraumEnde, 2=datum festgelegt ... |
| `menge` | `Decimal12_2` | Nein | Menge |
| `einzelpreis` | `Decimal12_2` | Nein | Der Einzelpreis. |
| `einheit` | `String64` | Nein | Die Einheit der Rechnungsposition. |
| `waehrung` | `String32` | Nein | Die Währung. |
| `sprache` | `String10` | Nein | Die verfügbare Sprachen für die Texte die in ZEP ausgegeben werden: z.B. de, en,... |
| `erloeskontoListe` | `ErloeskontoListeType` | Nein | Das Erlöskonto der Rechnungsposition (bei Einsatz des Moduls 'Export für Buchhal... |
| `status` | `int0_3` | Nein | 0 (default)=geplant, 1=freigegeben |
| `rechnungstext` | `string` | Nein | Der Rechnungstext der Rechnungsposition. |
| `rechnungsdatum` | `IsoDate` | Nein |  |
| `geplantesDatum` | `IsoDate` | Nein |  |
| `projektId` | `int` | Nein |  |
| `mwst` | `Decimal6_4` | Nein |  |
| `vorgangNr` | `String64` | Nein |  |
| `vorgangId` | `int` | Nein |  |
| `attributes` | `AttributesType` | Nein | Liste von Attributen für kundenspezifische Erweiterungen. |

### CreateArtikelRechnungspositionRequestType

Die Parameter zu Anlage einer neuen Artikel-Rechnungsposition

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `artikelRechnungsposition` | `ArtikelRechnungspositionType` | Ja | Die Daten der anzulegenden Festpreis-Rechnungsposition. |

### CreateArtikelRechnungspositionResponseType

Das Antwort-Objekt der Anlage einer neuen Artikel-Rechnungsposition

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |

### CreateRechnungspositionFestpreisRequestType

Die Parameter zu Anlage einer neuen Festpreis-Rechnungsposition

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `rechnungspositionFestpreis` | `RechnungspositionFestpreisType` | Ja | Die Daten der anzulegenden Festpreis-Rechnungsposition. |

### CreateRechnungspositionFestpreisResponseType

Das Antwort-Objekt der Anlage einer neuen Festpreis-Rechnungsposition

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |

### ReadRechnungDatevRequestType

Die Parameter zur Abfrage des Rechnungsexports im DATEV Format.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `readRechnungSearchCriteria` | `ReadRechnungSearchCriteriaType` | Nein | Die Suchkriterien für die Suche nach Rechnungsdaten. |

### ReadRechnungDatevResponseType

Die Antwort der Abfrage des Rechnungsexports im DATEV Format.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `datevListe` | `DatevListeType` | Nein | Die Liste der Buchungen im DATEV-Format. |

### ReadRechnungDatevXmlRequestType

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein |  |
| `readRechnungDatevXmlSearchCriteria` | `ReadRechnungDatevXmlSearchCriteriaType` | Nein |  |

### ReadRechnungDatevXmlResponseType

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Nein |  |
| `anhang` | `AnhangType` | Nein |  |

### ReadRechnungDatevXmlSearchCriteriaType

Beim Filtern dominieren Kundenabteilungen falls vorhanden, sonst gelten die Projektabteilungen wenn vorhanden.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `von` | `IsoDate` | Nein |  |
| `bis` | `IsoDate` | Nein |  |
| `inklusiveExportierterBuchungen` | `boolean` | Nein |  |
| `kundenabteilungListe` | `KurzformListeType` | Nein | Beim Filtern dominieren Kundenabteilungen falls vorhanden, sonst gelten die Proj... |
| `projektabteilungListe` | `KurzformListeType` | Nein | Beim Filtern dominieren Kundenabteilungen falls vorhanden, sonst gelten die Proj... |
| `inklusiveUnterabteilungen` | `boolean` | Nein |  |
| `alsExportiertMarkieren` | `boolean` | Nein |  |

### ReadRechnungDokumentRequestType

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein |  |
| `readRechnungDokumentSearchCriteria` | `ReadRechnungDokumentSearchCriteriaType` | Nein |  |

### ReadRechnungDokumentResponseType

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Nein |  |
| `dokument` | `AnhangType` | Nein |  |

### ReadRechnungDokumentSearchCriteriaType

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `rechnungNr` | `String32` | Nein |  |

### ReadRechnungGenericRequestType

Die Parameter zur Abfrage des Rechnungsexports im generischen Format.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `readRechnungSearchCriteria` | `ReadRechnungSearchCriteriaType` | Ja | Die Suchkriterien für die Suche nach Rechnungsdaten. |

### ReadRechnungGenericResponseType

Die Antwort der Abfrage des Rechnungsexports im generischen Format.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `genericListe` | `BuchhaltungGenericListeType` | Nein | Die Liste der Buchungen im generischen Format. |

### ReadRechnungLexwareRequestType

Die Parameter zur Abfrage des Rechnungsexports im Lexware Format.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `readRechnungSearchCriteria` | `ReadRechnungSearchCriteriaType` | Ja | Die Suchkriterien für die Suche nach Rechnungsdaten. |

### ReadRechnungLexwareResponseType

Die Antwort der Abfrage des Rechnungsexports im Lexware Format.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `lexwareListe` | `LexwareListeType` | Nein | Die Liste der Buchungen im Lexware Format. |

### ReadRechnungRequestType

Der Request zum Lesen von Rechnungen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Response-Header. |
| `readRechnungSearchCriteria` | `RechnungSearchCriteriaType` | Nein | Die Kriterien zur Suche von Rechnungen. |

### ReadRechnungResponseType

Der allgemeine ZEP Response-Header.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Nein | Der allgemeine ZEP Response-Header. |
| `rechnungListe` | `RechnungListeType` | Nein | Die Liste der gefundenen Rechnungen. |

### ReadRechnungSearchCriteriaType

Die Suchkriterien für die Abfrage des Rechnungsexports.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `von` | `IsoDate` | Nein | Der Anfang des Zeitraums, in dem das Rechnungsdamtum liegen soll. Format: JJJJ-M... |
| `bis` | `IsoDate` | Nein | Der Ende des Zeitraums, in dem das Rechnungsdamtum liegen soll. Format: JJJJ-MM-... |
| `abteilung` | `String64` | Nein | Die Bezeichnung der Abteilung des Kunden, zu der Rechnungsdaten geliefert werden... |
| `inklusiveUnterabteilung` | `boolean` | Nein | Flagge, ob auch Unterabteilungen beachtet werden sollen. |
| `inklBereitsExportierter` | `boolean` | Nein | Flagge, ob auch Daten die bereits exportiert wurden, erneut geliefert werden sol... |
| `alsExportiertMarkieren` | `boolean` | Nein |  |

### ReadRechnungspositionFestpreisRequestType

Der Request zur Abfrage von Festpreis-Rechnungspositionen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `readRechnungspositionFestpreisSearchCriteria` | `ReadRechnungspositionFestpreisSearchCriteriaType` | Ja | Die Suchkriterien für die zu liefernden Festpreis-Rechnungspositionen. |

### ReadRechnungspositionFestpreisResponseType

Response-Struktur mit dem Ergebnis der Abfrage von Festpreis-Rechnungspositions.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `rechnungspositionFestpreisListe` | `RechnungspositionFestpreisListeType` | Ja | Liste von Festpreis-Rechnungspositionen. |

### ReadRechnungspositionFestpreisSearchCriteriaType

Die Kriterien zur Suche von Festpreis-Rechnungspositionen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `projektNr` | `String64` | Nein | Das Projekt, zu dem die Festpreis-Rechnungspositionen zu liefern sind. |
| `kundenNr` | `String32` | Nein | Der Kunde, zu dem die Festpreis-Rechnungspositionen zu liefern sind. |
| `leistungszeitraumBeginn` | `IsoDate` | Nein | Das Startdatum des Leistungszeitraums der zu liefernden Festpreis-Rechnungsposit... |
| `leistungszeitraumEnde` | `IsoDate` | Nein | Das Endedatum des Leistungszeitraums der zu liefernden Festpreis-Rechnungspositi... |
| `projektId` | `int` | Nein |  |
| `id` | `int` | Nein |  |

### ReadRechnungspositionRequestType

Der Request zur Abfrage von Rechnungspositionen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `readRechnungspositionSearchCriteria` | `ReadRechnungspositionSearchCriteriaType` | Ja | Die Suchkriterien für die zu liefernden Rechnungspositionen. |

### ReadRechnungspositionResponseType

Response-Struktur mit dem Ergebnis der Rechnungspositions-Abfrage.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `rechnungspositionListe` | `RechnungspositionListeType` | Ja | Liste der gelesenen Rechnungspositionen. |

### ReadRechnungspositionSearchCriteriaType

Die Kriterien zur Suche von Rechnungspositionen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `projektNr` | `String64` | Nein | Das Projekt, zu dem Rechnungspositionen abgefragt werden sollen. |
| `kundenNr` | `String32` | Nein | Der Kunde, zu dem Rechnungspositionen abgefragt werden sollen. |
| `leistungszeitraumBeginn` | `IsoDate` | Nein | Das Anfangsdatum des Leistungszeitraums der zu liefernden Rechnungspositionen. |
| `leistungszeitraumEnde` | `IsoDate` | Nein | Das Endedatum des Leistungszeitraums der zu liefernden Rechnungspositionen. |
| `status` | `int0_3` | Nein | Der Status der zu liefernden Rechnungspositionen. 0 = geplant, 1 = freigegeben, ... |
| `rechnungsdatum` | `IsoDate` | Nein |  |
| `projektId` | `int` | Nein |  |
| `id` | `int` | Nein |  |

### RechnungListeType

Liste von Rechnungen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `rechnung` | `RechnungType` | Nein | Die in der Liste enthaltenen Rechnungen. |

#### Attribute

- `length` (int): 

### RechnungSearchCriteriaType

Die Rechnungsnummer.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `rechnungNr` | `String32` | Nein | Die Rechnungsnummer. |
| `kundenNr` | `String32` | Nein |  |
| `kundenabteilung` | `String32` | Nein | Die Abteilung des Kunden. |
| `projektsabteilung` | `String32` | Nein | Die Abteilung des Projekts. |
| `inklusiveUnterabteilung` | `boolean` | Nein | Flagge, ob auch in Unterabteilungen gesucht werden soll. |
| `von` | `IsoDate` | Nein | Startdatum des Zeitraums für Suche der Rechnungen. |
| `bis` | `IsoDate` | Nein | Endedatum des Zeitraums für Suche der Rechnungen. |
| `bereitsAlsEMailVersendet` | `boolean` | Nein | true oder 1= nur als Mail versendet0 false oder 0 = nur nicht als Mail versendet... |
| `titel` | `String120` | Nein | ist auch die Gutschriftsnummer bzw. exterener Referenz bei Eingangsgutschriften. |
| `projektId` | `int` | Nein |  |
| `projektNr` | `String64` | Nein |  |
| `modifiedSince` | `IsoDateTime` | Nein |  |

### RechnungType

Die Rechnungsnummer.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `rechnungNr` | `String32` | Ja | Die Rechnungsnummer. |
| `art` | `int0_1` | Nein | 0 = Rechnung 1 = Eingangsgutschrift |
| `datum` | `IsoDate` | Nein | Das Rechnungsdatum. |
| `betrag` | `Decimal10_2` | Nein | brutto |
| `status` | `int0_2` | Nein | 0 = abgerechnet 1 = storniert 2 = in Korrektur |
| `waehrung` | `String32` | Nein |  |
| `korrekturdatum` | `IsoDate` | Nein |  |
| `zahlungszielDatum` | `IsoDate` | Nein |  |
| `adresse` | `string` | Nein |  |
| `zahlungsziel` | `int` | Nein | Kurzform der Abteilung |
| `emaildatum` | `IsoDateTime` | Nein |  |
| `emailempfaenger` | `String255` | Nein |  |
| `kundenNr` | `String32` | Nein |  |
| `rechnungspositionListe` | `RechnungspositionListeType` | Nein |  |
| `mahnungListe` | `MahnungListeType` | Nein |  |
| `titel` | `String120` | Nein | ist auch die Gutschriftsnummer bzw. exterener Referenz bei Eingangsgutschriften. |
| `created` | `IsoDateTime` | Nein |  |
| `modified` | `IsoDateTime` | Nein |  |
| `leistungsdatumFuerDatev` | `IsoDate` | Nein |  |
| `attributes` | `AttributesType` | Nein |  |

### RechnungspositionFestpreisListeType

Liste der Festpreis-Rechnungspositionen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `rechnungspositionFestpreis` | `RechnungspositionFestpreisType` | Nein |  |

#### Attribute

- `length` (int): 

### RechnungspositionFestpreisType

Die Daten einer Festpreis-Rechnungsposition.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `id` | `int` | Nein |  |
| `projektNr` | `String64` | Nein | Die Nummer des Projektes. |
| `kundenNr` | `String32` | Nein | Die Nummer des Kunden. |
| `leistungszeitraumBeginn` | `IsoDate` | Nein | Das Anfagsdatum des Leistungszeitraumes. |
| `leistungszeitraumEnde` | `IsoDate` | Nein | Das Endedatum des Leistungszeitraumes. |
| `wiederholung` | `int0_4` | Nein | - leer bzw. nicht eingegeben=keine Wiederholung, - 0=Monatlich Ultimo, - 1=Monat... |
| `geplantesRechnungsdatumGleich` | `int0_2` | Nein | 0=leistungszeitraumBeginn, 1(default)=leistungszeitraumEnde, 2=datum festgelegt ... |
| `menge` | `Decimal12_2` | Nein | Menge |
| `einzelpreis` | `Decimal12_2` | Nein | Der Einzelpreis. |
| `einheit` | `String64` | Nein | Die Einheit der Rechnungsposition. |
| `waehrung` | `String32` | Nein | Die Währung. |
| `sprache` | `String10` | Nein | Die verfügbare Sprachen für die Texte die in ZEP ausgegeben werden: z.B. de, en,... |
| `erloeskontoListe` | `ErloeskontoListeType` | Nein | Das Erlöskonto der Rechnungsposition (bei Einsatz des Moduls 'Export für Buchhal... |
| `status` | `int0_3` | Nein | 0 (default)=geplant, 1=freigegeben |
| `rechnungstext` | `string` | Nein | Der Rechnungstext der Rechnungsposition. |
| `rechnungsdatum` | `IsoDate` | Nein |  |
| `geplantesDatum` | `IsoDate` | Nein | Wenn dies nicht null ist, dann gilt dies und nicht mehr die geplantesRechnungsda... |
| `projektId` | `int` | Nein |  |
| `mwst` | `Decimal6_4` | Nein |  |
| `vorgangNr` | `String64` | Nein |  |
| `vorgangId` | `int` | Nein |  |
| `attributes` | `AttributesType` | Nein | Liste von Attributen für kundenspezifische Erweiterungen. |

### RechnungspositionListeType

Liste von Rechnungspositionen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `rechnungsposition` | `RechnungspositionType` | Nein |  |

#### Attribute

- `length` (int): 

### RechnungspositionType

Die Daten einer Rechnungsposition.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `id` | `int` | Nein |  |
| `projektNr` | `String64` | Nein | Die Nummer des Projektes. |
| `kundenNr` | `String32` | Nein | Die Nummer des Kunden. |
| `leistungszeitraumBeginn` | `IsoDate` | Nein | Das Anfagsdatum des Leistungszeitraumes. |
| `leistungszeitraumEnde` | `IsoDate` | Nein | Das Endedatum des Leistungszeitraumes. |
| `wiederholung` | `integer` | Nein | leer bzw. nicht eingegeben = keine Wiederholung, 0 = monatlich Ultimo, 1 = monat... |
| `geplantesRechnungsdatumGleich` | `int0_2` | Nein | 0=leistungszeitraumBeginn, 1(default)=leistungszeitraumEnde, 2=datum festgelegt ... |
| `menge` | `Decimal12_2` | Nein | Menge |
| `einzelpreis` | `Decimal12_2` | Nein | Der Einzelpreis. |
| `einheit` | `String64` | Nein | Die Einheit der Rechnungsposition. |
| `waehrung` | `String32` | Nein | Die Währung. |
| `sprache` | `String10` | Nein | Die verfügbare Sprachen für die Texte die in ZEP ausgegeben werden: z.B. de, en,... |
| `erloeskontoListe` | `ErloeskontoListeType` | Nein | Das Erlöskonto der Rechnungsposition (bei Einsatz des Moduls 'Export für Buchhal... |
| `status` | `int0_3` | Nein | 0 = geplant 1 = freigegeben 2 = abgerechnet 3 = storniert |
| `rechnungstext` | `string` | Nein | Der Rechnungstext der Rechnungsposition. |
| `rechnungsNr` | `String32` | Nein | nur beim abgerechnete Rechnunsposition |
| `mitarbeiter` | `String32` | Nein | userid der Vorgangsmitarbeiter |
| `art` | `int` | Nein | 0=Aufwand, 1=Pauschal , 2=Vorgang, 3=Sonstige-Belege, 4=Reise-Pauschalen, 5=Tick... |
| `reihenfolge` | `String32` | Nein |  |
| `enthaeltArbeitszeiten` | `boolean` | Nein |  |
| `enthaeltBelege` | `boolean` | Nein |  |
| `enthaeltReisekosten` | `boolean` | Nein |  |
| `abgerechneterBetrag` | `Decimal12_2` | Nein | ist immer als Netto. Nur zum Lesen da, wird via SOAP nicht erstellt oder bearbei... |
| `geplanterBetrag` | `Decimal12_2` | Nein | ist immer als Netto. Nur zum Lesen da, wird via SOAP nicht erstellt oder bearbei... |
| `rechnungsdatum` | `IsoDate` | Nein |  |
| `geplantesDatum` | `IsoDate` | Nein |  |
| `projektId` | `int` | Nein |  |
| `mwst` | `Decimal6_4` | Nein |  |
| `vorgang` | `VorgangType` | Nein |  |
| `ticket` | `TicketType` | Nein |  |
| `artikel` | `ArtikelType` | Nein |  |
| `mitarbeiterListe` | `UserIdListeType` | Nein |  |
| `attributes` | `AttributesType` | Nein | Liste von Attributen für kundenspezifische Erweiterungen. |

### UpdateRechnungspositionFestpreisRequestType

Die Parameter zu Bearbeitung der Festpreis-Rechnungsposition

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `rechnungspositionFestpreis` | `RechnungspositionFestpreisType` | Ja | Die Daten der Festpreis-Rechnungsposition. |

### UpdateRechnungspositionFestpreisResponseType

Das Antwort-Objekt der Bearbeitung der Festpreis-Rechnungsposition

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |

