# Basis-Datentypen

Grundlegende Datentypen wie Strings, Zahlen und Datumsformate

---

## Operationen

### readKostenDatev

- **Request:** `readKostenDatevRequest`
- **Response:** `readKostenDatevResponse`

### readKostenDatevXml

- **Request:** `readKostenDatevXmlRequest`
- **Response:** `readKostenDatevXmlResponse`

### updateAbgeglicheneZeiten

- **Request:** `updateAbgeglicheneZeitenRequest`
- **Response:** `updateAbgeglicheneZeitenResponse`

### updateArtikel

- **Request:** `updateArtikelRequest`
- **Response:** `updateArtikelResponse`

### updateFehlzeit

- **Request:** `updateFehlzeitRequest`
- **Response:** `updateFehlzeitResponse`

### updateGeraet

- **Request:** `updateGeraetRequest`
- **Response:** `updateGeraetResponse`

### updateMahlzeit

- **Request:** `updateMahlzeitRequest`
- **Response:** `updateMahlzeitResponse`

### updatePreisgruppe

- **Request:** `updatePreisgruppeRequest`
- **Response:** `updatePreisgruppeResponse`

### updateRfidChips

- **Request:** `updateRfidChipsRequest`
- **Response:** `updateRfidChipsResponse`

### updateZahlungsdokumentation

- **Request:** `updateZahlungsdokumentationRequest`
- **Response:** `updateZahlungsdokumentationResponse`

## Komplexe Typen

### DatevListeType

Liste von Buchungsdaten im DATEV Format

#### Felder

| Feld    | Typ         | Pflicht | Beschreibung                   |
| ------- | ----------- | ------- | ------------------------------ |
| `datev` | `DatevType` | Nein    | Die Buchungen im DATEV-Format. |

#### Attribute

- `length` (int): Anzahl der Buchungen in der Liste.

### DatevType

Datensatz des Buchhaltungs-Exports im DATEV Format

#### Felder

| Feld                         | Typ              | Pflicht | Beschreibung                                                                        |
| ---------------------------- | ---------------- | ------- | ----------------------------------------------------------------------------------- |
| `umsatz`                     | `string`         | Nein    | Rechnungsbetrag der Rechnungsposition als absoluter Betrag (ggf. in Fremdwährung... |
| `soll_haben_kz`              | `string`         | Nein    | „S“ oder „H“                                                                        |
| `wkz_umsatz`                 | `string`         | Nein    | Währung des Umsatzes, 3-stelliges Währungskennzeichen (z. B. „EUR“)                 |
| `kurs`                       | `string`         | Nein    | Leer falls Umsatz in Basiswährung, sonst der Wechselkurs für die Umrechnung der ... |
| `basis_umsatz`               | `string`         | Nein    | Leer falls Umsatz in Basiswährung, sonst der in die Basiswährung umgerechnete Um... |
| `wkz_basis_umsatz`           | `string`         | Nein    | Leer falls Umsatz in Basiswährung, sonst Währungskennzeichen der Basiswährung.      |
| `konto`                      | `string`         | Nein    | Kundennummer.                                                                       |
| `gegenkonto`                 | `string`         | Nein    | Das in der Rechnungsposition eingestellte Erlöskonto                                |
| `steuerschluessel`           | `string`         | Nein    | leer.                                                                               |
| `belegdatum`                 | `string`         | Nein    | Rechnungsdatum im Format „TTMM“ (gem. DATEV-Spezifikation).                         |
| `belegfeld1`                 | `string`         | Nein    | Rechnungsnummer                                                                     |
| `belegfeld2`                 | `string`         | Nein    | leer                                                                                |
| `skonto`                     | `string`         | Nein    | leer                                                                                |
| `buchungstext`               | `string`         | Nein    | Kundenname                                                                          |
| `postensperre`               | `string`         | Nein    | leer                                                                                |
| `diverse_adressNr`           | `string`         | Nein    | leer                                                                                |
| `geschaeftspartnerbank`      | `string`         | Nein    | leer                                                                                |
| `sachverhalt`                | `string`         | Nein    | leer                                                                                |
| `zinssperre`                 | `string`         | Nein    | leer                                                                                |
| `beleglink`                  | `string`         | Nein    | leer                                                                                |
| `beleginfo_art1`             | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_inhalt1`          | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_art2`             | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_inhalt2`          | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_art3`             | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_inhalt3`          | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_art4`             | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_inhalt4`          | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_art5`             | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_inhalt5`          | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_art6`             | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_inhalt6`          | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_art7`             | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_inhalt7`          | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_art8`             | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `beleginfo_inhalt8`          | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `kost1`                      | `string`         | Nein    | Kostenstelle                                                                        |
| `kost2`                      | `string`         | Nein    | Kostenträger                                                                        |
| `kost_menge`                 | `string`         | Nein    | leer                                                                                |
| `euLand_UStID`               | `string`         | Nein    | UID des Kunden                                                                      |
| `eu_steuersatz`              | `string`         | Nein    | leer                                                                                |
| `abw_versteuerungsart`       | `string`         | Nein    | leer                                                                                |
| `sachverhalt_LL`             | `string`         | Nein    | leer                                                                                |
| `funktionsergaenzung_LL`     | `string`         | Nein    | leer                                                                                |
| `bu49_hauptfunktionstyp`     | `string`         | Nein    | leer                                                                                |
| `bu49_hauptfunktionsnummer`  | `string`         | Nein    | leer                                                                                |
| `bu49_funktionsergaenzung`   | `string`         | Nein    | leer                                                                                |
| `zusatzinformation_art1`     | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt1`  | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art2`     | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt2`  | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art3`     | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt3`  | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art4`     | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt4`  | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art5`     | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt5`  | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art6`     | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt6`  | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art7`     | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt7`  | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art8`     | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt8`  | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art9`     | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt9`  | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art10`    | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt10` | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art11`    | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt11` | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art12`    | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt12` | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art13`    | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt13` | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art14`    | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt14` | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art15`    | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt15` | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art16`    | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt16` | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art17`    | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt17` | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art18`    | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt18` | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art19`    | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt19` | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_art20`    | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `zusatzinformation_inhalt20` | `string`         | Nein    | ggf. gesetzt gem. kundenspezifischer Anforderung, sonst leer.                       |
| `stueck`                     | `string`         | Nein    | leer                                                                                |
| `gewicht`                    | `string`         | Nein    | leer                                                                                |
| `zahlweise`                  | `string`         | Nein    | leer                                                                                |
| `forderungsart`              | `string`         | Nein    | leer                                                                                |
| `veranlagungsjahr`           | `string`         | Nein    | leer                                                                                |
| `zugeordnete_faelligkeit`    | `string`         | Nein    | leer                                                                                |
| `attributes`                 | `AttributesType` | Nein    | Für kundenspezifische Erweiterungen.                                                |

### InternersatzListeType

Liste von internen Sätzen.

#### Felder

| Feld           | Typ                | Pflicht | Beschreibung                                |
| -------------- | ------------------ | ------- | ------------------------------------------- |
| `internersatz` | `InternersatzType` | Nein    | Die in der Liste enthaltenen intenen Sätze. |

### InternersatzType

Definiert einen internen Satz. i.e. Stunden- oder Tagessatz.

#### Felder

| Feld         | Typ           | Pflicht | Beschreibung                                                               |
| ------------ | ------------- | ------- | -------------------------------------------------------------------------- |
| `id`         | `int`         | Nein    | Id des internen Stundensatzes. Muss bei der Bearbeitung angegeben werden.  |
| `userId`     | `String32`    | Nein    | Optional, wird nur beim Lesen zurueck gegeben.                             |
| `satz`       | `Decimal12_2` | Nein    | Der Satz, zu dem der Mitarbeiter intern verrechnet wird.                   |
| `satztype`   | `int0_2`      | Nein    | Typ des 'internen Satzes': 1=Stundensatz, 2=Tagessatz (nur bei Freelancer) |
| `startdatum` | `IsoDate`     | Nein    | Das Datum, ab dem der interne Satz gilt.                                   |
| `bemerkung`  | `string`      | Nein    | Bemerkung zum Satz.                                                        |

### OnlyUpdateAssignmentsType

Wenn mindestens ein Element aus folgender Liste eingegeben wurde, dann werden überhaupt nur die eingebene Elemente aktualsiert: projektortListe, vorgangListe, projektmitarbeiterListe, projekttaetigkeitListe, preistabelleListe, projekttagessatzListe, projektzusatzfelder, kategorieListe

#### Felder

| Feld         | Typ      | Pflicht | Beschreibung |
| ------------ | -------- | ------- | ------------ |
| `assignment` | `string` | Nein    |              |

### ReadKostenDatevXmlSearchCriteriaType

#### Felder

| Feld                             | Typ                 | Pflicht | Beschreibung |
| -------------------------------- | ------------------- | ------- | ------------ |
| `von`                            | `IsoDate`           | Nein    |              |
| `bis`                            | `IsoDate`           | Nein    |              |
| `userIdListe`                    | `UserIdListeType`   | Nein    |              |
| `mitarbeiterabteilungListe`      | `KurzformListeType` | Nein    |              |
| `inklusiveUnterabteilungen`      | `boolean`           | Nein    |              |
| `inklusiveExportierterBuchungen` | `boolean`           | Nein    |              |
| `alsExportiertMarkieren`         | `boolean`           | Nein    |              |

### StammdatenFeiertagskalenderType

#### Felder

| Feld            | Typ                 | Pflicht | Beschreibung |
| --------------- | ------------------- | ------- | ------------ |
| `name`          | `String64`          | Nein    |              |
| `beschreibung`  | `string`            | Nein    |              |
| `land`          | `String64`          | Nein    |              |
| `region`        | `String64`          | Nein    |              |
| `feiertagListe` | `FeiertagListeType` | Nein    |              |
| `created`       | `IsoDateTime`       | Nein    |              |
| `modified`      | `IsoDateTime`       | Nein    |              |

### TerminType

userid des Eigentümers

#### Felder

| Feld           | Typ                      | Pflicht | Beschreibung                                                                        |
| -------------- | ------------------------ | ------- | ----------------------------------------------------------------------------------- |
| `userId`       | `String32`               | Nein    | userid des Eigentümers                                                              |
| `titel`        | `string`                 | Nein    |                                                                                     |
| `von`          | `IsoDateTime`            | Nein    |                                                                                     |
| `bis`          | `IsoDateTime`            | Nein    |                                                                                     |
| `ort`          | `String128`              | Nein    |                                                                                     |
| `anzeigenAls`  | `int0_1`                 | Nein    | 0 oder leer = als beschäftigt; 1 = als verfügbar                                    |
| `sichtbarkeit` | `String16`               | Nein    | PUBLIC = öffentlich; CONFIDENTIAL = nur Zeit und Datum; PRIVATE = privat; Defaul... |
| `projektNr`    | `String64`               | Nein    |                                                                                     |
| `beschreibung` | `string`                 | Nein    |                                                                                     |
| `gaeste`       | `EmailListeType`         | Nein    |                                                                                     |
| `wiederholung` | `TerminWiederholungType` | Nein    |                                                                                     |

## Einfache Typen

### Decimal10_2

Anzahl der Vorkommastellen = 10 und der Nachkommastellen = 2

- **Basis-Typ:** `double`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 9999999999.99

### Decimal12_2

Anzahl der Vorkommastellen = 12 und der Nachkommastellen = 2

- **Basis-Typ:** `double`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 999999999999.99

### Decimal12_4

Anzahl der Vorkommastellen = 12 und der Nachkommastellen = 4

- **Basis-Typ:** `double`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 999999999999.9999

### Decimal12_6

Anzahl der Vorkommastellen = 12 und der Nachkommastellen = 6

- **Basis-Typ:** `double`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 999999999999.999999

### Decimal13_10

Anzahl der Vorkommastellen = 13 und der Nachkommastellen = 10

- **Basis-Typ:** `double`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 9999999999999.9999999999

### Decimal2_2

Anzahl der Vorkommastellen = 2 und der Nachkommastellen = 2

- **Basis-Typ:** `double`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 99.99

### Decimal2_4

- **Basis-Typ:** `float`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 99.9999

### Decimal2_8

Anzahl der Vorkommastellen = 2 und der Nachkommastellen = 8

- **Basis-Typ:** `double`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 99.99999999

### Decimal6_4

Anzahl der Vorkommastellen = 6 und der Nachkommastellen = 4

- **Basis-Typ:** `double`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 999999.9999

### Decimal7_11

- **Basis-Typ:** `double`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 9999999.99999999999

### Decimal8_10

Anzahl der Vorkommastellen = 8 und der Nachkommastellen = 10

- **Basis-Typ:** `float`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 99999999.9999999999

### Decimal8_2

Anzahl der Vorkommastellen = 8 und der Nachkommastellen = 2

- **Basis-Typ:** `float`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 99999999.99

### Decimal8_4

Anzahl der Vorkommastellen = 8 und der Nachkommastellen = 4

- **Basis-Typ:** `double`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 99999999.9999

### Int1_5

- **Basis-Typ:** `int`
- **Einschränkungen:**
  - minInclusive: 1
  - maxInclusive: 5

### Int1_7

- **Basis-Typ:** `int`
- **Einschränkungen:**
  - minInclusive: 1
  - maxInclusive: 7

### IsoDate

Eine Datumsangabe im ISO-Format: YYYY-MM-DD

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - pattern: ^\d{4}-\d{2}-\d{2}$
  - length: 10

### IsoDateTime

IsoDateTime = IsoDate IsoTime

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 10
  - maxLength: 19
  - pattern: ^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{1,2}(:\d{1,2})?$

### IsoDateWithoutYear

Eine Datumsangabe im ISO-Format: MM-DD

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - pattern: ^\d{2}-\d{2}$
  - length: 5

### IsoTime

Eine Zeitangabe im ISO-Format: HH:MM

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 4
  - maxLength: 8
  - pattern: ^\d{1,2}:\d{2}(:\d{2})?$

### String10

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 10

### String100

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 100

### String11

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 11

### String120

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 120

### String128

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 128

### String16

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 16

### String2

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 2

### String20

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 20

### String255

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 255

### String32

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 32

### String34

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 34

### String64

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 64

### String82

- **Basis-Typ:** `string`
- **Einschränkungen:**
  - minLength: 0
  - maxLength: 82

### int0_1

- **Basis-Typ:** `int`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 1

### int0_10

- **Basis-Typ:** `int`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 10

### int0_100

- **Basis-Typ:** `int`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 100

### int0_2

- **Basis-Typ:** `int`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 2

### int0_3

- **Basis-Typ:** `int`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 3

### int0_4

- **Basis-Typ:** `int`
- **Einschränkungen:**
  - minInclusive: 0
  - maxInclusive: 4

### int1_2

- **Basis-Typ:** `int`
- **Einschränkungen:**
  - minInclusive: 1
  - maxInclusive: 2

### int1_20

- **Basis-Typ:** `int`
- **Einschränkungen:**
  - minInclusive: 1
  - maxExclusive: 20

### int1_3

- **Basis-Typ:** `int`
- **Einschränkungen:**
  - minInclusive: 1
  - maxInclusive: 3

### int1_4

- **Basis-Typ:** `int`
- **Einschränkungen:**
  - minInclusive: 1
  - maxInclusive: 4
