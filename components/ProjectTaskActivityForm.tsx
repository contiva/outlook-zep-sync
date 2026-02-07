'use client';

import { useMemo, useState, useEffect } from 'react';
import { Banknote, ClockArrowUp, Loader2 } from 'lucide-react';
import SearchableSelect, { SelectOption } from './SearchableSelect';

// === Shared Styles ===
const labelBase = 'text-xs mb-1 font-medium';
const labelEnabled = `${labelBase} text-gray-600`;
const labelDisabled = `${labelBase} text-gray-400`;

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
  const [showHopAnimation, setShowHopAnimation] = useState(false);

  useEffect(() => {
    if (isSyncReady) {
      // Use setTimeout to avoid synchronous setState in effect body
      const startTimer = setTimeout(() => setShowHopAnimation(true), 0);
      const endTimer = setTimeout(() => setShowHopAnimation(false), 5000);
      return () => {
        clearTimeout(startTimer);
        clearTimeout(endTimer);
      };
    } else {
      const timer = setTimeout(() => setShowHopAnimation(false), 0);
      return () => clearTimeout(timer);
    }
  }, [isSyncReady]);

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
    [projects, allTasks],
  );

  // === taskOptions ===
  const taskOptions: SelectOption[] = useMemo(
    () =>
      tasks.map((t) => ({
        value: t.id,
        label: t.name,
        description: t.description,
      })),
    [tasks],
  );

  // === activityOptions ===
  const activityOptions: SelectOption[] = useMemo(() => {
    // Find the selected task
    let selectedTask: Task | undefined;
    if (taskId && projectId) {
      selectedTask = tasks.find((t) => t.id === taskId);
    }
    const selectedProject = projectId ? projects.find((p) => p.id === projectId) : undefined;

    // Get assigned activities: Task activities take precedence over Project activities
    let assignedActivities: AssignedActivity[] = [];
    if (selectedTask?.activities && selectedTask.activities.length > 0) {
      assignedActivities = selectedTask.activities;
    } else if (selectedProject?.activities && selectedProject.activities.length > 0) {
      assignedActivities = selectedProject.activities;
    }

    // If we have assigned activities, filter the global activities list
    if (assignedActivities.length > 0) {
      const assignedNames = new Set(assignedActivities.map((a) => a.name));
      const filteredActivities = activities.filter((a) => assignedNames.has(a.name));

      return filteredActivities.map((a) => {
        const assigned = assignedActivities.find((aa) => aa.name === a.name);
        return {
          value: a.name,
          label: a.name,
          description: assigned?.standard ? `${a.description} (Standard)` : a.description,
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
    [workLocations],
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isSyncReady && !isSyncing) onSync();
      }}
      className="contents"
    >
      {/* Projekt-Dropdown */}
      <div className="flex flex-col min-w-0 col-span-2 md:flex-3">
        <label className={labelEnabled}>Projekt</label>
        <SearchableSelect
          options={projectOptions}
          value={projectId}
          onChange={(val) => onProjectChange(val !== null ? Number(val) : null)}
          placeholder="Projekt wählen"
        />
      </div>

      {/* Task-Dropdown */}
      <div className="flex flex-col min-w-0 col-span-2 md:flex-3">
        <label className={isTaskDisabled ? labelDisabled : labelEnabled}>Task</label>
        <SearchableSelect
          options={taskOptions}
          value={taskId}
          onChange={(val) => onTaskChange(val !== null ? Number(val) : null)}
          placeholder="Task wählen"
          disabled={isTaskDisabled}
          disabledMessage={
            !projectId ? 'Erst Projekt wählen' : loadingTasks ? 'Laden...' : 'Keine Tasks vorhanden'
          }
          loading={loadingTasks}
        />
      </div>

      {/* Activity-Dropdown */}
      <div className="flex flex-col col-span-1 md:w-24 md:shrink-0">
        <label className={isFieldDisabled ? labelDisabled : labelEnabled}>Tätigkeit</label>
        <SearchableSelect
          options={activityOptions}
          value={activityId}
          onChange={(val) => onActivityChange(String(val ?? 'be'))}
          placeholder="Tätigkeit"
          disabled={isFieldDisabled}
          disabledMessage={!projectId ? 'Erst Projekt wählen' : 'Erst Task wählen'}
          compact
        />
      </div>

      {/* Arbeitsort-Dropdown */}
      <div className="flex flex-col col-span-1 md:w-28 md:shrink-0">
        <label
          className={isFieldDisabled || workLocations.length === 0 ? labelDisabled : labelEnabled}
        >
          Ort
        </label>
        <SearchableSelect
          options={workLocationOptions}
          value={workLocation || null}
          onChange={(val) => onWorkLocationChange(val ? String(val) : undefined)}
          placeholder="Ort"
          disabled={isFieldDisabled || workLocations.length === 0}
          disabledMessage={
            !projectId
              ? 'Erst Projekt wählen'
              : workLocations.length === 0
                ? 'Keine Orte verfügbar'
                : 'Erst Task wählen'
          }
          compact
        />
      </div>

      {/* Bemerkung */}
      <div className="flex flex-col min-w-0 col-span-2 md:flex-2">
        <label className={isFieldDisabled ? labelDisabled : labelEnabled}>Bemerkung</label>
        <input
          type="text"
          value={bemerkung}
          onChange={(e) => onBemerkungChange(e.target.value)}
          placeholder={bemerkungPlaceholder}
          disabled={isFieldDisabled}
          className={`h-8 px-2.5 text-sm border transition-colors focus:outline-none ${
            isFieldDisabled
              ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-40'
              : isCustomBemerkung
                ? 'bg-blue-50 border-blue-200 text-blue-800 focus:ring-1 focus:ring-blue-400 focus:border-blue-400'
                : 'bg-white border-gray-200 text-gray-700 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 hover:border-gray-300'
          }`}
          title={
            isCustomBemerkung
              ? `ZEP-Bemerkung: "${bemerkung}"`
              : `Standard: "${bemerkungPlaceholder}"`
          }
        />
      </div>

      {/* Billable Toggle */}
      <div className="flex flex-col shrink-0 col-span-1">
        <label className={isFieldDisabled ? labelDisabled : labelEnabled}>Fakt.</label>
        <button
          type="button"
          onClick={() => {
            if (!isFieldDisabled && canChangeBillable) {
              onBillableChange(!billable);
            }
          }}
          disabled={isFieldDisabled || !canChangeBillable}
          className={`flex items-center justify-center w-8 h-8 border transition-colors ${
            isFieldDisabled
              ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-40'
              : !canChangeBillable
                ? billable
                  ? 'bg-amber-50 border-amber-200 text-amber-500 cursor-not-allowed'
                  : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                : billable
                  ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                  : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-500'
          }`}
          title={
            isFieldDisabled
              ? 'Erst Task wählen'
              : !canChangeBillable
                ? `Fakturierbarkeit vom Projekt/Vorgang festgelegt (${billable ? 'fakturierbar' : 'nicht fakturierbar'})`
                : billable
                  ? 'Fakturierbar - klicken zum Ändern'
                  : 'Nicht fakturierbar (intern) - klicken zum Ändern'
          }
        >
          <Banknote
            size={18}
            className={isFieldDisabled || (!billable && canChangeBillable) ? 'opacity-50' : ''}
          />
        </button>
      </div>

      {/* Time Type Toggle (Plan/Ist) */}
      <div className="flex flex-col shrink-0 col-span-1">
        <label className={isFieldDisabled ? labelDisabled : labelEnabled}>Zeit</label>
        <div
          className={`inline-flex items-center h-8 border text-xs overflow-hidden ${
            isFieldDisabled ? 'border-gray-200 bg-gray-50 opacity-40' : 'border-gray-200 bg-white'
          }`}
        >
          <button
            type="button"
            onClick={() => !isFieldDisabled && onTimeChange(false)}
            disabled={isFieldDisabled}
            className={`px-2 h-full transition-colors ${
              isFieldDisabled
                ? 'text-gray-300 cursor-not-allowed'
                : !useActualTime
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-500 hover:bg-gray-50'
            }`}
            title={isFieldDisabled ? 'Erst Task wählen' : `Plan-Zeit: ${plannedTimeLabel}`}
          >
            Plan
          </button>
          <span className="w-px h-4 bg-gray-200" />
          <button
            type="button"
            onClick={() =>
              !isFieldDisabled && hasActualTime && actualTimeDiffers && onTimeChange(true)
            }
            disabled={isFieldDisabled || !hasActualTime || !actualTimeDiffers}
            className={`px-2 h-full transition-colors ${
              isFieldDisabled || !hasActualTime || !actualTimeDiffers
                ? 'text-gray-300 cursor-not-allowed'
                : useActualTime
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-500 hover:bg-gray-50'
            }`}
            title={
              isFieldDisabled
                ? 'Erst Task wählen'
                : hasActualTime
                  ? !actualTimeDiffers
                    ? 'Ist-Zeit entspricht Plan-Zeit'
                    : `Ist-Zeit: ${actualTimeLabel}`
                  : 'Keine Ist-Zeit verfügbar'
            }
          >
            Ist
          </button>
        </div>
      </div>

      {/* Sync Button */}
      <div className="flex flex-col justify-end shrink-0 col-span-2 md:col-span-1">
        <button
          type="submit"
          disabled={!isSyncReady || isSyncing}
          className={`group flex items-center justify-center w-full h-8 md:w-8 border transition-all ${
            isSyncing
              ? 'bg-green-500 border-green-500 text-white cursor-wait shadow-[0_0_10px_rgba(74,222,128,0.35),0_4px_8px_rgba(0,0,0,0.15)]'
              : !isSyncReady
                ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-40'
                : 'bg-green-600 border-green-600 text-white shadow-[0_0_10px_rgba(74,222,128,0.35),0_4px_8px_rgba(0,0,0,0.15)] hover:bg-green-700 hover:border-green-700 hover:shadow-[0_0_14px_rgba(74,222,128,0.5),0_6px_12px_rgba(0,0,0,0.2)]'
          }`}
          title={syncTooltip}
        >
          {isSyncing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ClockArrowUp
              size={18}
              className={`transition-transform ${showHopAnimation ? 'animate-sync-hop' : ''} ${!isSyncReady ? 'opacity-50' : ''}`}
            />
          )}
        </button>
      </div>
    </form>
  );
}
