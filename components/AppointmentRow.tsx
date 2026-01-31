"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Users, CheckCircle, CloudUpload, ExternalLink, AlertTriangle } from "lucide-react";
import { getZepIdForOutlookEvent, getZepAttendanceUrl } from "@/lib/sync-history";
import SearchableSelect, { SelectOption } from "./SearchableSelect";
import { DuplicateCheckResult } from "@/lib/zep-api";

interface Project {
  id: number;
  name: string;
  description: string;
}

interface Task {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
}

interface Activity {
  name: string;
  description: string;
}

interface SyncedEntry {
  id?: number;
  project_id: number;
  project_task_id: number;
  activity_id: string;
  billable: boolean;
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

  // Konvertiere Activities zu SelectOptions
  const activityOptions: SelectOption[] = useMemo(
    () =>
      activities.map((a) => ({
        value: a.name,
        label: a.name,
        description: a.description,
      })),
    [activities]
  );

  // Get ZEP link if this appointment was synced
  const zepLink = useMemo(() => {
    const zepId = getZepIdForOutlookEvent(appointment.id);
    if (zepId) {
      return getZepAttendanceUrl(zepId);
    }
    return null;
  }, [appointment.id]);

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

  return (
    <div
      className={`p-4 border-b border-gray-100 ${
        appointment.selected ? "bg-white" : "bg-gray-50 opacity-60"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Status icons: Synced (green) or Checkbox + SyncReady indicator (amber) */}
        <div className="flex items-center gap-1">
          {isSynced ? (
            <div 
              className="mt-1 h-5 w-5 flex items-center justify-center" 
              title="Bereits in ZEP synchronisiert"
              role="img"
              aria-label="Bereits in ZEP synchronisiert"
            >
              <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
            </div>
          ) : (
            <>
              <input
                type="checkbox"
                checked={appointment.selected}
                onChange={() => onToggle(appointment.id)}
                className="mt-1 h-5 w-5 text-blue-600 rounded"
                aria-label={`Termin auswählen: ${appointment.subject}`}
              />
              {isSyncReady && (
                <div 
                  className="mt-1 h-5 w-5 flex items-center justify-center" 
                  title="Wird beim nächsten Sync übertragen"
                  role="img"
                  aria-label="Bereit zum Synchronisieren"
                >
                  <CloudUpload className="h-4 w-4 text-amber-500" aria-hidden="true" />
                </div>
              )}
              {duplicateWarning?.hasDuplicate && !isSynced && (
                <div 
                  className="mt-1 h-5 w-5 flex items-center justify-center" 
                  title={duplicateWarning.message || "Mögliches Duplikat erkannt"}
                  role="img"
                  aria-label={duplicateWarning.message || "Mögliches Duplikat erkannt"}
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium">{dayLabel}</span>
            <span>
              {startTime} - {endTime}
            </span>
            <span className="text-gray-400">
              ({durationHours}h {durationMins}min)
            </span>
            {appointment.organizer && (
              <span className="text-gray-400" title={appointment.organizer.emailAddress.address}>
                von {appointment.isOrganizer ? "Dir" : (appointment.organizer.emailAddress.name || appointment.organizer.emailAddress.address.split("@")[0])}
              </span>
            )}
            {isSynced && (
              <>
                {zepLink ? (
                  <a
                    href={zepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-green-600 text-xs font-medium hover:text-green-800 hover:underline"
                    title="In ZEP öffnen"
                  >
                    In ZEP
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="text-green-600 text-xs font-medium">
                    In ZEP
                  </span>
                )}
              </>
            )}
            {duplicateWarning?.hasDuplicate && !isSynced && (
              <span className="text-amber-600 text-xs font-medium" title={duplicateWarning.message}>
                {duplicateWarning.type === 'exact' ? 'Duplikat' : 
                 duplicateWarning.type === 'timeOverlap' ? 'Zeitkonflikt' : 
                 'Ähnlich'}
              </span>
            )}
          </div>
          <div className="font-medium text-gray-900 mt-1 flex items-center gap-2">
            {appointment.isOnlineMeeting && appointment.onlineMeetingProvider === "teamsForBusiness" && (
              <svg
                className="w-4 h-4 flex-shrink-0"
                viewBox="0 0 2228.833 2073.333"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Teams Meeting"
              >
                <path
                  fill="#5059C9"
                  d="M1554.637 777.5h575.713c54.391 0 98.483 44.092 98.483 98.483v524.398c0 199.901-162.051 361.952-361.952 361.952h-1.711c-199.901.028-361.975-162.023-362.004-361.924V828.971c.001-28.427 23.045-51.471 51.471-51.471z"
                />
                <circle fill="#5059C9" cx="1943.75" cy="440.583" r="233.25" />
                <circle fill="#7B83EB" cx="1218.083" cy="336.917" r="336.917" />
                <path
                  fill="#7B83EB"
                  d="M1667.323 777.5H717.01c-53.743 1.33-96.257 45.931-95.01 99.676v598.105c-7.505 322.519 247.657 590.16 570.167 598.053 322.51-7.893 577.671-275.534 570.167-598.053V877.176c1.245-53.745-41.268-98.346-95.011-99.676z"
                />
                <path
                  opacity=".1"
                  d="M1244 777.5v838.145c-.258 38.435-23.549 72.964-59.09 87.598a91.856 91.856 0 01-35.765 7.257H667.613c-6.738-17.105-12.958-34.21-18.142-51.833a631.287 631.287 0 01-27.472-183.49V877.02c-1.246-53.659 41.198-98.19 94.857-99.52H1244z"
                />
                <path
                  opacity=".2"
                  d="M1192.167 777.5v889.978a91.802 91.802 0 01-7.257 35.765c-14.634 35.541-49.163 58.832-87.598 59.09H691.975a721.63 721.63 0 01-24.362-51.833 631.282 631.282 0 01-27.472-183.49V877.02c-1.246-53.659 41.198-98.19 94.857-99.52h457.169z"
                />
                <path
                  opacity=".2"
                  d="M1192.167 777.5v786.312c-.395 52.223-42.632 94.46-94.855 94.855h-447.84A631.282 631.282 0 01622 1475.177V877.02c-1.246-53.659 41.198-98.19 94.857-99.52h475.31z"
                />
                <path
                  opacity=".2"
                  d="M1140.333 777.5v786.312c-.395 52.223-42.632 94.46-94.855 94.855H649.472A631.282 631.282 0 01622 1475.177V877.02c-1.246-53.659 41.198-98.19 94.857-99.52h423.476z"
                />
                <path
                  opacity=".1"
                  d="M1244 509.522v163.275c-8.812.518-17.105 1.037-25.917 1.037-8.812 0-17.105-.518-25.917-1.037a284.472 284.472 0 01-51.833-8.293c-104.963-24.857-191.679-98.469-233.25-198.003a288.02 288.02 0 01-16.587-51.833h258.648c52.305.198 94.657 42.549 94.856 94.854z"
                />
                <path
                  opacity=".2"
                  d="M1192.167 561.355v111.442a284.472 284.472 0 01-51.833-8.293c-104.963-24.857-191.679-98.469-233.25-198.003h190.228c52.304.198 94.656 42.55 94.855 94.854z"
                />
                <path
                  opacity=".2"
                  d="M1192.167 561.355v111.442a284.472 284.472 0 01-51.833-8.293c-104.963-24.857-191.679-98.469-233.25-198.003h190.228c52.304.198 94.656 42.55 94.855 94.854z"
                />
                <path
                  opacity=".2"
                  d="M1140.333 561.355v103.148c-104.963-24.857-191.679-98.469-233.25-198.003h138.395c52.305.199 94.656 42.551 94.855 94.855z"
                />
                <linearGradient
                  id="a"
                  gradientUnits="userSpaceOnUse"
                  x1="198.099"
                  y1="1683.0726"
                  x2="942.2344"
                  y2="394.2607"
                  gradientTransform="matrix(1 0 0 -1 0 2075.3333)"
                >
                  <stop offset="0" stopColor="#5a62c3" />
                  <stop offset=".5" stopColor="#4d55bd" />
                  <stop offset="1" stopColor="#3940ab" />
                </linearGradient>
                <path
                  fill="url(#a)"
                  d="M95.01 466.5h950.312c52.473 0 95.01 42.538 95.01 95.01v950.312c0 52.473-42.538 95.01-95.01 95.01H95.01c-52.473 0-95.01-42.538-95.01-95.01V561.51c0-52.472 42.538-95.01 95.01-95.01z"
                />
                <path
                  fill="#FFF"
                  d="M820.211 828.193H630.241v517.297H509.211V828.193H320.123V727.844h500.088v100.349z"
                />
              </svg>
            )}
            {appointment.subject}
          </div>

          {/* Teilnehmer anzeigen */}
          {attendeeCount > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Users size={12} />
                <span>{attendeeCount} Teilnehmer</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {attendees.map((attendee, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 ${getStatusColor(
                      attendee.status.response
                    )}`}
                    title={`${attendee.emailAddress.address} - ${attendee.status.response}`}
                  >
                    <span>{getStatusIcon(attendee.status.response)}</span>
                    <span className="text-gray-700">
                      {attendee.emailAddress.name || attendee.emailAddress.address.split("@")[0]}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Synced entry info: show project, task, activity */}
          {isSynced && syncedInfo && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                <span className="font-medium">{syncedInfo.projectName}</span>
                {syncedInfo.taskName && (
                  <span className="text-green-600">/ {syncedInfo.taskName}</span>
                )}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{syncedInfo.activityName}</span>
              {!syncedInfo.billable && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500 text-xs">(nicht abrechenbar)</span>
                </>
              )}
            </div>
          )}

          {appointment.selected && !isSynced && (
            <div className="mt-3 flex flex-wrap gap-3">
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
      </div>
    </div>
  );
}
