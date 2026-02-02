# Beleg-API

Operationen und Typen für Belege und Reisekosten

---

## Operationen

### createBeleg

- **Request:** `createBelegRequest`
- **Response:** `createBelegResponse`

### deleteBeleg

- **Request:** `deleteBelegRequest`
- **Response:** `deleteBelegResponse`

### readBeleg

- **Request:** `readBelegRequest`
- **Response:** `readBelegResponse`

### readBelegAnhang

- **Request:** `readBelegAnhangRequest`
- **Response:** `readBelegAnhangResponse`

### readBelegart

- **Request:** `readBelegartRequest`
- **Response:** `readBelegartResponse`

### updateBeleg

- **Request:** `updateBelegRequest`
- **Response:** `updateBelegResponse`

## Komplexe Typen

### BelegListeType

Liste von Belegen

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `beleg` | `BelegType` | Nein | Die in der Liste enthaltenen Belege. |

#### Attribute

- `length` (int): Die Anzahl der Belege in der Liste.

### BelegType

Die Daten eines Beleges.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `belegNr` | `int` | Nein | Die Nummer des Belegs. Leer bei Anlage eines neuen Belegs, Pflicht beim Update o... |
| `datum` | `IsoDate` | Nein | Das Datum des Beleges. |
| `leistungsdatum` | `IsoDate` | Nein | Das ggf. abweichende Leistungsdatum des Beleges. Nur zulässig wenn die Belegart ... |
| `projektNr` | `String64` | Nein | Die Nummer des Projektes, dem dieser Beleg zugeordnet ist. Pflicht bei Anlage. |
| `vorgangNr` | `String64` | Nein | Nummer des Vorgangs, dem der Beleg zugeordnet werden soll. Die Angabe eines Vorg... |
| `userId` | `String32` | Nein | Die Userid des Benutzer, dem der Beleg zugeordnet ist. Pflicht bei Anlage. |
| `belegart` | `String64` | Nein | Die Belegart des Beleges. Pflicht bei Anlage. |
| `waehrung` | `String32` | Nein | Die Währung des Beleges. |
| `faktWaehrung` | `String32` | Nein | Die Währung, in der der Beleg an den Kunden weiterfakturiert wird. |
| `zahlungsart` | `String32` | Nein | Die Zahlungsart des Beleges, z.B. privat oder Firma. Die hier angegebene Wert mu... |
| `bemerkung` | `string` | Nein | Eine optionale Bemerkung zum Beleg. |
| `istNetto` | `boolean` | Nein | Kennung, ob die Beträge des Beleges brutto oder netto sind. Default: brutto. |
| `istFaktNetto` | `boolean` | Nein | Kennung, ob die zu fakturierenden Beträge des Beleges brutto oder netto sind. De... |
| `belegbetragListe` | `BelegbetragListeType` | Nein | Liste der Einzel-Beträge des Beleges. Diese können u.U. unterschiedliche Steuers... |
| `anhang` | `AnhangType` | Nein | Der optionale Anhang zum Beleg (Bild oder PDF). |
| `vorgangId` | `int` | Nein |  |
| `projektId` | `int` | Nein |  |
| `created` | `IsoDateTime` | Nein | Der Zeitpunkt der Anlage des Objekts. |
| `modified` | `IsoDateTime` | Nein | Der Zeitpunkt der letzten Änderung des Objekts. |
| `rechnungspositionId` | `int` | Nein |  |
| `attributes` | `AttributesType` | Nein | Optionale Liste von Attributen für kundenspezifische Anpassungen. |

### BelegartListeType

Liste von Belegarten

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `belegart` | `BelegartType` | Nein | Die Liste der Belegarten. |

#### Attribute

- `length` (int): Anzahl der Belegarten in der Liste.

### BelegartType

Die Daten einer Belegart.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `kurzform` | `String64` | Nein | Die Kurzbezeichnung der Belegart. |
| `bezeichnung` | `String64` | Nein | Die Bezeichnung der Belegart. |
| `belegartsteuersatzListe` | `BelegartsteuersatzListeType` | Nein | Eine optionale Liste der für die Belegart zulässigen Steuersätze. Default: alle ... |
| `betrag` | `Decimal10_2` | Nein | Ein optionaler Default-Wert für den Betrag. |
| `faktBetrag` | `Decimal10_2` | Nein | Ein optionaler Default-Wert für den zu fakturierenden Betrag. |
| `waehrung` | `String32` | Nein | Der Vorgabe-Wert für die Währung (optional). |
| `zahlungsart` | `String64` | Nein | Der Vorgabe-Wert für die Zahlungsart (optional). |
| `inklusiveRechnung` | `boolean` | Nein |  |
| `abweichendesLeistungsdatum` | `boolean` | Nein | Kennung, ob bei Belegen dieser Belegart ein abweichendes Leistungsdatum angegebe... |
| `siebzigDreissigAufteilung` | `boolean` | Nein | Kennung, ob bei dieser Belegart eine 70/30-Aufteilung beim Mahlzeitenabzu eerfol... |
| `attributes` | `AttributesType` | Nein | Liste von Attributen für kundenspezifische Erweiterungen. |

### BelegartsteuersatzListeType

Liste der für eine Belegart zugelaässigen Steuersätze

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `belegartsteuersatz` | `BelegartsteuersatzType` | Nein | Die der Belegart zugeordneten Steuersätze. |

### BelegartsteuersatzType

Ein für eine Belegart zugelassener Steuersatz

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `belegart` | `String64` | Nein | Die Kurzbezeichnung der Belegart. |
| `steuersatz` | `Decimal6_4` | Nein | Der Steuersatz. |
| `konto` | `String64` | Nein | Das für diesen Steuersatz zu verwendende Konto (bei Einsatz des Moduls 'Export f... |
| `buschluessel` | `String32` | Nein | Der Buchungsschlüssel (bei Einsatz des Moduls 'Export für Buchhaltung'). |
| `konto2` | `String64` | Nein | Ein weiteres Erlöskonto (bei Einsatz des Moduls 'Export für Buchhaltung' und 70/... |
| `buschluessel2` | `String32` | Nein | Der zweite Buchungsschlüssel (bei Einsatz des Moduls 'Export für Buchhaltung' un... |
| `kontoFreelancer` | `String64` | Nein |  |
| `buschluesselFreelancer` | `String32` | Nein |  |
| `konto2Freelancer` | `String64` | Nein |  |
| `buschluessel2Freelancer` | `String32` | Nein |  |

### BelegbetragListeType

Liste der Einzelbeträge eines Beleges

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `belegbetrag` | `BelegbetragType` | Nein | Die einzelnen Beträgen. |

### BelegbetragType

Ein einem Beleg zugeordneter Betrag

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `id` | `int` | Nein | Wenn es beim Update angegeben und ein Belegbetrag vorhanden dann wird dieser bea... |
| `belegNr` | `int` | Nein | Die Nummer des Belegs, dem dieser Betrag zugeordnet ist. |
| `steuersatz` | `Decimal6_4` | Nein | Der Steuersatz zu diesem Betrag. |
| `menge` | `Decimal12_4` | Nein | Die Menge. |
| `betrag` | `Decimal10_2` | Nein | Der Betrag. |
| `privatAnteil` | `Decimal10_2` | Nein | Der private Anteil am Betrag. |
| `faktBetrag` | `Decimal10_2` | Nein | Der an den Kunden zu fakturierende Betrag. |
| `action` | `string` | Nein | Aktion. Um den Betrag im Rahmen eines Updates zu löschen muss hier 'delete' ange... |

### BelegeinstellungenType

0 = bei der Erfassung selbst eingeben 1 = Vorbelegung identisch weiterfakturieren 2 = Vorbelegung nicht weiterfakturieren

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `belegerfassung` | `boolean` | Nein |  |
| `belegerfassungOhneVorgang` | `boolean` | Nein |  |
| `zuFakturierendenBetrag` | `int0_2` | Nein | 0 = bei der Erfassung selbst eingeben 1 = Vorbelegung identisch weiterfakturiere... |

### CreateBelegRequestType

Die Parameter zur Anlage eines Belegs.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `beleg` | `BelegType` | Ja | Die Daten des anzulegenden Beleges. |

### CreateBelegResponseType

Das Antwort-Objekt der Beleg-Anlage

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `belegNr` | `int` | Nein | Die Nummer des neu angelegten Beleges. |

### DeleteBelegRequestType

Die Parameter zum Löschen eines Beleges.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `belegNr` | `int` | Ja | Nummer des zu löschenden Beleges. |

### DeleteBelegResponseType

Das Antwort-Objekt bei Löschen eines Beleges

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |

### ReadBelegAnhangRequestType

Die Daten zum Lesen eines Beleganhangs.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `readBelegAnhangSearchCriteria` | `ReadBelegAnhangSearchCriteriaType` | Ja | Die Suchkriterien zur Suche nach einem Beleganhang. |

### ReadBelegAnhangResponseType

Die Antwort beim Lesen eines Beleganhangs.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `anhang` | `AnhangType` | Ja | Der gelesene Beleganhang. |

### ReadBelegAnhangSearchCriteriaType

Die Suchkriterien für das Lesen eines Beleganhangs.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `belegNr` | `int` | Nein | Die Nummer des Beleges, dessen Anhang geliefert werden soll. |
| `attributes` | `AttributesType` | Nein | Attribute für kundenspezifische Erweiterungen. |

### ReadBelegRequestType

Die Parameter zum Lesen von Belegen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `readBelegSearchCriteria` | `ReadBelegSearchCriteriaType` | Ja | Die Suchkriterien für die Suche nach Belegen. |

### ReadBelegResponseType

Die Antwort beim Lesen von Belegen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `belegListe` | `BelegListeType` | Ja | Die Liste der gelesenen Belege. |

### ReadBelegSearchCriteriaType

Die Suchkriterien für das Lesen von Belegen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `von` | `IsoDate` | Nein | Das Startdatum des Zeitraums, in dem Belege gesucht werden sollen. Format: JJJJ-... |
| `bis` | `IsoDate` | Nein | Das Endedatum des Zeitraums, in dem Belege gesucht werden sollen. Format: JJJJ-M... |
| `belegNr` | `int` | Nein | Die Nummer des Beleges, der geliefert werden soll. |
| `projektNrListe` | `ProjektNrListeType` | Nein | Eine Liste mit den Nummern der Projekte, in denen nach Belegen gesucht werden so... |
| `userIdListe` | `UserIdListeType` | Nein | Eine Liste mit Benutzerids, in deren Belegen gesucht werden soll. |
| `belegart` | `String64` | Nein | Die Bezeichnung der Belegart, nach der gesucht werden soll. |
| `zahlungsart` | `String32` | Nein | Die Zahlungsart, nach der gesucht werden soll. |
| `modifiedSince` | `IsoDateTime` | Nein |  |
| `projektId` | `int` | Nein |  |
| `attributes` | `AttributesType` | Nein | Attribute für kundenspezifische Erweiterungen. |

### ReadBelegartRequestType

Die Parameter zum Lesen von Belgarten.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `readBelegartSearchCriteria` | `ReadBelegartSearchCriteriaType` | Ja | Die Suchkriterien zur Suche nach Belegarten. |

### ReadBelegartResponseType

Die Antwort beim Lesen von Belegarten.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `belegartListeType` | `BelegartListeType` | Ja | Die Liste der gelesenen Belegarten. |

### ReadBelegartSearchCriteriaType

Die Suchkriterien für das Lesen von Belegarten.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `kurzform` | `String64` | Nein | Die Kurzbezeichnung der gesuchten Belegart. Falls leer werden alle Belegarten ge... |
| `attributes` | `AttributesType` | Nein | Attribute für kundenspezifische Erweiterungen. |

### UpdateBelegRequestType

Die Parameter zur Aktualisierung eines Beleges.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `beleg` | `BelegType` | Ja | Die Daten des zu aktualisierenden Beleges. |

### UpdateBelegResponseType

Die Antwort bei der Aktualisierung eines Beleges.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |

