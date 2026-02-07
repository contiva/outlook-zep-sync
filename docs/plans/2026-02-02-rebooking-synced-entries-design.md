# Design: Umbuchen von synchronisierten Terminen

## Übersicht

Bereits synchronisierte Termine können nachträglich auf ein anderes Projekt/Task umgebucht oder die Tätigkeit geändert werden. Die Änderungen werden gesammelt und mit dem bestehenden "Synchronisieren"-Button übertragen.

## Anforderungen

### Was geändert werden kann

- Projekt und Task (Umbuchen auf anderes Projekt/Vorgang)
- Tätigkeit (z.B. von "Besprechung" auf "Entwicklung")

### Was NICHT geändert wird

- Zeiten (Start/Ende bleiben wie synchronisiert)
- Bemerkung/Notizen

## UI-Design

### AppointmentRow für synchronisierte Termine

**Aktueller Zustand:**

- Grüner Haken + "In ZEP" Badge
- Projekt/Task/Tätigkeit werden als read-only Badge angezeigt
- Keine Bearbeitungsmöglichkeit

**Neuer Zustand:**

- Grüner Haken + "In ZEP" Badge (unverändert)
- Neuer Bearbeiten-Button (Stift-Icon) rechts neben dem Badge
- Klick auf Bearbeiten:
  - Blendet Dropdowns ein (Projekt, Task, Tätigkeit)
  - Dropdowns sind mit aktuellen ZEP-Werten vorausgewählt
  - Abbrechen-Button (X) um Bearbeitung zu verwerfen
  - Kein separater Speichern-Button (Sammlung über Sync-Button)

### Visuelles Feedback für geänderte Termine

- Oranger Rahmen um die Zeile
- Badge "Geändert" (orange) neben "In ZEP"
- Im Sync-Confirmation-Dialog:
  - Sektion "Neue Einträge" (wie bisher)
  - Sektion "Geänderte Einträge" (neu)

## Technische Umsetzung

### 1. SOAP API erweitern (`lib/zep-soap.ts`)

Neue Funktion für Updates:

```typescript
interface ModifyProjektzeitRequest {
  requestHeader: RequestHeader;
  projektzeit: SoapProjektzeit; // Mit id für Update
}

interface ModifyProjektzeitResponse {
  responseHeader: ResponseHeader;
}

export async function modifyProjektzeit(token: string, projektzeit: SoapProjektzeit): Promise<void>;
```

### 2. API Route (`app/api/zep/timeentries/route.ts`)

PATCH oder PUT Methode hinzufügen:

```typescript
export async function PATCH(request: Request) {
  // Einzelnen Eintrag aktualisieren
  const { id, projektNr, vorgangNr, taetigkeit } = await request.json();
  await modifyProjektzeit(token, { id, projektNr, vorgangNr, taetigkeit, ... });
}
```

### 3. State-Management (`dashboard/page.tsx`)

Neue States:

```typescript
// Welche synchronisierten Termine werden gerade bearbeitet
const [editingAppointments, setEditingAppointments] = useState<Set<string>>(new Set());

// Geänderte Werte für synchronisierte Termine (key = outlookEventId)
const [modifiedEntries, setModifiedEntries] = useState<Map<string, ModifiedEntry>>(new Map());

interface ModifiedEntry {
  zepId: number; // ZEP Projektzeit ID
  originalProjectId: number;
  originalTaskId: number;
  originalActivityId: string;
  newProjectId: number | null;
  newTaskId: number | null;
  newActivityId: string;
  newProjektNr: string; // Für SOAP API
  newVorgangNr: string; // Für SOAP API
}
```

Neue Funktionen:

```typescript
// Bearbeitung starten
const startEditingSyncedAppointment = (appointmentId: string) => {
  setEditingAppointments((prev) => new Set(prev).add(appointmentId));
};

// Bearbeitung abbrechen
const cancelEditingSyncedAppointment = (appointmentId: string) => {
  setEditingAppointments((prev) => {
    const next = new Set(prev);
    next.delete(appointmentId);
    return next;
  });
  setModifiedEntries((prev) => {
    const next = new Map(prev);
    next.delete(appointmentId);
    return next;
  });
};

// Änderung speichern (lokal)
const updateModifiedEntry = (appointmentId: string, changes: Partial<ModifiedEntry>) => {
  setModifiedEntries((prev) => {
    const next = new Map(prev);
    const existing = next.get(appointmentId) || createInitialModifiedEntry(appointmentId);
    next.set(appointmentId, { ...existing, ...changes });
    return next;
  });
};
```

### 4. Sync-Flow anpassen (`submitToZep`)

```typescript
const submitToZep = async (appointmentsToSync: Appointment[]) => {
  // 1. Neue Einträge erstellen (wie bisher)
  const newEntries = appointmentsToSync.filter((apt) => !isAppointmentSynced(apt, syncedEntries));
  // ... createProjektzeit für jeden

  // 2. Geänderte Einträge aktualisieren (NEU)
  const entriesToModify = Array.from(modifiedEntries.values());
  for (const entry of entriesToModify) {
    await fetch('/api/zep/timeentries', {
      method: 'PATCH',
      body: JSON.stringify({
        id: entry.zepId,
        projektNr: entry.newProjektNr,
        vorgangNr: entry.newVorgangNr,
        taetigkeit: entry.newActivityId,
      }),
    });
  }

  // 3. States zurücksetzen
  setEditingAppointments(new Set());
  setModifiedEntries(new Map());

  // 4. Sync-Status neu laden
  // ...
};
```

### 5. AppointmentRow Props erweitern

```typescript
interface AppointmentRowProps {
  // ... existing props
  isEditing?: boolean; // Wird gerade bearbeitet
  isModified?: boolean; // Hat ungespeicherte Änderungen
  modifiedValues?: ModifiedEntry; // Die geänderten Werte
  onStartEdit?: () => void; // Bearbeiten-Button geklickt
  onCancelEdit?: () => void; // Abbrechen-Button geklickt
  onModifyProject?: (projectId: number | null) => void;
  onModifyTask?: (taskId: number | null) => void;
  onModifyActivity?: (activityId: string) => void;
}
```

### 6. SyncConfirmDialog erweitern

Dialog zeigt zwei Sektionen:

- "Neue Einträge erstellen" (Anzahl + Liste)
- "Einträge aktualisieren" (Anzahl + Liste mit Änderungen)

## Implementierungsreihenfolge

1. SOAP `modifyProjektzeit` Funktion implementieren
2. API Route PATCH Methode hinzufügen
3. Dashboard State-Management erweitern
4. AppointmentRow UI für Bearbeitung anpassen
5. SyncConfirmDialog für Updates erweitern
6. submitToZep Flow anpassen
7. Testen

## Offene Fragen

- Soll die ZEP Projektzeit-ID aus dem localStorage (sync-history) oder aus syncedEntries kommen?
  → Aus syncedEntries, da dort die vollständigen Daten vorliegen

## Risiken

- ZEP SOAP `modifyProjektzeit` könnte andere Parameter erwarten → API-Dokumentation prüfen
- Concurrent Updates wenn mehrere Browser-Tabs offen → Akzeptables Risiko für Single-User-App
