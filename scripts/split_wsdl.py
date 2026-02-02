#!/usr/bin/env python3
"""
WSDL Splitter - Teilt eine WSDL-Datei in AI-freundliche Markdown-Dokumentation auf.

Dieses Script parst eine WSDL-Datei und erstellt strukturierte Markdown-Dateien,
die von einer AI gut verarbeitet werden können.
"""

import xml.etree.ElementTree as ET
import os
import re
from collections import defaultdict
from pathlib import Path

# Namespaces
NS = {
    'wsdl': 'http://schemas.xmlsoap.org/wsdl/',
    'xsd': 'http://www.w3.org/2001/XMLSchema',
    'soap': 'http://schemas.xmlsoap.org/wsdl/soap/',
    'tns': 'http://zep.provantis.de'
}

def clean_text(text):
    """Bereinigt Text von übermäßigen Whitespaces."""
    if text is None:
        return ""
    return re.sub(r'\s+', ' ', text.strip())

def get_documentation(element):
    """Extrahiert die Dokumentation aus einem Element."""
    doc = element.find('.//xsd:documentation', NS)
    if doc is not None and doc.text:
        return clean_text(doc.text)
    return ""

def parse_simple_type(element):
    """Parst einen simpleType."""
    name = element.get('name')
    restriction = element.find('xsd:restriction', NS)
    
    info = {
        'name': name,
        'documentation': get_documentation(element),
        'base_type': '',
        'constraints': []
    }
    
    if restriction is not None:
        info['base_type'] = restriction.get('base', '').replace('xsd:', '')
        
        for child in restriction:
            tag = child.tag.replace('{http://www.w3.org/2001/XMLSchema}', '')
            value = child.get('value')
            if tag and value:
                info['constraints'].append(f"{tag}: {value}")
    
    return info

def parse_complex_type(element):
    """Parst einen complexType."""
    name = element.get('name')
    
    info = {
        'name': name,
        'documentation': get_documentation(element),
        'elements': [],
        'attributes': []
    }
    
    # Elemente aus sequence
    for seq in element.findall('.//xsd:sequence', NS):
        for elem in seq.findall('xsd:element', NS):
            elem_info = {
                'name': elem.get('name'),
                'type': elem.get('type', '').replace('tns:', '').replace('xsd:', ''),
                'minOccurs': elem.get('minOccurs', '1'),
                'maxOccurs': elem.get('maxOccurs', '1'),
                'documentation': get_documentation(elem)
            }
            info['elements'].append(elem_info)
    
    # Attribute
    for attr in element.findall('.//xsd:attribute', NS):
        attr_info = {
            'name': attr.get('name'),
            'type': attr.get('type', '').replace('xsd:', ''),
            'documentation': get_documentation(attr)
        }
        info['attributes'].append(attr_info)
    
    return info

def parse_operation(element):
    """Parst eine WSDL Operation."""
    name = element.get('name')
    
    info = {
        'name': name,
        'documentation': get_documentation(element),
        'input': '',
        'output': ''
    }
    
    input_elem = element.find('wsdl:input', NS)
    if input_elem is not None:
        info['input'] = input_elem.get('message', '').replace('tns:', '')
    
    output_elem = element.find('wsdl:output', NS)
    if output_elem is not None:
        info['output'] = output_elem.get('message', '').replace('tns:', '')
    
    return info

def categorize_type(name):
    """Kategorisiert einen Typ basierend auf seinem Namen."""
    name_lower = name.lower()
    
    # Request/Response Types
    if 'request' in name_lower:
        if 'projektzeit' in name_lower:
            return 'projektzeit'
        elif 'projekt' in name_lower and 'mitarbeiter' not in name_lower:
            return 'projekt'
        elif 'mitarbeiter' in name_lower:
            return 'mitarbeiter'
        elif 'kunde' in name_lower:
            return 'kunde'
        elif 'ticket' in name_lower:
            return 'ticket'
        elif 'vorgang' in name_lower:
            return 'vorgang'
        elif 'beleg' in name_lower:
            return 'beleg'
        elif 'rechnung' in name_lower:
            return 'rechnung'
        elif 'abteilung' in name_lower:
            return 'abteilung'
        elif 'kategorie' in name_lower:
            return 'stammdaten'
        elif 'taetigkeit' in name_lower:
            return 'stammdaten'
        elif 'einplanung' in name_lower:
            return 'einplanung'
        elif 'kommt' in name_lower or 'geht' in name_lower:
            return 'zeiterfassung'
        else:
            return 'sonstige'
    
    if 'response' in name_lower:
        if 'projektzeit' in name_lower:
            return 'projektzeit'
        elif 'projekt' in name_lower and 'mitarbeiter' not in name_lower:
            return 'projekt'
        elif 'mitarbeiter' in name_lower:
            return 'mitarbeiter'
        elif 'kunde' in name_lower:
            return 'kunde'
        elif 'ticket' in name_lower:
            return 'ticket'
        elif 'vorgang' in name_lower:
            return 'vorgang'
        elif 'beleg' in name_lower:
            return 'beleg'
        elif 'rechnung' in name_lower:
            return 'rechnung'
        elif 'abteilung' in name_lower:
            return 'abteilung'
        elif 'kategorie' in name_lower:
            return 'stammdaten'
        elif 'taetigkeit' in name_lower:
            return 'stammdaten'
        elif 'einplanung' in name_lower:
            return 'einplanung'
        elif 'kommt' in name_lower or 'geht' in name_lower:
            return 'zeiterfassung'
        else:
            return 'sonstige'
    
    # Entity Types
    if 'projektzeit' in name_lower:
        return 'projektzeit'
    elif 'projektmitarbeiter' in name_lower or 'vorgangmitarbeiter' in name_lower:
        return 'projekt'
    elif 'projekt' in name_lower:
        return 'projekt'
    elif 'mitarbeiter' in name_lower:
        return 'mitarbeiter'
    elif 'kunde' in name_lower or 'ansprechpartner' in name_lower or 'adress' in name_lower:
        return 'kunde'
    elif 'ticket' in name_lower or 'teilaufgabe' in name_lower:
        return 'ticket'
    elif 'vorgang' in name_lower:
        return 'vorgang'
    elif 'beleg' in name_lower:
        return 'beleg'
    elif 'rechnung' in name_lower:
        return 'rechnung'
    elif 'abteilung' in name_lower:
        return 'abteilung'
    elif 'kategorie' in name_lower or 'taetigkeit' in name_lower or 'schlagwort' in name_lower:
        return 'stammdaten'
    elif 'einplanung' in name_lower:
        return 'einplanung'
    elif 'kommt' in name_lower or 'geht' in name_lower:
        return 'zeiterfassung'
    elif any(x in name_lower for x in ['string', 'decimal', 'int', 'iso', 'date', 'time']):
        return 'basis_typen'
    elif 'header' in name_lower or 'attribute' in name_lower:
        return 'allgemein'
    elif 'liste' in name_lower:
        # Listen dem zugehörigen Typ zuordnen
        if 'projektzeit' in name_lower:
            return 'projektzeit'
        elif 'projekt' in name_lower:
            return 'projekt'
        elif 'mitarbeiter' in name_lower:
            return 'mitarbeiter'
        elif 'kunde' in name_lower:
            return 'kunde'
        elif 'ticket' in name_lower:
            return 'ticket'
        elif 'vorgang' in name_lower:
            return 'vorgang'
        elif 'beleg' in name_lower:
            return 'beleg'
        else:
            return 'sonstige'
    else:
        return 'sonstige'

def generate_simple_type_md(type_info):
    """Generiert Markdown für einen simpleType."""
    md = f"### {type_info['name']}\n\n"
    
    if type_info['documentation']:
        md += f"{type_info['documentation']}\n\n"
    
    md += f"- **Basis-Typ:** `{type_info['base_type']}`\n"
    
    if type_info['constraints']:
        md += "- **Einschränkungen:**\n"
        for c in type_info['constraints']:
            md += f"  - {c}\n"
    
    md += "\n"
    return md

def generate_complex_type_md(type_info):
    """Generiert Markdown für einen complexType."""
    md = f"### {type_info['name']}\n\n"
    
    if type_info['documentation']:
        md += f"{type_info['documentation']}\n\n"
    
    if type_info['elements']:
        md += "#### Felder\n\n"
        md += "| Feld | Typ | Pflicht | Beschreibung |\n"
        md += "|------|-----|---------|-------------|\n"
        
        for elem in type_info['elements']:
            pflicht = "Ja" if elem['minOccurs'] != '0' else "Nein"
            doc = elem['documentation'][:80] + "..." if len(elem['documentation']) > 80 else elem['documentation']
            md += f"| `{elem['name']}` | `{elem['type']}` | {pflicht} | {doc} |\n"
        
        md += "\n"
    
    if type_info['attributes']:
        md += "#### Attribute\n\n"
        for attr in type_info['attributes']:
            md += f"- `{attr['name']}` ({attr['type']}): {attr['documentation']}\n"
        md += "\n"
    
    return md

def generate_operation_md(op_info):
    """Generiert Markdown für eine Operation."""
    md = f"### {op_info['name']}\n\n"
    
    if op_info['documentation']:
        md += f"{op_info['documentation']}\n\n"
    
    md += f"- **Request:** `{op_info['input']}`\n"
    md += f"- **Response:** `{op_info['output']}`\n\n"
    
    return md

def write_category_file(output_dir, category, simple_types, complex_types, operations):
    """Schreibt eine Markdown-Datei für eine Kategorie."""
    
    titles = {
        'allgemein': ('01-allgemein.md', 'Allgemeine Typen', 'Request/Response Header und allgemeine Hilfstypen'),
        'basis_typen': ('02-basis-typen.md', 'Basis-Datentypen', 'Grundlegende Datentypen wie Strings, Zahlen und Datumsformate'),
        'mitarbeiter': ('03-mitarbeiter.md', 'Mitarbeiter-API', 'Operationen und Typen für die Verwaltung von Mitarbeitern'),
        'kunde': ('04-kunde.md', 'Kunden-API', 'Operationen und Typen für die Verwaltung von Kunden und Ansprechpartnern'),
        'projekt': ('05-projekt.md', 'Projekt-API', 'Operationen und Typen für die Projektverwaltung'),
        'vorgang': ('06-vorgang.md', 'Vorgang-API', 'Operationen und Typen für die Vorgangsverwaltung'),
        'projektzeit': ('07-projektzeit.md', 'Projektzeit-API', 'Operationen und Typen für Zeitbuchungen'),
        'ticket': ('08-ticket.md', 'Ticket-API', 'Operationen und Typen für das Ticket-System'),
        'beleg': ('09-beleg.md', 'Beleg-API', 'Operationen und Typen für Belege und Reisekosten'),
        'rechnung': ('10-rechnung.md', 'Rechnungs-API', 'Operationen und Typen für die Rechnungsverwaltung'),
        'abteilung': ('11-abteilung.md', 'Abteilungs-API', 'Operationen und Typen für die Abteilungsverwaltung'),
        'stammdaten': ('12-stammdaten.md', 'Stammdaten-API', 'Kategorien, Tätigkeiten, Schlagworte und andere Stammdaten'),
        'einplanung': ('13-einplanung.md', 'Einplanungs-API', 'Operationen und Typen für die Ressourcenplanung'),
        'zeiterfassung': ('14-zeiterfassung.md', 'Zeiterfassungs-API', 'Kommt/Geht-Buchungen und Anwesenheitserfassung'),
        'sonstige': ('99-sonstige.md', 'Sonstige Typen', 'Weitere Typen und Hilfsstrukturen'),
    }
    
    if category not in titles:
        return
    
    filename, title, description = titles[category]
    filepath = output_dir / filename
    
    md = f"# {title}\n\n"
    md += f"{description}\n\n"
    md += "---\n\n"
    
    # Operationen
    if operations:
        md += "## Operationen\n\n"
        for op in sorted(operations, key=lambda x: x['name']):
            md += generate_operation_md(op)
    
    # Complex Types
    if complex_types:
        md += "## Komplexe Typen\n\n"
        for ct in sorted(complex_types, key=lambda x: x['name']):
            md += generate_complex_type_md(ct)
    
    # Simple Types
    if simple_types:
        md += "## Einfache Typen\n\n"
        for st in sorted(simple_types, key=lambda x: x['name']):
            md += generate_simple_type_md(st)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(md)
    
    print(f"  Erstellt: {filename}")

def generate_index(output_dir, categories):
    """Generiert die Index-Datei."""
    
    md = """# ZEP SOAP API Dokumentation

Diese Dokumentation beschreibt die ZEP (Zeiterfassung für Projekte) SOAP-Schnittstelle Version 10.

## Übersicht

Die ZEP API ermöglicht die programmatische Interaktion mit dem ZEP-System für:
- Zeiterfassung und Projektzeiten
- Projekt- und Vorgangsverwaltung
- Mitarbeiter- und Kundenverwaltung
- Ticket-System
- Belegerfassung und Reisekosten
- Rechnungswesen

## Authentifizierung

Alle Requests benötigen einen `RequestHeader` mit einem `authorizationToken`:

```xml
<requestHeader>
    <authorizationToken>IHR_TOKEN</authorizationToken>
</requestHeader>
```

Das Token wird in ZEP unter Administration > Einstellungen > SOAP konfiguriert.

## Response-Struktur

Alle Responses enthalten einen `ResponseHeader`:

```xml
<responseHeader>
    <version>10.x</version>
    <returnCode>0</returnCode>  <!-- 0 = Erfolg -->
    <message>Optional: Fehlermeldung</message>
</responseHeader>
```

## Dokumentations-Dateien

"""
    
    file_order = [
        ('01-allgemein.md', 'Allgemeine Typen', 'Request/Response Header, Attribute'),
        ('02-basis-typen.md', 'Basis-Datentypen', 'String, Decimal, Date, Time Typen'),
        ('03-mitarbeiter.md', 'Mitarbeiter-API', 'CRUD für Mitarbeiter, Beschäftigungszeiten'),
        ('04-kunde.md', 'Kunden-API', 'CRUD für Kunden, Ansprechpartner, Adressen'),
        ('05-projekt.md', 'Projekt-API', 'CRUD für Projekte, Projektmitarbeiter'),
        ('06-vorgang.md', 'Vorgang-API', 'CRUD für Vorgänge (Arbeitspakete)'),
        ('07-projektzeit.md', 'Projektzeit-API', 'Zeitbuchungen erstellen, lesen, ändern'),
        ('08-ticket.md', 'Ticket-API', 'Ticket-System, Teilaufgaben'),
        ('09-beleg.md', 'Beleg-API', 'Belege, Reisekosten, Spesen'),
        ('10-rechnung.md', 'Rechnungs-API', 'Rechnungen lesen'),
        ('11-abteilung.md', 'Abteilungs-API', 'Organisationsstruktur'),
        ('12-stammdaten.md', 'Stammdaten-API', 'Kategorien, Tätigkeiten, Schlagworte'),
        ('13-einplanung.md', 'Einplanungs-API', 'Ressourcenplanung'),
        ('14-zeiterfassung.md', 'Zeiterfassungs-API', 'Kommt/Geht-Buchungen'),
        ('99-sonstige.md', 'Sonstige Typen', 'Weitere Hilfstypen'),
    ]
    
    md += "| Datei | Bereich | Beschreibung |\n"
    md += "|-------|---------|-------------|\n"
    
    for filename, title, desc in file_order:
        if (output_dir / filename).exists():
            md += f"| [{filename}]({filename}) | {title} | {desc} |\n"
    
    md += """
## Häufige Operationen

### Zeitbuchung erstellen
Siehe [07-projektzeit.md](07-projektzeit.md) - `createProjektzeit`

### Projekte lesen
Siehe [05-projekt.md](05-projekt.md) - `readProjekte`

### Mitarbeiter lesen
Siehe [03-mitarbeiter.md](03-mitarbeiter.md) - `readMitarbeiter`

## Datenformate

- **Datum:** `YYYY-MM-DD` (z.B. `2024-01-15`)
- **Zeit:** `HH:MM` (z.B. `08:30`)
- **DateTime:** `YYYY-MM-DDTHH:MM:SS` (z.B. `2024-01-15T08:30:00`)

## Namespace

- **Target Namespace:** `http://zep.provantis.de`
- **SOAP Namespace:** `http://schemas.xmlsoap.org/wsdl/soap/`
"""
    
    with open(output_dir / 'README.md', 'w', encoding='utf-8') as f:
        f.write(md)
    
    print("  Erstellt: README.md")

def main():
    # Pfade
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    wsdl_path = project_dir / 'docs' / 'Zep_V10.wsdl'
    output_dir = project_dir / 'docs' / 'wsdl'
    
    print(f"Lese WSDL: {wsdl_path}")
    
    # WSDL parsen
    tree = ET.parse(wsdl_path)
    root = tree.getroot()
    
    # Schema finden
    schema = root.find('.//xsd:schema', NS)
    
    if schema is None:
        print("Fehler: Kein Schema in der WSDL gefunden!")
        return
    
    # Typen sammeln
    simple_types = []
    complex_types = []
    
    for st in schema.findall('xsd:simpleType', NS):
        simple_types.append(parse_simple_type(st))
    
    for ct in schema.findall('xsd:complexType', NS):
        complex_types.append(parse_complex_type(ct))
    
    print(f"Gefunden: {len(simple_types)} simpleTypes, {len(complex_types)} complexTypes")
    
    # Operationen sammeln
    operations = []
    for porttype in root.findall('.//wsdl:portType', NS):
        for op in porttype.findall('wsdl:operation', NS):
            operations.append(parse_operation(op))
    
    print(f"Gefunden: {len(operations)} Operationen")
    
    # Nach Kategorien sortieren
    categorized_simple = defaultdict(list)
    categorized_complex = defaultdict(list)
    categorized_ops = defaultdict(list)
    
    for st in simple_types:
        cat = categorize_type(st['name'])
        categorized_simple[cat].append(st)
    
    for ct in complex_types:
        cat = categorize_type(ct['name'])
        categorized_complex[cat].append(ct)
    
    for op in operations:
        cat = categorize_type(op['name'])
        categorized_ops[cat].append(op)
    
    # Output-Verzeichnis erstellen
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\nErstelle Dokumentation in: {output_dir}")
    
    # Alle Kategorien
    all_categories = set(categorized_simple.keys()) | set(categorized_complex.keys()) | set(categorized_ops.keys())
    
    for cat in sorted(all_categories):
        write_category_file(
            output_dir, 
            cat,
            categorized_simple.get(cat, []),
            categorized_complex.get(cat, []),
            categorized_ops.get(cat, [])
        )
    
    # Index generieren
    generate_index(output_dir, all_categories)
    
    print(f"\nFertig! Dokumentation erstellt in: {output_dir}")

if __name__ == '__main__':
    main()
