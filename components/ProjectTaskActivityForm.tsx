"use client";

import { useMemo } from "react";
import { Banknote, ClockArrowUp, Loader2 } from "lucide-react";
import SearchableSelect, { SelectOption } from "./SearchableSelect";

// === Interfaces (duplicated per project pattern) ===

interface AssignedActivity {
  name: string;
  standard: boolean;
}

interface Project {
  id: number;
  name: string;
  description: string;
  activities?: AssignedActivity[];
  voreinstFakturierbarkeit?: number;
  defaultFakt?: number;
}

interface Task {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  activities?: AssignedActivity[];
  defaultFakt?: number;
}

interface Activity {
  name: string;
  description: string;
}

interface WorkLocation {
  kurzform: string;
  bezeichnung: string;
  heimarbeitsort: boolean;
}

export interface ProjectTaskActivityFormProps {
  // === Datenquellen für Options ===
  projects: Project[];
  tasks: Task[];
  allTasks?: Record<number, Task[]>;
  activities: Activity[];

  // === Aktuelle Werte (normalisiert vom Aufrufer) ===
  projectId: number | null;
  taskId: number | null;
  activityId: string;
  bemerkung: string;
  bemerkungPlaceholder: string;
  isCustomBemerkung: boolean;
  billable: boolean;
  canChangeBillable: boolean;
  useActualTime: boolean;

  // === Arbeitsort ===
  workLocations: WorkLocation[];
  workLocation?: string; // kurzform des gewählten Orts
  onWorkLocationChange: (workLocation: string | undefined) => void;

  // === Zeit-Anzeige ===
  plannedTimeLabel: string;
  actualTimeLabel?: string;
  hasActualTime: boolean;
  actualTimeDiffers: boolean;

  // === Loading States ===
  loadingTasks?: boolean;

  // === Callbacks ===
  onProjectChange: (projectId: number | null) => void;
  onTaskChange: (taskId: number | null) => void;
  onActivityChange: (activityId: string) => void;
  onBemerkungChange: (value: string) => void;
  onBillableChange: (billable: boolean) => void;
  onTimeChange: (useActual: boolean) => void;

  // === Sync Button ===
  onSync: () => void;
  isSyncing: boolean;
  isSyncReady: boolean;
  syncTooltip: string;
}

export default function ProjectTaskActivityForm({
  projects,
  tasks,
  allTasks,
  activities,
  projectId,
  taskId,
  activityId,
  bemerkung,
  bemerkungPlaceholder,
  isCustomBemerkung,
  billable,
  canChangeBillable,
  useActualTime,
  workLocations,
  workLocation,
  onWorkLocationChange,
  plannedTimeLabel,
  actualTimeLabel,
  hasActualTime,
  actualTimeDiffers,
  loadingTasks,
  onProjectChange,
  onTaskChange,
  onActivityChange,
  onBemerkungChange,
  onBillableChange,
  onTimeChange,
  onSync,
  isSyncing,
  isSyncReady,
  syncTooltip,
}: ProjectTaskActivityFormProps) {
  // === Derived disabled states ===
  const isTaskDisabled = !projectId || (tasks.length === 0 && !loadingTasks);
  const isFieldDisabled = !taskId;

  // === projectOptions ===
  const projectOptions: SelectOption[] = useMemo(
    () =>
      projects
        .filter((p) => allTasks && allTasks[p.id] && allTasks[p.id].length > 0)
        .map((p) => ({
          value: p.id,
          label: p.name,
          description: p.description || null,
        })),
    [projects, allTasks]
  );

  // === taskOptions ===
  const taskOptions: SelectOption[] = useMemo(
    () =>
      tasks.map((t) => ({
        value: t.id,
        label: t.name,
        description: t.description,
      })),
    [tasks]
  );

  // === activityOptions ===
  const activityOptions: SelectOption[] = useMemo(() => {
    // Find the selected task
    let selectedTask: Task | undefined;
    if (taskId && projectId) {
      selectedTask = tasks.find((t) => t.id === taskId);
    }
    const selectedProject = projectId
      ? projects.find((p) => p.id === projectId)
      : undefined;

    // Get assigned activities: Task activities take precedence over Project activities
    let assignedActivities: AssignedActivity[] = [];
    if (selectedTask?.activities && selectedTask.activities.length > 0) {
      assignedActivities = selectedTask.activities;
    } else if (
      selectedProject?.activities &&
      selectedProject.activities.length > 0
    ) {
      assignedActivities = selectedProject.activities;
    }

    // If we have assigned activities, filter the global activities list
    if (assignedActivities.length > 0) {
      const assignedNames = new Set(assignedActivities.map((a) => a.name));
      const filteredActivities = activities.filter((a) =>
        assignedNames.has(a.name)
      );

      return filteredActivities.map((a) => {
        const assigned = assignedActivities.find((aa) => aa.name === a.name);
        return {
          value: a.name,
          label: a.name,
          description: assigned?.standard
            ? `${a.description} (Standard)`
            : a.description,
        };
      });
    }

    // Fallback: show all global activities
    return activities.map((a) => ({
      value: a.name,
      label: a.name,
      description: a.description,
    }));
  }, [activities, projects, tasks, projectId, taskId]);

  // === workLocationOptions ===
  const workLocationOptions: SelectOption[] = useMemo(
    () =>
      workLocations.map((loc) => ({
        value: loc.kurzform,
        label: loc.kurzform,
        description: loc.bezeichnung !== loc.kurzform ? loc.bezeichnung : null,
      })),
    [workLocations]
  );

  return (
    <>
      {/* Projekt-Dropdown */}
      <div className="flex flex-col flex-3 min-w-0">
        <label className="text-xs text-gray-500 mb-1">Projekt</label>
        <SearchableSelect
          options={projectOptions}
          value={projectId}
          onChange={(val) => onProjectChange(val !== null ? Number(val) : null)}
          placeholder="Projekt wählen"
        />
      </div>

      {/* Task-Dropdown */}
      <div className="flex flex-col flex-3 min-w-0">
        <label
          className={`text-xs mb-1 ${isTaskDisabled ? "text-gray-300" : "text-gray-500"}`}
        >
          Task
        </label>
        <SearchableSelect
          options={taskOptions}
          value={taskId}
          onChange={(val) => onTaskChange(val !== null ? Number(val) : null)}
          placeholder="Task wählen"
          disabled={isTaskDisabled}
          disabledMessage={
            !projectId
              ? "Erst Projekt wählen"
              : loadingTasks
                ? "Laden..."
                : "Keine Tasks vorhanden"
          }
          loading={loadingTasks}
        />
      </div>

      {/* Activity-Dropdown */}
      <div className="flex flex-col w-24 shrink-0">
        <label
          className={`text-xs mb-1 ${isFieldDisabled ? "text-gray-300" : "text-gray-500"}`}
        >
          Tätigkeit
        </label>
        <SearchableSelect
          options={activityOptions}
          value={activityId}
          onChange={(val) => onActivityChange(String(val ?? "be"))}
          placeholder="Tätigkeit"
          disabled={isFieldDisabled}
          disabledMessage={
            !projectId ? "Erst Projekt wählen" : "Erst Task wählen"
          }
          compact
        />
      </div>

      {/* Arbeitsort-Dropdown - nur sichtbar wenn Projekt Arbeitsorte hat */}
      {workLocations.length > 0 && (
        <div className="flex flex-col w-28 shrink-0">
          <label
            className={`text-xs mb-1 ${isFieldDisabled ? "text-gray-300" : "text-gray-500"}`}
          >
            Ort
          </label>
          <SearchableSelect
            options={workLocationOptions}
            value={workLocation || null}
            onChange={(val) => onWorkLocationChange(val ? String(val) : undefined)}
            placeholder="Ort"
            disabled={isFieldDisabled}
            disabledMessage={!projectId ? "Erst Projekt wählen" : "Erst Task wählen"}
            compact
          />
        </div>
      )}

      {/* Bemerkung */}
      <div className="flex flex-col flex-2 min-w-0">
        <label
          className={`text-xs mb-1 ${isFieldDisabled ? "text-gray-300" : "text-gray-500"}`}
        >
          Bemerkung
        </label>
        <input
          type="text"
          value={bemerkung}
          onChange={(e) => onBemerkungChange(e.target.value)}
          placeholder={bemerkungPlaceholder}
          disabled={isFieldDisabled}
          className={`h-9.5 px-3 text-sm rounded-lg border transition-colors ${
            isFieldDisabled
              ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-40"
              : isCustomBemerkung
                ? "bg-blue-50 border-blue-300 text-blue-900 focus:ring-blue-500 focus:border-blue-500"
                : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
          }`}
          title={
            isCustomBemerkung
              ? `ZEP-Bemerkung: "${bemerkung}"`
              : `Standard: "${bemerkungPlaceholder}"`
          }
        />
      </div>

      {/* Billable Toggle */}
      <div className="flex flex-col shrink-0">
        <label
          className={`text-xs mb-1 ${isFieldDisabled ? "text-gray-300" : "text-gray-500"}`}
        >
          Fakt.
        </label>
        <button
          type="button"
          onClick={() => {
            if (!isFieldDisabled && canChangeBillable) {
              onBillableChange(!billable);
            }
          }}
          disabled={isFieldDisabled || !canChangeBillable}
          className={`flex items-center justify-center w-10 h-9.5 rounded-lg border transition-colors ${
            isFieldDisabled
              ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-40"
              : !canChangeBillable
                ? billable
                  ? "bg-amber-50 border-amber-300 text-amber-500 cursor-not-allowed opacity-70"
                  : "bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed opacity-70"
                : billable
                  ? "bg-amber-50 border-amber-300 text-amber-500 hover:bg-amber-100"
                  : "bg-gray-50 border-gray-300 text-gray-400 hover:bg-gray-100"
          }`}
          title={
            isFieldDisabled
              ? "Erst Task wählen"
              : !canChangeBillable
                ? `Fakturierbarkeit vom Projekt/Vorgang festgelegt (${billable ? "fakturierbar" : "nicht fakturierbar"})`
                : billable
                  ? "Fakturierbar - klicken zum Ändern"
                  : "Nicht fakturierbar (intern) - klicken zum Ändern"
          }
        >
          <Banknote
            size={18}
            className={
              isFieldDisabled || (!billable && canChangeBillable)
                ? "opacity-50"
                : ""
            }
          />
        </button>
      </div>

      {/* Time Type Toggle (Plan/Ist) */}
      <div className="flex flex-col shrink-0">
        <label
          className={`text-xs mb-1 ${isFieldDisabled ? "text-gray-300" : "text-gray-500"}`}
        >
          Zeit
        </label>
        <div
          className={`inline-flex items-center h-9.5 rounded-lg border text-xs overflow-hidden ${
            isFieldDisabled
              ? "border-gray-200 bg-gray-50 opacity-40"
              : "border-gray-300 bg-gray-50"
          }`}
        >
          <button
            type="button"
            onClick={() => !isFieldDisabled && onTimeChange(false)}
            disabled={isFieldDisabled}
            className={`px-2.5 h-full transition-colors ${
              isFieldDisabled
                ? "text-gray-300 cursor-not-allowed"
                : !useActualTime
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-500 hover:bg-gray-100"
            }`}
            title={
              isFieldDisabled
                ? "Erst Task wählen"
                : `Plan-Zeit: ${plannedTimeLabel}`
            }
          >
            Plan
          </button>
          <span className="w-px h-5 bg-gray-300" />
          <button
            type="button"
            onClick={() =>
              !isFieldDisabled &&
              hasActualTime &&
              actualTimeDiffers &&
              onTimeChange(true)
            }
            disabled={isFieldDisabled || !hasActualTime || !actualTimeDiffers}
            className={`px-2.5 h-full transition-colors ${
              isFieldDisabled || !hasActualTime || !actualTimeDiffers
                ? "text-gray-300 cursor-not-allowed"
                : useActualTime
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-500 hover:bg-gray-100"
            }`}
            title={
              isFieldDisabled
                ? "Erst Task wählen"
                : hasActualTime
                  ? !actualTimeDiffers
                    ? "Ist-Zeit entspricht Plan-Zeit"
                    : `Ist-Zeit: ${actualTimeLabel}`
                  : "Keine Ist-Zeit verfügbar"
            }
          >
            Ist
          </button>
        </div>
      </div>

      {/* Sync Button */}
      <div className="flex flex-col shrink-0">
        <label
          className={`text-xs mb-1 ${!isSyncReady ? "text-gray-300" : "text-gray-500"}`}
        >
          Sync
        </label>
        <button
          type="button"
          onClick={() => isSyncReady && !isSyncing && onSync()}
          disabled={!isSyncReady || isSyncing}
          className={`flex items-center justify-center w-10 h-9.5 rounded-lg border transition-colors ${
            isSyncing
              ? "bg-green-500 border-green-500 text-white cursor-wait"
              : !isSyncReady
                ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-40"
                : "bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700"
          }`}
          title={syncTooltip}
        >
          {isSyncing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ClockArrowUp
              size={18}
              className={!isSyncReady ? "opacity-50" : ""}
            />
          )}
        </button>
      </div>
    </>
  );
}
