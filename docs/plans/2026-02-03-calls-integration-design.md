# Design: Calls in Dashboard integrieren

**Datum:** 2026-02-03
**Status:** Approved

## Übersicht

Ein Toggle-Button im Dashboard aktiviert das Laden von Call-Daten via Microsoft Graph API. Calls werden mit Kalender-Terminen gemischt und nach Zeit sortiert. Ein "Call"-Badge unterscheidet sie visuell. Duplikate werden zugunsten des Kalender-Termins entfernt.

## Entscheidungen

| Frage                   | Entscheidung                                                |
| ----------------------- | ----------------------------------------------------------- |
| Ansicht                 | Integriert - Calls und Termine gemischt, nach Zeit sortiert |
| Laden                   | On-Demand via Toggle-Button                                 |
| Datenquelle             | Live API (Microsoft Graph, ~30s)                            |
| Visuelle Unterscheidung | Badge "Call" neben Titel                                    |
| Duplikate               | Deduplizieren - Kalender-Termin hat Vorrang                 |

## Datenfluss

```
User aktiviert Toggle
    ↓
/api/calls (Microsoft Graph, ~30s)
    ↓
Calls + Appointments mergen
    ↓
Duplikate entfernen (Kalender-Termin gewinnt)
    ↓
Nach Startzeit sortieren
    ↓
Gemischte Liste anzeigen
```

## API-Endpoint

### `GET /api/calls`

**Input:**

```
?startDate=2026-01-05&endDate=2026-02-02
```

**Output:**

```typescript
{
  calls: [
    {
      id: "abc-123",
      subject: "Call mit Sven Brandt",
      start: "2026-01-07T12:31:00",
      end: "2026-01-07T12:38:00",
      type: "call",
      callType: "Phone" | "Video" | "ScreenShare",
      direction: "incoming" | "outgoing",
      participants: ["Sven Brandt"],
      organizer: "Robert Fels"
    }
  ],
  duration: 30.5
}
```

**Besonderheiten:**

- Nutzt Microsoft Graph Token aus Session
- Parallel-Batching (20 gleichzeitig)
- Filtert: nur Calls > 5 min, keine geplanten Meetings
- Subject generiert aus Teilnehmern

## Integration in Appointment-Struktur

```typescript
// Bestehendes Interface erweitern
interface Appointment {
  // ... bestehende Felder
  type?: 'calendar' | 'call';
  callType?: 'Phone' | 'Video' | 'ScreenShare';
  direction?: 'incoming' | 'outgoing';
}

// Mapping Call → Appointment
{
  id: call.id,
  subject: `Call mit ${call.participants[0]}`,
  start: call.start,
  end: call.end,
  attendees: call.participants.map(name => ({ name })),
  organizer: call.organizer,
  type: 'call',
  callType: call.callType,
  direction: call.direction,
  selected: false,
  projectId: null,
  taskId: null,
}
```

**Deduplizierung:**

- Für jeden Call: Prüfe ob Kalender-Termin mit ±5 min Überlappung existiert
- Falls ja: Call verwerfen (Kalender-Termin bleibt)

## UI-Änderungen

### 1. Dashboard Header

```
[DateRangePicker] [Laden] [Calls laden ○───]
                           ↑ Toggle mit Loading-Spinner
```

### 2. AppointmentRow Badge

```
[✓] Call mit Sven Brandt  [Call] [Phone] [32m]
                            ↑      ↑
                         Blau   Grau (Typ)
```

### 3. Loading-State

- Toggle disabled während Laden
- Spinner + "Calls werden geladen..." Text
- Progress optional

### 4. Heatmap

- Calls zählen zur Tages-Statistik
- Gleiche Farb-Logik (grün=synced, grau=unsynced)

## Implementierungsschritte

1. API-Endpoint `/api/calls` erstellen
2. Appointment-Interface erweitern
3. Toggle-Button im Dashboard hinzufügen
4. Call-Daten laden und mergen
5. Deduplizierung implementieren
6. AppointmentRow um Call-Badge erweitern
7. Heatmap-Integration
