import { DuplicateCheckResult } from '@/lib/zep-api';
import { RedisSyncMapping } from '@/lib/redis';
import { ActualDuration } from '@/lib/teams-utils';

// Zugeordnete Tätigkeit (zu Projekt oder Vorgang)
export interface AssignedActivity {
  name: string; // Tätigkeit-Kürzel
  standard: boolean; // true wenn Standard-Tätigkeit
}

export interface WorkLocation {
  kurzform: string;
  bezeichnung: string;
  heimarbeitsort: boolean;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  activities?: AssignedActivity[]; // Dem Projekt zugeordnete Tätigkeiten
  workLocations?: string[]; // Projektspezifische Einschränkungen (Kurzformen)
  voreinstFakturierbarkeit?: number; // 1-4: Projekt-Level Fakturierbarkeit
  defaultFakt?: number; // 1-4: Projekt-Level Fakturierbarkeit (alternative)
}

export interface Task {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  activities?: AssignedActivity[]; // Dem Vorgang zugeordnete Tätigkeiten (leer = erbt vom Projekt)
  defaultFakt?: number; // 0=vom Projekt geerbt, 1-4=eigene Einstellung
}

export interface Activity {
  name: string;
  description: string;
}

export interface SyncedEntry {
  id: number;
  date: string;
  from: string;
  to: string;
  note: string | null;
  employee_id: string;
  project_id: number;
  project_task_id: number;
  activity_id: string;
  billable: boolean;
  projektNr?: string;
  vorgangNr?: string;
  work_location_id?: string | null;
}

// Modified entry for rebooking
export interface ModifiedEntry {
  zepId: number;
  outlookEventId: string;
  originalProjectId: number;
  originalTaskId: number;
  originalActivityId: string;
  originalBillable: boolean;
  newProjectId: number;
  newTaskId: number;
  newActivityId: string;
  newBillable: boolean;
  newOrt?: string;
  newProjektNr: string;
  newVorgangNr: string;
  userId: string;
  datum: string;
  von: string;
  bis: string;
  bemerkung?: string;
  // New time values (when user changes planned/actual time in edit mode)
  newVon?: string;
  newBis?: string;
}

export interface Attendee {
  emailAddress: {
    name: string;
    address: string;
  };
  type: 'required' | 'optional' | 'resource';
  status: {
    response: string;
  };
}

export interface Appointment {
  id: string;
  subject: string;
  start: { dateTime: string };
  end: { dateTime: string };
  selected: boolean;
  projectId: number | null;
  taskId: number | null;
  activityId: string;
  billable: boolean;
  canChangeBillable: boolean;
  attendees?: Attendee[];
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  isOrganizer?: boolean;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
  onlineMeeting?: { joinUrl?: string };
  // Abgesagte Termine
  isCancelled?: boolean;
  lastModifiedDateTime?: string;
  type?: 'calendar' | 'call' | 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  callType?: 'Phone' | 'Video' | 'ScreenShare';
  direction?: 'incoming' | 'outgoing';
  useActualTime?: boolean; // true = use actual time from call records, false = use planned time
  manualDurationMinutes?: number; // Manual "Ist" duration in minutes (for appointments without call data)
  customRemark?: string; // Optional: alternative remark for ZEP (overrides subject)
  workLocation?: string;
  // Location
  location?: {
    displayName?: string;
    locationType?: string;
  };
  // Body preview und full body (für Zoom-Link Erkennung etc.)
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
}

export interface AppointmentRowProps {
  appointment: Appointment;
  projects: Project[];
  tasks: Task[];
  allTasks?: Record<number, Task[]>;
  activities: Activity[];
  isSynced?: boolean;
  isSyncReady?: boolean;
  syncedEntry?: SyncedEntry | null;
  duplicateWarning?: DuplicateCheckResult;
  loadingTasks?: boolean;
  // Actual meeting duration from call records
  actualDuration?: ActualDuration;
  onToggle: (id: string) => void;
  onProjectChange: (id: string, projectId: number | null) => void;
  onTaskChange: (id: string, taskId: number | null) => void;
  onActivityChange: (id: string, activityId: string) => void;
  onBillableChange: (id: string, billable: boolean) => void;
  onCustomRemarkChange?: (id: string, customRemark: string) => void;
  // Toggle between planned and actual time for ZEP sync
  onUseActualTimeChange?: (id: string, useActual: boolean) => void;
  // Manual duration change (for appointments without call data)
  onManualDurationChange?: (id: string, durationMinutes: number | undefined) => void;
  // Single row sync
  onSyncSingle?: (appointment: Appointment) => void;
  isSyncingSingle?: boolean;
  // Editing synced entries (rebooking)
  isEditing?: boolean;
  modifiedEntry?: ModifiedEntry;
  onStartEditSynced?: (appointmentId: string) => void;
  onCancelEditSynced?: (appointmentId: string) => void;
  onModifyProject?: (
    appointmentId: string,
    apt: Appointment,
    syncedEntry: SyncedEntry,
    projectId: number,
  ) => void;
  onModifyTask?: (appointmentId: string, taskId: number) => void;
  onModifyActivity?: (
    appointmentId: string,
    apt: Appointment,
    syncedEntry: SyncedEntry,
    activityId: string,
  ) => void;
  onModifyBillable?: (
    appointmentId: string,
    apt: Appointment,
    syncedEntry: SyncedEntry,
    billable: boolean,
  ) => void;
  onModifyBemerkung?: (
    appointmentId: string,
    apt: Appointment,
    syncedEntry: SyncedEntry,
    bemerkung: string,
  ) => void;
  onModifyTime?: (
    appointmentId: string,
    apt: Appointment,
    syncedEntry: SyncedEntry,
    useActualTime: boolean,
  ) => void;
  globalWorkLocations?: WorkLocation[];
  onWorkLocationChange?: (id: string, workLocation: string | undefined) => void;
  onModifyWorkLocation?: (
    appointmentId: string,
    apt: Appointment,
    syncedEntry: SyncedEntry,
    workLocation: string | undefined,
  ) => void;
  onSaveModifiedSingle?: (modifiedEntry: ModifiedEntry) => void;
  isSavingModifiedSingle?: boolean;
  // Delete synced entry
  onDeleteSynced?: (zepId: number, outlookEventId: string) => void;
  isDeletingSynced?: boolean;
  // Rescheduled appointment correction
  onCorrectTime?: (appointmentId: string, duplicateWarning: DuplicateCheckResult) => void;
  isCorrectingTime?: boolean;
  // Conflict link popover
  onLinkToZep?: (appointmentId: string, zepEntryId: number) => void;
  syncedEntries?: SyncedEntry[];
  syncMappings?: Map<string, RedisSyncMapping>;
  linkedZepIds?: Set<number>;
  // Keyboard navigation focus
  isFocused?: boolean;
}
