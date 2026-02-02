"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Users, CheckCircle, CloudUpload, ExternalLink, AlertTriangle, Pencil, X, Check, HelpCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { getZepIdForOutlookEvent, getZepAttendanceUrl } from "@/lib/sync-history";
import SearchableSelect, { SelectOption } from "./SearchableSelect";
import { DuplicateCheckResult } from "@/lib/zep-api";

// Zugeordnete Tätigkeit (zu Projekt oder Vorgang)
interface AssignedActivity {
  name: string;      // Tätigkeit-Kürzel
  standard: boolean; // true wenn Standard-Tätigkeit
}

interface Project {
  id: number;
  name: string;
  description: string;
  activities?: AssignedActivity[]; // Dem Projekt zugeordnete Tätigkeiten
}

interface Task {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  activities?: AssignedActivity[]; // Dem Vorgang zugeordnete Tätigkeiten (leer = erbt vom Projekt)
}

interface Activity {
  name: string;
  description: string;
}

interface SyncedEntry {
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
}

// Modified entry for rebooking
interface ModifiedEntry {
  zepId: number;
  outlookEventId: string;
  originalProjectId: number;
  originalTaskId: number;
  originalActivityId: string;
  newProjectId: number;
  newTaskId: number;
  newActivityId: string;
  newProjektNr: string;
  newVorgangNr: string;
}

interface Attendee {
  emailAddress: {
    name: string;
    address: string;
  };
  type: "required" | "optional" | "resource";
  status: {
    response: string;
  };
}

interface Appointment {
  id: string;
  subject: string;
  start: { dateTime: string };
  end: { dateTime: string };
  selected: boolean;
  projectId: number | null;
  taskId: number | null;
  activityId: string;
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
}

interface AppointmentRowProps {
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
  onToggle: (id: string) => void;
  onProjectChange: (id: string, projectId: number | null) => void;
  onTaskChange: (id: string, taskId: number | null) => void;
  onActivityChange: (id: string, activityId: string) => void;
  // Editing synced entries (rebooking)
  isEditing?: boolean;
  modifiedEntry?: ModifiedEntry;
  onStartEditSynced?: (appointmentId: string) => void;
  onCancelEditSynced?: (appointmentId: string) => void;
  onModifyProject?: (appointmentId: string, apt: Appointment, syncedEntry: SyncedEntry, projectId: number) => void;
  onModifyTask?: (appointmentId: string, taskId: number) => void;
  onModifyActivity?: (appointmentId: string, apt: Appointment, syncedEntry: SyncedEntry, activityId: string) => void;
  // Rescheduled appointment correction
  onCorrectTime?: (appointmentId: string, duplicateWarning: DuplicateCheckResult) => void;
  isCorrectingTime?: boolean;
}

function getStatusColor(response: string): string {
  switch (response) {
    case "accepted":
      return "text-green-600";
    case "tentativelyAccepted":
      return "text-yellow-600";
    case "declined":
      return "text-red-600";
    case "organizer":
      return "text-blue-600";
    default:
      return "text-gray-400";
  }
}

function getStatusIcon(response: string): string {
  switch (response) {
    case "accepted":
      return "✓";
    case "tentativelyAccepted":
      return "?";
    case "declined":
      return "✗";
    case "organizer":
      return "★";
    default:
      return "○";
  }
}

// Attendee Status Icon Component
function AttendeeStatusIcon({ response }: { response: string }) {
  switch (response) {
    case "accepted":
      return <Check size={12} className="text-green-600" />;
    case "tentativelyAccepted":
      return <HelpCircle size={12} className="text-amber-500" />;
    case "declined":
      return <XCircle size={12} className="text-red-500" />;
    case "organizer":
      return <span className="text-blue-600 text-xs font-medium">★</span>;
    default:
      return <Clock size={12} className="text-gray-400" />;
  }
}

function getStatusLabel(response: string): string {
  switch (response) {
    case "accepted":
      return "Zugesagt";
    case "tentativelyAccepted":
      return "Vorbehaltlich";
    case "declined":
      return "Abgesagt";
    case "organizer":
      return "Organisator";
    case "none":
    case "notResponded":
    default:
      return "Keine Antwort";
  }
}

// Attendee Popover Component
interface AttendeePopoverProps {
  attendees: Attendee[];
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  isOrganizer?: boolean;
}

function AttendeePopover({ attendees, organizer, isOrganizer }: AttendeePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const attendeeCount = attendees.length;
  const domains = [...new Set(attendees.map(a => a.emailAddress.address.split('@')[1]).filter(Boolean))];
  
  // Group attendees by status
  const accepted = attendees.filter(a => a.status.response === "accepted");
  const tentative = attendees.filter(a => a.status.response === "tentativelyAccepted");
  const declined = attendees.filter(a => a.status.response === "declined");
  const noResponse = attendees.filter(a => !["accepted", "tentativelyAccepted", "declined", "organizer"].includes(a.status.response));

  return (
    <div className="relative inline-flex">
      <span className="text-gray-300">•</span>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 ml-2 hover:text-gray-700 transition-colors"
      >
        <Users size={11} />
        <span>{attendeeCount}</span>
        <span className="text-gray-400">
          ({domains.join(', ')})
        </span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[280px] max-w-[360px]"
        >
          <div className="text-xs font-medium text-gray-700 mb-2">
            {attendeeCount} Teilnehmer
          </div>
          
          {/* Organizer - highlighted at top */}
          {organizer && (
            <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-[10px] uppercase tracking-wide text-blue-600 font-medium mb-1">
                Organisator
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-blue-600 font-bold">★</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-gray-800 font-medium">
                    {isOrganizer ? "Du" : (organizer.emailAddress.name || organizer.emailAddress.address.split('@')[0])}
                  </div>
                  <div className="truncate text-gray-400 text-[10px]">{organizer.emailAddress.address}</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {/* Accepted */}
            {accepted.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-green-600 font-medium mb-1">
                  Zugesagt ({accepted.length})
                </div>
                {accepted.map((a, i) => (
                  <AttendeeItem key={i} attendee={a} />
                ))}
              </div>
            )}

            {/* Tentative */}
            {tentative.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-amber-600 font-medium mb-1">
                  Vorbehaltlich ({tentative.length})
                </div>
                {tentative.map((a, i) => (
                  <AttendeeItem key={i} attendee={a} />
                ))}
              </div>
            )}

            {/* Declined */}
            {declined.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-red-600 font-medium mb-1">
                  Abgesagt ({declined.length})
                </div>
                {declined.map((a, i) => (
                  <AttendeeItem key={i} attendee={a} />
                ))}
              </div>
            )}

            {/* No Response */}
            {noResponse.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1">
                  Keine Antwort ({noResponse.length})
                </div>
                {noResponse.map((a, i) => (
                  <AttendeeItem key={i} attendee={a} />
                ))}
              </div>
            )}
          </div>

          {/* Domain summary */}
          <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500">
            Domains: {domains.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

// Single Attendee Item
function AttendeeItem({ attendee }: { attendee: Attendee }) {
  const name = attendee.emailAddress.name || attendee.emailAddress.address.split('@')[0];
  const email = attendee.emailAddress.address;
  const domain = email.split('@')[1];

  return (
    <div className="flex items-center gap-2 py-0.5 text-xs">
      <AttendeeStatusIcon response={attendee.status.response} />
      <div className="flex-1 min-w-0">
        <div className="truncate text-gray-800">{name}</div>
        <div className="truncate text-gray-400 text-[10px]">{email}</div>
      </div>
    </div>
  );
}

export default function AppointmentRow({
  appointment,
  projects,
  tasks,
  allTasks,
  activities,
  isSynced = false,
  isSyncReady = false,
  syncedEntry,
  duplicateWarning,
  loadingTasks = false,
  onToggle,
  onProjectChange,
  onTaskChange,
  onActivityChange,
  isEditing = false,
  modifiedEntry,
  onStartEditSynced,
  onCancelEditSynced,
  onModifyProject,
  onModifyTask,
  onModifyActivity,
  onCorrectTime,
  isCorrectingTime = false,
}: AppointmentRowProps) {
  const startDate = new Date(appointment.start.dateTime);
  const endDate = new Date(appointment.end.dateTime);

  const dayLabel = format(startDate, "EE dd.MM.", { locale: de });
  const startTime = format(startDate, "HH:mm");
  const endTime = format(endDate, "HH:mm");

  const durationMinutes = (endDate.getTime() - startDate.getTime()) / 1000 / 60;
  const durationHours = Math.floor(durationMinutes / 60);
  const durationMins = Math.round(durationMinutes % 60);

  const attendees = appointment.attendees || [];
  const attendeeCount = attendees.length;

  // Konvertiere Projekte zu SelectOptions
  const projectOptions: SelectOption[] = useMemo(
    () =>
      projects.map((p) => ({
        value: p.id,
        label: p.name,
        description: p.description || null,
      })),
    [projects]
  );

  // Konvertiere Tasks zu SelectOptions
  const taskOptions: SelectOption[] = useMemo(
    () =>
      tasks.map((t) => ({
        value: t.id,
        label: t.name,
        description: t.description,
      })),
    [tasks]
  );

  // Task options for editing mode (based on modified project or synced project)
  const editingTaskOptions: SelectOption[] = useMemo(() => {
    if (!isEditing || !allTasks) return [];
    const projectId = modifiedEntry?.newProjectId || syncedEntry?.project_id;
    if (!projectId) return [];
    const projectTasks = allTasks[projectId] || [];
    return projectTasks.map((t) => ({
      value: t.id,
      label: t.name,
      description: t.description,
    }));
  }, [isEditing, allTasks, modifiedEntry?.newProjectId, syncedEntry?.project_id]);

  // Konvertiere Activities zu SelectOptions - gefiltert nach Projekt/Vorgang
  const activityOptions: SelectOption[] = useMemo(() => {
    // Determine which project and task are currently selected
    const selectedProjectId = isEditing
      ? (modifiedEntry?.newProjectId || syncedEntry?.project_id)
      : appointment.projectId;
    const selectedTaskId = isEditing
      ? (modifiedEntry?.newTaskId || syncedEntry?.project_task_id)
      : appointment.taskId;

    // Find the selected task and project
    let selectedTask: Task | undefined;
    if (selectedTaskId && selectedProjectId) {
      // In editing mode, use allTasks; otherwise use tasks prop
      if (isEditing && allTasks && allTasks[selectedProjectId]) {
        selectedTask = allTasks[selectedProjectId].find(t => t.id === selectedTaskId);
      } else {
        selectedTask = tasks.find(t => t.id === selectedTaskId);
      }
    }
    const selectedProject = selectedProjectId
      ? projects.find(p => p.id === selectedProjectId)
      : undefined;

    // Get assigned activities: Task activities take precedence over Project activities
    let assignedActivities: AssignedActivity[] = [];
    if (selectedTask?.activities && selectedTask.activities.length > 0) {
      assignedActivities = selectedTask.activities;
    } else if (selectedProject?.activities && selectedProject.activities.length > 0) {
      assignedActivities = selectedProject.activities;
    }

    // If we have assigned activities, filter the global activities list
    if (assignedActivities.length > 0) {
      const assignedNames = new Set(assignedActivities.map(a => a.name));
      const filteredActivities = activities.filter(a => assignedNames.has(a.name));
      
      return filteredActivities.map((a) => {
        const assigned = assignedActivities.find(aa => aa.name === a.name);
        return {
          value: a.name,
          label: assigned?.standard ? `${a.name} (Standard)` : a.name,
          description: a.description,
        };
      });
    }

    // Fallback: show all global activities
    return activities.map((a) => ({
      value: a.name,
      label: a.name,
      description: a.description,
    }));
  }, [activities, projects, tasks, allTasks, appointment.projectId, appointment.taskId, isEditing, modifiedEntry?.newProjectId, modifiedEntry?.newTaskId, syncedEntry?.project_id, syncedEntry?.project_task_id]);

  // Get ZEP link if this appointment was synced
  const zepLink = useMemo(() => {
    const zepId = getZepIdForOutlookEvent(appointment.id);
    if (zepId) {
      return getZepAttendanceUrl(zepId);
    }
    return null;
  }, [appointment.id]);

  // Check if this entry has been modified (for visual indicator)
  const isModified = useMemo(() => {
    if (!modifiedEntry || !syncedEntry) return false;
    return (
      modifiedEntry.newProjectId !== syncedEntry.project_id ||
      modifiedEntry.newTaskId !== syncedEntry.project_task_id ||
      modifiedEntry.newActivityId !== syncedEntry.activity_id
    );
  }, [modifiedEntry, syncedEntry]);

  // Check if modification is complete (has project and task selected)
  const isModificationComplete = useMemo(() => {
    if (!modifiedEntry) return false;
    return modifiedEntry.newProjectId > 0 && modifiedEntry.newTaskId > 0;
  }, [modifiedEntry]);

  // Get synced project/task info for display
  const syncedInfo = useMemo(() => {
    if (!syncedEntry) return null;
    
    const project = projects.find((p) => p.id === syncedEntry.project_id);
    const activity = activities.find((a) => a.name === syncedEntry.activity_id);
    
    // Find task in allTasks if available
    let taskName: string | null = null;
    if (allTasks && syncedEntry.project_id && syncedEntry.project_task_id) {
      const projectTasks = allTasks[syncedEntry.project_id];
      if (projectTasks) {
        const task = projectTasks.find((t) => t.id === syncedEntry.project_task_id);
        taskName = task?.name || null;
      }
    }
    
    return {
      projectName: project?.name || `Projekt #${syncedEntry.project_id}`,
      taskName: taskName,
      activityName: activity?.description || syncedEntry.activity_id,
      billable: syncedEntry.billable,
    };
  }, [syncedEntry, projects, activities, allTasks]);

  // Muted state for unselected, non-synced appointments
  const isMuted = !appointment.selected && !isSynced && !isSyncReady;

  return (
    <div
      className={`px-3 py-2 border-b border-gray-100 ${
        isSynced 
          ? "bg-gradient-to-r from-green-50 via-emerald-50/50 to-white" 
          : isSyncReady
            ? "bg-gradient-to-r from-amber-50 via-yellow-50/50 to-white"
            : appointment.selected 
              ? "bg-white" 
              : "bg-gray-50/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status icons: Synced (green) or Checkbox + SyncReady indicator (amber) */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
          {isSynced ? (
            <div 
              className="h-5 w-5 flex items-center justify-center" 
              title="Bereits in ZEP synchronisiert"
              role="img"
              aria-label="Bereits in ZEP synchronisiert"
            >
              <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
            </div>
          ) : (
            <>
              <input
                type="checkbox"
                checked={appointment.selected}
                onChange={() => onToggle(appointment.id)}
                className="h-4 w-4 text-blue-600 rounded"
                aria-label={`Termin auswählen: ${appointment.subject}`}
              />
              {isSyncReady && (
                <div 
                  className="h-4 w-4 flex items-center justify-center" 
                  title="Wird beim nächsten Sync übertragen"
                  role="img"
                  aria-label="Bereit zum Synchronisieren"
                >
                  <CloudUpload className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                </div>
              )}
              {duplicateWarning?.hasDuplicate && !isSynced && (
                <div 
                  className="h-4 w-4 flex items-center justify-center" 
                  title={duplicateWarning.message || "Mögliches Duplikat erkannt"}
                  role="img"
                  aria-label={duplicateWarning.message || "Mögliches Duplikat erkannt"}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Main content - Title on top, details below */}
        <div className="flex-1 min-w-0">
          {/* Title row with duration */}
          <div className="flex items-center gap-1.5">
            {appointment.isOnlineMeeting && appointment.onlineMeetingProvider === "teamsForBusiness" && (
              <svg
                className={`w-3.5 h-3.5 flex-shrink-0 ${isMuted ? "opacity-40" : ""}`}
                viewBox="0 0 2228.833 2073.333"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Teams Meeting"
              >
                <path fill="#5059C9" d="M1554.637 777.5h575.713c54.391 0 98.483 44.092 98.483 98.483v524.398c0 199.901-162.051 361.952-361.952 361.952h-1.711c-199.901.028-361.975-162.023-362.004-361.924V828.971c.001-28.427 23.045-51.471 51.471-51.471z"/>
                <circle fill="#5059C9" cx="1943.75" cy="440.583" r="233.25"/>
                <circle fill="#7B83EB" cx="1218.083" cy="336.917" r="336.917"/>
                <path fill="#7B83EB" d="M1667.323 777.5H717.01c-53.743 1.33-96.257 45.931-95.01 99.676v598.105c-7.505 322.519 247.657 590.16 570.167 598.053 322.51-7.893 577.671-275.534 570.167-598.053V877.176c1.245-53.745-41.268-98.346-95.011-99.676z"/>
                <linearGradient id="a" gradientUnits="userSpaceOnUse" x1="198.099" y1="1683.0726" x2="942.2344" y2="394.2607" gradientTransform="matrix(1 0 0 -1 0 2075.3333)">
                  <stop offset="0" stopColor="#5a62c3"/><stop offset=".5" stopColor="#4d55bd"/><stop offset="1" stopColor="#3940ab"/>
                </linearGradient>
                <path fill="url(#a)" d="M95.01 466.5h950.312c52.473 0 95.01 42.538 95.01 95.01v950.312c0 52.473-42.538 95.01-95.01 95.01H95.01c-52.473 0-95.01-42.538-95.01-95.01V561.51c0-52.472 42.538-95.01 95.01-95.01z"/>
                <path fill="#FFF" d="M820.211 828.193H630.241v517.297H509.211V828.193H320.123V727.844h500.088v100.349z"/>
              </svg>
            )}
            {appointment.subject ? (
              <span className={`font-medium text-sm truncate ${isMuted ? "text-gray-400" : "text-gray-900"}`}>{appointment.subject}</span>
            ) : (
              <span className="font-medium text-gray-400 text-sm italic">Kein Titel definiert</span>
            )}
            {/* Duration badge - small, right of title */}
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isMuted ? "bg-gray-100 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
              {durationHours > 0 ? `${durationHours}h${durationMins > 0 ? durationMins : ''}` : `${durationMins}min`}
            </span>
          </div>
          
          {/* Details row - Date/Time, Organizer, Attendee Domains */}
          <div className={`flex items-center gap-2 text-xs mt-0.5 ${isMuted ? "text-gray-400" : "text-gray-500"}`}>
            {/* Date and Time */}
            <span>
              <span className={`font-medium ${isMuted ? "text-gray-400" : "text-gray-600"}`}>{dayLabel}</span>
              <span className="ml-1">{startTime}–{endTime}</span>
            </span>
            
            {/* Organizer */}
            {appointment.organizer && (
              <>
                <span className={isMuted ? "text-gray-200" : "text-gray-300"}>•</span>
                <span 
                  className="cursor-help"
                  title={appointment.organizer.emailAddress.address}
                >
                  {appointment.isOrganizer ? (
                    <span className={`font-medium ${isMuted ? "text-blue-400" : "text-blue-600"}`}>Du (Organisator)</span>
                  ) : (
                    <span>von {appointment.organizer.emailAddress.name || appointment.organizer.emailAddress.address}</span>
                  )}
                </span>
              </>
            )}
            
            {/* Attendee Domains with Popover */}
            {attendeeCount > 0 && (
              <AttendeePopover attendees={attendees} organizer={appointment.organizer} isOrganizer={appointment.isOrganizer} />
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {isSynced && (
            zepLink ? (
              <a
                href={zepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition"
                title="In ZEP öffnen"
              >
                ZEP
                <ExternalLink size={10} />
              </a>
            ) : (
              <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 rounded">
                ZEP
              </span>
            )
          )}
          {duplicateWarning?.hasDuplicate && !isSynced && duplicateWarning.type !== 'rescheduled' && (
            <span className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 rounded" title={duplicateWarning.message}>
              {duplicateWarning.type === 'exact' ? 'Duplikat' : duplicateWarning.type === 'timeOverlap' ? 'Konflikt' : 'Ähnlich'}
            </span>
          )}
          {/* Rescheduled appointment - show correction button */}
          {duplicateWarning?.type === 'rescheduled' && !isSynced && onCorrectTime && (
            <button
              onClick={() => onCorrectTime(appointment.id, duplicateWarning)}
              disabled={isCorrectingTime}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition disabled:opacity-50"
              title={duplicateWarning.message}
            >
              <RefreshCw size={10} className={isCorrectingTime ? "animate-spin" : ""} />
              Zeiten korrigieren
            </button>
          )}
          
          {/* Edit button for synced */}
          {isSynced && !isEditing && onStartEditSynced && (
            <button
              onClick={() => onStartEditSynced(appointment.id)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
              title="Bearbeiten"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Synced entry info - compact inline */}
      {isSynced && syncedInfo && !isEditing && (
        <div className="mt-1 ml-8 flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-600">{syncedInfo.projectName}</span>
          {syncedInfo.taskName && (
            <>
              <span className="text-gray-300">/</span>
              <span>{syncedInfo.taskName}</span>
            </>
          )}
          <span className="text-gray-300">•</span>
          <span>{syncedInfo.activityName}</span>
          {!syncedInfo.billable && <span className="text-gray-400">(intern)</span>}
          {isModified && <span className="text-amber-600 font-medium">Geändert</span>}
        </div>
      )}

      {/* Rescheduled appointment info - show time change details */}
      {duplicateWarning?.type === 'rescheduled' && !isSynced && duplicateWarning.originalTime && duplicateWarning.newTime && (
        <div className="mt-1 ml-8 text-xs space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-14">In ZEP:</span>
            <span className="text-red-500 line-through">
              {duplicateWarning.originalTime.date} {duplicateWarning.originalTime.from.slice(0, 5)}–{duplicateWarning.originalTime.to.slice(0, 5)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-14">Outlook:</span>
            <span className="text-green-600 font-medium">
              {duplicateWarning.newTime.date} {duplicateWarning.newTime.from.slice(0, 5)}–{duplicateWarning.newTime.to.slice(0, 5)}
            </span>
          </div>
        </div>
      )}

      {/* Editing UI for synced entries */}
      {isSynced && isEditing && syncedEntry && (
        <div className="mt-3 ml-8 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-blue-800">Eintrag bearbeiten</span>
            {onCancelEditSynced && (
              <button
                onClick={() => onCancelEditSynced(appointment.id)}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
                title="Bearbeitung abbrechen"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Projekt-Dropdown */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Projekt</label>
              <SearchableSelect
                options={projectOptions}
                value={modifiedEntry?.newProjectId || syncedEntry.project_id}
                onChange={(val) => {
                  if (val !== null && onModifyProject && syncedEntry) {
                    onModifyProject(appointment.id, appointment, syncedEntry, Number(val));
                  }
                }}
                placeholder="-- Projekt wählen --"
                className="w-full sm:w-96"
              />
            </div>

            {/* Task-Dropdown */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Task</label>
              <SearchableSelect
                options={editingTaskOptions}
                value={modifiedEntry?.newTaskId || syncedEntry.project_task_id}
                onChange={(val) => {
                  if (val !== null && onModifyTask) {
                    onModifyTask(appointment.id, Number(val));
                  }
                }}
                placeholder="-- Task wählen --"
                disabled={editingTaskOptions.length === 0}
                disabledMessage={editingTaskOptions.length === 0 ? "Laden..." : undefined}
                className="w-full sm:w-96"
              />
            </div>

            {/* Activity-Dropdown */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Tätigkeit</label>
              <SearchableSelect
                options={activityOptions}
                value={modifiedEntry?.newActivityId || syncedEntry.activity_id}
                onChange={(val) => {
                  if (val !== null && onModifyActivity && syncedEntry) {
                    onModifyActivity(appointment.id, appointment, syncedEntry, String(val));
                  }
                }}
                placeholder="-- Tätigkeit wählen --"
                className="w-full sm:w-56"
              />
            </div>
          </div>
          {isModificationComplete && isModified && (
            <div className="mt-2 text-xs text-amber-700">
              Änderungen werden beim nächsten Sync übertragen.
            </div>
          )}
        </div>
      )}

      {/* Dropdowns for selected unsynchronized appointments */}
      {appointment.selected && !isSynced && (
        <div className="mt-3 ml-8 flex flex-wrap gap-3">
          {/* Projekt-Dropdown */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Projekt</label>
            <SearchableSelect
              options={projectOptions}
              value={appointment.projectId}
              onChange={(val) =>
                onProjectChange(
                  appointment.id,
                  val !== null ? Number(val) : null
                )
              }
              placeholder="-- Projekt wählen --"
              className="w-full sm:w-96"
            />
          </div>

          {/* Task-Dropdown */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Task</label>
            <SearchableSelect
              options={taskOptions}
              value={appointment.taskId}
              onChange={(val) =>
                onTaskChange(
                  appointment.id,
                  val !== null ? Number(val) : null
                )
              }
              placeholder="-- Task wählen --"
              disabled={!appointment.projectId || (tasks.length === 0 && !loadingTasks)}
              disabledMessage={
                !appointment.projectId
                  ? "Erst Projekt wählen"
                  : loadingTasks 
                    ? "Laden..."
                    : "Keine Tasks vorhanden"
              }
              loading={loadingTasks}
              className="w-full sm:w-96"
            />
          </div>

          {/* Activity-Dropdown */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Tätigkeit</label>
            <SearchableSelect
              options={activityOptions}
              value={appointment.activityId}
              onChange={(val) =>
                onActivityChange(appointment.id, String(val ?? "be"))
              }
              placeholder="-- Tätigkeit wählen --"
              className="w-full sm:w-56"
            />
          </div>
        </div>
      )}
    </div>
  );
}
