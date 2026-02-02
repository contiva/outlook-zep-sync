# Kunden-API

Operationen und Typen für die Verwaltung von Kunden und Ansprechpartnern

---

## Operationen

### createKunde

- **Request:** `createKundeRequest`
- **Response:** `createKundeResponse`

### deleteKunde

- **Request:** `deleteKundeRequest`
- **Response:** `deleteKundeResponse`

### readKunde

- **Request:** `readKundeRequest`
- **Response:** `readKundeResponse`

### updateKunde

- **Request:** `updateKundeRequest`
- **Response:** `updateKundeResponse`

## Komplexe Typen

### AdresseType

Eine einzelne Adresse.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `id` | `int` | Nein | Eindeutige Id der Adresse. Pflicht bei Änderung und Löschen. |
| `name` | `String120` | Nein | Der Firmenname o.ä. |
| `namenszusatz` | `String120` | Nein |  |
| `adressZeile1` | `String120` | Nein | Erste Zeile der Adresse. |
| `adressZeile2` | `String120` | Nein | Zweite Zeile der Adresse. |
| `adressZeile3` | `String120` | Nein | Dritte Zeile der Adresse. |
| `plz` | `String16` | Nein | Die Postleitzahl (PLZ) der Adresse. |
| `ort` | `String32` | Nein | Der Ort der Adresse. |
| `land` | `String64` | Nein | Das Land der Adresse. |
| `istStandard` | `boolean` | Nein | Flagge, ob es sich um die Standard-Adresse handelt. Wenn nur eine Adresse gegebe... |
| `alsRechnungsadresse` | `boolean` | Nein | Flagge, ob die Adresse als Rechnungsadresse verwendet werden soll. |
| `alsLieferadresse` | `boolean` | Nein |  |
| `rechnungsversandMailAdresse` | `string` | Nein | Eine oder mehrere Empfängeradressen separiert durch Komma oder Semikolon angeben... |
| `maschinenlesbaresRechnungsversand` | `int` | Nein | 0=nein , 1=ZUGFeRD1 , 2=ZUGFeRD2 , 99=Swiss QR Code |
| `rechnungsversandMailAdresseCC` | `string` | Nein |  |
| `rechnungsversandMailAdresseBCC` | `string` | Nein |  |
| `laendercode` | `String32` | Nein |  |
| `action` | `string` | Nein | in Kunde: "delete" um die Adresse beim Update zu löschenmuss hier "delete" angeg... |

### AdressenListeType

Liste von Adressen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `adresse` | `AdresseType` | Nein | Die in der Liste enthaltenen Adressen. |

### AnsprechpartnerListeType

Eine Liste von Ansprechpartnern.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `ansprechpartner` | `AnsprechpartnerType` | Nein | Die in der Liste enthaltenen Ansprechpartner. |

### AnsprechpartnerType

Die Daten eines Kunden-Ansprechpartners.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `id` | `int` | Nein | Die Id des Ansprechpartners. Pflicht bei Update und Löschen. |
| `vorname` | `String120` | Nein | Der Vorname des Ansprechpartners. Pflicht bei Anlage. |
| `name` | `String120` | Nein | Der Name des Ansprechpartners. Pflicht bei Anlage. |
| `anrede` | `String32` | Nein | Die Anrede des Ansprechpartners. |
| `titel` | `String32` | Nein | Der Titel des Ansprechpartners. |
| `telefon` | `String32` | Nein | Die Telefonnummer des Ansprechpartners. |
| `handy` | `String32` | Nein | Die Mobilnummer des Ansprechpartners. |
| `fax` | `String32` | Nein | Die Faxnummer des Ansprechpartners. |
| `email` | `String120` | Nein | Die EMail-Adresse des Ansprechpartners. |
| `isPrimary` | `boolean` | Nein | Flagge, ob es sich um den primären Ansprechpartner des Kunden handelt. |
| `abteilung` | `String64` | Nein |  |
| `kundenNr` | `String32` | Nein | Wird nur beim Lesen zurückgegeben (wird nicht benötigt für create oder update) |
| `kategorieListe` | `KategorieListeType` | Nein |  |
| `adresse` | `AdresseType` | Nein |  |
| `berufsbezeichnung` | `String64` | Nein |  |
| `benutzername` | `String32` | Nein |  |
| `sprache` | `String32` | Nein | Die verfügbare Sprachen für die Texte, die in ZEP ausgegeben werden: z.B. de, en... |
| `bemerkung` | `string` | Nein |  |
| `inaktiv` | `boolean` | Nein |  |
| `action` | `string` | Nein | Zum Löschen des Ansprechpartner im Rahmen des UpdateKunde-Requests auf 'delete' ... |

### CreateKundeRequestType

Die Parameter zur Anlage eines neuen Kunden.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `kunde` | `KundeType` | Ja | Die Daten des neu anzulegenden Kunden. |

### CreateKundeResponseType

Das Antwort-Objekt der Kunden-Anlage.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `kundenNr` | `String32` | Nein |  |

### DeleteKundeRequestType

Die Parameter zum Löschen eines Kunden.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `kundenNr` | `String32` | Ja | Die Kundennummer des zu löschenden Kunden. |

### DeleteKundeResponseType

Das Antwort-Objekt beim Löschen eines Kunden.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |

### KundeListeType

Eine Liste von Kunden.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `kunde` | `KundeType` | Nein | Die in der Liste enthaltenen Kunden. |

#### Attribute

- `length` (int): Die Anzahl der Kunden in der Liste.

### KundeType

Die Daten eines Kunden.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `kundenNr` | `String32` | Nein | Die Kundennummer. Pflicht bei Anlage, Update und Löschen. Wenn die Nummernkreis ... |
| `name` | `String120` | Nein | Der Name des Kunden. Pflicht bei der Anlage eines neuen Kunden. |
| `namenszusatz` | `String120` | Nein |  |
| `waehrung` | `String32` | Nein | Die Währung des Kunden (Währungssysmbol, z. B. EUR). |
| `bemerkung` | `string` | Nein | Eine Bemerkung zum Kunden. |
| `abteilung` | `String64` | Nein | Die Abteilung, der der Kunde zugeordnet werden soll. Bei der Kundenanlage muss d... |
| `branche` | `String32` | Nein | Die Branche, die dem Kunden zugeordnet ist. Bei der Kundenanlage muss diese bere... |
| `mwst` | `Decimal6_4` | Nein | Der MsWt-Satz des Kunden. |
| `bic` | `String11` | Nein | Die BIC des Kunden. |
| `iban` | `String34` | Nein | Die IBAN des Kunden. |
| `fax` | `String32` | Nein | Die Fax-Nummer des Kunden |
| `www` | `String120` | Nein | Der URL der Web-Site des Kunden. Der URL muss ggf. als CDATA angegeben werden. |
| `email` | `String120` | Nein | Die EMail-Adresse des Kunden. |
| `zahlungsziel` | `int` | Nein | Das dem Kunden eingeräumte Zahlungsziel. |
| `ustId` | `String16` | Nein | Die USt.Id-Nr des Kunden. |
| `telefon` | `String32` | Nein | Die Telefonnummer des Kunden. |
| `inaktiv` | `boolean` | Nein | Kennung, ob der Kunde aktiv oder inaktiv ist. |
| `adressenListe` | `AdressenListeType` | Nein | Die Liste der Adressen des Kunden. |
| `ansprechpartnerListe` | `AnsprechpartnerListeType` | Nein | Die Liste der Ansprechpartner des Kunden. |
| `preistabelleListe` | `PreistabelleListeType` | Nein | Die Liste der Preistabellen des Kunden. |
| `skontofrist` | `int` | Nein | Skontofrist in Tagen. |
| `kundenverantwortlicherListe` | `KundenverantwortlicherListeType` | Nein | Hier wird die userId erwartet (optional) |
| `kundenzusatzfelder` | `ZusatzfelderType` | Nein |  |
| `kategorieListe` | `KategorieListeType` | Nein |  |
| `created` | `IsoDateTime` | Nein | Der Zeitpunkt der Anlage des Objekts. |
| `modified` | `IsoDateTime` | Nein | Der Zeitpunkt der letzten Änderung des Objekts. |
| `abrechnungsverfahren` | `int1_2` | Nein |  |
| `automatisierteRechnungsstellung` | `boolean` | Nein |  |
| `lastschriftZahlung` | `boolean` | Nein |  |
| `debitorennummer` | `String32` | Nein |  |
| `landkennung` | `String32` | Nein |  |
| `lieferantennummer` | `String32` | Nein |  |
| `skontoProzent` | `Decimal2_4` | Nein |  |
| `attributes` | `AttributesType` | Nein | Liste von Attributen für kundenspezifische Erweiterungen. |

### KundenNrListeType

Liste von Kunden-Nummern.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `kundenNr` | `String32` | Nein |  |

### KundenverantwortlicherListeType

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `kundenverantwortlicher` | `KundenverantwortlicherType` | Nein |  |

### KundenverantwortlicherType

Zum Löschen des Kundenveratwortlicher-Zuordnung im Rahmen des UpdateKunde-Requests auf 'delete' setzen.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `userId` | `String32` | Ja |  |
| `kundenNr` | `String32` | Nein |  |
| `darfKundeAendern` | `boolean` | Nein |  |
| `primaer` | `boolean` | Nein |  |
| `mitBudgetverantwortung` | `boolean` | Nein |  |
| `action` | `string` | Nein | Zum Löschen des Kundenveratwortlicher-Zuordnung im Rahmen des UpdateKunde-Reques... |

### ReadKundeRequestType

Die Parameter zum Lesen von Kunden.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `readKundenSearchCriteria` | `ReadKundenSearchCriteriaType` | Ja | Die Suchkriterien für die Kundensuche. |

### ReadKundeResponseType

Die Antwort beim Lesen eines Kunden.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |
| `kundeListe` | `KundeListeType` | Ja | Die Liste der gelesenen Kunden. |

### ReadKundenSearchCriteriaType

Kriterien für die Suche nach Kunden.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `kundenNr` | `String32` | Nein | Die Kundennummer des gesuchten Kunden. |
| `abteilung` | `String64` | Nein | Die Abteilung der zu liefernden Kunden. |
| `kategorie` | `String32` | Nein | wir empfehlen 'kategorienKurzform' zu benutzen dies kann mehr als dies (dieses E... |
| `branche` | `String32` | Nein | Die Branche der zu liefernden Kunden. |
| `inklusiveUnterabteilung` | `boolean` | Nein | Flagge, ob Kunden, die untergeordneten Abteilungen zugeordnet sind, ebenfalls ge... |
| `inaktiv` | `boolean` | Nein | Flagge, ob auch inaktive Kunden geliefert werden sollen. |
| `modifiedSince` | `IsoDateTime` | Nein |  |
| `name` | `String120` | Nein |  |
| `attributes` | `AttributesType` | Nein | Liste von Attributen für kundenspezifische Erweiterungen. |

### UpdateKundeRequestType

Die Parameter zum Aktualisieren von Kunden.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `requestHeader` | `RequestHeaderType` | Nein | Der allgemeine ZEP Request-Header. |
| `kunde` | `KundeType` | Ja | Die Daten zur Aktualisierung des Kunden. |

### UpdateKundeResponseType

Die Antwort bei der Aktualisierung eines Kunden.

#### Felder

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `responseHeader` | `ResponseHeaderType` | Ja | Der allgemeine ZEP Response-Header. |

