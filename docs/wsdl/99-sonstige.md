# Sonstige Typen

Weitere Typen und Hilfsstrukturen

---

## Operationen

### checkCreateUser

- **Request:** `checkCreateUserRequest`
- **Response:** `checkCreateUserResponse`

### createArtikel

- **Request:** `createArtikelRequest`
- **Response:** `createArtikelResponse`

### createFehlzeit

- **Request:** `createFehlzeitRequest`
- **Response:** `createFehlzeitResponse`

### createGeraet

- **Request:** `createGeraetRequest`
- **Response:** `createGeraetResponse`

### createMahlzeit

- **Request:** `createMahlzeitRequest`
- **Response:** `createMahlzeitResponse`

### createMassen

- **Request:** `createMassenRequest`
- **Response:** `createMassenResponse`

### createPreisgruppe

- **Request:** `createPreisgruppeRequest`
- **Response:** `createPreisgruppeResponse`

### createRfidChip

- **Request:** `createRfidChipRequest`
- **Response:** `createRfidChipResponse`

### createZahlungsdokumentation

- **Request:** `createZahlungsdokumentationRequest`
- **Response:** `createZahlungsdokumentationResponse`

### deleteArtikel

- **Request:** `deleteArtikelRequest`
- **Response:** `deleteArtikelResponse`

### deleteFehlzeit

- **Request:** `deleteFehlzeitRequest`
- **Response:** `deleteFehlzeitResponse`

### deleteGeraet

- **Request:** `deleteGeraetRequest`
- **Response:** `deleteGeraetResponse`

### deleteMahlzeit

- **Request:** `deleteMahlzeitRequest`
- **Response:** `deleteMahlzeitResponse`

### deletePreisgruppe

- **Request:** `deletePreisgruppeRequest`
- **Response:** `deletePreisgruppeResponse`

### deleteRfidChips

- **Request:** `deleteRfidChipsRequest`
- **Response:** `deleteRfidChipsResponse`

### deleteZahlungsdokumentation

- **Request:** `deleteZahlungsdokumentationRequest`
- **Response:** `deleteZahlungsdokumentationResponse`

### readAbgeglicheneZeiten

- **Request:** `readAbgeglicheneZeitenRequest`
- **Response:** `readAbgeglicheneZeitenResponse`

### readAngebot

- **Request:** `readAngebotRequest`
- **Response:** `readAngebotResponse`

### readArtikel

- **Request:** `readArtikelRequest`
- **Response:** `readArtikelResponse`

### readBasispreistabelle

- **Request:** `readBasispreistabelleRequest`
- **Response:** `readBasispreistabelleResponse`

### readDokumentInhalt

- **Request:** `readDokumentInhaltRequest`
- **Response:** `readDokumentInhaltResponse`

### readDokumente

- **Request:** `readDokumenteRequest`
- **Response:** `readDokumenteResponse`

### readEinstellungen

- **Request:** `readEinstellungenRequest`
- **Response:** `readEinstellungenResponse`

### readErloeskonto

- **Request:** `readErloeskontoRequest`
- **Response:** `readErloeskontoResponse`

### readFehlgrund

- **Request:** `readFehlgrundRequest`
- **Response:** `readFehlgrundResponse`

### readFehlzeit

- **Request:** `readFehlzeitRequest`
- **Response:** `readFehlzeitResponse`

### readFeiertagAusnahme

- **Request:** `readFeiertagAusnahmeRequest`
- **Response:** `readFeiertagAusnahmeResponse`

### readFeiertagskalender

- **Request:** `readFeiertagskalenderRequest`
- **Response:** `readFeiertagskalenderResponse`

### readGeraet

- **Request:** `readGeraetRequest`
- **Response:** `readGeraetResponse`

### readKostenGeneric

- **Request:** `readKostenGenericRequest`
- **Response:** `readKostenGenericResponse`

### readKostenLexware

- **Request:** `readKostenLexwareRequest`
- **Response:** `readKostenLexwareResponse`

### readMahlzeit

- **Request:** `readMahlzeitRequest`
- **Response:** `readMahlzeitResponse`

### readOrtsliste

- **Request:** `readOrtslisteRequest`
- **Response:** `readOrtslisteResponse`

### readPreisgruppe

- **Request:** `readPreisgruppeRequest`
- **Response:** `readPreisgruppeResponse`

### readRfidChips

- **Request:** `readRfidChipsRequest`
- **Response:** `readRfidChipsResponse`

### readSteuersatz

- **Request:** `readSteuersatzRequest`
- **Response:** `readSteuersatzResponse`

### readTagessatzanteile

- **Request:** `readTagessatzanteileRequest`
- **Response:** `readTagessatzanteileResponse`

### readTermin

- **Request:** `readTerminRequest`
- **Response:** `readTerminResponse`

### readWechselkurs

- **Request:** `readWechselkursRequest`
- **Response:** `readWechselkursResponse`

### readZahlungsart

- **Request:** `readZahlungsartRequest`
- **Response:** `readZahlungsartResponse`

### readZahlungsdokumentation

- **Request:** `readZahlungsdokumentationRequest`
- **Response:** `readZahlungsdokumentationResponse`

### readZahlungseingang

- **Request:** `readZahlungseingangRequest`
- **Response:** `readZahlungseingangResponse`

## Komplexe Typen

### AbgeglicheneZeitenListeType

Die LIste der abgeglichenen Zeiten.

#### Felder

| Feld                 | Typ                      | Pflicht | Beschreibung                                       |
| -------------------- | ------------------------ | ------- | -------------------------------------------------- |
| `abgeglicheneZeiten` | `AbgeglicheneZeitenType` | Nein    | Die in der Liste enthaltenen abgeglichenen Zeiten. |

#### Attribute

- `length` (int): Die Anzahl der in der Liste enthaltenen abgeglichenen Zeiten.

### AbgeglicheneZeitenType

Informationen zu einem Zeitabgleich.

#### Felder

| Feld                          | Typ            | Pflicht | Beschreibung                                                                        |
| ----------------------------- | -------------- | ------- | ----------------------------------------------------------------------------------- |
| `userId`                      | `String32`     | Ja      | Der User, für dens die abgeglichenen Zeiten gelten.                                 |
| `monat`                       | `int`          | Ja      | Der Monat, für den die abgeglichenen Zeiten gelten.                                 |
| `jahr`                        | `int`          | Ja      | Das Jahr für das die abgeglichenen Zeiten gelten.                                   |
| `abgeglicheneUeberstunden`    | `Decimal13_10` | Nein    | Anzahl der abgeglichenen Überstunden.                                               |
| `abgeglicheneUrlaubstage`     | `Decimal13_10` | Nein    | Anzahl der abgeglichenen Urlaubstage.                                               |
| `bemerkung`                   | `string`       | Nein    | Die Bemerkung zu den abgeglichenen Zeiten.                                          |
| `verfalleneUrlaubstage`       | `Decimal13_10` | Nein    | Wird nur beim Lesen zurückgeliefert. Beim Anlegen oder Bearbeiten der abgegliche... |
| `gutgeschriebeneUeberstunden` | `Decimal13_10` | Nein    |                                                                                     |
| `gutgeschriebeneUrlaubstage`  | `Decimal13_10` | Nein    |                                                                                     |

### AngebotListeType

#### Felder

| Feld      | Typ           | Pflicht | Beschreibung |
| --------- | ------------- | ------- | ------------ |
| `angebot` | `AngebotType` | Nein    |              |

#### Attribute

- `length` (int):

### AngebotType

#### Felder

| Feld                                | Typ                         | Pflicht | Beschreibung |
| ----------------------------------- | --------------------------- | ------- | ------------ |
| `id`                                | `int`                       | Nein    |              |
| `angebotNr`                         | `String32`                  | Nein    |              |
| `titel`                             | `String128`                 | Nein    |              |
| `version`                           | `String32`                  | Nein    |              |
| `status`                            | `int`                       | Nein    |              |
| `bearbeiter`                        | `String32`                  | Nein    |              |
| `abteilung`                         | `String64`                  | Nein    |              |
| `kundenNr`                          | `String32`                  | Nein    |              |
| `projektNr`                         | `String64`                  | Nein    |              |
| `ticketNr`                          | `int`                       | Nein    |              |
| `auftragsdatum`                     | `IsoDate`                   | Nein    |              |
| `gueltigBis`                        | `IsoDate`                   | Nein    |              |
| `betragNetto`                       | `float`                     | Nein    |              |
| `waehrung`                          | `String32`                  | Nein    |              |
| `bemerkung`                         | `string`                    | Nein    |              |
| `auftragsWahrscheinlichkeitProzent` | `int0_100`                  | Nein    |              |
| `kategorieListe`                    | `KategorieListeType`        | Nein    |              |
| `angebotspositionListe`             | `AngebotspositionListeType` | Nein    |              |

### AngebotspositionListeType

#### Felder

| Feld               | Typ                    | Pflicht | Beschreibung |
| ------------------ | ---------------------- | ------- | ------------ |
| `angebotsposition` | `AngebotspositionType` | Nein    |              |

#### Attribute

- `length` (int):

### AngebotspositionType

gruppierung, artikel, aufwand, pauschal oder zuschlag

#### Felder

| Feld                    | Typ           | Pflicht | Beschreibung                                                         |
| ----------------------- | ------------- | ------- | -------------------------------------------------------------------- |
| `id`                    | `int`         | Nein    |                                                                      |
| `art`                   | `string`      | Nein    | gruppierung, artikel, aufwand, pauschal oder zuschlag                |
| `parent`                | `int`         | Nein    |                                                                      |
| `angebotId`             | `int`         | Nein    |                                                                      |
| `bezeichnung`           | `String128`   | Nein    |                                                                      |
| `beschreibung`          | `string`      | Nein    |                                                                      |
| `position`              | `int`         | Nein    |                                                                      |
| `einheit`               | `String64`    | Nein    |                                                                      |
| `menge`                 | `Decimal8_2`  | Nein    |                                                                      |
| `einzelpreis`           | `Decimal6_4`  | Nein    |                                                                      |
| `belegeKmGeld`          | `Decimal6_4`  | Nein    |                                                                      |
| `vma`                   | `Decimal6_4`  | Nein    |                                                                      |
| `artikel`               | `ArtikelType` | Nein    |                                                                      |
| `betrag`                | `Decimal8_2`  | Nein    |                                                                      |
| `angebotsbetrag`        | `Decimal8_2`  | Nein    |                                                                      |
| `nurEndbetragAusweisen` | `boolean`     | Nein    |                                                                      |
| `istAlternativposition` | `boolean`     | Nein    | Alternativpositionen werden nicht in der Angebotssumme brücksichtigt |

### AnhangListeType

Liste von Anhängen.

#### Felder

| Feld     | Typ          | Pflicht | Beschreibung           |
| -------- | ------------ | ------- | ---------------------- |
| `anhang` | `AnhangType` | Nein    | Die Anhänge der Liste. |

### AnhangType

Ein Beleganhang. Enthält die Base-64 codierten Daten der Belegdatei (Bild oder PDF).

#### Felder

| Feld     | Typ            | Pflicht | Beschreibung                                                 |
| -------- | -------------- | ------- | ------------------------------------------------------------ |
| `inhalt` | `base64Binary` | Nein    | Die Base64 codierten Daten des Beleganhangs (Bild oder PDF). |
| `name`   | `string`       | Nein    | Der Dateiname des Beleganhangs.                              |

### ArtikelListeType

Liste von Artikeln.

#### Felder

| Feld      | Typ           | Pflicht | Beschreibung |
| --------- | ------------- | ------- | ------------ |
| `artikel` | `ArtikelType` | Nein    |              |

#### Attribute

- `length` (int):

### ArtikelType

Daten eines Artikels.

#### Felder

| Feld                | Typ              | Pflicht | Beschreibung                                              |
| ------------------- | ---------------- | ------- | --------------------------------------------------------- |
| `artikelnummer`     | `String128`      | Ja      | Die Nummer des Artikels.                                  |
| `bezeichnung`       | `String128`      | Nein    | Die Bezeichnung des Artikels.                             |
| `einheit`           | `String64`       | Nein    | Die Einheit des Artikels.                                 |
| `einzelpreis`       | `Decimal10_2`    | Nein    | Der Einzelpreis des Artikels.                             |
| `waehrung`          | `String32`       | Nein    | Die Währung des Artikels.                                 |
| `beschreibung`      | `string`         | Nein    | Die Beschreibung des Artikels.                            |
| `inaktiv`           | `boolean`        | Nein    | Flagge, ob der Artikel aktiv oder inaktiv ist.            |
| `created`           | `IsoDateTime`    | Nein    | Das Anlagedatum des Artikels.                             |
| `modified`          | `IsoDateTime`    | Nein    | Das Datum der letzten Aktualisierung des Artikels.        |
| `neueArtikelnummer` | `String128`      | Nein    | Neue Nummer der Artikels (bei Update der Artikelnummer).  |
| `id`                | `int`            | Nein    |                                                           |
| `attributes`        | `AttributesType` | Nein    | Liste von Attributen für kundenspezifische Erweiterungen. |

### BeschaeftigungszeitListeType

Liste von Beschäftigungszeiträumen.

#### Felder

| Feld                  | Typ                       | Pflicht | Beschreibung                                          |
| --------------------- | ------------------------- | ------- | ----------------------------------------------------- |
| `beschaeftigungszeit` | `BeschaeftigungszeitType` | Nein    | Die in der Liste enthaltenen Beschäftigungszeiträume. |

### BeschaeftigungszeitType

Dies eingeben nur wenn Beschaeftigungsbeginn von Erstellungsdatum abweichen soll, diese wird per default angelegt.

#### Felder

| Feld                             | Typ                  | Pflicht | Beschreibung                                                                        |
| -------------------------------- | -------------------- | ------- | ----------------------------------------------------------------------------------- |
| `id`                             | `int`                | Nein    | Die Id des Beschäftigungszeitraumes.                                                |
| `userId`                         | `String32`           | Nein    | Die Userid des Benutzers, dem dieser Beschäftigungszeitraum zugeordnet ist.         |
| `startdatum`                     | `IsoDate`            | Nein    | Das Startdatum des Beschäftigungszeitraum.                                          |
| `enddatum`                       | `IsoDate`            | Nein    | Das Endedatum des Beschäftigungszeitraum. Leer oder nicht angegeben = unbefriste... |
| `bemerkung`                      | `string`             | Nein    | Eine Bemekung zum Beschäftigungszeitraum.                                           |
| `urlaubsanpruchInDiesemZeitraum` | `Decimal8_2`         | Nein    | Entweder urlaubsanpruchInDiesemZeitraum oder urlaubsanspruchProJahr darf ein Wer... |
| `urlaubsanspruchProJahr`         | `Decimal8_2`         | Nein    | Entweder urlaubsanpruchInDiesemZeitraum oder urlaubsanspruchProJahr darf ein Wer... |
| `fehltagInStunden`               | `Decimal2_4`         | Nein    | 0 = jeder Fehltag ist soviel Wert wie die regelarbeitszeit an dem Tag, eine Zahl... |
| `splitFrom`                      | `string`             | Nein    | id (integer) oder startdatum (yyyy-mm-dd) der Beschäftigungszeit, der durch dies... |
| `urlaubsanspruchJaehrlichZum`    | `IsoDateWithoutYear` | Nein    | taucht auf nur wenn urlaubsanspruchProJahr auch auftaucht und wenn in ZEP die da... |
| `action`                         | `string`             | Nein    | Die mit dem Beschäftigungszeitraum durchzuführende Aktion.                          |

### BuchhaltungGenericListeType

Liste von Buchhaltungs-Records im generischen Format

#### Felder

| Feld                 | Typ                      | Pflicht | Beschreibung                          |
| -------------------- | ------------------------ | ------- | ------------------------------------- |
| `buchhaltungGeneric` | `BuchhaltungGenericType` | Nein    | Die Buchungen im generischen Format). |

#### Attribute

- `length` (int): Anzahl der Buchungen in der Liste.

### BuchhaltungGenericType

Datensatz aus dem Buchhaltungs-Export im generischen Format

#### Felder

| Feld                 | Typ              | Pflicht | Beschreibung                                                                        |
| -------------------- | ---------------- | ------- | ----------------------------------------------------------------------------------- |
| `datum`              | `string`         | Nein    | Das Datum der Buchung (z.B. Rechnungsdatum).                                        |
| `belegnummer`        | `string`         | Nein    | Die Nummer des Beleges bzw. der Rechnung.                                           |
| `betrag`             | `string`         | Nein    | Der Betrag der Buchung.                                                             |
| `waehrung`           | `string`         | Nein    | Die Währung der Buchung.                                                            |
| `mwst`               | `string`         | Nein    | Der MwSt. Satz der Buchung.                                                         |
| `sollkonto`          | `string`         | Nein    | Das Soll-Konto, zu dessen Lasten die Buchung erfolgt.                               |
| `habenkonto`         | `string`         | Nein    | Das Haben-Konto, zu dessen Gunsten die Buchung erfolgt.                             |
| `buchungsschluessel` | `string`         | Nein    | Der Buchungsschlüssel (s. Belegart).                                                |
| `buchungstext`       | `string`         | Nein    | Der Buchungstext, z.B. Text der Rechnungsposition oder des Beleges.                 |
| `kostenstelle`       | `string`         | Nein    | Die Kostenstelle (bei Einsatz des Moduls 'Export für Buchhaltung' und Kostenstel... |
| `kostentraeger`      | `string`         | Nein    | Die Kostenstelle (bei Einsatz des Moduls 'Export für Buchhaltung' und Kostenträg... |
| `kost1`              | `string`         | Nein    |                                                                                     |
| `kost2`              | `string`         | Nein    |                                                                                     |
| `attributes`         | `AttributesType` | Nein    | Für kundenspezifische Erweiterungen.                                                |

### CheckCreateUserCriteriaType

Kriterien zur Prüfung der User-Anlage.

#### Felder

| Feld       | Typ       | Pflicht | Beschreibung                                                   |
| ---------- | --------- | ------- | -------------------------------------------------------------- |
| `vonDatum` | `IsoDate` | Ja      | ob ab diesem Datum die Lizenz verletzt wird                    |
| `bisDatum` | `IsoDate` | Nein    | ob bis zu diesem Datum die Lizenz verletzt wird                |
| `stichtag` | `IsoDate` | Nein    | Datum für die Abfrage der Anzahl der noch verfügbaren Lizenzen |

### CheckCreateUserRequestType

Prüft, ob die Anlage weiterer Benutzer möglich wäre.

#### Felder

| Feld                      | Typ                           | Pflicht | Beschreibung |
| ------------------------- | ----------------------------- | ------- | ------------ |
| `requestHeader`           | `RequestHeaderType`           | Ja      |              |
| `checkCreateUserCriteria` | `CheckCreateUserCriteriaType` | Ja      |              |

### CheckCreateUserResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld                 | Typ                  | Pflicht | Beschreibung |
| -------------------- | -------------------- | ------- | ------------ |
| `responseHeader`     | `ResponseHeaderType` | Ja      |              |
| `wirdLizenzVerletzt` | `boolean`            | Ja      |              |
| `anzahlLizenzen`     | `int`                | Nein    |              |
| `freieLizenzen`      | `int`                | Nein    |              |

### CreateArtikelRequestType

Die Parameter zur Anlage eines Artikels.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                       |
| --------------- | ------------------- | ------- | ---------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header. |
| `artikel`       | `ArtikelType`       | Ja      |                                    |

### CreateArtikelResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |
| `id`             | `int`                | Nein    |                                     |

### CreateFehlzeitRequestType

Die Parameter zur Anlage einer Fehlzeit.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                       |
| --------------- | ------------------- | ------- | ---------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header. |
| `fehlzeit`      | `FehlzeitType`      | Ja      | Die anzulegende Fehlzeit.          |

### CreateFehlzeitResponseType

Das Antwort-Objekt der Fehlzeit-Anlage

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                                                      |
| ---------------- | -------------------- | ------- | ----------------------------------------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header.                               |
| `ids`            | `string`             | Nein    | Die Liste der Ids der angelegten Fehlzeiten durch Komma getrennt. |

### CreateGeraetRequestType

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Nein    |              |
| `geraet`        | `GeraetType`        | Nein    |              |

### CreateGeraetResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |
| `id`             | `int`                | Nein    |              |

### CreateMahlzeitRequestType

Request-Struktur zum Anlegen einer Mahlzeit.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                                          |
| --------------- | ------------------- | ------- | ----------------------------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header.                    |
| `mahlzeit`      | `MahlzeitType`      | Nein    | Die Struktur mit den Daten der anzulegenden Mahlzeit. |

### CreateMahlzeitResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### CreateMassenRequestType

Die Parameter zur Massenanlage von Objekten.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                       |
| --------------- | ------------------- | ------- | ---------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header. |
| `massenListe`   | `MassenListeType`   | Ja      |                                    |

### CreateMassenResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld            | Typ                       | Pflicht | Beschreibung                                                                        |
| --------------- | ------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `version`       | `string`                  | Ja      | Der allgemeine ZEP Response-Header.                                                 |
| `returnCode`    | `string`                  | Ja      | gibt den maximalen returnCode der allen Operations (falls dies nicht 0 ist dann ... |
| `responseListe` | `MassenResponseListeType` | Ja      |                                                                                     |

### CreatePreisgruppeRequestType

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Nein    |              |
| `preisgruppe`   | `PreisgruppeType`   | Ja      |              |

### CreatePreisgruppeResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |

### CreateRfidChipRequestType

Der Request zur Erstellung der RFID-Chip / User-Zuordnung.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                    |
| --------------- | ------------------- | ------- | ------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    |                                 |
| `rfidChip`      | `RfidChipType`      | Ja      | Die RFID-Chip / User Zuordnung. |

### CreateRfidChipResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |

### CreateTeilaufgabeRequestType

Das Request-Objekt zur Anlage einer Teilaufgabe.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                       |
| --------------- | ------------------- | ------- | ---------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header. |
| `teilaufgabe`   | `TeilaufgabeType`   | Ja      | Die Daten der Teilaufgabe.         |

### CreateTeilaufgabeResponseType

Das Antwort-Objekt der Anlage der Teilaufgabe.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |
| `ticketNr`       | `int`                | Nein    |                                     |
| `teilaufgabeNr`  | `String32`           | Nein    |                                     |

### CreateZahlungsdokumentationRequestType

#### Felder

| Feld                    | Typ                         | Pflicht | Beschreibung |
| ----------------------- | --------------------------- | ------- | ------------ |
| `requestHeader`         | `RequestHeaderType`         | Nein    |              |
| `zahlungsdokumentation` | `ZahlungsdokumentationType` | Ja      |              |

### CreateZahlungsdokumentationResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Nein    |              |
| `id`             | `int`                | Nein    |              |

### DeleteArtikelRequestType

Die Parameter zum Löschen eines Artikels.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                       |
| --------------- | ------------------- | ------- | ---------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header. |
| `artikelnummer` | `String128`         | Nein    |                                    |
| `id`            | `int`               | Nein    |                                    |

### DeleteArtikelResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### DeleteFehlzeitRequestType

Die Parameter zum Löschen eines Fehlgrunds

#### Felder

| Feld                       | Typ                 | Pflicht | Beschreibung                                                                        |
| -------------------------- | ------------------- | ------- | ----------------------------------------------------------------------------------- |
| `requestHeader`            | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header.                                                  |
| `id`                       | `int`               | Ja      |                                                                                     |
| `mailversandUnterdruecken` | `boolean`           | Nein    | Ist gleich false oder nicht mitgegeben dann werden mitarbeiter benachrichtigt (f... |

### DeleteFehlzeitResponseType

Das Antwort-Objekt bei Löschen eines Fehlgrunds

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### DeleteGeraetRequestType

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Nein    |              |
| `geraet`        | `GeraetType`        | Nein    |              |

### DeleteGeraetResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |

### DeleteMahlzeitRequestType

Die Request-Struktur zum Löschen der Mahlzeiten eines Tages.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                                                   |
| --------------- | ------------------- | ------- | -------------------------------------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header.                             |
| `userId`        | `String32`          | Ja      | Die Userid des Benutzers.                                      |
| `datum`         | `IsoDate`           | Ja      | Das Datum des Tages, an dem die Mahlzeit gelöscht werden soll. |

### DeleteMahlzeitResponseType

Die Response-Struktur mit dem Ergebnis des Löschens einer Mahlzeit.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### DeletePreisgruppeRequestType

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Nein    |              |
| `kurzform`      | `String32`          | Ja      |              |

### DeletePreisgruppeResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |

### DeleteRfidChipsRequestType

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Nein    |              |
| `rfidChip`      | `RfidChipType`      | Ja      |              |

### DeleteRfidChipsResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |

### DeleteTeilaufgabeRequestType

Die Parameter zum Löschen einer Teilaufgabe.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                                           |
| --------------- | ------------------- | ------- | ------------------------------------------------------ |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header.                     |
| `ticketNr`      | `int`               | Ja      | Die Nummer des Tickets, zu dem die Teilaufgabe gehört. |
| `teilaufgabeNr` | `String32`          | Ja      | Dei Nummer der zu löschenden Teilaufgabe.              |

### DeleteTeilaufgabeResponseType

Das Antwort-Objekt des Löschens einer Teilaufgabe.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### DeleteZahlungsdokumentationRequestType

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Nein    |              |
| `id`            | `int`               | Ja      |              |

### DeleteZahlungsdokumentationResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Nein    |              |

### DokumentListeType

#### Felder

| Feld       | Typ            | Pflicht | Beschreibung |
| ---------- | -------------- | ------- | ------------ |
| `dokument` | `DokumentType` | Nein    |              |

#### Attribute

- `length` (int):

### DokumentType

#### Felder

| Feld              | Typ           | Pflicht | Beschreibung |
| ----------------- | ------------- | ------- | ------------ |
| `id`              | `int`         | Nein    |              |
| `bezeichnung`     | `string`      | Nein    |              |
| `dateiname`       | `string`      | Nein    |              |
| `groesseInByte`   | `int`         | Nein    |              |
| `version`         | `int`         | Nein    |              |
| `hochgeladenAm`   | `IsoDateTime` | Nein    |              |
| `erstellerUserId` | `string`      | Nein    |              |
| `kundenNr`        | `String32`    | Nein    |              |
| `rechnungNr`      | `String32`    | Nein    |              |
| `angebotId`       | `int`         | Nein    |              |
| `userId`          | `String32`    | Nein    |              |
| `projektId`       | `int`         | Nein    |              |
| `ordner`          | `OrdnerType`  | Nein    |              |

### EmailListeType

#### Felder

| Feld    | Typ        | Pflicht | Beschreibung |
| ------- | ---------- | ------- | ------------ |
| `email` | `String64` | Nein    |              |

### ErloeskontoListeType

Eine Liste von Erlöskonten

#### Felder

| Feld          | Typ               | Pflicht | Beschreibung     |
| ------------- | ----------------- | ------- | ---------------- |
| `erloeskonto` | `ErloeskontoType` | Nein    | Die Erlöskonten. |

#### Attribute

- `length` (int): Die Anzahl der Erlöskonten in der Liste.

### ErloeskontoType

Die Daten eines Erlöskontos

#### Felder

| Feld            | Typ          | Pflicht | Beschreibung                                               |
| --------------- | ------------ | ------- | ---------------------------------------------------------- |
| `erloeskontoNr` | `String32`   | Nein    | Die Nummer des Erlöskontos.                                |
| `bezeichnung`   | `String255`  | Nein    | Die Bezeichnung des Erlöskontos.                           |
| `landkennung`   | `String32`   | Nein    | Die Kennung für das Land, z.B. 'Inland', 'EU', 'Drittland' |
| `mwst`          | `Decimal6_4` | Nein    | Der MwSt-Satz des Erlöskontos.                             |

### FehldauerType

Die Dauer einer Fehlzeit.

#### Felder

| Feld        | Typ       | Pflicht | Beschreibung |
| ----------- | --------- | ------- | ------------ |
| `ganzerTag` | `boolean` | Nein    |              |
| `halberTag` | `boolean` | Nein    |              |
| `stunden`   | `boolean` | Nein    |              |

### FehlgrundListeType

Liste von Fehlgründen

#### Felder

| Feld        | Typ             | Pflicht | Beschreibung             |
| ----------- | --------------- | ------- | ------------------------ |
| `fehlgrund` | `FehlgrundType` | Nein    | Die Fehlgründe der LIste |

#### Attribute

- `length` (int): Anzahl der Fehlgründe in der Liste

### FehlgrundType

Die Parameter eines Fehlgrunds

#### Felder

| Feld                              | Typ             | Pflicht | Beschreibung                                                                  |
| --------------------------------- | --------------- | ------- | ----------------------------------------------------------------------------- |
| `kurzform`                        | `String32`      | Ja      | Die Kurzbezeichnung des Fehlgrundes                                           |
| `bezeichnung`                     | `string`        | Nein    | Die Bezeichnung des Fehlgrundes                                               |
| `genehmigungspflichtig`           | `boolean`       | Nein    | Kennung, ob Fehlzeiten mit diesem Fehlgrund genehmigungspflichtig sind        |
| `selbstErfassen`                  | `boolean`       | Nein    | Kennung, ob ein Benutzer Fehlzeiten mit diesem Fehlgrund selbst erfassen darf |
| `fehldauer`                       | `FehldauerType` | Nein    |                                                                               |
| `art`                             | `string`        | Nein    |                                                                               |
| `jederDarfFehlzeitSelbstErfassen` | `boolean`       | Nein    |                                                                               |
| `jederKannKurzformSehen`          | `boolean`       | Nein    |                                                                               |

### FehlzeitListeType

Liste von Fehlzeiten

#### Felder

| Feld       | Typ            | Pflicht | Beschreibung                            |
| ---------- | -------------- | ------- | --------------------------------------- |
| `fehlzeit` | `FehlzeitType` | Nein    | Die in der Liste enthaltenen Fehlzeiten |

#### Attribute

- `length` (int): Die Anzahl der Fehlzeiten in der Liste

### FehlzeitType

Die Parameter einer Fehlzeit.

#### Felder

| Feld                       | Typ              | Pflicht | Beschreibung                                                                        |
| -------------------------- | ---------------- | ------- | ----------------------------------------------------------------------------------- |
| `id`                       | `int`            | Nein    | Die Id der Fehlzeit.                                                                |
| `userId`                   | `String32`       | Ja      | Der Benutzer dem die Fehlzeit zugeordnet ist.                                       |
| `startdatum`               | `IsoDate`        | Ja      | Das Startdatum der Fehlzeit.                                                        |
| `enddatum`                 | `IsoDate`        | Nein    | Das Datum, bis zu dem die Fehlzeit gilt. Falls leer, so entspricht das Endedatum... |
| `fehlgrund`                | `String32`       | Ja      | Die Kurzbezeichnung des zugeordneten Fehlgrundes.                                   |
| `istHalberTag`             | `boolean`        | Nein    | true: Fehlzeit is halber Tag. leer/false: Fehlzeit ist ganzer Tag. Wenn 'vonZeit... |
| `genehmigt`                | `boolean`        | Nein    | Kennung bei einer genehmigungspflichtigen Fehlzeit, ob diese genehmigt ist oder ... |
| `vonZeit`                  | `IsoTime`        | Nein    | Diese gilt nur für eine Fehlzeit mit Dauer in Stunden, das Feld 'bisZeit' muss a... |
| `bisZeit`                  | `IsoTime`        | Nein    | Dies gilt nur für eine Fehlzeit m,it Dauer in Stunden, das Feld 'vonZeit' muss a... |
| `bemerkung`                | `string`         | Nein    | Die Bemerkung zur Fehlzeit.                                                         |
| `timezone`                 | `string`         | Nein    | gilt nur für Fehlzeiten mit von/bis-Zeiten. Beispiele: 'Europe/Berlin', 'Africa/... |
| `mailversandUnterdruecken` | `boolean`        | Nein    | Ist gleich false oder nicht mitgegeben dann werden mitarbeiter benachrichtigt (f... |
| `created`                  | `IsoDateTime`    | Nein    | Der Zeitpunkt der Anlage des Objekts.                                               |
| `modified`                 | `IsoDateTime`    | Nein    | Der Zeitpunkt der letzten Änderung des Objekts.                                     |
| `geplant`                  | `boolean`        | Nein    |                                                                                     |
| `beantragt`                | `boolean`        | Nein    |                                                                                     |
| `genehmigt_durch`          | `String32`       | Nein    | userId des Admin bzw. Abteilungsleiter der die Fehlzeit genehmigt und Berechitig... |
| `attributes`               | `AttributesType` | Nein    | Liste von Attributen für kundenspezifische Erweiterungen.                           |

### FeiertagAusnahmeListeType

#### Felder

| Feld               | Typ                    | Pflicht | Beschreibung |
| ------------------ | ---------------------- | ------- | ------------ |
| `feiertagAusnahme` | `FeiertagAusnahmeType` | Nein    |              |

#### Attribute

- `length` (int):

### FeiertagAusnahmeType

#### Felder

| Feld                  | Typ           | Pflicht | Beschreibung |
| --------------------- | ------------- | ------- | ------------ |
| `datum`               | `IsoDate`     | Nein    |              |
| `userId`              | `String32`    | Nein    |              |
| `name`                | `String128`   | Nein    |              |
| `bezeichnungDe`       | `string`      | Nein    |              |
| `bezeichnungEn`       | `string`      | Nein    |              |
| `bezeichnungFr`       | `string`      | Nein    |              |
| `wertigkeit`          | `int`         | Nein    |              |
| `zuschlag`            | `int`         | Nein    |              |
| `zuschlagFolgetagBis` | `IsoTime`     | Nein    |              |
| `created`             | `IsoDateTime` | Nein    |              |
| `modified`            | `IsoDateTime` | Nein    |              |

### FeiertagListeType

#### Felder

| Feld       | Typ            | Pflicht | Beschreibung |
| ---------- | -------------- | ------- | ------------ |
| `feiertag` | `FeiertagType` | Nein    |              |

#### Attribute

- `length` (int):

### FeiertagType

#### Felder

| Feld                  | Typ           | Pflicht | Beschreibung |
| --------------------- | ------------- | ------- | ------------ |
| `datum`               | `IsoDate`     | Nein    |              |
| `name`                | `String128`   | Nein    |              |
| `bezeichnungDe`       | `string`      | Nein    |              |
| `bezeichnungEn`       | `string`      | Nein    |              |
| `bezeichnungFr`       | `string`      | Nein    |              |
| `wertigkeit`          | `int`         | Nein    |              |
| `maxStunden`          | `Decimal8_10` | Nein    |              |
| `zuschlag`            | `int`         | Nein    |              |
| `zuschlagFolgetagBis` | `IsoTime`     | Nein    |              |
| `crerated`            | `IsoDateTime` | Nein    |              |
| `modified`            | `IsoDateTime` | Nein    |              |

### FeiertagskalenderListeType

#### Felder

| Feld                | Typ                               | Pflicht | Beschreibung |
| ------------------- | --------------------------------- | ------- | ------------ |
| `feiertagskalender` | `StammdatenFeiertagskalenderType` | Nein    |              |

#### Attribute

- `length` (int):

### FeiertagskalenderType

#### Felder

| Feld     | Typ        | Pflicht | Beschreibung |
| -------- | ---------- | ------- | ------------ |
| `name`   | `String64` | Ja      |              |
| `action` | `string`   | Nein    |              |

### GeraetListeType

#### Felder

| Feld     | Typ          | Pflicht | Beschreibung |
| -------- | ------------ | ------- | ------------ |
| `geraet` | `GeraetType` | Nein    |              |

#### Attribute

- `length` (int):

### GeraetType

0 = APP 1 = Terminal

#### Felder

| Feld                   | Typ                  | Pflicht | Beschreibung                                                                        |
| ---------------------- | -------------------- | ------- | ----------------------------------------------------------------------------------- |
| `id`                   | `int`                | Ja      |                                                                                     |
| `typ`                  | `int0_1`             | Nein    | 0 = APP 1 = Terminal                                                                |
| `name`                 | `String120`          | Nein    |                                                                                     |
| `userIdListe`          | `UserIdListeType`    | Nein    |                                                                                     |
| `userKategorieListe`   | `KategorieListeType` | Nein    |                                                                                     |
| `standortUebermitteln` | `boolean`            | Nein    |                                                                                     |
| `administratorPinCode` | `String32`           | Nein    |                                                                                     |
| `status`               | `int0_10`            | Nein    | Status des Deivces: 0=inaktiv, 1=aktiv, 2=warte auf connect 3=aktiv im Lernmodus... |
| `erfassungszeitVon`    | `IsoTime`            | Nein    |                                                                                     |
| `erfassungszeitBis`    | `IsoTime`            | Nein    |                                                                                     |
| `startzeitAnzeigen`    | `boolean`            | Nein    | Für die Anzeige auf dem Gerät.                                                      |

### IdListeType

#### Felder

| Feld | Typ   | Pflicht | Beschreibung |
| ---- | ----- | ------- | ------------ |
| `id` | `int` | Nein    |              |

### JaehrlichType

Endet nach x Ereignisse.

#### Felder

| Feld                 | Typ       | Pflicht | Beschreibung                                                                   |
| -------------------- | --------- | ------- | ------------------------------------------------------------------------------ |
| `endetNach`          | `int`     | Nein    | Endet nach x Ereignisse.                                                       |
| `bis`                | `IsoDate` | Nein    | Gilt bis diesem Datum. Entweder 'endetNach' oder 'bis' eingeben (nicht beide). |
| `alleBestimmteJahre` | `int`     | Nein    |                                                                                |
| `monat`              | `int`     | Nein    |                                                                                |
| `monatstag`          | `int`     | Nein    | 1,...,28(,29,30,31)                                                            |
| `wochentag`          | `Int1_7`  | Nein    | 1=Montag,..,7=Sonntag                                                          |
| `monatswoche`        | `Int1_5`  | Nein    | 1=die Erste; 2=die Zweite; 3=die Dritte; 4=die Vierte; 5= die Letzte.          |

### KurzformListeType

#### Felder

| Feld       | Typ      | Pflicht | Beschreibung |
| ---------- | -------- | ------- | ------------ |
| `kurzform` | `string` | Nein    |              |

### LexwareListeType

Eine Liste von Buchungssätzen im Lexware Format

#### Felder

| Feld      | Typ           | Pflicht | Beschreibung                         |
| --------- | ------------- | ------- | ------------------------------------ |
| `lexware` | `LexwareType` | Nein    | Die Buchungssätze im Lexware Format. |

#### Attribute

- `length` (int): Die Anzahl der Buchungssätze in der Liste.

### LexwareType

Die Daten eines Buchungssatzes im Lexware Format

#### Felder

| Feld               | Typ              | Pflicht | Beschreibung                                                                        |
| ------------------ | ---------------- | ------- | ----------------------------------------------------------------------------------- |
| `belegdatum`       | `string`         | Nein    | Das Datum des Beleges bzw. der Buchung.                                             |
| `belegnummer`      | `string`         | Nein    | Die Nummer des Beleges.                                                             |
| `buchungstext`     | `string`         | Nein    | Der Buchungstext, z.B. Text der Rechnungsposition.                                  |
| `buchungsbetrag`   | `string`         | Nein    | Der zu buchende Betrag.                                                             |
| `sollkonto`        | `string`         | Nein    | Das Soll-Konto, zu dessen Lasten die Buchung erfolgt.                               |
| `habenkonto`       | `string`         | Nein    | Das Haben-Konto, zu dessen Gunsten die Buchung erfolgt.                             |
| `steuerschluessel` | `string`         | Nein    | Der Steuerschlüssel.                                                                |
| `kostenstelle`     | `string`         | Nein    | Die Kostenstelle (falls das Modu 'Export für Buchhaltung' aktiv ist und Kostenst... |
| `kostentraeger`    | `string`         | Nein    | Der Kostenträge (falls das Modu 'Export für Buchhaltung' aktiv ist und Kostenträ... |
| `waehrung`         | `string`         | Nein    | Die Währung der Buchung.                                                            |
| `attributes`       | `AttributesType` | Nein    | Für kundenspezifische Erweiterungen.                                                |

### MahlzeitListeType

Liste von Mahlzeiten.

#### Felder

| Feld       | Typ            | Pflicht | Beschreibung |
| ---------- | -------------- | ------- | ------------ |
| `mahlzeit` | `MahlzeitType` | Nein    |              |

#### Attribute

- `length` (int):

### MahlzeitType

Die Struktur zur Anlage von Mahlzeiten an einem Tag.

#### Felder

| Feld        | Typ        | Pflicht | Beschreibung                                                   |
| ----------- | ---------- | ------- | -------------------------------------------------------------- |
| `id`        | `int`      | Nein    |                                                                |
| `userId`    | `String32` | Nein    | Die Userid des Benutzers.                                      |
| `datum`     | `IsoDate`  | Nein    | Das Datum, an dem der Mahlzeiten-Eintrag angelegt werden soll. |
| `breakfast` | `int0_1`   | Nein    | Boolean Flagge, ob an dem Tag ein Frühstück stattfand (0/1).   |
| `lunch`     | `int0_1`   | Nein    | Boolean Flagge, ob an dem Tag ein Mittagessen stattfand (0/1). |
| `dinner`    | `int0_1`   | Nein    | Boolean Flagge, ob an dem Tag ein Abendessen stattfand (0/1).  |
| `action`    | `string`   | Nein    |                                                                |

### MahnungListeType

#### Felder

| Feld      | Typ           | Pflicht | Beschreibung |
| --------- | ------------- | ------- | ------------ |
| `mahnung` | `MahnungType` | Nein    |              |

#### Attribute

- `length` (int):

### MahnungType

#### Felder

| Feld                 | Typ              | Pflicht | Beschreibung |
| -------------------- | ---------------- | ------- | ------------ |
| `id`                 | `int`            | Nein    |              |
| `titel`              | `String64`       | Nein    |              |
| `rechnungNr`         | `String32`       | Ja      |              |
| `datum`              | `IsoDate`        | Nein    |              |
| `betrag`             | `Decimal10_2`    | Nein    |              |
| `ausstehenderBetrag` | `Decimal10_2`    | Nein    |              |
| `zahlungszielDatum`  | `IsoDate`        | Nein    |              |
| `zahlungsziel`       | `int`            | Nein    |              |
| `adresse`            | `string`         | Nein    |              |
| `created`            | `IsoDateTime`    | Nein    |              |
| `modified`           | `IsoDateTime`    | Nein    |              |
| `attributes`         | `AttributesType` | Nein    |              |

### MassenListeType

Liste der auszuführenden Massen-Operationen.

#### Felder

| Feld          | Typ               | Pflicht | Beschreibung                 |
| ------------- | ----------------- | ------- | ---------------------------- |
| `mitarbeiter` | `MitarbeiterType` | Nein    |                              |
| `kunde`       | `KundeType`       | Nein    |                              |
| `projekt`     | `ProjektType`     | Nein    |                              |
| `ticket`      | `TicketType`      | Nein    |                              |
| `teilaufgabe` | `TeilaufgabeType` | Nein    |                              |
| `projektzeit` | `ProjektzeitType` | Nein    |                              |
| `beleg`       | `BelegType`       | Nein    |                              |
| `mahlzeit`    | `MahlzeitType`    | Nein    |                              |
| `fehlzeit`    | `FehlzeitType`    | Nein    | für Operation createFehlzeit |
| `einplanung`  | `EinplanungType`  | Nein    |                              |
| `artikel`     | `ArtikelType`     | Nein    |                              |

### MassenResponseListeType

Das Resultat der Request-Ausführung.

#### Felder

| Feld       | Typ                  | Pflicht | Beschreibung |
| ---------- | -------------------- | ------- | ------------ |
| `response` | `ResponseHeaderType` | Nein    |              |

### MonatlichType

Endet nach x Ereignisse.

#### Felder

| Feld                  | Typ       | Pflicht | Beschreibung                                                                   |
| --------------------- | --------- | ------- | ------------------------------------------------------------------------------ |
| `endetNach`           | `int`     | Nein    | Endet nach x Ereignisse.                                                       |
| `bis`                 | `IsoDate` | Nein    | Gilt bis diesem Datum. Entweder 'endetNach' oder 'bis' eingeben (nicht beide). |
| `alleBestimmteMonate` | `int`     | Nein    |                                                                                |
| `monatstag`           | `int`     | Nein    | 1,...,28(,29,30,31)                                                            |
| `wochentag`           | `Int1_7`  | Nein    | 1=Montag,..,7=Sonntag                                                          |
| `monatswoche`         | `Int1_5`  | Nein    | 1=die Erste; 2=die Zweite; 3=die Dritte; 4=die Vierte; 5= die Letzte.          |

### OrdnerType

Alle übergeordneten Ordner rekursiv bis zum obersten Ordner

#### Felder

| Feld        | Typ          | Pflicht | Beschreibung                                                |
| ----------- | ------------ | ------- | ----------------------------------------------------------- |
| `parentRef` | `OrdnerType` | Nein    | Alle übergeordneten Ordner rekursiv bis zum obersten Ordner |

#### Attribute

- `id` (int):
- `name` (tns:String255):

### OrdnertypListeType

0: Odrner für allgemeine Dokumente 1: Ordner für Projektdokuemente 2: Ordner für Kundendokumente 3:-- 4: Ordner für Rechnungsdokumente 5: Ordner für Mitarbeiterdokumente 6: Ordner für Rechnungsanhänge 7: Ordner für Angebotdokumente 8: Ordner für Angebotsanhänge

#### Felder

| Feld  | Typ       | Pflicht | Beschreibung |
| ----- | --------- | ------- | ------------ |
| `typ` | `int0_10` | Nein    |              |

### OrtType

#### Felder

| Feld             | Typ        | Pflicht | Beschreibung |
| ---------------- | ---------- | ------- | ------------ |
| `kurzform`       | `String32` | Ja      |              |
| `bezeichnung`    | `String64` | Nein    |              |
| `heimarbeitsort` | `boolean`  | Nein    |              |
| `inland`         | `boolean`  | Nein    |              |
| `waehrung`       | `String32` | Nein    |              |

### OrtslisteListeType

#### Felder

| Feld        | Typ             | Pflicht | Beschreibung |
| ----------- | --------------- | ------- | ------------ |
| `ortsliste` | `OrtslisteType` | Nein    |              |

#### Attribute

- `length` (int):

### OrtslisteType

#### Felder

| Feld         | Typ       | Pflicht | Beschreibung |
| ------------ | --------- | ------- | ------------ |
| `id`         | `int`     | Nein    |              |
| `gueltigAb`  | `IsoDate` | Nein    |              |
| `gueltigBis` | `IsoDate` | Nein    |              |
| `bemerkung`  | `string`  | Nein    |              |
| `ort`        | `OrtType` | Nein    |              |

### PausenregelungType

#### Felder

| Feld     | Typ        | Pflicht | Beschreibung |
| -------- | ---------- | ------- | ------------ |
| `name`   | `String64` | Ja      |              |
| `action` | `string`   | Nein    |              |

### PreisListeType

Eine Liste von Preisen.

#### Felder

| Feld    | Typ         | Pflicht | Beschreibung                         |
| ------- | ----------- | ------- | ------------------------------------ |
| `preis` | `PreisType` | Nein    | Die in der Liste enthaltenen Preise. |

### PreisType

Die Daten eines Preises.

#### Felder

| Feld                  | Typ           | Pflicht | Beschreibung                                                                        |
| --------------------- | ------------- | ------- | ----------------------------------------------------------------------------------- |
| `id`                  | `int`         | Nein    | Die Id des Preises. Pflicht bei Update und Löschen.                                 |
| `preisgruppe`         | `String32`    | Nein    | Die Preisgruppe, der der Preis zugeordnet ist. Pflicht bei Anlage.                  |
| `tagessatz`           | `Decimal12_2` | Nein    | Der Tagessatz.                                                                      |
| `stundensatz`         | `Decimal12_2` | Nein    | Der Stundensatz.                                                                    |
| `speziellStundensatz` | `Decimal12_2` | Nein    | Ein spezieller Stundensatz für die im Preis angegebene Tätigkeit.                   |
| `taetigkeit`          | `String32`    | Nein    | Die Tätigkeit, für die ein spezieller Stundensatz gilt.                             |
| `action`              | `string`      | Nein    | Aktion. Um den Preis im Rahmen eines Updates zu löschen muss hier "delete" angeg... |

### PreisfaktorListeType

Eine Liste von Preisfaktoren.

#### Felder

| Feld          | Typ               | Pflicht | Beschreibung                                |
| ------------- | ----------------- | ------- | ------------------------------------------- |
| `preisfaktor` | `PreisfaktorType` | Nein    | Die in der Liste enthaltenen Preisfaktoren. |

### PreisfaktorType

Die Daten eines Preisfaktors.

#### Felder

| Feld         | Typ            | Pflicht | Beschreibung                                                                        |
| ------------ | -------------- | ------- | ----------------------------------------------------------------------------------- |
| `id`         | `int`          | Nein    | Die Id des Preisfaktors.                                                            |
| `tag`        | `string`       | Nein    | Der Wochentag, für den der Preisfaktor gilt. Wertebereich: 0=Sonntag,...,6=Samst... |
| `von`        | `IsoTime`      | Nein    | Die Uhrzeit, ab der der Preisfaktor gilt. Pflicht bei Anlage. Format: HH:MM         |
| `bis`        | `IsoTime`      | Nein    | Die Uhrzeit, bis zu der der Preisfaktor gilt. Pflicht bei Anlage. Format: HH:MM     |
| `faktor`     | `Decimal13_10` | Nein    | Der Preisfaktor (in Prozent). Pflicht bei Anlage.                                   |
| `taetigkeit` | `String32`     | Nein    | Die Tätigkeit, für die der Preisfaktor gilt.                                        |
| `action`     | `string`       | Nein    | Aktion. Um den Preisfaktor im Rahmen eines Updates zu löschen muss hier "delete"... |

### PreisgruppeListeType

#### Felder

| Feld          | Typ               | Pflicht | Beschreibung |
| ------------- | ----------------- | ------- | ------------ |
| `preisgruppe` | `PreisgruppeType` | Nein    |              |

#### Attribute

- `length` (int):

### PreisgruppeType

#### Felder

| Feld             | Typ        | Pflicht | Beschreibung |
| ---------------- | ---------- | ------- | ------------ |
| `kurzform`       | `String32` | Nein    |              |
| `bezeichnung_de` | `String82` | Nein    |              |
| `bezeichnung_en` | `String82` | Nein    |              |
| `bezeichnung_fr` | `String82` | Nein    |              |
| `bezeichnung_es` | `String32` | Nein    |              |
| `bezeichnung_pl` | `String32` | Nein    |              |
| `inaktiv`        | `boolean`  | Nein    |              |

### PreistabelleListeType

Eine Liste von Preistabellen.

#### Felder

| Feld           | Typ                | Pflicht | Beschreibung                                |
| -------------- | ------------------ | ------- | ------------------------------------------- |
| `preistabelle` | `PreistabelleType` | Nein    | Die in der Liste enthaltenen Preistabellen. |

### PreistabelleType

Die Daten einer einzelnen Preistabelle. Diese wird sowohl als Projekt- als auch als Kundenpreistabelle verwendet, abhängig davon, ob eine Projektnummer oder eine Kundennummer angegeben wurde.

#### Felder

| Feld               | Typ                    | Pflicht | Beschreibung                                                                        |
| ------------------ | ---------------------- | ------- | ----------------------------------------------------------------------------------- |
| `id`               | `int`                  | Nein    | Die Id der Preistabelle. Pflicht bei Update und Löschen.                            |
| `gueltigAb`        | `IsoDate`              | Nein    | Das Datum, ab dem die Preistabelle gilt. Format: JJJJ-MM-TT. Pflicht.               |
| `kundenNr`         | `String32`             | Nein    | Die Nummer des Kunden, für den die Preistabelle gilt (Kundenpreistabelle). Ist d... |
| `projektNr`        | `String64`             | Nein    | Die Nummer des Projektes, für das die Preistabelle gilt (Projektpreistabelle). I... |
| `preisListe`       | `PreisListeType`       | Nein    | Die Liste der Preise dieser Preistabelle.                                           |
| `preisfaktorListe` | `PreisfaktorListeType` | Nein    | Die Liste der Preisfaktoren dieser Preistabelle.                                    |
| `projektId`        | `int`                  | Nein    |                                                                                     |
| `action`           | `string`               | Nein    | Aktion. Um die Preistabelle im Rahmen eines Updates zu löschen muss hier "delete... |

### ReadAbgeglicheneZeitenRequestType

Die Request-Struktur zum Lesen von abgeglichenen Zeiten.

#### Felder

| Feld                                   | Typ                                        | Pflicht | Beschreibung                                          |
| -------------------------------------- | ------------------------------------------ | ------- | ----------------------------------------------------- |
| `requestHeader`                        | `RequestHeaderType`                        | Nein    | Der allgemeine ZEP Request-Header.                    |
| `readAbgeglicheneZeitenSearchCriteria` | `ReadAbgeglicheneZeitenSearchCriteriaType` | Ja      | Die Suchkriterien zum Lesen von abgeglichenen Zeiten. |

### ReadAbgeglicheneZeitenResponseType

Die Antwort-Struktur zum Lesen von abgeglichenen Zeiten.

#### Felder

| Feld                      | Typ                           | Pflicht | Beschreibung                        |
| ------------------------- | ----------------------------- | ------- | ----------------------------------- |
| `responseHeader`          | `ResponseHeaderType`          | Ja      | Der allgemeine ZEP Response-Header. |
| `abgeglicheneZeitenListe` | `AbgeglicheneZeitenListeType` | Ja      | Die LIste der abgeglichenen Zeiten. |

### ReadAbgeglicheneZeitenSearchCriteriaType

Die Suchkriterien zum Lesen von abgeglichenen Zeiten.

#### Felder

| Feld     | Typ        | Pflicht | Beschreibung                                                        |
| -------- | ---------- | ------- | ------------------------------------------------------------------- |
| `userId` | `String32` | Nein    | Der Benutzername.                                                   |
| `jahr`   | `int0_4`   | Nein    | Das Jahr, zu dem die abgeglichenen Zeiten geliefert werden sollen.  |
| `monat`  | `int`      | Nein    | Der Monat, zu dem die abgeglichenen Zeiten geliefert werden sollen. |

### ReadAngebotRequestType

#### Felder

| Feld                        | Typ                             | Pflicht | Beschreibung |
| --------------------------- | ------------------------------- | ------- | ------------ |
| `requestHeader`             | `RequestHeaderType`             | Nein    |              |
| `readAngebotSearchCriteria` | `ReadAngebotSearchCriteriaType` | Nein    |              |

### ReadAngebotResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Nein    |              |
| `angebotListe`   | `AngebotListeType`   | Nein    |              |

### ReadAngebotSearchCriteriaType

10 = NEU; 20 = IN_BEARBEITUNG; 30 = FERTIG; 40 = IN_PRUEFUNG; 50 = GEPRUEFT; 60 = DOKUMENT_ERSTELLT; 70 = ALS_MAIL_ANGEBOTEN; 80 = ALS_BRIEF_ANGEBOTEN; 90 = BEAUFTRAGT; 95 = BESTAETIGT; 100 = IN_PROJEKT_UEBERFUEHRT; 110 = ABGERECHNET; 200 = ABGELEHNT;

#### Felder

| Feld                | Typ                     | Pflicht | Beschreibung                                                                        |
| ------------------- | ----------------------- | ------- | ----------------------------------------------------------------------------------- |
| `von`               | `IsoDate`               | Nein    |                                                                                     |
| `bis`               | `IsoDate`               | Nein    |                                                                                     |
| `abteilung`         | `String64`              | Nein    |                                                                                     |
| `projektNr`         | `String64`              | Nein    |                                                                                     |
| `kundenNr`          | `String32`              | Nein    |                                                                                     |
| `status`            | `int`                   | Nein    | 10 = NEU; 20 = IN_BEARBEITUNG; 30 = FERTIG; 40 = IN_PRUEFUNG; 50 = GEPRUEFT; 60 ... |
| `bearbeiter`        | `String32`              | Nein    |                                                                                     |
| `schlagworteFilter` | `SchlagworteFilterType` | Nein    |                                                                                     |
| `suchbegriff`       | `string`                | Nein    | Durch den in das Suchfeld eingebebenen Text wird die Ergebnistabelle nach: Nr Ti... |
| `id`                | `int`                   | Nein    |                                                                                     |

### ReadArtikelRequestType

Die Paramater zum Lesen von Artikeln.

#### Felder

| Feld                        | Typ                             | Pflicht | Beschreibung                              |
| --------------------------- | ------------------------------- | ------- | ----------------------------------------- |
| `requestHeader`             | `RequestHeaderType`             | Nein    | Der allgemeine ZEP Request-Header.        |
| `readArtikelSearchCriteria` | `ReadArtikelSearchCriteriaType` | Nein    | Die Suchkriterien zum Lesen von Artikeln. |

### ReadArtikelResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |
| `artikelListe`   | `ArtikelListeType`   | Ja      |                                     |

### ReadArtikelSearchCriteriaType

Die Suchkriterien zum Lesen von Artikeln.

#### Felder

| Feld            | Typ           | Pflicht | Beschreibung                                                |
| --------------- | ------------- | ------- | ----------------------------------------------------------- |
| `artikelnummer` | `String128`   | Nein    | Die Nummer des Artikels.                                    |
| `bezeichnung`   | `String128`   | Nein    | Die Bezeichnung des Artikels.                               |
| `einheit`       | `String64`    | Nein    | Die Einheit des Artikels.                                   |
| `einzelpreis`   | `Decimal10_2` | Nein    | Der Einzelpreis des Artikels.                               |
| `waehrung`      | `String32`    | Nein    | Die Währung des Artikels.                                   |
| `inaktiv`       | `boolean`     | Nein    | Flagge, ob aktive oder inaktive Artikel zu liefen sind.     |
| `modifiedSince` | `IsoDateTime` | Nein    | Suche nach Artikeln, die nach diesem Datum geändert wurden. |
| `id`            | `int`         | Nein    |                                                             |

### ReadBasispreistabelleRequestType

#### Felder

| Feld                                  | Typ                                       | Pflicht | Beschreibung |
| ------------------------------------- | ----------------------------------------- | ------- | ------------ |
| `requestHeader`                       | `RequestHeaderType`                       | Nein    |              |
| `readBasispreistabelleSearchCriteria` | `ReadBasispreistabelleSearchCriteriaType` | Nein    |              |

### ReadBasispreistabelleResponseType

#### Felder

| Feld                     | Typ                     | Pflicht | Beschreibung |
| ------------------------ | ----------------------- | ------- | ------------ |
| `responseHeader`         | `ResponseHeaderType`    | Nein    |              |
| `basispreistabelleListe` | `PreistabelleListeType` | Nein    |              |

### ReadBasispreistabelleSearchCriteriaType

#### Felder

| Feld    | Typ       | Pflicht | Beschreibung |
| ------- | --------- | ------- | ------------ |
| `datum` | `IsoDate` | Nein    |              |

### ReadDokumentInhaltRequestType

Die Parameter zum Lesen des Inhalts eines Dokuments.

#### Felder

| Feld                               | Typ                                    | Pflicht | Beschreibung                                                 |
| ---------------------------------- | -------------------------------------- | ------- | ------------------------------------------------------------ |
| `requestHeader`                    | `RequestHeaderType`                    | Nein    | Der allgemeine ZEP Request-Header.                           |
| `readDokumentInhaltSearchCriteria` | `ReadDokumentInhaltSearchCriteriaType` | Ja      | Die Suchkriterien zur Suche nach dem Inhalt eines Dokuments. |

### ReadDokumentInhaltResponseType

Die Antwort beim Lesen des Inhalts eines Dokuments.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |
| `dokumentInhalt` | `AnhangType`         | Nein    | Der gelesene Inhalt des Dokuments.  |

### ReadDokumentInhaltSearchCriteriaType

Die Suchkriterien für das Lesen eines Dokumentinhalts.

#### Felder

| Feld         | Typ   | Pflicht | Beschreibung                                               |
| ------------ | ----- | ------- | ---------------------------------------------------------- |
| `dokumentId` | `int` | Nein    | Die Id des Dokuments, dessen Inhalt geliefert werden soll. |

### ReadDokumenteRequestType

#### Felder

| Feld                          | Typ                               | Pflicht | Beschreibung |
| ----------------------------- | --------------------------------- | ------- | ------------ |
| `requestHeader`               | `RequestHeaderType`               | Nein    |              |
| `readDokumenteSearchCriteria` | `ReadDokumenteSearchCriteriaType` | Nein    |              |

### ReadDokumenteResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Nein    |              |
| `dokumentListe`  | `DokumentListeType`  | Nein    |              |

### ReadDokumenteSearchCriteriaType

#### Felder

| Feld            | Typ                  | Pflicht | Beschreibung |
| --------------- | -------------------- | ------- | ------------ |
| `dateiname`     | `String255`          | Nein    |              |
| `bezeichnung`   | `String64`           | Nein    |              |
| `odnertypListe` | `OrdnertypListeType` | Nein    |              |
| `kundenNr`      | `String32`           | Nein    |              |
| `rechnungNr`    | `String32`           | Nein    |              |
| `angebotId`     | `int`                | Nein    |              |
| `userId`        | `String32`           | Nein    |              |
| `projektNr`     | `String64`           | Nein    |              |
| `projektId`     | `int`                | Nein    |              |

### ReadEinstellungenRequestType

Der allgemeine ZEP Request-Header.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                       |
| --------------- | ------------------- | ------- | ---------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header. |

### ReadEinstellungenResponseType

Der allgemeine ZEP Response-Header.

#### Felder

| Feld                   | Typ                        | Pflicht | Beschreibung                        |
| ---------------------- | -------------------------- | ------- | ----------------------------------- |
| `responseHeader`       | `ResponseHeaderType`       | Nein    | Der allgemeine ZEP Response-Header. |
| `projektzeitUndBelege` | `ProjektzeitUndBelegeType` | Nein    |                                     |

### ReadErloeskontoRequestType

Die Parameter zum Lesen von Erlöskonten.

#### Felder

| Feld                            | Typ                                 | Pflicht | Beschreibung                                      |
| ------------------------------- | ----------------------------------- | ------- | ------------------------------------------------- |
| `requestHeader`                 | `RequestHeaderType`                 | Nein    | Der allgemeine ZEP Request-Header.                |
| `readErloeskontoSearchCriteria` | `ReadErloeskontoSearchCriteriaType` | Ja      | Die Suchkriterien für die Suche nach Erlöskonten. |

### ReadErloeskontoResponseType

Die Antwort beim Lesen von Erlöskonten.

#### Felder

| Feld               | Typ                    | Pflicht | Beschreibung                         |
| ------------------ | ---------------------- | ------- | ------------------------------------ |
| `responseHeader`   | `ResponseHeaderType`   | Ja      | Der allgemeine ZEP Response-Header.  |
| `erloeskontoListe` | `ErloeskontoListeType` | Ja      | Die Liste der gelesenen Erlöskonten. |

### ReadErloeskontoSearchCriteriaType

Die Suchkriterien für das Lesen von Erlöskonten.

#### Felder

| Feld            | Typ              | Pflicht | Beschreibung                                                                        |
| --------------- | ---------------- | ------- | ----------------------------------------------------------------------------------- |
| `erloeskontoNr` | `String32`       | Nein    | Die Nummer des gesuchten Erlöskontos. Falls leer werden alle Erlöskonten geliefe... |
| `attributes`    | `AttributesType` | Nein    | Attribute für kundenspezifische Erweiterungen.                                      |

### ReadFehlgrundRequestType

Die Parameter zur Abfrage von Fehlgründen.

#### Felder

| Feld                          | Typ                               | Pflicht | Beschreibung                                   |
| ----------------------------- | --------------------------------- | ------- | ---------------------------------------------- |
| `requestHeader`               | `RequestHeaderType`               | Nein    | Der allgemeine ZEP Request-Header.             |
| `readFehlgrundSearchCriteria` | `ReadFehlgrundSearchCriteriaType` | Ja      | Die Suchkriterien zur Abfrage von Fehlgründen. |

### ReadFehlgrundResponseType

Die Antwort der Abfrage von Fehlgründen.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |
| `fehlgrundListe` | `FehlgrundListeType` | Ja      | Liste der gefundenen Fehlgründe.    |

### ReadFehlgrundSearchCriteriaType

Die Suchkriterien zur Abfrage von Fehlgründen.

#### Felder

| Feld                    | Typ        | Pflicht | Beschreibung                                                                 |
| ----------------------- | ---------- | ------- | ---------------------------------------------------------------------------- |
| `kurzform`              | `String32` | Nein    | Die Kurzbezeichnung des gesuchten Fehlgrundes.                               |
| `genehmigungspflichtig` | `boolean`  | Nein    | Suche nach der Genehmigungspflicht einschränken.                             |
| `selbstErfassen`        | `boolean`  | Nein    | Suche nach der Möglichkeit der Erfassung durch den Mitarbeiter einschränken. |

### ReadFehlzeitRequestType

Die Parameter zur Abfrage von Fehlzeiten.

#### Felder

| Feld                         | Typ                              | Pflicht | Beschreibung                                |
| ---------------------------- | -------------------------------- | ------- | ------------------------------------------- |
| `requestHeader`              | `RequestHeaderType`              | Nein    | Der allgemeine ZEP Request-Header.          |
| `readFehlzeitSearchCriteria` | `ReadFehlzeitSearchCriteriaType` | Ja      | Die Suchkriterien zur Suche nach Fehlzeiten |

### ReadFehlzeitResponseType

Die Antwort der Abfrage von Fehlgzeiten.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                         |
| ---------------- | -------------------- | ------- | ------------------------------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header.  |
| `fehlzeitListe`  | `FehlzeitListeType`  | Ja      | Die Liste der gefundenen Fehlzeiten. |

### ReadFehlzeitSearchCriteriaType

Die Suchkriterien zur Abfrage von Fehlzeiten.

#### Felder

| Feld                    | Typ           | Pflicht | Beschreibung                                                                        |
| ----------------------- | ------------- | ------- | ----------------------------------------------------------------------------------- |
| `userId`                | `string`      | Ja      | Der Benutzer, dessen Fehlzeiten abgefragt werden sollen.                            |
| `startdatum`            | `IsoDate`     | Nein    | Das (Anfangs-)Datum, an dem die Fehlzeiten liegen sollen.                           |
| `enddatum`              | `IsoDate`     | Nein    | Das (Ende-)Datum, vor dem die Fehlzeiten liegen sollen.                             |
| `fehlgrund`             | `String32`    | Nein    | Der Fehlgrund, zu dem Fehlzeiten abgefragt werden sollen.                           |
| `vonZeit`               | `IsoTime`     | Nein    |                                                                                     |
| `bisZeit`               | `IsoTime`     | Nein    |                                                                                     |
| `genehmigungspflichtig` | `boolean`     | Nein    | Einschränkung nch der Genehmigung der abgefragten Fehlzeiten - false oder 0 = nu... |
| `modifiedSince`         | `IsoDateTime` | Nein    |                                                                                     |
| `genehmigt`             | `boolean`     | Nein    |                                                                                     |
| `beantragt`             | `boolean`     | Nein    |                                                                                     |
| `id`                    | `int`         | Nein    |                                                                                     |

### ReadFeiertagAusnahmeRequestType

#### Felder

| Feld                                 | Typ                                      | Pflicht | Beschreibung |
| ------------------------------------ | ---------------------------------------- | ------- | ------------ |
| `requestHeader`                      | `RequestHeaderType`                      | Nein    |              |
| `readFeiertagAusnahmeSearchCriteria` | `ReadFeiertagAusnahmeSearchCriteriaType` | Nein    |              |

### ReadFeiertagAusnahmeResponseType

#### Felder

| Feld                    | Typ                         | Pflicht | Beschreibung |
| ----------------------- | --------------------------- | ------- | ------------ |
| `responseHeader`        | `ResponseHeaderType`        | Nein    |              |
| `feiertagAusnahmeListe` | `FeiertagAusnahmeListeType` | Nein    |              |

### ReadFeiertagAusnahmeSearchCriteriaType

#### Felder

| Feld     | Typ         | Pflicht | Beschreibung |
| -------- | ----------- | ------- | ------------ |
| `datum`  | `IsoDate`   | Nein    |              |
| `userId` | `String32`  | Nein    |              |
| `name`   | `String128` | Nein    |              |

### ReadFeiertagskalenderRequestType

#### Felder

| Feld                                  | Typ                                       | Pflicht | Beschreibung |
| ------------------------------------- | ----------------------------------------- | ------- | ------------ |
| `requestHeader`                       | `RequestHeaderType`                       | Nein    |              |
| `readFeiertagskalenderSearchCriteria` | `ReadFeiertagskalenderSearchCriteriaType` | Nein    |              |

### ReadFeiertagskalenderResponseType

#### Felder

| Feld                     | Typ                          | Pflicht | Beschreibung |
| ------------------------ | ---------------------------- | ------- | ------------ |
| `responseHeader`         | `ResponseHeaderType`         | Nein    |              |
| `feiertagskalenderListe` | `FeiertagskalenderListeType` | Nein    |              |

### ReadFeiertagskalenderSearchCriteriaType

#### Felder

| Feld     | Typ        | Pflicht | Beschreibung |
| -------- | ---------- | ------- | ------------ |
| `name`   | `String64` | Nein    |              |
| `land`   | `String64` | Nein    |              |
| `region` | `String64` | Nein    |              |
| `jahr`   | `int`      | Nein    |              |

### ReadGeraetRequestType

#### Felder

| Feld                       | Typ                            | Pflicht | Beschreibung |
| -------------------------- | ------------------------------ | ------- | ------------ |
| `requestHeader`            | `RequestHeaderType`            | Nein    |              |
| `readGeraetSearchCriteria` | `ReadGeraetSearchCriteriaType` | Nein    |              |

### ReadGeraetResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |
| `geraetListe`    | `GeraetListeType`    | Nein    |              |

### ReadGeraetSearchCriteriaType

Mögliche Eingaben sind: App oder Terminal oder Leer

#### Felder

| Feld          | Typ      | Pflicht | Beschreibung                                                                        |
| ------------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `typ`         | `string` | Ja      | Mögliche Eingaben sind: App oder Terminal oder Leer                                 |
| `status`      | `string` | Ja      |                                                                                     |
| `suchbegriff` | `string` | Ja      | Durch den in das Suchfeld eingebebenen Text wird die Ergebnistabelle nach: Useri... |

### ReadKostenDatevRequestType

Die Parameter zum Lesen des Kostenexports im DATEV Format.

#### Felder

| Feld                       | Typ                            | Pflicht | Beschreibung                                                    |
| -------------------------- | ------------------------------ | ------- | --------------------------------------------------------------- |
| `requestHeader`            | `RequestHeaderType`            | Nein    | Der allgemeine ZEP Request-Header.                              |
| `readKostenSearchCriteria` | `ReadKostenSearchCriteriaType` | Nein    | Die Suchkriterien für die Suche nach Buchungen im DATEV Format. |

### ReadKostenDatevResponseType

Die Antwort bei der Abfrage des Kostenexports im DATEV Format.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                                           |
| ---------------- | -------------------- | ------- | ------------------------------------------------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header.                    |
| `datevListe`     | `DatevListeType`     | Nein    | Die Liste mit den gelesenen Buchungen im DATEV-Format. |

### ReadKostenDatevXmlRequestType

#### Felder

| Feld                               | Typ                                    | Pflicht | Beschreibung |
| ---------------------------------- | -------------------------------------- | ------- | ------------ |
| `requestHeader`                    | `RequestHeaderType`                    | Nein    |              |
| `readKostenDatevXmlSearchCriteria` | `ReadKostenDatevXmlSearchCriteriaType` | Nein    |              |

### ReadKostenDatevXmlResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Nein    |              |
| `anhang`         | `AnhangType`         | Nein    |              |

### ReadKostenGenericRequestType

Die Parameter zum Lesen des Kostenexports im generischen Format.

#### Felder

| Feld                       | Typ                            | Pflicht | Beschreibung                                                          |
| -------------------------- | ------------------------------ | ------- | --------------------------------------------------------------------- |
| `requestHeader`            | `RequestHeaderType`            | Nein    | Der allgemeine ZEP Request-Header.                                    |
| `readKostenSearchCriteria` | `ReadKostenSearchCriteriaType` | Nein    | Die Suchkriterien für die Suche nach Buchungen im generischen Format. |

### ReadKostenGenericResponseType

Die Antwort bei der Abfrage des Kostenexports im generischen Format.

#### Felder

| Feld                      | Typ                           | Pflicht | Beschreibung                                                 |
| ------------------------- | ----------------------------- | ------- | ------------------------------------------------------------ |
| `responseHeader`          | `ResponseHeaderType`          | Ja      | Der allgemeine ZEP Response-Header.                          |
| `buchhaltungGenericListe` | `BuchhaltungGenericListeType` | Nein    | Die Liste mit den gelesenen Buchungen im generischen Format. |

### ReadKostenLexwareRequestType

Die Parameter zum Lesen des Kostenexports im Lexware Format.

#### Felder

| Feld                       | Typ                            | Pflicht | Beschreibung                                                      |
| -------------------------- | ------------------------------ | ------- | ----------------------------------------------------------------- |
| `requestHeader`            | `RequestHeaderType`            | Nein    | Der allgemeine ZEP Request-Header.                                |
| `readKostenSearchCriteria` | `ReadKostenSearchCriteriaType` | Nein    | Die Suchkriterien für die Suche nach Buchungen im Lexware Format. |

### ReadKostenLexwareResponseType

Die Antwort bei der Abfrage des Kostenexports im Lexware Format.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                                             |
| ---------------- | -------------------- | ------- | -------------------------------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header.                      |
| `lexwareListe`   | `LexwareListeType`   | Nein    | Die Liste mit den gelesenen Buchungen im Lexware Format. |

### ReadKostenSearchCriteriaType

Die Suchkriterien für die Abfrage des Kostenexports.

#### Felder

| Feld                      | Typ              | Pflicht | Beschreibung                                                                     |
| ------------------------- | ---------------- | ------- | -------------------------------------------------------------------------------- |
| `von`                     | `IsoDate`        | Nein    | Der Anfang des Zeitraums, in dem die zu lesenden Buchungsdaten liegen.           |
| `bis`                     | `IsoDate`        | Nein    | Das Ende des Zeitraums, in dem die zu lesenden Buchungsdaten liegen.             |
| `abteilung`               | `String64`       | Nein    | Die Abteilung, zu der die gelesenen Buchungsdaten gehören.                       |
| `inklusiveUnterabteilung` | `boolean`        | Nein    | Flagge, ob auch die Buchungsdaten von Unter-Abteilungen geliefert werden sollen. |
| `userId`                  | `String32`       | Nein    | Die Id des Benutzers, zu dem die Buchungsdaten geliefert werden sollen.          |
| `inklBereitsExportierter` | `boolean`        | Nein    |                                                                                  |
| `alsExportiertMarkieren`  | `boolean`        | Nein    |                                                                                  |
| `attributes`              | `AttributesType` | Nein    | Attribute für kundenspezifische Erweiterungen.                                   |

### ReadMahlzeitRequestType

Die Paramater zum Lesen von Mahlzeiten.

#### Felder

| Feld                         | Typ                              | Pflicht | Beschreibung                       |
| ---------------------------- | -------------------------------- | ------- | ---------------------------------- |
| `requestHeader`              | `RequestHeaderType`              | Nein    | Der allgemeine ZEP Request-Header. |
| `readMahlzeitSearchCriteria` | `ReadMahlzeitSearchCriteriaType` | Ja      |                                    |

### ReadMahlzeitResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |
| `mahlzeitListe`  | `MahlzeitListeType`  | Nein    |                                     |

### ReadMahlzeitSearchCriteriaType

Die Suchkriterien zum Lesen von Mahlzeiten.

#### Felder

| Feld       | Typ        | Pflicht | Beschreibung                                                                        |
| ---------- | ---------- | ------- | ----------------------------------------------------------------------------------- |
| `id`       | `int`      | Nein    |                                                                                     |
| `userId`   | `String32` | Nein    |                                                                                     |
| `datum`    | `IsoDate`  | Nein    | Hat datum Wert und bisDatum überhaupt nicht vorhanden dann bisDatum = datum. Hat... |
| `bisDatum` | `IsoDate`  | Nein    | Ist bisDatum vorhanden und leer dann gilt als unendlich. Ist bisDatum nicht vorh... |

### ReadOrtslisteRequestType

Der allgemeine ZEP Request-Header.

#### Felder

| Feld                          | Typ                               | Pflicht | Beschreibung                       |
| ----------------------------- | --------------------------------- | ------- | ---------------------------------- |
| `requestHeader`               | `RequestHeaderType`               | Nein    | Der allgemeine ZEP Request-Header. |
| `readOrtslisteSearchCriteria` | `ReadOrtslisteSearchCriteriaType` | Nein    |                                    |

### ReadOrtslisteResponseType

Der allgemeine ZEP Response-Header.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Nein    | Der allgemeine ZEP Response-Header. |
| `ortslisteListe` | `OrtslisteListeType` | Nein    |                                     |

### ReadOrtslisteSearchCriteriaType

liefert Ortsliste, welche an diesem Datum gueltig ist

#### Felder

| Feld    | Typ       | Pflicht | Beschreibung                                          |
| ------- | --------- | ------- | ----------------------------------------------------- |
| `datum` | `IsoDate` | Nein    | liefert Ortsliste, welche an diesem Datum gueltig ist |

### ReadPreisgruppeRequestType

#### Felder

| Feld                            | Typ                                 | Pflicht | Beschreibung |
| ------------------------------- | ----------------------------------- | ------- | ------------ |
| `requestHeader`                 | `RequestHeaderType`                 | Nein    |              |
| `readPreisgruppeSearchCriteria` | `ReadPreisgruppeSearchCriteriaType` | Nein    |              |

### ReadPreisgruppeResponseType

#### Felder

| Feld               | Typ                    | Pflicht | Beschreibung |
| ------------------ | ---------------------- | ------- | ------------ |
| `responseHeader`   | `ResponseHeaderType`   | Ja      |              |
| `preisgruppeListe` | `PreisgruppeListeType` | Nein    |              |

### ReadPreisgruppeSearchCriteriaType

#### Felder

| Feld       | Typ       | Pflicht | Beschreibung |
| ---------- | --------- | ------- | ------------ |
| `kurzform` | `string`  | Nein    |              |
| `inaktiv`  | `boolean` | Nein    |              |

### ReadRfidChipsRequestType

Der Request-Type zur Abfrage von RFID-Chips.

#### Felder

| Feld                          | Typ                               | Pflicht | Beschreibung                                        |
| ----------------------------- | --------------------------------- | ------- | --------------------------------------------------- |
| `requestHeader`               | `RequestHeaderType`               | Nein    |                                                     |
| `readRfidChipsSearchCriteria` | `ReadRfidChipsSearchCriteriaType` | Nein    | Die Kriterien zur Suche der zu lesenden RFID-Chips. |

### ReadRfidChipsResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                         |
| ---------------- | -------------------- | ------- | ------------------------------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |                                      |
| `rfidChipListe`  | `RfidChipListeType`  | Nein    | Die Liste der gefundenen RFID-Chips. |

### ReadRfidChipsSearchCriteriaType

Die Kriterien zur Suche von RFID-Chips.

#### Felder

| Feld     | Typ        | Pflicht | Beschreibung                             |
| -------- | ---------- | ------- | ---------------------------------------- |
| `rfid`   | `String32` | Nein    | Die RFID-Kennung des Chips.              |
| `userId` | `String32` | Nein    | Der User, dessen RFID-Chip gelesen wird. |

### ReadSchlagworteRequestType

Der Request zum Lesen von Schlagworten.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                                                                        |
| --------------- | ------------------- | ------- | ----------------------------------------------------------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header.                                                  |
| `schlagwortArt` | `string`            | Ja      | 'ticket' => Stammdaten-Schlagworte des Ticket-System, 'projekt' => Stammdaten-Sc... |

### ReadSchlagworteResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld               | Typ                    | Pflicht | Beschreibung                          |
| ------------------ | ---------------------- | ------- | ------------------------------------- |
| `responseHeader`   | `ResponseHeaderType`   | Ja      | Der allgemeine ZEP Response-Header.   |
| `schlagworteListe` | `SchlagworteListeType` | Nein    | Die Liste der gefundenen Schlagworte. |

### ReadSteuersatzRequestType

Die Parameter zur Abfrage von Steuersätzen.

#### Felder

| Feld                           | Typ                                | Pflicht | Beschreibung                                   |
| ------------------------------ | ---------------------------------- | ------- | ---------------------------------------------- |
| `requestHeader`                | `RequestHeaderType`                | Nein    | Der allgemeine ZEP Request-Header.             |
| `readSteuersatzSearchCriteria` | `ReadSteuersatzSearchCriteriaType` | Ja      | Die Suchkriterien zur Suche nach Steuersätzen. |

### ReadSteuersatzResponseType

Die Antwort der Abfrage von Steuersätzen.

#### Felder

| Feld              | Typ                   | Pflicht | Beschreibung                         |
| ----------------- | --------------------- | ------- | ------------------------------------ |
| `responseHeader`  | `ResponseHeaderType`  | Ja      | Der allgemeine ZEP Response-Header.  |
| `steuersatzListe` | `SteuersatzListeType` | Ja      | Die Liste der gelesenen Steuersätze. |

### ReadSteuersatzSearchCriteriaType

Die Suchkriterien zur Abfrage von Steuersätzen.

#### Felder

| Feld         | Typ              | Pflicht | Beschreibung                                   |
| ------------ | ---------------- | ------- | ---------------------------------------------- |
| `steuersatz` | `Decimal6_4`     | Nein    | Der gesuchte Steuersatz.                       |
| `attributes` | `AttributesType` | Nein    | Attribute für kundenspezifische Erweiterungen. |

### ReadTagessatzanteileRequestType

Die Request-Struktur zum Lesen von Tagessatzanteilen.

#### Felder

| Feld                                 | Typ                                      | Pflicht | Beschreibung                                    |
| ------------------------------------ | ---------------------------------------- | ------- | ----------------------------------------------- |
| `requestHeader`                      | `RequestHeaderType`                      | Nein    | Der allgemeine ZEP Request-Header.              |
| `readTagessatzanteileSearchCriteria` | `ReadTagessatzanteileSearchCriteriaType` | Ja      | Die Kriterien zur Suche nach Tagessatzanteilen. |

### ReadTagessatzanteileResponseType

Die Antwort mit den gelesenen Tagessatzanteilen.

#### Felder

| Feld                   | Typ                        | Pflicht | Beschreibung                              |
| ---------------------- | -------------------------- | ------- | ----------------------------------------- |
| `responseHeader`       | `ResponseHeaderType`       | Ja      | Der allgemeine ZEP Response-Header.       |
| `tagessatzanteilListe` | `TagessatzanteilListeType` | Nein    | Die Liste der gelesenen Tagessatzanteile. |

### ReadTagessatzanteileSearchCriteriaType

Die Suchkriterien zum Lesen von Tagessatzanteilen.

#### Felder

| Feld     | Typ          | Pflicht | Beschreibung                                                                        |
| -------- | ------------ | ------- | ----------------------------------------------------------------------------------- |
| `id`     | `int`        | Nein    |                                                                                     |
| `vonStd` | `Decimal6_4` | Nein    | Die untere Grenze des Intervalls, zu der Tagessatzanteile geliefert werden solle... |
| `bisStd` | `Decimal6_4` | Nein    | Die obere Grenze des Intervalls, zu der Tagessatzanteile geliefert werden sollen... |

### ReadTeilaufgabeHistoryRequestType

Der allgemeine ZEP Request-Header.

#### Felder

| Feld                                   | Typ                                        | Pflicht | Beschreibung                                          |
| -------------------------------------- | ------------------------------------------ | ------- | ----------------------------------------------------- |
| `requestHeader`                        | `RequestHeaderType`                        | Nein    | Der allgemeine ZEP Request-Header.                    |
| `readTeilaufgabeHistorySearchCriteria` | `ReadTeilaufgabeHistorySearchCriteriaType` | Ja      | Die Suchkriterien für die Ermittlung der Teilaufgabe. |

### ReadTeilaufgabeHistoryResponseType

Der Antwort-Typ der Teilaufgaben-Historien-Abfrage.

#### Felder

| Feld             | Typ                           | Pflicht | Beschreibung                        |
| ---------------- | ----------------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType`          | Ja      | Der allgemeine ZEP Response-Header. |
| `historyListe`   | `TeilaufgabeHistoryListeType` | Ja      | Die gelesenen Historien-Einträge.   |

### ReadTeilaufgabeRequestType

Die Parameter zum Lesen von Teilaufgaben.

#### Felder

| Feld                            | Typ                                 | Pflicht | Beschreibung                                  |
| ------------------------------- | ----------------------------------- | ------- | --------------------------------------------- |
| `requestHeader`                 | `RequestHeaderType`                 | Nein    | Der allgemeine ZEP Request-Header.            |
| `readTeilaufgabeSearchCriteria` | `ReadTeilaufgabeSearchCriteriaType` | Ja      | Die Suchkriterien zum Lesen von Teilaufgaben. |

### ReadTeilaufgabeResponseType

Das Antwort-Objekt beim Lesen von Teilaufgaben.

#### Felder

| Feld               | Typ                    | Pflicht | Beschreibung                        |
| ------------------ | ---------------------- | ------- | ----------------------------------- |
| `responseHeader`   | `ResponseHeaderType`   | Ja      | Der allgemeine ZEP Response-Header. |
| `teilaufgabeListe` | `TeilaufgabeListeType` | Ja      | Die Liste mit Teilaufgaben.         |

### ReadTerminRequestType

#### Felder

| Feld                       | Typ                            | Pflicht | Beschreibung |
| -------------------------- | ------------------------------ | ------- | ------------ |
| `requestHeader`            | `RequestHeaderType`            | Nein    |              |
| `readTerminSearchCriteria` | `ReadTerminSearchCriteriaType` | Nein    |              |

### ReadTerminResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Nein    |              |
| `terminListe`    | `TerminListeType`    | Nein    |              |

### ReadTerminSearchCriteriaType

#### Felder

| Feld     | Typ        | Pflicht | Beschreibung |
| -------- | ---------- | ------- | ------------ |
| `userId` | `String32` | Nein    |              |
| `von`    | `IsoDate`  | Nein    |              |
| `bis`    | `IsoDate`  | Nein    |              |

### ReadWechselkursRequestType

Die Parameter zum Lesen von Wechselkursen.

#### Felder

| Feld                            | Typ                                 | Pflicht | Beschreibung                                    |
| ------------------------------- | ----------------------------------- | ------- | ----------------------------------------------- |
| `requestHeader`                 | `RequestHeaderType`                 | Nein    | Der allgemeine ZEP Request-Header.              |
| `readWechselkursSearchCriteria` | `ReadWechselkursSearchCriteriaType` | Ja      | Die Suchkriterien zur Suche nach Wechselkursen. |

### ReadWechselkursResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld               | Typ                    | Pflicht | Beschreibung                          |
| ------------------ | ---------------------- | ------- | ------------------------------------- |
| `responseHeader`   | `ResponseHeaderType`   | Ja      | Der allgemeine ZEP Response-Header.   |
| `wechselkursListe` | `WechselkursListeType` | Ja      | Die Liste der gelesenen Wechselkurse. |

### ReadWechselkursSearchCriteriaType

Die Suchkriterien zur Abfrage von Wechselkursen. P.S. Basis-Währung wird immer geliefert (zu erkennen durch das Element basis = true).

#### Felder

| Feld         | Typ              | Pflicht | Beschreibung                                                            |
| ------------ | ---------------- | ------- | ----------------------------------------------------------------------- |
| `waehrung`   | `String32`       | Nein    | Die Bezeichnung der zu liefernden Wechselkurses.                        |
| `bisdatum`   | `IsoDate`        | Nein    | End-Zeitraum der Suche (verglichen mit gültig_bis_datum der Währung)    |
| `vondatum`   | `IsoDate`        | Nein    | Anfang-Zeitraum der Suche (verglichen mit gültig_bis_datum der Währung) |
| `attributes` | `AttributesType` | Nein    | Attribute für kundenspezifische Erweiterungen.                          |

### ReadZahlungsartRequestType

Der allgemeine ZEP Request-Header.

#### Felder

| Feld                            | Typ                                 | Pflicht | Beschreibung                                    |
| ------------------------------- | ----------------------------------- | ------- | ----------------------------------------------- |
| `requestHeader`                 | `RequestHeaderType`                 | Nein    | Der allgemeine ZEP Request-Header.              |
| `readZahlungsartSearchCriteria` | `ReadZahlungsartSearchCriteriaType` | Ja      | Die Suchkriterien zur Suche nach Zahlungsarten. |

### ReadZahlungsartResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld               | Typ                    | Pflicht | Beschreibung                           |
| ------------------ | ---------------------- | ------- | -------------------------------------- |
| `responseHeader`   | `ResponseHeaderType`   | Ja      | Der allgemeine ZEP Response-Header.    |
| `zahlungsartListe` | `ZahlungsartListeType` | Ja      | Die Liste der gelesenen Zahlungsarten. |

### ReadZahlungsartSearchCriteriaType

Die Suchkriterien zur Abfrage von Zahlungsarten.

#### Felder

| Feld         | Typ              | Pflicht | Beschreibung                                                            |
| ------------ | ---------------- | ------- | ----------------------------------------------------------------------- |
| `kurzform`   | `String32`       | Nein    | Die Kurzbezeichnung der gesuchten Zahlungsart (z.B. 'Firma', 'privat'). |
| `attributes` | `AttributesType` | Nein    | Attribute für kundenspezifische Erweiterungen.                          |

### ReadZahlungsdokumentationRequestType

#### Felder

| Feld                                      | Typ                                           | Pflicht | Beschreibung |
| ----------------------------------------- | --------------------------------------------- | ------- | ------------ |
| `requestHeader`                           | `RequestHeaderType`                           | Nein    |              |
| `readZahlungsdokumentationSearchCriteria` | `ReadZahlungsdokumentationSearchCriteriaType` | Nein    |              |

### ReadZahlungsdokumentationResponseType

#### Felder

| Feld                         | Typ                              | Pflicht | Beschreibung |
| ---------------------------- | -------------------------------- | ------- | ------------ |
| `responseHeader`             | `ResponseHeaderType`             | Nein    |              |
| `zahlungsdokumentationListe` | `ZahlungsdokumentationListeType` | Nein    |              |

### ReadZahlungsdokumentationSearchCriteriaType

#### Felder

| Feld              | Typ           | Pflicht | Beschreibung |
| ----------------- | ------------- | ------- | ------------ |
| `id`              | `int`         | Nein    |              |
| `zahlungseingang` | `IsoDate`     | Nein    |              |
| `rechnungsnummer` | `String32`    | Nein    |              |
| `modifiedSince`   | `IsoDateTime` | Nein    |              |

### ReadZahlungseingangRequestType

#### Felder

| Feld                                | Typ                                     | Pflicht | Beschreibung |
| ----------------------------------- | --------------------------------------- | ------- | ------------ |
| `requestHeader`                     | `RequestHeaderType`                     | Nein    |              |
| `readZahlungseingangSearchCriteria` | `ReadZahlungseingangSearchCriteriaType` | Nein    |              |

### ReadZahlungseingangResponseType

#### Felder

| Feld                   | Typ                        | Pflicht | Beschreibung |
| ---------------------- | -------------------------- | ------- | ------------ |
| `responseHeader`       | `ResponseHeaderType`       | Nein    |              |
| `zahlungseingangListe` | `ZahlungseingangListeType` | Nein    |              |

### ReadZahlungseingangSearchCriteriaType

Default = true

#### Felder

| Feld                           | Typ                  | Pflicht | Beschreibung   |
| ------------------------------ | -------------------- | ------- | -------------- |
| `projektNrListe`               | `ProjektNrListeType` | Nein    |                |
| `projektsabteilung`            | `String32`           | Nein    |                |
| `inklProjektsunterabteilungen` | `boolean`            | Nein    |                |
| `von`                          | `IsoDate`            | Nein    |                |
| `bis`                          | `IsoDate`            | Nein    |                |
| `waehrung`                     | `String32`           | Nein    |                |
| `inBasiswaehrungUmrechnen`     | `boolean`            | Nein    | Default = true |
| `kundenNr`                     | `String32`           | Nein    |                |
| `kundenabteilung`              | `String32`           | Nein    |                |
| `inklKundenunterabteilungen`   | `boolean`            | Nein    |                |

### RegelarbeitszeitListeType

Eine Liste von Regelarbeitszeit-Definitionen.

#### Felder

| Feld               | Typ                    | Pflicht | Beschreibung                                                |
| ------------------ | ---------------------- | ------- | ----------------------------------------------------------- |
| `regelarbeitszeit` | `RegelarbeitszeitType` | Nein    | Die in der Liste enthaltenen Regelarbeitszeit-Definitionen. |

### RegelarbeitszeitType

Dies eingeben nur wenn Regelarbeitszeiten von Standard-Arbeitszeiten in der Einstellungen abweichen soll, diese wird per default angelegt.

#### Felder

| Feld                    | Typ                     | Pflicht | Beschreibung                                                                        |
| ----------------------- | ----------------------- | ------- | ----------------------------------------------------------------------------------- |
| `id`                    | `int`                   | Nein    | Die Id des Regelarbeitszeit-Objektes.                                               |
| `userId`                | `String32`              | Nein    | Die Userid des Benutzers, dem diese Regelarbeitszeit zugeordnet ist.                |
| `startdatum`            | `IsoDate`               | Nein    | Das Datum, ab dem die Regelarbeitszeit gilt. Leer oder nicht angegeben = Beschae... |
| `montag`                | `Decimal12_6`           | Nein    | - Die Regelarbeitszeit am Montag: Wenn gleich -1 oder leer dann ist kein Arbeits... |
| `dienstag`              | `Decimal12_6`           | Nein    | - Die Regelarbeitszeit am Dienstag: Wenn gleich -1 oder leer dann ist kein Arbei... |
| `mittwoch`              | `Decimal12_6`           | Nein    | - Die Regelarbeitszeit am Mittwoch: Wenn gleich -1 oder leer dann ist kein Arbei... |
| `donnerstag`            | `Decimal12_6`           | Nein    | - Die Regelarbeitszeit am Donnerstag: Wenn gleich -1 oder leer dann ist kein Arb... |
| `freitag`               | `Decimal12_6`           | Nein    | - Die Regelarbeitszeit am Freitag: Wenn gleich -1 oder leer dann ist kein Arbeit... |
| `samstag`               | `Decimal12_6`           | Nein    | - Die Regelarbeitszeit am Samstag: Wenn größer oder gleich 0 dann ist Arbeitstag... |
| `sonntag`               | `Decimal12_6`           | Nein    | - Die Regelarbeitszeit am Sonntag: Wenn größer oder gleich 0 dann ist Arbeitstag... |
| `maximumStundenImMonat` | `Decimal13_10`          | Nein    | Die Stundenobergrenze im Monat.                                                     |
| `maximumStundenInWoche` | `Decimal13_10`          | Nein    |                                                                                     |
| `monatlich`             | `boolean`               | Nein    | Achtung: Bitte die Hilfe in ZEP-Frontend lesen bevor hier ein TRUE setzen. Defau... |
| `monatlicheStunden`     | `Decimal13_10`          | Nein    | wird wahr genommen nur wenn monatlich gleich true ist                               |
| `feiertagskalender`     | `FeiertagskalenderType` | Nein    |                                                                                     |
| `pausenregelung`        | `PausenregelungType`    | Nein    |                                                                                     |
| `action`                | `string`                | Nein    | Die auf dem Regelarbeitszeit-Objekt auszuführende Aktion.                           |

### ReiseeinstellungenType

0=nicht abrechnen, 1=nur für fakturierbare Arbeitszeiten, 2=für alle Arbeitszeiten

#### Felder

| Feld                                 | Typ           | Pflicht | Beschreibung                                                                        |
| ------------------------------------ | ------------- | ------- | ----------------------------------------------------------------------------------- |
| `kilometergeld`                      | `int0_2`      | Nein    | 0=nicht abrechnen, 1=nur für fakturierbare Arbeitszeiten, 2=für alle Arbeitszeit... |
| `spezielleKilometerpauschale`        | `Decimal8_4`  | Nein    | leer = keine spezielle Kilometerpauschale. Ansonsten jeder Wert zählt als spezie... |
| `anreisepauschale`                   | `int0_2`      | Nein    | leer oder 0 = keine Anreisepauschale , 1=je Mitarbeiter und Tag , 2= je Mitarbei... |
| `anreisepauschaleWert`               | `Decimal10_2` | Nein    |                                                                                     |
| `anreisepauschaleAuchFuerNichtFakt`  | `boolean`     | Nein    |                                                                                     |
| `verpflegungsmehraufwendungen`       | `int0_2`      | Nein    | 0=nicht abrechnen, 1= nur für fakturierbare Arbeitszeiten, 2 = für alle Arbeitsz... |
| `tagespauschalAb8Stunden`            | `Decimal10_2` | Nein    |                                                                                     |
| `tagespauschalAb14Stunden`           | `Decimal10_2` | Nein    |                                                                                     |
| `tagespauschalAb24Stunden`           | `Decimal10_2` | Nein    |                                                                                     |
| `prozentualabzugBeiFruehstueck`      | `Decimal10_2` | Nein    |                                                                                     |
| `prozentualabzugMittagBzwAbendEssen` | `Decimal10_2` | Nein    |                                                                                     |

### RequestHeaderType

Der allgemeine ZEP Request-Header. Muss in Request-Header oder Request-Body vorkommen, wenn die Authentifizierung-Method in Administration > Einstellungen via Token ausgewählt.

#### Felder

| Feld                 | Typ      | Pflicht | Beschreibung                                                                        |
| -------------------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `authorizationToken` | `string` | Ja      | Das SOAP-Token zur Autorisierung des Requests, siehe ZEP: Administration - Einst... |

### ResponseHeaderType

Allgemeiner Antwort-Header, der in jeder Response mitgeliefert wird und Informationen zur Request-Ausführung enthält.

#### Felder

| Feld         | Typ      | Pflicht | Beschreibung                                                |
| ------------ | -------- | ------- | ----------------------------------------------------------- |
| `version`    | `string` | Ja      | Die Versionsnummer der SOAP Schnittstelle.                  |
| `returnCode` | `string` | Ja      | Der Fehlercode der Request-Ausführung. 0 falls kein Fehler. |
| `message`    | `string` | Nein    | Eine Fehlermeldung oder Information der Request-Ausführung. |

### RfidChipListeType

Die Liste der RFID-Chips.

#### Felder

| Feld       | Typ            | Pflicht | Beschreibung              |
| ---------- | -------------- | ------- | ------------------------- |
| `rfidChip` | `RfidChipType` | Nein    | Die Liste der RFID-Chips. |

#### Attribute

- `length` (int):

### RfidChipType

Die RFID-Kennung des Chips.

#### Felder

| Feld       | Typ           | Pflicht | Beschreibung                                |
| ---------- | ------------- | ------- | ------------------------------------------- |
| `rfid`     | `String32`    | Ja      | Die RFID-Kennung des Chips.                 |
| `userId`   | `String32`    | Nein    | Der User, dem der Chip zugeordnet ist/wird. |
| `created`  | `IsoDateTime` | Nein    |                                             |
| `modified` | `IsoDateTime` | Nein    |                                             |

### StatusListeType

Die Liste von Status.

#### Felder

| Feld     | Typ      | Pflicht | Beschreibung                                                                        |
| -------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `status` | `Int1_7` | Nein    | Der Status des Tickets (1=neu, 2=in Bearbeitung, 3=fertig, 4=abgelehnt, 5=abgeno... |

### SteuersatzListeType

Liste von Steuersätzen.

#### Felder

| Feld         | Typ              | Pflicht | Beschreibung     |
| ------------ | ---------------- | ------- | ---------------- |
| `steuersatz` | `SteuersatzType` | Nein    | Die Steuersätze. |

#### Attribute

- `length` (int): Die Anzahl der Steuersätze in der Liste.

### SteuersatzType

Die Daten eines Steuersatzes.

#### Felder

| Feld          | Typ              | Pflicht | Beschreibung                                   |
| ------------- | ---------------- | ------- | ---------------------------------------------- |
| `steuersatz`  | `Decimal6_4`     | Nein    | Der Steuersatz, z.B. '7', '19.00'              |
| `bezeichnung` | `String64`       | Nein    | Die Bezeichnung des Steuersatzes.              |
| `attributes`  | `AttributesType` | Nein    | Attribute für kundenspezifische Erweiterungen. |

### TaeglichType

Endet nach x Ereignisse.

#### Felder

| Feld                | Typ       | Pflicht | Beschreibung                                                                   |
| ------------------- | --------- | ------- | ------------------------------------------------------------------------------ |
| `endetNach`         | `int`     | Nein    | Endet nach x Ereignisse.                                                       |
| `bis`               | `IsoDate` | Nein    | Gilt bis diesem Datum. Entweder 'endetNach' oder 'bis' eingeben (nicht beide). |
| `alleBestimmteTage` | `int`     | Nein    |                                                                                |

### TagessatzanteilListeType

Liste von Tagessatzanteilen.

#### Felder

| Feld              | Typ                   | Pflicht | Beschreibung                                   |
| ----------------- | --------------------- | ------- | ---------------------------------------------- |
| `tagessatzanteil` | `TagessatzanteilType` | Nein    | Die in der Liste enthaltenen Tagessatzanteile. |

### TagessatzanteilType

Die Definition eines Tagessatzanteils.

#### Felder

| Feld         | Typ          | Pflicht | Beschreibung                              |
| ------------ | ------------ | ------- | ----------------------------------------- |
| `id`         | `int`        | Nein    | Die Id des Tagessatzanteils.              |
| `vonStd`     | `Decimal6_4` | Ja      | Das untere Grenze des Stunden-Intervalls. |
| `bisStd`     | `Decimal6_4` | Ja      | Das obere Grenze des Stunden-Intervalls.  |
| `satzanteil` | `Decimal2_8` | Ja      | Der Tagessatz-Anteil.                     |

### TerminListeType

#### Felder

| Feld     | Typ          | Pflicht | Beschreibung |
| -------- | ------------ | ------- | ------------ |
| `termin` | `TerminType` | Nein    |              |

#### Attribute

- `length` (int):

### TerminWiederholungType

1=täglich; 2=wochentags; 3=wöchentlich; 4=monatlich; 5=jährlich

#### Felder

| Feld           | Typ                | Pflicht | Beschreibung                                                    |
| -------------- | ------------------ | ------- | --------------------------------------------------------------- |
| `taeglich`     | `TaeglichType`     | Nein    | 1=täglich; 2=wochentags; 3=wöchentlich; 4=monatlich; 5=jährlich |
| `woechentlich` | `WoechentlichType` | Nein    |                                                                 |
| `monatlich`    | `MonatlichType`    | Nein    |                                                                 |
| `jaehrlich`    | `JaehrlichType`    | Nein    |                                                                 |

### UpdateAbgeglicheneZeitenRequestType

Die Parameter zur Aktualisierung abgeglichener Zeiten.

#### Felder

| Feld                 | Typ                      | Pflicht | Beschreibung                       |
| -------------------- | ------------------------ | ------- | ---------------------------------- |
| `requestHeader`      | `RequestHeaderType`      | Nein    | Der allgemeine ZEP Request-Header. |
| `abgeglicheneZeiten` | `AbgeglicheneZeitenType` | Ja      |                                    |

### UpdateAbgeglicheneZeitenResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### UpdateArtikelRequestType

Die Parameter zur Aktualisierung eines Artikels.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                       |
| --------------- | ------------------- | ------- | ---------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header. |
| `artikel`       | `ArtikelType`       | Ja      |                                    |

### UpdateArtikelResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### UpdateFehlzeitRequestType

Der Daten zur Aktualisierung einer Fehlzeit.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                       |
| --------------- | ------------------- | ------- | ---------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header. |
| `fehlzeit`      | `FehlzeitType`      | Ja      | Die zu aktualisierende Fehlzeit.   |

### UpdateFehlzeitResponseType

Der Antwort-Daten zur Aktualisierung einer Fehlzeit.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### UpdateGeraetRequestType

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Nein    |              |
| `geraet`        | `GeraetType`        | Nein    |              |

### UpdateGeraetResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |

### UpdateMahlzeitRequestType

Die Parameter zur Aktualisierung von Mahlzeiten.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                       |
| --------------- | ------------------- | ------- | ---------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header. |
| `mahlzeit`      | `MahlzeitType`      | Ja      |                                    |

### UpdateMahlzeitResponseType

Das Resultat der Request-Ausführung.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### UpdatePreisgruppeRequestType

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `requestHeader` | `RequestHeaderType` | Nein    |              |
| `preisgruppe`   | `PreisgruppeType`   | Ja      |              |

### UpdatePreisgruppeResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |

### UpdateRfidChipsRequestType

Der Request zur Aktualsiierung der RFID-Chip / User-Zuordnung.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                    |
| --------------- | ------------------- | ------- | ------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    |                                 |
| `rfidChip`      | `RfidChipType`      | Ja      | Die RFID-Chip / User Zuordnung. |

### UpdateRfidChipsResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Ja      |              |

### UpdateTeilaufgabeRequestType

Die Parameter zur Aktualisierung einer Teilaufgabe.

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung                                   |
| --------------- | ------------------- | ------- | ---------------------------------------------- |
| `requestHeader` | `RequestHeaderType` | Nein    | Der allgemeine ZEP Request-Header.             |
| `teilaufgabe`   | `TeilaufgabeType`   | Ja      | Die Daten der zu aktualisierenden Teilaufgabe. |

### UpdateTeilaufgabeResponseType

Das Antwort-Objekt der Aktualisierung einer Teilaufgabe.

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung                        |
| ---------------- | -------------------- | ------- | ----------------------------------- |
| `responseHeader` | `ResponseHeaderType` | Ja      | Der allgemeine ZEP Response-Header. |

### UpdateZahlungsdokumentationRequestType

#### Felder

| Feld                    | Typ                         | Pflicht | Beschreibung |
| ----------------------- | --------------------------- | ------- | ------------ |
| `requestHeader`         | `RequestHeaderType`         | Nein    |              |
| `zahlungsdokumentation` | `ZahlungsdokumentationType` | Ja      |              |

### UpdateZahlungsdokumentationResponseType

#### Felder

| Feld             | Typ                  | Pflicht | Beschreibung |
| ---------------- | -------------------- | ------- | ------------ |
| `responseHeader` | `ResponseHeaderType` | Nein    |              |

### UserIdListeType

Eine Liste von Benutzernamen.

#### Felder

| Feld     | Typ        | Pflicht | Beschreibung                    |
| -------- | ---------- | ------- | ------------------------------- |
| `userId` | `String32` | Nein    | Der Anmeldename eines Benutzers |

### WechselkursListeType

Liste von Wechselkursen.

#### Felder

| Feld          | Typ               | Pflicht | Beschreibung      |
| ------------- | ----------------- | ------- | ----------------- |
| `wechselkurs` | `WechselkursType` | Nein    | Die Wechselkurse. |

#### Attribute

- `length` (int): Die Anzahl der Wechselkurse in der Liste.

### WechselkursType

Die Daten eines Wechselkurses.

#### Felder

| Feld          | Typ              | Pflicht | Beschreibung                                                    |
| ------------- | ---------------- | ------- | --------------------------------------------------------------- |
| `waehrung`    | `String32`       | Nein    | Die Währung.                                                    |
| `kurs`        | `Decimal12_6`    | Nein    | Der Umrechnungskurs zur Umrechnung in die Basiswährung.         |
| `bisdatum`    | `IsoDate`        | Nein    | Das Datum, bis zu dem der Wechselkurs gilt.                     |
| `bezeichnung` | `String64`       | Nein    | Die Bezeichnung des Wechselkurses.                              |
| `basis`       | `boolean`        | Nein    | Flagge, ob es sich bei der Währung um die Basiswährung handelt. |
| `attributes`  | `AttributesType` | Nein    | Attribute für kundenspezifische Erweiterungen.                  |

### WoechentlichType

Endet nach x Ereignisse.

#### Felder

| Feld                  | Typ       | Pflicht | Beschreibung                                                                   |
| --------------------- | --------- | ------- | ------------------------------------------------------------------------------ |
| `endetNach`           | `int`     | Nein    | Endet nach x Ereignisse.                                                       |
| `bis`                 | `IsoDate` | Nein    | Gilt bis diesem Datum. Entweder 'endetNach' oder 'bis' eingeben (nicht beide). |
| `alleBestimmteWochen` | `int`     | Nein    |                                                                                |
| `wochentag`           | `Int1_7`  | Nein    | 1=Montag,..,7=Sonntag                                                          |

### ZahlungsartListeType

Eine Liste von Zahlungsarten.

#### Felder

| Feld          | Typ               | Pflicht | Beschreibung       |
| ------------- | ----------------- | ------- | ------------------ |
| `zahlungsart` | `ZahlungsartType` | Nein    | Die Zahlungsarten. |

#### Attribute

- `length` (int): Die Anzahl der Zahlungsarten in der Liste.

### ZahlungsartType

Die Daten einer Zahlungsart.

#### Felder

| Feld                      | Typ              | Pflicht | Beschreibung                                                                        |
| ------------------------- | ---------------- | ------- | ----------------------------------------------------------------------------------- |
| `kurzform`                | `String32`       | Nein    | Die Kurzform der Zahlungsart, z.B. 'Firma' , 'privat'                               |
| `bezeichnung`             | `String64`       | Nein    | Die Bezeichnung der Zahlungsart.                                                    |
| `erstattung`              | `boolean`        | Nein    | Flagge, ob die Zahlungsart eine Erstattung impliziert.                              |
| `buchhaltungsexportKonto` | `String32`       | Nein    | Das Konto für den Buchhaltungexport (bei Einsatz des Moduls 'Export für Buchhalt... |
| `attributes`              | `AttributesType` | Nein    | Attribute für kundenspezifische Erweiterungen.                                      |

### ZahlungsdokumentationListeType

Eine Liste von Zahlungsdokumentationen.

#### Felder

| Feld                    | Typ                         | Pflicht | Beschreibung                                          |
| ----------------------- | --------------------------- | ------- | ----------------------------------------------------- |
| `zahlungsdokumentation` | `ZahlungsdokumentationType` | Nein    | Die in der Liste enthaltenen Zahlungsdokumentationen. |

#### Attribute

- `length` (int):

### ZahlungsdokumentationType

#### Felder

| Feld              | Typ           | Pflicht | Beschreibung |
| ----------------- | ------------- | ------- | ------------ |
| `id`              | `int`         | Nein    |              |
| `rechnungsnummer` | `String32`    | Nein    |              |
| `zahlungseingang` | `IsoDate`     | Nein    |              |
| `betragBrutto`    | `Decimal10_2` | Nein    |              |
| `istMinderung`    | `boolean`     | Nein    |              |
| `bemerkung`       | `string`      | Nein    |              |
| `created`         | `IsoDateTime` | Nein    |              |
| `modified`        | `IsoDateTime` | Nein    |              |

### ZahlungseingangListeType

#### Felder

| Feld              | Typ                   | Pflicht | Beschreibung |
| ----------------- | --------------------- | ------- | ------------ |
| `zahlungseingang` | `ZahlungseingangType` | Nein    |              |

#### Attribute

- `length` (int):

### ZahlungseingangType

#### Felder

| Feld              | Typ        | Pflicht | Beschreibung |
| ----------------- | ---------- | ------- | ------------ |
| `rechnungNr`      | `String32` | Nein    |              |
| `projektNr`       | `String64` | Nein    |              |
| `kundenNr`        | `String32` | Nein    |              |
| `rechnungsdatum`  | `IsoDate`  | Nein    |              |
| `skontodatum`     | `IsoDate`  | Nein    |              |
| `zahlungsziel`    | `IsoDate`  | Nein    |              |
| `betragNetto`     | `float`    | Nein    |              |
| `betragBrutto`    | `float`    | Nein    |              |
| `zahlungseingang` | `IsoDate`  | Nein    |              |
| `zahlung`         | `float`    | Nein    |              |
| `minderung`       | `float`    | Nein    |              |
| `mwst`            | `float`    | Nein    |              |
| `bemerkung`       | `string`   | Nein    |              |

### ZusatzfelderType

Definition von Kunden- oder Projektzusatzfeldern und Rechnungstext.

#### Felder

| Feld                 | Typ         | Pflicht | Beschreibung                                                                        |
| -------------------- | ----------- | ------- | ----------------------------------------------------------------------------------- |
| `feld1`              | `String120` | Nein    | Die Bezeichnung des Zusatzfeldes.                                                   |
| `value1`             | `string`    | Nein    | Der Wert des Zusatzfeldes.                                                          |
| `feld2`              | `String120` | Nein    | Die Bezeichnung des Zusatzfeldes.                                                   |
| `value2`             | `string`    | Nein    | Der Wert des Zusatzfeldes.                                                          |
| `feld3`              | `String120` | Nein    | Die Bezeichnung des Zusatzfeldes.                                                   |
| `value3`             | `string`    | Nein    | Der Wert des Zusatzfeldes.                                                          |
| `feld4`              | `String120` | Nein    | Die Bezeichnung des Zusatzfeldes.                                                   |
| `value4`             | `string`    | Nein    | Der Wert des Zusatzfeldes.                                                          |
| `feld5`              | `String120` | Nein    | Die Bezeichnung des Zusatzfeldes.                                                   |
| `value5`             | `string`    | Nein    | Der Wert des Zusatzfeldes.                                                          |
| `rechnungstextOben`  | `string`    | Nein    | Der obere Rechnungstext.                                                            |
| `rechnungstextUnten` | `string`    | Nein    | Der untere Rechnungstext. Darf nur Kundenzusatzfelder gefuellt werden.              |
| `action`             | `string`    | Nein    | Aktion. Um die Zusatzfelder im Rahmen eines Updates zu löschen muss hier 'delete... |
