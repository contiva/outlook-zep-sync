# AppointmentRow UX Redesign: Fokus-Karten

**Datum:** 2025-02-04
**Status:** Design validiert, bereit zur Implementierung

## Problemstellung

Die aktuelle `AppointmentRow`-Komponente (~1470 Zeilen) hat folgende UX-Probleme:

- **Zu viele Klicks:** 4 Klicks für einen Einzelsync (Checkbox → Projekt → Task → Sync)
- **Informationsflut:** Zu viele Badges konkurrieren um Aufmerksamkeit (Dauer, Intern/Extern, Call-Type, Abgesagt, etc.)
- **Versteckte Aktionen:** Dropdowns erscheinen erst nach Checkbox-Klick

### Nutzerverhalten

- Einzeln prüfen: Jeden Termin individuell zuordnen
- Nachbearbeitung: Bereits synchronisierte Termine häufig korrigieren
- Entscheidungsgrundlage: Titel + Teilnehmer + Dauer

---

## Lösung: Fokus-Karten

Jeder Termin ist eine kompakte Karte. Sekundäre Infos und Aktionen erscheinen erst bei Fokus.

### Die drei Zustände

#### 1. Collapsed (Standard)

Maximale Übersicht, minimale Info.

```
┌──────────────────────────────────────────────────────────────┐
│ ☑  Daily Standup                      1h   09:00   Mo 03.02.│
└──────────────────────────────────────────────────────────────┘
```

- Nur: Checkbox, Titel, Dauer, Uhrzeit, Datum
- Kein Organisator, keine Badges, keine Teilnehmer
- Farbe zeigt Status (Weiß = offen, Grün = synchronisiert)

#### 2. Focused (Hover oder Klick)

Kontext + Aktionen werden sichtbar.

```
┌──────────────────────────────────────────────────────────────┐
│ ☑  Daily Standup                      1h   09:00   Mo 03.02.│
│    von Dir • 👥 5 Teilnehmer                         Intern │
├──────────────────────────────────────────────────────────────┤
│  [Projekt ▼]    [Task ▼]    [Tätigkeit ▼]    [€]    [Sync]  │
└──────────────────────────────────────────────────────────────┘
```

- Zweite Zeile: Organisator + Teilnehmer + Badge
- Dritte Zeile: Dropdowns sofort sichtbar und bedienbar
- Kein extra Klick auf Checkbox nötig

#### 3. Synced (Bereits in ZEP)

Kompakt mit Edit-Option.

```
┌──────────────────────────────────────────────────────────────┐
│ ✓  Daily Standup                      1h   09:00   Mo 03.02.│
│    Projekt XY / Sprint-Meeting (be)  €                   ✎  │
└──────────────────────────────────────────────────────────────┘
```

- Grüner Haken statt Checkbox
- Gebuchte Info kompakt in Zeile 2
- Stift-Icon öffnet Edit-Modus

---

## Interaktionsmodell

### Fokus aktivieren

- **Hover** (Desktop): Maus über Zeile → expandiert sanft (300ms delay beim Verlassen)
- **Klick**: Zeile bleibt expanded bis Klick außerhalb
- **Tab**: Keyboard-Navigation

### Workflow-Verbesserung

| Vorher              | Nachher                              |
| ------------------- | ------------------------------------ |
| 1. Checkbox klicken | 1. Hover/Klick auf Zeile             |
| 2. Projekt wählen   | 2. Projekt wählen (Task öffnet auto) |
| 3. Task wählen      | 3. Task wählen → Sync aktiv          |
| 4. Sync klicken     | (Enter = Sync)                       |
| **4 Klicks**        | **3 Klicks**                         |

---

## Progressive Projekt-Erfassung

Zeige nur was nötig ist, wähle automatisch wenn eindeutig.

### Regeln

| Situation                    | Verhalten                  |
| ---------------------------- | -------------------------- |
| 1 Task im Projekt            | Auto-select, kein Dropdown |
| 1 Tätigkeit im Task          | Auto-select, kein Dropdown |
| Standard-Tätigkeit definiert | Auto-select                |
| Fakturierbar ist locked      | Kein Toggle, nur Icon      |

### Beispiel: Projekt mit 1 Task

```
→ User wählt "ABC GmbH" (hat nur Task "Beratung", Standard-Tätigkeit "be")

┌──────────────────────────────────────────────────────────────┤
│  ABC GmbH / Beratung (be)                        [€] [Sync] │
└──────────────────────────────────────────────────────────────┘
```

Direkt sync-bereit, keine weiteren Klicks nötig.

### Beispiel: Projekt mit mehreren Tasks

```
→ User wählt "Internes Projekt" (5 Tasks)

┌──────────────────────────────────────────────────────────────┤
│  Internes Projekt    [Task ▼]                                │
└──────────────────────────────────────────────────────────────┘

→ User wählt "Development" (1 Tätigkeit: "en")

┌──────────────────────────────────────────────────────────────┤
│  Internes Projekt / Development (en)             [€] [Sync] │
└──────────────────────────────────────────────────────────────┘
```

---

## Edit-Modus (Synced Entries)

Klick auf ✎ oder Doppelklick auf synchronisierte Zeile.

```
┌──────────────────────────────────────────────────────────────┐
│ ✓  Daily Standup                      1h   09:00   Mo 03.02.│
│    von Dir • 👥 3                                     Intern │
├──────────────────────────────────────────────────────────────┤
│  [ABC GmbH ▼]  [Beratung ▼]  (be)  [€]    [Speichern]  [✕]  │
└──────────────────────────────────────────────────────────────┘
```

- Gleiche progressive Logik wie Neu-Erfassung
- Änderungen werden gelb hervorgehoben
- **Speichern** statt "Sync" (klarer)
- **✕** bricht ab

### Zeit-Korrektur

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠  Daily Standup                      1h   09:00   Mo 03.02.│
│    ZEP: 08:00–09:00 → Outlook: 09:00–10:00      [Korrigieren]│
└──────────────────────────────────────────────────────────────┘
```

- Gelbes Warn-Icon bei Zeitdifferenz
- Ein-Klick-Korrektur

---

## Visuelles System

### Farbsystem

| Zustand        | Hintergrund    | Linker Rand | Icon       |
| -------------- | -------------- | ----------- | ---------- |
| Offen          | Weiß           | Keiner      | ☐ Checkbox |
| Fokussiert     | `blue-50`      | Blau 2px    | ☐ Checkbox |
| Sync-Ready     | Amber-Gradient | Amber 2px   | ☑ Checked  |
| Synchronisiert | Grün-Gradient  | Grün 2px    | ✓ Grün     |
| Zeit-Konflikt  | Gelb           | Gelb 2px    | ⚠ Gelb     |
| Abgesagt       | Grau           | Rot 2px     | ✗ Rot      |

### Typografie

```
Daily Standup                    ← Bold, Schwarz, 14px
von Max Müller • 👥 5            ← Light, Grau, 12px
ABC GmbH / Beratung (be)         ← Medium, Dunkelgrau, 12px
09:00–10:00  Mo 03.02.           ← Semibold Zeit, Medium Datum, 12px
```

### Reduzierte Badges

- **Entfernt:** Separate Badges für Intern/Extern, Call, Video
- **Neu:**
  - 👥 + externe Domain → impliziert Extern
  - 📞 vor Titel → Call
  - Teams-Icon links → Online-Meeting

---

## Implementierungshinweise

### Komponenten-Struktur

```
AppointmentRow/
├── AppointmentRowCollapsed.tsx    # Minimale Ansicht
├── AppointmentRowExpanded.tsx     # Mit Details + Dropdowns
├── AppointmentRowSynced.tsx       # Synchronisiert
├── ProjectSelector.tsx            # Progressive Dropdown-Logik
└── index.tsx                      # State-Management, welche Ansicht
```

### Wichtige Änderungen

1. **Fokus-State auf Zeilen-Ebene** statt Checkbox-basiert
2. **Auto-Select Logik** in `ProjectSelector` kapseln
3. **Hover-Delay** für stabiles Dropdown-Verhalten
4. **Keyboard-Support** (Tab, Enter, Escape)

---

## Nächste Schritte

1. [ ] Design-Review mit Stakeholdern
2. [ ] Komponenten-Refactoring planen
3. [ ] Progressive Dropdown-Logik implementieren
4. [ ] Fokus-Interaktion implementieren
5. [ ] Visuelles Redesign umsetzen
6. [ ] Testing mit echten Daten
