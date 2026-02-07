# Allgemeine Typen

Request/Response Header und allgemeine Hilfstypen

---

## Komplexe Typen

### AttributeType

Ein kundenspezifisches Attribut (Key-Value).

#### Felder

| Feld    | Typ      | Pflicht | Beschreibung                                |
| ------- | -------- | ------- | ------------------------------------------- |
| `value` | `string` | Ja      | Der Wert des kundenspezifischen Attributes. |

#### Attribute

- `name` (string): Der Name des kundenspezifischen Attributes.

### AttributesType

Liste von Attributen für kundenspezifische Erweiterungen

#### Felder

| Feld        | Typ             | Pflicht | Beschreibung                                              |
| ----------- | --------------- | ------- | --------------------------------------------------------- |
| `attribute` | `AttributeType` | Nein    | Liste von Attributen für kundenspezifische Erweiterungen. |
