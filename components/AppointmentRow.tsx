"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Users, ClockCheck, ClockArrowUp, AlertTriangle, Pencil, X, Check, RefreshCw, RotateCcw, Ban, Banknote, MapPin } from "lucide-react";
import ProjectTaskActivityForm from "./ProjectTaskActivityForm";
import { DuplicateCheckResult } from "@/lib/zep-api";
import { RedisSyncMapping } from "@/lib/redis";
import { ActualDuration } from "@/lib/teams-utils";
import { calculateDisplayTimes, roundToNearest15Min } from "@/lib/time-utils";

// Helper: Check if domain is internal (contiva.com or subdomains)
function isInternalDomain(domain: string): boolean {
  return domain === "contiva.com" || domain.endsWith(".contiva.com");
}

// Helper: Format name from "Nachname, Vorname" to "Vorname Nachname"
function formatName(name?: string | null): string | null {
  if (!name) return null;
  // Check if name contains comma (format: "Nachname, Vorname")
  if (name.includes(', ')) {
    const [lastName, firstName] = name.split(', ');
    return `${firstName} ${lastName}`;
  }
  return name;
}

// Helper: Determine if user can change billable status
// Values 1 and 3 are editable, values 2 and 4 are locked
// Note: ZEP SOAP API returns these as strings, so we convert to number
function canChangeBillableForTask(projektFakt?: number | string, vorgangFakt?: number | string): boolean {
  const pFakt = projektFakt !== undefined ? Number(projektFakt) : undefined;
  const vFakt = vorgangFakt !== undefined ? Number(vorgangFakt) : undefined;
  
  // Task has own setting (not 0 = "inherited")
  if (vFakt !== undefined && vFakt !== 0) {
    return vFakt === 1 || vFakt === 3;
  }
  // Fallback to project setting
  if (pFakt !== undefined) {
    return pFakt === 1 || pFakt === 3;
  }
  // Default: editable
  return true;
}

// Helper: Extract Zoom meeting URL from text (bodyPreview or location)
function extractZoomUrl(text?: string): string | null {
  if (!text) return null;
  // Match various Zoom URL formats:
  // https://zoom.us/j/123456789
  // https://us02web.zoom.us/j/123456789
  // https://workato.zoom.us/j/123456789?pwd=xxx
  // Also match without https:// prefix
  const zoomRegex = /(?:https?:\/\/)?(?:[\w-]+\.)*zoom\.us\/j\/[\w?=&./-]+/gi;
  const match = text.match(zoomRegex);
  if (match) {
    // Ensure URL has https:// prefix
    let url = match[0];
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    return url;
  }
  return null;
}

// Helper: Get body text from appointment (combines bodyPreview and full body)
function getBodyText(appointment: { bodyPreview?: string; body?: { content?: string } }): string {
  // Prefer full body content, fall back to preview
  return appointment.body?.content?.toLowerCase() || appointment.bodyPreview?.toLowerCase() || '';
}

// Helper: Check if meeting has a Teams link in body (for meetings not marked as isOnlineMeeting)
function hasTeamsLinkInBody(appointment: {
  bodyPreview?: string;
  body?: { content?: string };
}): boolean {
  const bodyText = getBodyText(appointment);
  return bodyText.includes('teams.microsoft.com') || bodyText.includes('teams.live.com');
}

// Helper: Extract Teams join URL from body
function getTeamsJoinUrlFromBody(appointment: {
  bodyPreview?: string;
  body?: { content?: string };
}): string | null {
  const fullBodyText = appointment.body?.content || '';
  const bodyPreviewText = appointment.bodyPreview || '';

  // Match Teams meeting URLs
  const teamsRegex = /https?:\/\/teams\.(microsoft|live)\.com\/l\/meetup-join\/[\w%?=&./-]+/gi;

  const matchFullBody = fullBodyText.match(teamsRegex);
  if (matchFullBody) return matchFullBody[0];
  const matchPreview = bodyPreviewText.match(teamsRegex);
  if (matchPreview) return matchPreview[0];
  return null;
}

// Helper: Check if meeting is a Calendly meeting
function isCalendlyMeeting(appointment: {
  location?: { displayName?: string };
  bodyPreview?: string;
  body?: { content?: string };
}): boolean {
  const locationText = appointment.location?.displayName?.toLowerCase() || '';
  const bodyText = getBodyText(appointment);
  return locationText.includes('calendly.com') || bodyText.includes('calendly.com');
}

// Helper: Get Calendly URL from appointment
function getCalendlyUrl(appointment: {
  location?: { displayName?: string };
  bodyPreview?: string;
  body?: { content?: string };
}): string | null {
  const locationText = appointment.location?.displayName || '';
  const fullBodyText = appointment.body?.content || '';
  const bodyPreviewText = appointment.bodyPreview || '';

  // Extract Calendly URL
  const calendlyRegex = /https?:\/\/(?:[\w-]+\.)?calendly\.com\/[\w?=&./-]*/gi;
  const matchLocation = locationText.match(calendlyRegex);
  if (matchLocation) return matchLocation[0];
  const matchFullBody = fullBodyText.match(calendlyRegex);
  if (matchFullBody) return matchFullBody[0];
  const matchPreview = bodyPreviewText.match(calendlyRegex);
  if (matchPreview) return matchPreview[0];
  return null;
}

// Helper: Check if meeting is a Zoom meeting (only if we can find a zoom.us URL)
function isZoomMeeting(appointment: {
  location?: { displayName?: string };
  bodyPreview?: string;
  body?: { content?: string };
}): boolean {
  // Don't detect as Zoom if it's Calendly
  if (isCalendlyMeeting(appointment)) return false;

  const locationText = appointment.location?.displayName?.toLowerCase() || '';
  const bodyText = getBodyText(appointment);

  // Only detect as Zoom if we find zoom.us domain (actual Zoom URL)
  const hasZoomUrl = locationText.includes('zoom.us') || bodyText.includes('zoom.us');

  return hasZoomUrl;
}

// Helper: Get Zoom join URL from appointment
function getZoomJoinUrl(appointment: {
  location?: { displayName?: string };
  bodyPreview?: string;
  body?: { content?: string };
}): string | null {
  // First try full body content (most complete)
  if (appointment.body?.content) {
    const urlFromFullBody = extractZoomUrl(appointment.body.content);
    if (urlFromFullBody) return urlFromFullBody;
  }

  // Then try bodyPreview
  const urlFromBodyPreview = extractZoomUrl(appointment.bodyPreview);
  if (urlFromBodyPreview) return urlFromBodyPreview;

  // Check if location contains a Zoom URL
  const urlFromLocation = extractZoomUrl(appointment.location?.displayName);
  if (urlFromLocation) return urlFromLocation;

  return null;
}

// Helper: Check if meeting is a Google Meet meeting
function isGoogleMeetMeeting(appointment: {
  location?: { displayName?: string };
  bodyPreview?: string;
  body?: { content?: string };
}): boolean {
  const locationText = appointment.location?.displayName?.toLowerCase() || '';
  const bodyText = getBodyText(appointment);

  return locationText.includes('meet.google.com') || bodyText.includes('meet.google.com');
}

// Helper: Get Google Meet URL from appointment
function getGoogleMeetUrl(appointment: {
  location?: { displayName?: string };
  bodyPreview?: string;
  body?: { content?: string };
}): string | null {
  const fullBodyText = appointment.body?.content || '';
  const bodyPreviewText = appointment.bodyPreview || '';
  const locationText = appointment.location?.displayName || '';

  // Match Google Meet URLs: https://meet.google.com/xxx-xxxx-xxx
  const meetRegex = /https?:\/\/meet\.google\.com\/[\w-]+/gi;

  const matchFullBody = fullBodyText.match(meetRegex);
  if (matchFullBody) return matchFullBody[0];
  const matchPreview = bodyPreviewText.match(meetRegex);
  if (matchPreview) return matchPreview[0];
  const matchLocation = locationText.match(meetRegex);
  if (matchLocation) return matchLocation[0];

  return null;
}

// Zugeordnete Tätigkeit (zu Projekt oder Vorgang)
interface AssignedActivity {
  name: string;      // Tätigkeit-Kürzel
  standard: boolean; // true wenn Standard-Tätigkeit
}

interface WorkLocation {
  kurzform: string;
  bezeichnung: string;
  heimarbeitsort: boolean;
}

interface Project {
  id: number;
  name: string;
  description: string;
  activities?: AssignedActivity[]; // Dem Projekt zugeordnete Tätigkeiten
  workLocations?: string[]; // Projektspezifische Einschränkungen (Kurzformen)
  voreinstFakturierbarkeit?: number; // 1-4: Projekt-Level Fakturierbarkeit
  defaultFakt?: number; // 1-4: Projekt-Level Fakturierbarkeit (alternative)
}

interface Task {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  activities?: AssignedActivity[]; // Dem Vorgang zugeordnete Tätigkeiten (leer = erbt vom Projekt)
  defaultFakt?: number; // 0=vom Projekt geerbt, 1-4=eigene Einstellung
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
  work_location_id?: string | null;
}

// Modified entry for rebooking
interface ModifiedEntry {
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
  // Single row sync
  onSyncSingle?: (appointment: Appointment) => void;
  isSyncingSingle?: boolean;
  // Editing synced entries (rebooking)
  isEditing?: boolean;
  modifiedEntry?: ModifiedEntry;
  onStartEditSynced?: (appointmentId: string) => void;
  onCancelEditSynced?: (appointmentId: string) => void;
  onModifyProject?: (appointmentId: string, apt: Appointment, syncedEntry: SyncedEntry, projectId: number) => void;
  onModifyTask?: (appointmentId: string, taskId: number) => void;
  onModifyActivity?: (appointmentId: string, apt: Appointment, syncedEntry: SyncedEntry, activityId: string) => void;
  onModifyBillable?: (appointmentId: string, apt: Appointment, syncedEntry: SyncedEntry, billable: boolean) => void;
  onModifyBemerkung?: (appointmentId: string, apt: Appointment, syncedEntry: SyncedEntry, bemerkung: string) => void;
  onModifyTime?: (appointmentId: string, apt: Appointment, syncedEntry: SyncedEntry, useActualTime: boolean) => void;
  globalWorkLocations?: WorkLocation[];
  onWorkLocationChange?: (id: string, workLocation: string | undefined) => void;
  onModifyWorkLocation?: (appointmentId: string, apt: Appointment, syncedEntry: SyncedEntry, workLocation: string | undefined) => void;
  onSaveModifiedSingle?: (modifiedEntry: ModifiedEntry) => void;
  isSavingModifiedSingle?: boolean;
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

// Attendee Status Icon Component
function AttendeeStatusIcon({ response }: { response: string }) {
  switch (response) {
    case "accepted":
      return <Check size={12} className="text-green-600" />;
    case "tentativelyAccepted":
      return <span className="text-amber-500 text-[10px]">?</span>;
    case "declined":
      return <X size={12} className="text-red-500" />;
    case "organizer":
      return <span className="text-blue-600 text-xs font-medium">★</span>;
    default:
      return <span className="text-gray-400 text-[10px]">–</span>;
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
  isMuted?: boolean;
}

function AttendeePopover({ attendees, organizer, isOrganizer, isMuted }: AttendeePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
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

  // Toggle popover and calculate position
  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const popoverHeight = 300; // Approximate max height
      setOpenAbove(spaceBelow < popoverHeight && rect.top > popoverHeight);
    }
    setIsOpen(!isOpen);
  };

  // Check if organizer is already in attendees list
  const organizerInAttendees = organizer && attendees.some(
    a => a.emailAddress.address.toLowerCase() === organizer.emailAddress.address.toLowerCase()
  );
  // Total count includes organizer if not already in attendees
  const attendeeCount = attendees.length + (organizer && !organizerInAttendees ? 1 : 0);

  // Collect all domains including organizer
  const attendeeDomainList = attendees.map(a => a.emailAddress.address.split('@')[1]).filter(Boolean);
  if (organizer && !organizerInAttendees) {
    const organizerDomain = organizer.emailAddress.address.split('@')[1];
    if (organizerDomain) attendeeDomainList.push(organizerDomain);
  }
  const allDomains = [...new Set(attendeeDomainList)];

  // Filter out internal domains from displayed domains
  const domains = allDomains.filter(d => !isInternalDomain(d));

  // Check if all attendees are from internal domains
  const isInternalOnly = attendeeCount > 0 && allDomains.every(d => isInternalDomain(d));

  // Filter out organizer from attendees list (will be shown separately)
  const filteredAttendees = organizer
    ? attendees.filter(a => a.emailAddress.address.toLowerCase() !== organizer.emailAddress.address.toLowerCase())
    : attendees;

  // Group attendees by status
  const accepted = filteredAttendees.filter(a => a.status.response === "accepted");
  const tentative = filteredAttendees.filter(a => a.status.response === "tentativelyAccepted");
  const declined = filteredAttendees.filter(a => a.status.response === "declined");
  const noResponse = filteredAttendees.filter(a => !["accepted", "tentativelyAccepted", "declined", "organizer"].includes(a.status.response));

  // Only show trigger if there are attendees
  if (attendeeCount === 0) {
    return null;
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className={`flex items-center gap-1 text-xs hover:text-gray-700 transition-colors ${isMuted ? "text-gray-400" : "text-gray-500"}`}
        title="Teilnehmer anzeigen"
      >
        <Users size={11} />
        <span>{attendeeCount}</span>
        {!isInternalOnly && domains.length > 0 && (
          <span className="text-gray-400">
            {domains.length <= 2
              ? `(${domains.join(', ')})`
              : `(${domains.length} extern)`
            }
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute left-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-70 max-w-90 font-[Inter] ${
            openAbove ? "bottom-full mb-1" : "top-full mt-1"
          }`}
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

          <div className="space-y-2 max-h-75 overflow-y-auto">
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

          {/* Domain summary - only show if there are external domains */}
          {domains.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500">
              Externe Domains: {domains.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Single Attendee Item
function AttendeeItem({ attendee }: { attendee: Attendee }) {
  const name = attendee.emailAddress.name || attendee.emailAddress.address.split('@')[0];
  const email = attendee.emailAddress.address;

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

// Duration Info Popover Component - explains Plan vs Ist times with rounding details
interface DurationInfoPopoverProps {
  // Original times from Outlook (unrounded)
  originalStart: string;
  originalEnd: string;
  originalDurationMinutes: number;
  // Rounded times for ZEP
  plannedStart: string;
  plannedEnd: string;
  plannedDurationMinutes: number;
  // Actual times from call records (if available)
  originalActualStart?: string;
  originalActualEnd?: string;
  originalActualDurationMinutes?: number;
  // Rounded actual times for ZEP
  actualStart?: string;
  actualEnd?: string;
  actualDurationMinutes?: number;
  hasActualData: boolean;
  // Time deviation indicator
  hasDeviation?: boolean;
  // Currently selected time type (for non-synced entries)
  useActualTime?: boolean;
  // Synced time type (for synced entries) - 'planned', 'actual', 'other', or null
  syncedTimeType?: 'planned' | 'actual' | 'other' | null;
  // Callback to change time type (useActualTime: true = Ist, false = Plan)
  onTimeTypeChange?: (useActualTime: boolean) => void;
  // Whether switching is allowed (e.g., disabled for synced entries not in edit mode)
  canSwitch?: boolean;
  // Optional children to wrap (e.g., date/time display)
  children?: React.ReactNode;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}min`;
  if (hours > 0) return `${hours}h`;
  return `${mins}min`;
}

function DurationInfoPopover({
  originalStart,
  originalEnd,
  originalDurationMinutes,
  plannedStart,
  plannedEnd,
  plannedDurationMinutes,
  originalActualStart,
  originalActualEnd,
  originalActualDurationMinutes,
  actualStart,
  actualEnd,
  actualDurationMinutes,
  hasActualData,
  hasDeviation,
  useActualTime,
  syncedTimeType,
  onTimeTypeChange,
  canSwitch = false,
  children,
}: DurationInfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
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

  // Toggle popover and calculate position
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const popoverHeight = 250; // Approximate max height
      setOpenAbove(spaceBelow < popoverHeight && rect.top > popoverHeight);
    }
    setIsOpen(!isOpen);
  };

  const plannedWasRounded = originalStart !== plannedStart || originalEnd !== plannedEnd;
  const actualWasRounded = hasActualData && originalActualStart && actualStart &&
    (originalActualStart !== actualStart || originalActualEnd !== actualEnd);

  // Determine which time is selected
  // For synced entries: use syncedTimeType
  // For non-synced entries: use useActualTime
  const isIstSelected = syncedTimeType
    ? syncedTimeType === 'actual'
    : (useActualTime === true && hasActualData);
  const isPlanSelected = syncedTimeType
    ? syncedTimeType === 'planned'
    : !isIstSelected;

  return (
    <span className="relative inline-flex items-center">
      {children && (
        <button
          ref={triggerRef}
          onClick={handleToggle}
          className="hover:text-gray-700 transition-colors cursor-pointer"
          title="Zeitoptionen anzeigen"
        >
          {children}
        </button>
      )}
      {!children && (
        <button
          ref={triggerRef}
          onClick={handleToggle}
          className="text-gray-500 px-1.5 py-0.5 hover:text-gray-700 transition-colors cursor-pointer"
          title="Klicken für Details"
        >
          Dauer:
        </button>
      )}

      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute left-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-64 font-[Inter] ${
            openAbove ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <div className="text-xs font-medium text-gray-700 mb-2">
            Zeitoptionen für ZEP
          </div>

          <div className="space-y-2 text-xs">
            {/* Plan time explanation */}
            <button
              type="button"
              onClick={() => canSwitch && onTimeTypeChange?.(false)}
              disabled={!canSwitch || isPlanSelected}
              className={`w-full text-left p-2 rounded-lg border transition-all ${
                isPlanSelected
                  ? "bg-blue-50 border-blue-200 ring-1 ring-blue-300"
                  : canSwitch
                    ? "bg-blue-50/50 border-blue-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer"
                    : "bg-blue-50/50 border-blue-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${isPlanSelected ? "bg-blue-200 text-blue-800" : "bg-blue-100 text-blue-700"}`}>
                  {isPlanSelected && <Check size={10} />}
                  Plan
                </span>
                <span className="text-[10px] text-gray-500">Geplante Dauer laut Outlook-Termin</span>
                {isPlanSelected && <span className="ml-auto text-[10px] text-blue-600 font-medium">Aktiv</span>}
                {!isPlanSelected && canSwitch && <span className="ml-auto text-[10px] text-blue-500">Auswählen</span>}
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Outlook:</span>
                  <span className="text-gray-600 tabular-nums">
                    {originalStart}–{originalEnd} ({formatDuration(originalDurationMinutes)})
                  </span>
                </div>
                {plannedWasRounded && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Für ZEP:</span>
                    <span className="text-blue-600 font-medium tabular-nums">
                      {plannedStart}–{plannedEnd} ({formatDuration(plannedDurationMinutes)})
                    </span>
                  </div>
                )}
              </div>
              {plannedWasRounded && (
                <div className="text-[10px] text-gray-400 mt-1">
                  ↳ Auf 15-Minuten-Raster gerundet
                </div>
              )}
            </button>

            {/* Actual time explanation */}
            <button
              type="button"
              onClick={() => canSwitch && hasActualData && onTimeTypeChange?.(true)}
              disabled={!canSwitch || !hasActualData || isIstSelected}
              className={`w-full text-left p-2 rounded-lg border transition-all ${
                isIstSelected
                  ? "bg-orange-50 border-orange-200 ring-1 ring-orange-300"
                  : hasActualData && canSwitch
                    ? "bg-orange-50/50 border-orange-100 hover:bg-orange-50 hover:border-orange-200 cursor-pointer"
                    : hasActualData
                      ? "bg-orange-50/50 border-orange-100"
                      : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  isIstSelected
                    ? "bg-orange-200 text-orange-800"
                    : hasActualData
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-400"
                }`}>
                  {isIstSelected && <Check size={10} />}
                  Ist
                </span>
                <span className={`text-[10px] ${hasActualData ? "text-gray-500" : "text-gray-400"}`}>
                  {hasActualData
                    ? "Tatsächliche Dauer aus Teams-Anrufdaten"
                    : "Keine Anrufdaten verfügbar"
                  }
                </span>
                {isIstSelected && <span className="ml-auto text-[10px] text-orange-600 font-medium">Aktiv</span>}
                {!isIstSelected && hasActualData && canSwitch && <span className="ml-auto text-[10px] text-orange-500">Auswählen</span>}
              </div>
              {hasActualData && originalActualStart && originalActualEnd && originalActualDurationMinutes !== undefined && (
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Teams:</span>
                    <span className="text-gray-600 tabular-nums">
                      {originalActualStart}–{originalActualEnd} ({formatDuration(originalActualDurationMinutes)})
                    </span>
                  </div>
                  {actualWasRounded && actualStart && actualEnd && actualDurationMinutes !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Für ZEP:</span>
                      <span className="text-orange-600 font-medium tabular-nums">
                        {actualStart}–{actualEnd} ({formatDuration(actualDurationMinutes)})
                      </span>
                    </div>
                  )}
                  {actualWasRounded && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      ↳ Auf 15-Minuten-Raster gerundet
                    </div>
                  )}
                </div>
              )}
            </button>
          </div>

          {hasDeviation && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5 text-[10px] text-amber-600">
              <span className="text-amber-500">✱</span>
              <span>Die Zeit für ZEP weicht vom Outlook-Termin ab</span>
            </div>
          )}

          <div className={`text-[10px] text-gray-400 ${hasDeviation ? "mt-1.5" : "mt-2 pt-2 border-t border-gray-100"}`}>
            Wähle die Zeit, die in ZEP gebucht werden soll
          </div>
        </div>
      )}
    </span>
  );
}

// Conflict Link Popover - allows linking an Outlook appointment to an existing ZEP entry
interface ConflictLinkPopoverProps {
  appointmentId: string;
  appointmentDate: string; // ISO datetime
  suggestedEntryId?: number;
  suggestedEntry?: { note: string | null; from: string; to: string; projektNr?: string; vorgangNr?: string };
  syncedEntries: SyncedEntry[];
  linkedZepIds?: Set<number>;
  onLink: (appointmentId: string, zepEntryId: number) => void;
  children: React.ReactNode;
}

function ConflictLinkPopover({
  appointmentId,
  appointmentDate,
  suggestedEntryId,
  suggestedEntry,
  syncedEntries,
  linkedZepIds,
  onLink,
  children,
}: ConflictLinkPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(suggestedEntryId ?? null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const aptDateStr = new Date(appointmentDate).toISOString().split("T")[0];
  const sameDayEntries = syncedEntries.filter((entry) => {
    const entryDate = entry.date.split("T")[0];
    if (entryDate !== aptDateStr) return false;
    if (entry.id && linkedZepIds?.has(entry.id)) return false;
    return true;
  }).sort((a, b) => b.from.localeCompare(a.from));

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

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      // Reset selection when opening
      setSelectedEntryId(suggestedEntryId ?? null);
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const popoverHeight = 280;
        setOpenAbove(spaceBelow < popoverHeight && rect.top > popoverHeight);
      }
    }
    setIsOpen(!isOpen);
  };

  const handleLink = () => {
    if (selectedEntryId !== null) {
      onLink(appointmentId, selectedEntryId);
      setIsOpen(false);
    }
  };

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="cursor-pointer"
      >
        {children}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute right-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-72 max-w-96 font-[Inter] ${
            openAbove ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <div className="text-xs font-medium text-gray-700 mb-2">
            ZEP-Eintrag verknüpfen
          </div>

          {sameDayEntries.length === 0 ? (
            <div className="text-xs text-gray-500 py-2 space-y-2">
              <div>Keine verfügbaren ZEP-Einträge an diesem Tag.</div>
              {suggestedEntry && (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-[11px] text-amber-600 mb-1">Überschneidung mit:</div>
                  <div className="text-xs font-medium text-gray-800 truncate">
                    {suggestedEntry.note || "Ohne Bemerkung"}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {suggestedEntry.from.slice(0, 5)}–{suggestedEntry.to.slice(0, 5)}
                    {suggestedEntry.projektNr && (
                      <span className="ml-1.5 text-gray-400">
                        {suggestedEntry.projektNr}{suggestedEntry.vorgangNr ? `/${suggestedEntry.vorgangNr}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-amber-500 mt-1">Bereits einem anderen Termin zugeordnet</div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {sameDayEntries.map((entry) => (
                <label
                  key={entry.id}
                  className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition ${
                    selectedEntryId === entry.id
                      ? "bg-blue-50 border border-blue-200"
                      : entry.id === suggestedEntryId
                        ? "bg-amber-50 border border-amber-200 hover:bg-amber-100"
                        : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <input
                    type="radio"
                    name={`link-zep-${appointmentId}`}
                    checked={selectedEntryId === entry.id}
                    onChange={() => setSelectedEntryId(entry.id)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">
                      {entry.note || "Ohne Bemerkung"}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {entry.from.slice(0, 5)}–{entry.to.slice(0, 5)}
                      {entry.projektNr && (
                        <span className="ml-1.5 text-gray-400">
                          {entry.projektNr}{entry.vorgangNr ? `/${entry.vorgangNr}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {sameDayEntries.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleLink}
                disabled={selectedEntryId === null}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Verknüpfen
              </button>
            </div>
          )}
        </div>
      )}
    </span>
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
  actualDuration,
  onToggle,
  onProjectChange,
  onTaskChange,
  onActivityChange,
  onBillableChange,
  onCustomRemarkChange,
  onUseActualTimeChange,
  onSyncSingle,
  isSyncingSingle = false,
  isEditing = false,
  modifiedEntry,
  onStartEditSynced,
  onCancelEditSynced,
  onModifyProject,
  onModifyTask,
  onModifyActivity,
  onModifyBillable,
  onModifyBemerkung,
  onModifyTime,
  globalWorkLocations,
  onWorkLocationChange,
  onModifyWorkLocation,
  onSaveModifiedSingle,
  isSavingModifiedSingle = false,
  onCorrectTime,
  isCorrectingTime = false,
  onLinkToZep,
  syncedEntries,
  syncMappings,
  linkedZepIds: linkedZepIdsProp,
  isFocused = false,
}: AppointmentRowProps) {
  const startDate = new Date(appointment.start.dateTime);
  const endDate = new Date(appointment.end.dateTime);

  // Check if appointment is currently running (live) or starting soon (upcoming)
  const [isLive, setIsLive] = useState(() => {
    const now = new Date();
    return now >= startDate && now <= endDate;
  });
  const [isUpcoming, setIsUpcoming] = useState(() => {
    const now = new Date();
    const minutesUntilStart = (startDate.getTime() - now.getTime()) / 60000;
    return minutesUntilStart > 0 && minutesUntilStart <= 30;
  });
  const [isStartingSoon, setIsStartingSoon] = useState(() => {
    const now = new Date();
    const minutesUntilStart = (startDate.getTime() - now.getTime()) / 60000;
    return minutesUntilStart > 0 && minutesUntilStart <= 5;
  });

  // Update live/upcoming status every 30 seconds
  useEffect(() => {
    const checkStatus = () => {
      const now = new Date();
      const start = new Date(appointment.start.dateTime);
      const end = new Date(appointment.end.dateTime);
      const minutesUntilStart = (start.getTime() - now.getTime()) / 60000;

      setIsLive(now >= start && now <= end);
      setIsUpcoming(minutesUntilStart > 0 && minutesUntilStart <= 30);
      setIsStartingSoon(minutesUntilStart > 0 && minutesUntilStart <= 5);
    };

    // Check immediately
    checkStatus();

    // Set up interval to check periodically
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, [appointment.start.dateTime, appointment.end.dateTime]);

  const dayLabel = format(startDate, "EE dd.MM.", { locale: de });
  const startTime = format(startDate, "HH:mm");
  const endTime = format(endDate, "HH:mm");

  // Original (unrounded) duration in minutes
  const originalDurationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  // Ref for the editing UI to detect clicks outside
  const editingRowRef = useRef<HTMLDivElement>(null);


  // Planned duration (for ZEP - only rounds if duration is not a 15-min multiple)
  const plannedDurationRounded = useMemo(() => {
    const start = new Date(appointment.start.dateTime);
    const end = new Date(appointment.end.dateTime);
    const display = calculateDisplayTimes(start, end);
    return {
      hours: display.durationHours,
      minutes: display.durationMins,
      totalMinutes: display.durationMinutes,
      startFormatted: display.startFormatted,
      endFormatted: display.endFormatted,
    };
  }, [appointment.start.dateTime, appointment.end.dateTime]);

  // Actual duration from call records (if available)
  // Display uses real call record times, ZEP booking uses planned start + actual duration
  const actualDurationInfo = useMemo(() => {
    if (!actualDuration) return null;
    const actualStart = new Date(actualDuration.actualStart);
    const actualEnd = new Date(actualDuration.actualEnd);

    // Calculate original (unrounded) duration
    const originalDurationMs = actualEnd.getTime() - actualStart.getTime();
    const originalDurationMinutes = Math.round(originalDurationMs / 60000);

    // For DISPLAY: use real call record times (rounded)
    const display = calculateDisplayTimes(actualStart, actualEnd);
    const difference = display.durationMinutes - plannedDurationRounded.totalMinutes;

    // For ZEP BOOKING: use planned start (rounded) + ROUNDED actual duration
    // We use display.durationMinutes (the rounded duration) to match what the badge shows
    const plannedStart = new Date(appointment.start.dateTime);
    const roundedPlannedStart = roundToNearest15Min(plannedStart);
    const zepEndDate = new Date(roundedPlannedStart.getTime() + display.durationMinutes * 60 * 1000);

    const formatTime = (d: Date) =>
      d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

    return {
      hours: display.durationHours,
      minutes: display.durationMins,
      totalMinutes: display.durationMinutes,
      difference,
      // Color based on difference: green if shorter, orange if longer, gray if same
      color: difference < 0 ? "text-green-600" : difference > 0 ? "text-orange-600" : "text-gray-500",
      // Original times (unrounded from call records)
      originalStart: formatTime(actualStart),
      originalEnd: formatTime(actualEnd),
      originalDurationMinutes,
      // Display times (real call record times, rounded)
      startRounded: display.startFormatted,
      endRounded: display.endFormatted,
      // ZEP booking times (planned start rounded + rounded duration)
      zepStart: formatTime(roundedPlannedStart),
      zepEnd: formatTime(zepEndDate),
    };
  }, [actualDuration, appointment.start.dateTime, plannedDurationRounded.totalMinutes]);

  // ZEP booked duration (for synced entries)
  const zepBookedDuration = useMemo(() => {
    if (!isSynced || !syncedEntry) return null;
    // Parse ZEP times (format: "HH:mm:ss")
    const [fromH, fromM] = syncedEntry.from.split(':').map(Number);
    const [toH, toM] = syncedEntry.to.split(':').map(Number);
    const fromMinutes = fromH * 60 + fromM;
    const toMinutes = toH * 60 + toM;
    const bookedMinutes = toMinutes - fromMinutes;
    const bookedHours = Math.floor(bookedMinutes / 60);
    const bookedMins = bookedMinutes % 60;
    return {
      hours: bookedHours,
      minutes: bookedMins,
      totalMinutes: bookedMinutes,
      from: syncedEntry.from.slice(0, 5), // "HH:mm"
      to: syncedEntry.to.slice(0, 5),     // "HH:mm"
    };
  }, [isSynced, syncedEntry]);

  // Determine which time was synced (planned or actual)
  const syncedTimeType = useMemo(() => {
    if (!zepBookedDuration) return null;
    // Compare ZEP booked times with planned and actual times
    const zepFrom = zepBookedDuration.from;
    const zepTo = zepBookedDuration.to;
    const plannedFrom = plannedDurationRounded.startFormatted;
    const plannedTo = plannedDurationRounded.endFormatted;

    // Check if synced with planned time
    if (zepFrom === plannedFrom && zepTo === plannedTo) {
      return 'planned';
    }

    // Check if synced with actual time (if available)
    if (actualDurationInfo) {
      // New format: planned start + actual duration (for ZEP booking)
      if (zepFrom === actualDurationInfo.zepStart && zepTo === actualDurationInfo.zepEnd) {
        return 'actual';
      }
      // Also check old format: original call record times (for backwards compatibility)
      if (zepFrom === actualDurationInfo.startRounded && zepTo === actualDurationInfo.endRounded) {
        return 'actual';
      }
    }

    // Times don't match either - could be manually edited in ZEP
    return 'other';
  }, [zepBookedDuration, plannedDurationRounded, actualDurationInfo]);

  // Check if the shorter time was synced (warning: other time option was longer)
  const syncedShorterTime = useMemo(() => {
    // Only relevant for synced entries with actual duration data
    if (!isSynced || !actualDurationInfo || !zepBookedDuration) return false;

    // Calculate ZEP booked duration in minutes
    const [fromH, fromM] = zepBookedDuration.from.split(':').map(Number);
    const [toH, toM] = zepBookedDuration.to.split(':').map(Number);
    const zepMinutes = (toH * 60 + toM) - (fromH * 60 + fromM);

    // Get the planned and actual durations
    const plannedMinutes = plannedDurationRounded.totalMinutes;
    const actualMinutes = actualDurationInfo.totalMinutes;

    // Find the longer available time
    const longerTime = Math.max(plannedMinutes, actualMinutes);

    // Warning if ZEP time is shorter than the longer available time
    return zepMinutes < longerTime;
  }, [isSynced, actualDurationInfo, zepBookedDuration, plannedDurationRounded.totalMinutes]);

  // Check if there's a time deviation between Outlook and ZEP times
  const timeDeviation = useMemo(() => {
    // Get the ZEP time that will be/was used
    let zepStart: string;
    let zepEnd: string;

    if (isSynced && zepBookedDuration) {
      // Already synced - use booked time
      zepStart = zepBookedDuration.from;
      zepEnd = zepBookedDuration.to;
    } else if (appointment.useActualTime && actualDurationInfo) {
      // Will use actual time (planned start + actual duration for ZEP)
      zepStart = actualDurationInfo.zepStart;
      zepEnd = actualDurationInfo.zepEnd;
    } else {
      // Will use planned time (rounded)
      zepStart = plannedDurationRounded.startFormatted;
      zepEnd = plannedDurationRounded.endFormatted;
    }

    // Compare with original Outlook time
    const hasDeviation = zepStart !== startTime || zepEnd !== endTime;
    if (!hasDeviation) return null;

    // Determine reason for deviation
    const usesActual = appointment.useActualTime && actualDurationInfo;
    const plannedDiffers = plannedDurationRounded.startFormatted !== startTime ||
                          plannedDurationRounded.endFormatted !== endTime;

    let reason: 'rounded' | 'actual' | 'both';
    if (usesActual && plannedDiffers) {
      reason = 'both';
    } else if (usesActual) {
      reason = 'actual';
    } else {
      reason = 'rounded';
    }

    return {
      outlookStart: startTime,
      outlookEnd: endTime,
      zepStart,
      zepEnd,
      reason,
      actualStart: actualDurationInfo?.startRounded,
      actualEnd: actualDurationInfo?.endRounded,
    };
  }, [
    isSynced, zepBookedDuration, appointment.useActualTime, actualDurationInfo,
    plannedDurationRounded, startTime, endTime
  ]);

  const attendees = appointment.attendees || [];
  const attendeeCount = attendees.length;
  
  // Check if all attendees are from internal domains (contiva.com or subdomains)
  const attendeeDomains = [...new Set(attendees.map(a => a.emailAddress.address.split('@')[1]).filter(Boolean))];
  const isInternalOnly = attendeeCount > 0 && attendeeDomains.every(d => isInternalDomain(d));

  // Determine if billable can be changed in edit mode (based on task/project settings)
  const canEditBillableInEditMode = useMemo(() => {
    if (!isEditing) return true;
    
    const selectedProjectId = modifiedEntry?.newProjectId || syncedEntry?.project_id;
    const selectedTaskId = modifiedEntry?.newTaskId || syncedEntry?.project_task_id;
    
    if (!selectedTaskId || !selectedProjectId) return true; // No task selected yet
    
    // Find the selected task and project
    let selectedTask: Task | undefined;
    if (allTasks && allTasks[selectedProjectId]) {
      selectedTask = allTasks[selectedProjectId].find(t => t.id === selectedTaskId);
    }
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    
    const projektFakt = selectedProject?.voreinstFakturierbarkeit ?? selectedProject?.defaultFakt;
    const vorgangFakt = selectedTask?.defaultFakt;
    
    return canChangeBillableForTask(projektFakt, vorgangFakt);
  }, [isEditing, allTasks, projects, modifiedEntry?.newProjectId, modifiedEntry?.newTaskId, syncedEntry?.project_id, syncedEntry?.project_task_id]);

  // Get effective work locations for the current project
  // "- erste Tätigkeitsstätte -" is a ZEP system value (primary workplace), always available
  // If project has projektortListe → filter global list to those orte
  // If project has no projektortListe → all global orte available
  const currentWorkLocations = useMemo(() => {
    if (!globalWorkLocations || globalWorkLocations.length === 0) return [];
    const pid = isEditing
      ? (modifiedEntry?.newProjectId || syncedEntry?.project_id)
      : appointment.projectId;
    if (!pid) return [];
    const project = projects.find((p) => p.id === pid);
    if (!project) return [];

    const ERSTE_TAETIGKEIT: WorkLocation = {
      kurzform: "- erste Tätigkeitsstätte -",
      bezeichnung: "Erste Tätigkeitsstätte",
      heimarbeitsort: false,
    };

    let locations: WorkLocation[];
    if (project.workLocations && project.workLocations.length > 0) {
      // Project has specific restrictions — filter global list, but always include system value
      const allowed = new Set(project.workLocations);
      locations = globalWorkLocations.filter(wl => allowed.has(wl.kurzform));
      // Add any restriction entries not in global list (like "- erste Tätigkeitsstätte -")
      for (const wlKey of project.workLocations) {
        if (!globalWorkLocations.some(g => g.kurzform === wlKey) && wlKey !== ERSTE_TAETIGKEIT.kurzform) {
          locations.push({ kurzform: wlKey, bezeichnung: wlKey, heimarbeitsort: false });
        }
      }
    } else {
      // No restrictions → all global work locations
      locations = [...globalWorkLocations];
    }

    // Always prepend "- erste Tätigkeitsstätte -" as first option if not already present
    if (!locations.some(wl => wl.kurzform === ERSTE_TAETIGKEIT.kurzform)) {
      locations.unshift(ERSTE_TAETIGKEIT);
    } else {
      // Move it to the front
      locations = [
        ERSTE_TAETIGKEIT,
        ...locations.filter(wl => wl.kurzform !== ERSTE_TAETIGKEIT.kurzform),
      ];
    }

    return locations;
  }, [globalWorkLocations, projects, appointment.projectId, isEditing, modifiedEntry?.newProjectId, syncedEntry?.project_id]);

  // Bemerkung values for synced editing mode
  const syncedBemerkungValues = useMemo(() => {
    if (!syncedEntry) return { bemerkung: "", isCustom: false };
    const hasCustomRemark = syncedEntry.note && syncedEntry.note.trim() !== (appointment.subject || "").trim();
    const displayValue = modifiedEntry?.bemerkung !== undefined
      ? modifiedEntry.bemerkung
      : (hasCustomRemark ? syncedEntry.note! : "");
    const isCustom = !!(displayValue && displayValue.trim() !== (appointment.subject || "").trim());
    return { bemerkung: displayValue, isCustom };
  }, [syncedEntry, appointment.subject, modifiedEntry]);

  // Bemerkung values for unsynced mode
  const unsyncedBemerkungValues = useMemo(() => {
    const hasCustom = appointment.customRemark && appointment.customRemark.trim() !== (appointment.subject || "").trim();
    return { bemerkung: hasCustom ? appointment.customRemark! : "", isCustom: !!hasCustom };
  }, [appointment.customRemark, appointment.subject]);

  // Check if this entry has been modified (for visual indicator)
  const isModified = useMemo(() => {
    if (!modifiedEntry || !syncedEntry) return false;
    // Check project/task/activity/billable changes
    const hasProjectChanges =
      modifiedEntry.newProjectId !== syncedEntry.project_id ||
      modifiedEntry.newTaskId !== syncedEntry.project_task_id ||
      modifiedEntry.newActivityId !== syncedEntry.activity_id ||
      modifiedEntry.newBillable !== syncedEntry.billable;
    // Check time changes
    const hasTimeChanges = modifiedEntry.newVon !== undefined || modifiedEntry.newBis !== undefined;
    // Check bemerkung changes
    const hasBemerkungChanges = modifiedEntry.bemerkung !== undefined && modifiedEntry.bemerkung !== (syncedEntry.note || "");
    // Check work location changes
    const hasOrtChanges = modifiedEntry.newOrt !== undefined && modifiedEntry.newOrt !== (syncedEntry.work_location_id || undefined);
    return hasProjectChanges || hasTimeChanges || hasBemerkungChanges || hasOrtChanges;
  }, [modifiedEntry, syncedEntry]);


  // Click outside handler: Cancel editing if no changes were made
  useEffect(() => {
    if (!isEditing || isModified) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // Check if click is inside the row
      if (editingRowRef.current?.contains(target)) {
        return;
      }

      // Check if click is inside a HeadlessUI portal (dropdown options)
      // HeadlessUI adds data-headlessui-state attribute to portal elements
      if (target.closest('[data-headlessui-state]')) {
        return;
      }

      // Use setTimeout to allow the click event on other edit buttons to be processed first
      setTimeout(() => {
        onCancelEditSynced?.(appointment.id);
      }, 0);
    }

    // Small delay to avoid immediate trigger from the edit button click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, isModified, appointment.id, onCancelEditSynced]);

  // ZEP entry IDs already linked to any appointment (to exclude from popover)
  // Prefer prop from parent (includes both Redis + subject matches), fallback to syncMappings only
  const linkedZepIds = useMemo(() => {
    if (linkedZepIdsProp) return linkedZepIdsProp;
    if (!syncMappings || syncMappings.size === 0) return undefined;
    const ids = new Set<number>();
    for (const mapping of syncMappings.values()) {
      ids.add(mapping.zepAttendanceId);
    }
    return ids;
  }, [linkedZepIdsProp, syncMappings]);

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
      activityId: syncedEntry.activity_id, // Short form like "be", "vw"
      activityName: activity?.description || syncedEntry.activity_id,
      billable: syncedEntry.billable,
    };
  }, [syncedEntry, projects, activities, allTasks]);

  // Muted state for unselected, non-synced appointments
  const isMuted = !appointment.selected && !isSynced && !isSyncReady;

  return (
    <div
      id={`appointment-${appointment.id}`}
      ref={editingRowRef}
      className={`px-3 py-2 border-r border-b border-t border-l-4 transition-shadow ${
        isFocused
          ? "ring-2 ring-blue-400 ring-inset"
          : ""
      } ${
        isSynced && isModified
          ? "border-l-yellow-400 border-gray-200 bg-yellow-50/30"
          : isSynced
            ? "border-l-green-600 border-gray-200 bg-green-50/30"
            : isSyncReady
              ? "border-l-amber-400 border-gray-200 bg-amber-50/30"
              : appointment.selected
                ? "border-l-red-400 border-gray-200 bg-white"
                : "border-l-gray-300 border-gray-200 bg-gray-50/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status icons: Synced, Ready-to-sync, or Checkbox + duplicate warning below */}
        <div className="shrink-0 w-5 flex flex-col items-center gap-1">
          {/* Primary status icon */}
          <div className="h-5 w-5 flex items-center justify-center">
            {isSynced && isModified ? (
              // Synced with pending changes - orange clock arrow up
              <div
                title="Änderungen ausstehend"
                role="img"
                aria-label="Änderungen ausstehend"
              >
                <ClockArrowUp className="h-4 w-4 text-amber-500" aria-hidden="true" />
              </div>
            ) : isSynced ? (
              // Synced without changes - green clock check
              <div
                title="Bereits in ZEP synchronisiert"
                role="img"
                aria-label="Bereits in ZEP synchronisiert"
              >
                <ClockCheck className="h-4 w-4 text-green-600" aria-hidden="true" />
              </div>
            ) : isSyncReady ? (
              // Ready to sync - orange clock arrow up
              <div
                title="Bereit zur Synchronisierung"
                role="img"
                aria-label="Bereit zur Synchronisierung"
              >
                <ClockArrowUp className="h-4 w-4 text-amber-500" aria-hidden="true" />
              </div>
            ) : (
              // Not synced, not ready - checkbox
              <button
                type="button"
                onClick={() => onToggle(appointment.id)}
                className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                  appointment.selected
                    ? "bg-blue-50 border-blue-300 text-blue-500"
                    : "border-gray-300 bg-white hover:bg-gray-50"
                }`}
                aria-label={`Termin auswählen: ${appointment.subject}`}
                aria-pressed={appointment.selected}
              >
                {appointment.selected && <Check size={12} strokeWidth={2.5} />}
              </button>
            )}
          </div>
          {/* Duplicate warning indicator */}
          {duplicateWarning?.hasDuplicate && !isSynced && duplicateWarning.type !== 'rescheduled' && (
            <div
              className="h-4 w-4 flex items-center justify-center"
              title={duplicateWarning.message}
            >
              <AlertTriangle
                size={14}
                className="text-amber-500"
                aria-label={duplicateWarning.message}
              />
            </div>
          )}
        </div>

        {/* Main content - Title on top, details below */}
        <div className="flex-1 min-w-0">
          {/* Title row with duration */}
          <div className="flex items-center gap-1.5 min-h-5">
            {/* Title and organizer grouped with center alignment */}
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Live Badge */}
              {isLive && (
                <span className="inline-flex items-center gap-0.5 px-1 rounded text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-600 shrink-0 leading-4">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Jetzt
                </span>
              )}
              {/* Upcoming Badge - subtle */}
              {!isLive && isUpcoming && (
                <span className="inline-flex items-center gap-1 px-1 rounded text-[10px] text-blue-500 uppercase border border-blue-300 shrink-0 leading-4">
                  {isStartingSoon && (
                    <span className="inline-flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                  In Kürze
                </span>
              )}
              {(() => {
                // In synced mode: show ZEP note as primary title if it differs from Outlook subject
                const zepNote = isSynced && syncedEntry?.note ? syncedEntry.note.trim() : null;
                const hasAltTitle = zepNote && zepNote !== (appointment.subject || "").trim();

                if (hasAltTitle) {
                  return (
                    <span className={`font-bold text-sm truncate ${isMuted ? "text-gray-400" : "text-gray-900"}`}>{zepNote}</span>
                  );
                }

                return appointment.subject ? (
                  <span className={`font-bold text-sm truncate ${isMuted ? "text-gray-400" : "text-gray-900"}`}>{appointment.subject}</span>
                ) : (
                  <span className="font-medium text-gray-400 text-sm italic">Kein Titel definiert</span>
                );
              })()}
              {/* Organizer - inline after title */}
              {appointment.organizer && (
                <span
                  className={`text-xs font-light shrink-0 ${isMuted ? "text-gray-400" : "text-gray-500"}`}
                  title={appointment.organizer.emailAddress.address}
                >
                  {appointment.isOrganizer ? "von Dir" : `von ${formatName(appointment.organizer.emailAddress.name) || appointment.organizer.emailAddress.address}`}
                </span>
              )}
            </div>
            {/* Separator after organizer */}
            {appointment.organizer && (
              <span className={`text-xs ${isMuted ? "text-gray-200" : "text-gray-300"}`}>•</span>
            )}
            {/* Attendees with Popover */}
            {attendeeCount > 0 && (
              <AttendeePopover
                attendees={attendees}
                organizer={appointment.organizer}
                isOrganizer={appointment.isOrganizer}
                isMuted={isMuted}
              />
            )}
            {/* Separator after attendees - only show if there's visible location or meeting icons */}
            {attendeeCount > 0 && (
              (appointment.location?.displayName &&
                !appointment.location.displayName.toLowerCase().includes('microsoft teams') &&
                !appointment.location.displayName.toLowerCase().includes('calendly.com') &&
                !appointment.location.displayName.toLowerCase().includes('zoom.us') &&
                !appointment.location.displayName.toLowerCase().includes('meet.google.com')) ||
              appointment.isCancelled ||
              appointment.isOnlineMeeting ||
              hasTeamsLinkInBody(appointment) ||
              isZoomMeeting(appointment) ||
              isCalendlyMeeting(appointment) ||
              isGoogleMeetMeeting(appointment)
            ) && (
              <span className={`text-xs ${isMuted ? "text-gray-200" : "text-gray-300"}`}>•</span>
            )}
            {/* Location - hide if it's a meeting service URL (redundant with icons) */}
            {appointment.location?.displayName &&
              !appointment.location.displayName.toLowerCase().includes('microsoft teams') &&
              !appointment.location.displayName.toLowerCase().includes('calendly.com') &&
              !appointment.location.displayName.toLowerCase().includes('zoom.us') &&
              !appointment.location.displayName.toLowerCase().includes('meet.google.com') && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs ${isMuted ? "text-gray-400" : "text-gray-500"}`}
                title={appointment.location.displayName}
              >
                <MapPin size={11} className="shrink-0" />
                <span className="truncate max-w-30">{appointment.location.displayName}</span>
              </span>
            )}
            {/* Cancelled badge */}
            {appointment.isCancelled && (
              <span 
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium cursor-help"
                title={appointment.lastModifiedDateTime 
                  ? `Abgesagt am ${format(new Date(appointment.lastModifiedDateTime), "dd.MM.yyyy 'um' HH:mm", { locale: de })}` 
                  : "Abgesagt"}
              >
                <Ban size={10} />
                Abgesagt
                {appointment.lastModifiedDateTime && (
                  <span className="text-red-500">
                    ({format(new Date(appointment.lastModifiedDateTime), "dd.MM.", { locale: de })})
                  </span>
                )}
              </span>
            )}
            {/* Teams Meeting Icon / Join Button - also detect Teams links in body */}
            {((appointment.isOnlineMeeting && appointment.onlineMeetingProvider === "teamsForBusiness") || hasTeamsLinkInBody(appointment)) && (
              (() => {
                const teamsUrl = appointment.onlineMeeting?.joinUrl || getTeamsJoinUrlFromBody(appointment);
                return (isLive || isUpcoming) && teamsUrl ? (
                  <a
                    href={teamsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`group inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 transition-all ${
                      isLive
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    }`}
                    title="Teams Meeting beitreten"
                  >
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      viewBox="0 0 2228.833 2073.333"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="Teams Meeting"
                    >
                      <path fill="#5059C9" d="M1554.637 777.5h575.713c54.391 0 98.483 44.092 98.483 98.483v524.398c0 199.901-162.051 361.952-361.952 361.952h-1.711c-199.901.028-361.975-162.023-362.004-361.924V828.971c.001-28.427 23.045-51.471 51.471-51.471z"/>
                      <circle fill="#5059C9" cx="1943.75" cy="440.583" r="233.25"/>
                      <circle fill="#7B83EB" cx="1218.083" cy="336.917" r="336.917"/>
                      <path fill="#7B83EB" d="M1667.323 777.5H717.01c-53.743 1.33-96.257 45.931-95.01 99.676v598.105c-7.505 322.519 247.657 590.16 570.167 598.053 322.51-7.893 577.671-275.534 570.167-598.053V877.176c1.245-53.745-41.268-98.346-95.011-99.676z"/>
                      <linearGradient id="teams-gradient" gradientUnits="userSpaceOnUse" x1="198.099" y1="1683.0726" x2="942.2344" y2="394.2607" gradientTransform="matrix(1 0 0 -1 0 2075.3333)">
                        <stop offset="0" stopColor="#5a62c3"/><stop offset=".5" stopColor="#4d55bd"/><stop offset="1" stopColor="#3940ab"/>
                      </linearGradient>
                      <path fill="url(#teams-gradient)" d="M95.01 466.5h950.312c52.473 0 95.01 42.538 95.01 95.01v950.312c0 52.473-42.538 95.01-95.01 95.01H95.01c-52.473 0-95.01-42.538-95.01-95.01V561.51c0-52.472 42.538-95.01 95.01-95.01z"/>
                      <path fill="#FFF" d="M820.211 828.193H630.241v517.297H509.211V828.193H320.123V727.844h500.088v100.349z"/>
                    </svg>
                    Beitreten
                  </a>
                ) : (
                  <span className="group">
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all ${isMuted ? "opacity-40" : ""}`}
                      viewBox="0 0 2228.833 2073.333"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="Teams Meeting"
                    >
                      <path fill="#5059C9" d="M1554.637 777.5h575.713c54.391 0 98.483 44.092 98.483 98.483v524.398c0 199.901-162.051 361.952-361.952 361.952h-1.711c-199.901.028-361.975-162.023-362.004-361.924V828.971c.001-28.427 23.045-51.471 51.471-51.471z"/>
                      <circle fill="#5059C9" cx="1943.75" cy="440.583" r="233.25"/>
                      <circle fill="#7B83EB" cx="1218.083" cy="336.917" r="336.917"/>
                      <path fill="#7B83EB" d="M1667.323 777.5H717.01c-53.743 1.33-96.257 45.931-95.01 99.676v598.105c-7.505 322.519 247.657 590.16 570.167 598.053 322.51-7.893 577.671-275.534 570.167-598.053V877.176c1.245-53.745-41.268-98.346-95.011-99.676z"/>
                      <linearGradient id="teams-gradient-muted" gradientUnits="userSpaceOnUse" x1="198.099" y1="1683.0726" x2="942.2344" y2="394.2607" gradientTransform="matrix(1 0 0 -1 0 2075.3333)">
                        <stop offset="0" stopColor="#5a62c3"/><stop offset=".5" stopColor="#4d55bd"/><stop offset="1" stopColor="#3940ab"/>
                      </linearGradient>
                      <path fill="url(#teams-gradient-muted)" d="M95.01 466.5h950.312c52.473 0 95.01 42.538 95.01 95.01v950.312c0 52.473-42.538 95.01-95.01 95.01H95.01c-52.473 0-95.01-42.538-95.01-95.01V561.51c0-52.472 42.538-95.01 95.01-95.01z"/>
                      <path fill="#FFF" d="M820.211 828.193H630.241v517.297H509.211V828.193H320.123V727.844h500.088v100.349z"/>
                    </svg>
                  </span>
                );
              })()
            )}
            {/* Zoom Meeting Icon / Join Button - show for Zoom meetings that are not Teams */}
            {appointment.onlineMeetingProvider !== "teamsForBusiness" && !hasTeamsLinkInBody(appointment) && isZoomMeeting(appointment) && (
              (() => {
                const zoomUrl = getZoomJoinUrl(appointment);
                return (isLive || isUpcoming) && zoomUrl ? (
                  <a
                    href={zoomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`group inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 transition-all ${
                      isLive
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                    title="Zoom Meeting beitreten"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-label="Zoom Meeting">
                      <rect width="512" height="512" rx="85" fill="#2D8CFF"/>
                      <path fill="#fff" d="M310 178H148c-16.5 0-30 13.5-30 30v96c0 16.5 13.5 30 30 30h162c16.5 0 30-13.5 30-30v-96c0-16.5-13.5-30-30-30zm84 6v144l-48-36v-72l48-36z"/>
                    </svg>
                    Beitreten
                  </a>
                ) : (
                  <span className="group" title="Zoom Meeting">
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all ${isMuted ? "opacity-40" : ""}`}
                      viewBox="0 0 512 512"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="Zoom Meeting"
                    >
                      <rect width="512" height="512" rx="85" fill="#2D8CFF"/>
                      <path fill="#fff" d="M310 178H148c-16.5 0-30 13.5-30 30v96c0 16.5 13.5 30 30 30h162c16.5 0 30-13.5 30-30v-96c0-16.5-13.5-30-30-30zm84 6v144l-48-36v-72l48-36z"/>
                    </svg>
                  </span>
                );
              })()
            )}
            {/* Calendly Meeting Icon / Join Button */}
            {isCalendlyMeeting(appointment) && (
              (() => {
                const calendlyUrl = getCalendlyUrl(appointment);
                return (isLive || isUpcoming) && calendlyUrl ? (
                  <a
                    href={calendlyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`group inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 transition-all ${
                      isLive
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                    title="Calendly Meeting öffnen"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="Calendly">
                      <rect width="120" height="120" rx="24" fill="#006BFF"/>
                      <rect x="28" y="38" width="64" height="54" rx="6" fill="none" stroke="#fff" strokeWidth="5"/>
                      <path d="M28 52h64" stroke="#fff" strokeWidth="5"/>
                      <circle cx="42" cy="34" r="4" fill="#fff"/>
                      <circle cx="78" cy="34" r="4" fill="#fff"/>
                      <path d="M44 68l10 10 22-22" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                    Öffnen
                  </a>
                ) : (
                  <span className="group" title="Calendly Meeting">
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all ${isMuted ? "opacity-40" : ""}`}
                      viewBox="0 0 120 120"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="Calendly"
                    >
                      <rect width="120" height="120" rx="24" fill="#006BFF"/>
                      <rect x="28" y="38" width="64" height="54" rx="6" fill="none" stroke="#fff" strokeWidth="5"/>
                      <path d="M28 52h64" stroke="#fff" strokeWidth="5"/>
                      <circle cx="42" cy="34" r="4" fill="#fff"/>
                      <circle cx="78" cy="34" r="4" fill="#fff"/>
                      <path d="M44 68l10 10 22-22" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </span>
                );
              })()
            )}
            {/* Google Meet Icon / Join Button */}
            {isGoogleMeetMeeting(appointment) && (
              (() => {
                const meetUrl = getGoogleMeetUrl(appointment);
                return (isLive || isUpcoming) && meetUrl ? (
                  <a
                    href={meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`group inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 transition-all ${
                      isLive
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                    title="Google Meet beitreten"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 87.5 72" xmlns="http://www.w3.org/2000/svg" aria-label="Google Meet">
                      <path fill="#00832d" d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z"/>
                      <path fill="#0066da" d="M0 51.5V66c0 3.315 2.685 6 6 6h14.5l3-10.96-3-9.54H0z"/>
                      <path fill="#e94235" d="M20.5 0L0 20.5l10.25 3 10.25-3V0z"/>
                      <path fill="#2684fc" d="M20.5 20.5H0v31h20.5z"/>
                      <path fill="#00ac47" d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c2.97 2.44 7.34.46 7.34-3.32V12.09c0-3.81-4.42-5.78-7.4-3.41z"/>
                      <path fill="#00832d" d="M49.5 36v15.5h-29V72h43c3.315 0 6-2.685 6-6V53.08z"/>
                      <path fill="#ffba00" d="M63.5 0h-43v20.5h29V36l19.5-16.08V6c0-3.315-2.685-6-6-6z"/>
                    </svg>
                    Beitreten
                  </a>
                ) : (
                  <span className="group" title="Google Meet">
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all ${isMuted ? "opacity-40" : ""}`}
                      viewBox="0 0 87.5 72"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="Google Meet"
                    >
                      <path fill="#00832d" d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z"/>
                      <path fill="#0066da" d="M0 51.5V66c0 3.315 2.685 6 6 6h14.5l3-10.96-3-9.54H0z"/>
                      <path fill="#e94235" d="M20.5 0L0 20.5l10.25 3 10.25-3V0z"/>
                      <path fill="#2684fc" d="M20.5 20.5H0v31h20.5z"/>
                      <path fill="#00ac47" d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c2.97 2.44 7.34.46 7.34-3.32V12.09c0-3.81-4.42-5.78-7.4-3.41z"/>
                      <path fill="#00832d" d="M49.5 36v15.5h-29V72h43c3.315 0 6-2.685 6-6V53.08z"/>
                      <path fill="#ffba00" d="M63.5 0h-43v20.5h29V36l19.5-16.08V6c0-3.315-2.685-6-6-6z"/>
                    </svg>
                  </span>
                );
              })()
            )}
            {/* Call badges */}
            {appointment.type === 'call' && (
              <>
                <span
                  className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-800"
                  title="Anruf"
                >
                  Call
                </span>
                {appointment.callType && (
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600"
                    title={`Anruftyp: ${appointment.callType}`}
                  >
                    {appointment.callType}
                  </span>
                )}
                {appointment.direction && (
                  <span
                    className="text-[10px]"
                    title={appointment.direction === 'incoming' ? 'Eingehender Anruf' : 'Ausgehender Anruf'}
                  >
                    {appointment.direction === 'incoming' ? '📥' : '📤'}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Original Outlook title - shown below when synced with different remark */}
          {isSynced && syncedEntry?.note && syncedEntry.note.trim() !== (appointment.subject || "").trim() && (
            <div className={`text-[11px] truncate line-through ml-0.5 -mt-0.5 ${isMuted ? "text-gray-300" : "text-gray-400"}`}>
              {appointment.subject}
            </div>
          )}

          {/* Details row - Date/Time, Organizer, Attendee Domains */}
          <div className={`flex items-center gap-2 text-xs mt-0.5 ${isMuted ? "text-gray-400" : "text-gray-500"}`}>
            {/* Date and Time - clickable to show time options popover */}
            <DurationInfoPopover
              originalStart={startTime}
              originalEnd={endTime}
              originalDurationMinutes={originalDurationMinutes}
              plannedStart={plannedDurationRounded.startFormatted}
              plannedEnd={plannedDurationRounded.endFormatted}
              plannedDurationMinutes={plannedDurationRounded.totalMinutes}
              originalActualStart={actualDurationInfo?.originalStart}
              originalActualEnd={actualDurationInfo?.originalEnd}
              originalActualDurationMinutes={actualDurationInfo?.originalDurationMinutes}
              actualStart={actualDurationInfo?.zepStart}
              actualEnd={actualDurationInfo?.zepEnd}
              actualDurationMinutes={actualDurationInfo?.totalMinutes}
              hasActualData={!!actualDurationInfo}
              hasDeviation={!!timeDeviation}
              useActualTime={appointment.useActualTime}
              syncedTimeType={syncedTimeType}
              canSwitch={(!isSynced || isEditing) && !!actualDurationInfo && actualDurationInfo.difference !== 0}
              onTimeTypeChange={(useActual) => {
                if (isEditing && syncedEntry && onModifyTime) {
                  onModifyTime(appointment.id, appointment, syncedEntry, useActual);
                } else if (!isSynced) {
                  onUseActualTimeChange?.(appointment.id, useActual);
                }
              }}
            >
              <span className="relative pr-2">
                {isSynced && !isEditing && zepBookedDuration ? (
                  <span className={`font-semibold ${isMuted ? "text-gray-400" : "text-gray-700"}`}>{zepBookedDuration.from}–{zepBookedDuration.to}</span>
                ) : actualDurationInfo ? (
                  <span className={`font-semibold ${isMuted ? "text-gray-400" : "text-gray-700"}`}>
                    {appointment.useActualTime
                      ? `${actualDurationInfo.zepStart}–${actualDurationInfo.zepEnd}`
                      : `${plannedDurationRounded.startFormatted}–${plannedDurationRounded.endFormatted}`
                    }
                  </span>
                ) : (
                  <span className={`font-semibold ${isMuted ? "text-gray-400" : "text-gray-700"}`}>{plannedDurationRounded.startFormatted}–{plannedDurationRounded.endFormatted}</span>
                )}
                <span className={`ml-1 font-medium ${isMuted ? "text-gray-400" : "text-gray-500"}`}>{dayLabel}</span>
                {timeDeviation && (
                  <sup className="absolute right-0.5 top-1 text-[8px] text-amber-500">✱</sup>
                )}
              </span>
            </DurationInfoPopover>

            {/* Separator before duration badge */}
            <span className={`text-xs ${isMuted ? "text-gray-200" : "text-gray-300"}`}>•</span>

            {/* Duration badge - shows both times for synced entries with checkmark on synced one */}
            {isSynced && !isEditing && zepBookedDuration ? (
              // Synced (not editing): Show both times with checkmark on synced one
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] rounded ${isMuted ? "bg-gray-100 text-gray-400" : "bg-gray-100"}`}
                title={`In ZEP gebucht: ${zepBookedDuration.from}–${zepBookedDuration.to}`}
              >
                <DurationInfoPopover
                  originalStart={startTime}
                  originalEnd={endTime}
                  originalDurationMinutes={originalDurationMinutes}
                  plannedStart={plannedDurationRounded.startFormatted}
                  plannedEnd={plannedDurationRounded.endFormatted}
                  plannedDurationMinutes={plannedDurationRounded.totalMinutes}
                  originalActualStart={actualDurationInfo?.originalStart}
                  originalActualEnd={actualDurationInfo?.originalEnd}
                  originalActualDurationMinutes={actualDurationInfo?.originalDurationMinutes}
                  actualStart={actualDurationInfo?.zepStart}
                  actualEnd={actualDurationInfo?.zepEnd}
                  actualDurationMinutes={actualDurationInfo?.totalMinutes}
                  hasActualData={!!actualDurationInfo}
                  hasDeviation={!!timeDeviation}
                  useActualTime={appointment.useActualTime}
                  syncedTimeType={syncedTimeType}
                  canSwitch={false}
                />
                {/* Planned time - with checkmark if synced, warning if shorter than actual */}
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-l ${
                    syncedTimeType === 'planned'
                      ? syncedShorterTime
                        ? "bg-amber-100 text-amber-700 font-medium"
                        : "bg-green-100 text-green-700 font-medium"
                      : "text-gray-400"
                  }`}
                  title={`Geplant: ${plannedDurationRounded.startFormatted}–${plannedDurationRounded.endFormatted}${syncedTimeType === 'planned' ? ' ✓ In ZEP gebucht' : ''}${syncedShorterTime && syncedTimeType === 'planned' ? ' ⚠ Kürzer als tatsächliche Zeit' : ''}`}
                >
                  {syncedTimeType === 'planned' && syncedShorterTime && <AlertTriangle size={10} className="text-amber-600" />}
                  {syncedTimeType === 'planned' && !syncedShorterTime && <ClockCheck size={10} className="text-green-600" />}
                  {plannedDurationRounded.hours > 0 ? `${plannedDurationRounded.hours}h${plannedDurationRounded.minutes > 0 ? plannedDurationRounded.minutes : ''}` : `${plannedDurationRounded.minutes}m`}
                </span>
                <span className="text-gray-300">|</span>
                {/* Actual time - with checkmark if synced, warning if shorter than planned */}
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-r ${
                    syncedTimeType === 'actual'
                      ? syncedShorterTime
                        ? "bg-amber-100 text-amber-700 font-medium"
                        : "bg-green-100 text-green-700 font-medium"
                      : actualDurationInfo
                        ? actualDurationInfo.color
                        : "text-gray-300"
                  }`}
                  title={actualDurationInfo
                    ? `Tatsächlich: ${actualDurationInfo.startRounded}–${actualDurationInfo.endRounded}${syncedTimeType === 'actual' ? ' ✓ In ZEP gebucht' : ''}${syncedShorterTime && syncedTimeType === 'actual' ? ' ⚠ Kürzer als geplante Zeit' : ''}`
                    : "Keine tatsächliche Zeit verfügbar"
                  }
                >
                  {syncedTimeType === 'actual' && syncedShorterTime && <AlertTriangle size={10} className="text-amber-600" />}
                  {syncedTimeType === 'actual' && !syncedShorterTime && <ClockCheck size={10} className="text-green-600" />}
                  {actualDurationInfo
                    ? (actualDurationInfo.hours > 0 ? `${actualDurationInfo.hours}h${actualDurationInfo.minutes > 0 ? actualDurationInfo.minutes : ''}` : `${actualDurationInfo.minutes}m`)
                    : "--"
                  }
                </span>
              </span>
            ) : (
              // Not synced or editing: Show both times as toggle buttons
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] rounded ring-1 ${isMuted ? "bg-gray-100 text-gray-400 ring-gray-200" : "bg-gray-100 ring-blue-300"}`}
                title={actualDurationInfo
                  ? `Geplant: ${plannedDurationRounded.hours > 0 ? `${plannedDurationRounded.hours}h ${plannedDurationRounded.minutes}min` : `${plannedDurationRounded.minutes}min`} | Tatsächlich: ${actualDurationInfo.hours > 0 ? `${actualDurationInfo.hours}h ${actualDurationInfo.minutes}min` : `${actualDurationInfo.minutes}min`}`
                  : `Geplant: ${plannedDurationRounded.hours > 0 ? `${plannedDurationRounded.hours}h ${plannedDurationRounded.minutes}min` : `${plannedDurationRounded.minutes}min`} | Tatsächlich: keine Daten`
                }
              >
                <DurationInfoPopover
                  originalStart={startTime}
                  originalEnd={endTime}
                  originalDurationMinutes={originalDurationMinutes}
                  plannedStart={plannedDurationRounded.startFormatted}
                  plannedEnd={plannedDurationRounded.endFormatted}
                  plannedDurationMinutes={plannedDurationRounded.totalMinutes}
                  originalActualStart={actualDurationInfo?.originalStart}
                  originalActualEnd={actualDurationInfo?.originalEnd}
                  originalActualDurationMinutes={actualDurationInfo?.originalDurationMinutes}
                  actualStart={actualDurationInfo?.zepStart}
                  actualEnd={actualDurationInfo?.zepEnd}
                  actualDurationMinutes={actualDurationInfo?.totalMinutes}
                  hasActualData={!!actualDurationInfo}
                  hasDeviation={!!timeDeviation}
                  useActualTime={appointment.useActualTime}
                  syncedTimeType={syncedTimeType}
                  canSwitch={!!actualDurationInfo && actualDurationInfo.difference !== 0}
                  onTimeTypeChange={(useActual) => {
                    if (isEditing && syncedEntry && onModifyTime) {
                      onModifyTime(appointment.id, appointment, syncedEntry, useActual);
                    } else {
                      onUseActualTimeChange?.(appointment.id, useActual);
                    }
                  }}
                />
                {/* Planned time button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!actualDurationInfo) return; // Can't toggle without actual data
                    if (isEditing && syncedEntry && onModifyTime) {
                      onModifyTime(appointment.id, appointment, syncedEntry, false);
                    } else {
                      onUseActualTimeChange?.(appointment.id, false);
                    }
                  }}
                  disabled={!actualDurationInfo}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-l transition-colors ${
                    !appointment.useActualTime || !actualDurationInfo
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                  } ${!actualDurationInfo ? "cursor-default" : "cursor-pointer"}`}
                  title={`Geplant (gerundet): ${plannedDurationRounded.hours > 0 ? `${plannedDurationRounded.hours}h ${plannedDurationRounded.minutes}min` : `${plannedDurationRounded.minutes}min`} - für ZEP verwenden`}
                >
                  {(!appointment.useActualTime || !actualDurationInfo) && <Check size={10} />}
                  {plannedDurationRounded.hours > 0 ? `${plannedDurationRounded.hours}h${plannedDurationRounded.minutes > 0 ? plannedDurationRounded.minutes : ''}` : `${plannedDurationRounded.minutes}m`}
                </button>
                <span className="text-gray-300">|</span>
                {/* Actual time button - disabled if no actual data or if times are equal */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!actualDurationInfo || actualDurationInfo.difference === 0) return;
                    if (isEditing && syncedEntry && onModifyTime) {
                      onModifyTime(appointment.id, appointment, syncedEntry, true);
                    } else {
                      onUseActualTimeChange?.(appointment.id, true);
                    }
                  }}
                  disabled={!actualDurationInfo || actualDurationInfo.difference === 0}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-r transition-colors ${
                    !actualDurationInfo || actualDurationInfo.difference === 0
                      ? "text-gray-300 cursor-default"
                      : appointment.useActualTime
                        ? `bg-blue-100 font-medium ${actualDurationInfo.color}`
                        : `${actualDurationInfo.color} hover:bg-gray-200`
                  }`}
                  title={!actualDurationInfo
                    ? "Keine tatsächliche Zeit verfügbar"
                    : actualDurationInfo.difference === 0
                      ? "Tatsächliche Zeit entspricht der geplanten Zeit"
                      : `Tatsächlich (gerundet): ${actualDurationInfo.hours > 0 ? `${actualDurationInfo.hours}h ${actualDurationInfo.minutes}min` : `${actualDurationInfo.minutes}min`} - für ZEP verwenden`
                  }
                >
                  {actualDurationInfo && appointment.useActualTime && actualDurationInfo.difference !== 0 && <Check size={10} />}
                  {actualDurationInfo
                    ? (actualDurationInfo.hours > 0 ? `${actualDurationInfo.hours}h${actualDurationInfo.minutes > 0 ? actualDurationInfo.minutes : ''}` : `${actualDurationInfo.minutes}m`)
                    : "--"
                  }
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="shrink-0 flex items-center gap-1.5">
          {/* Editing badge */}
          {isSynced && isEditing && (
            <span className="px-2 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-50 rounded">
              In Bearbeitung
            </span>
          )}
          {isSynced && (
            <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 rounded">
              Synced
            </span>
          )}
          {/* Internal/External meeting badge */}
          {attendeeCount > 0 && (
            isInternalOnly ? (
              <span
                className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600"
                title="Internes Meeting - nur Contiva-Teilnehmer"
              >
                Intern
              </span>
            ) : (
              <span
                className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700"
                title="Externes Meeting - externe Teilnehmer"
              >
                Extern
              </span>
            )
          )}
          {duplicateWarning?.hasDuplicate && !isSynced && duplicateWarning.type !== 'rescheduled' && (
            onLinkToZep && syncedEntries ? (
              <ConflictLinkPopover
                appointmentId={appointment.id}
                appointmentDate={appointment.start.dateTime}
                suggestedEntryId={duplicateWarning.existingEntry?.id}
                suggestedEntry={duplicateWarning.existingEntry}
                syncedEntries={syncedEntries}
                linkedZepIds={linkedZepIds}
                onLink={onLinkToZep}
              >
                <span className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 rounded hover:bg-amber-100 transition cursor-pointer" title={`${duplicateWarning.message} — Klicken zum Verknüpfen`}>
                  {duplicateWarning.type === 'exact' ? 'Duplikat' : duplicateWarning.type === 'timeOverlap' ? 'Zeitüberschneidung' : 'Ähnlich'}
                </span>
              </ConflictLinkPopover>
            ) : (
              <span className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 rounded" title={duplicateWarning.message}>
                {duplicateWarning.type === 'exact' ? 'Duplikat' : duplicateWarning.type === 'timeOverlap' ? 'Zeitüberschneidung' : 'Ähnlich'}
              </span>
            )
          )}
          {/* Rescheduled appointment - show correction button and link option */}
          {duplicateWarning?.type === 'rescheduled' && !isSynced && (
            <>
              {onCorrectTime && (
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
              {onLinkToZep && syncedEntries && (
                <ConflictLinkPopover
                  appointmentId={appointment.id}
                  appointmentDate={appointment.start.dateTime}
                  suggestedEntryId={duplicateWarning.existingEntry?.id}
                  suggestedEntry={duplicateWarning.existingEntry}
                  syncedEntries={syncedEntries}
                  linkedZepIds={linkedZepIds}
                  onLink={onLinkToZep}
                >
                  <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition cursor-pointer" title="Als verknüpft markieren">
                    Verknüpfen
                  </span>
                </ConflictLinkPopover>
              )}
            </>
          )}
          
          {/* Reset button for unsynchronized entries being edited */}
          {!isSynced && appointment.selected && appointment.projectId && (
            <button
              onClick={() => onProjectChange(appointment.id, null)}
              className="p-1 rounded transition text-gray-400 hover:text-red-600 hover:bg-red-50"
              title="Auswahl zurücksetzen"
            >
              <RotateCcw size={12} />
            </button>
          )}

          {/* Edit/Cancel button for synced */}
          {isSynced && onStartEditSynced && onCancelEditSynced && (
            <button
              onClick={() => isEditing
                ? onCancelEditSynced(appointment.id)
                : onStartEditSynced(appointment.id)
              }
              className={`p-1 rounded transition ${
                isEditing
                  ? "text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                  : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
              }`}
              title={isEditing ? "Bearbeitung abbrechen" : "Bearbeiten"}
            >
              {isEditing ? <X size={12} /> : <Pencil size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* Synced entry info - compact inline */}
      {isSynced && syncedInfo && !isEditing && (
        <div className="mt-2 pt-2 ml-8 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-600">{syncedInfo.projectName}</span>
          {syncedInfo.taskName && (
            <>
              <span className="text-gray-300">/</span>
              <span title={syncedInfo.activityName}>
                {syncedInfo.taskName} <span className="text-gray-400">({syncedInfo.activityId})</span>
              </span>
            </>
          )}
          <span title={syncedInfo.billable ? "Fakturierbar" : "Nicht fakturierbar (intern)"}>
            <Banknote
              size={14}
              className={syncedInfo.billable ? "text-amber-500" : "text-gray-400"}
            />
          </span>
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

      {/* Editing UI for synced entries - inline like normal appointments */}
      {isSynced && isEditing && syncedEntry && (
        <div className="mt-3 pt-3 ml-8 border-t border-gray-100 flex items-end gap-2">
          <ProjectTaskActivityForm
            projects={projects}
            tasks={
              allTasks && (modifiedEntry?.newProjectId || syncedEntry.project_id)
                ? allTasks[modifiedEntry?.newProjectId || syncedEntry.project_id] || []
                : []
            }
            allTasks={allTasks}
            activities={activities}
            projectId={modifiedEntry?.newProjectId || syncedEntry.project_id}
            taskId={modifiedEntry?.newTaskId || syncedEntry.project_task_id}
            activityId={modifiedEntry?.newActivityId || syncedEntry.activity_id}
            bemerkung={syncedBemerkungValues.bemerkung}
            bemerkungPlaceholder={appointment.subject}
            isCustomBemerkung={syncedBemerkungValues.isCustom}
            billable={modifiedEntry?.newBillable ?? syncedEntry.billable}
            canChangeBillable={canEditBillableInEditMode && !!(modifiedEntry?.newTaskId || syncedEntry.project_task_id)}
            useActualTime={!!appointment.useActualTime}
            plannedTimeLabel={`${plannedDurationRounded.startFormatted}–${plannedDurationRounded.endFormatted}`}
            actualTimeLabel={actualDurationInfo ? `${actualDurationInfo.zepStart}–${actualDurationInfo.zepEnd}` : undefined}
            hasActualTime={!!actualDurationInfo}
            actualTimeDiffers={!!actualDurationInfo && actualDurationInfo.difference !== 0}
            onProjectChange={(val) => {
              if (val !== null && onModifyProject && syncedEntry) {
                onModifyProject(appointment.id, appointment, syncedEntry, val);
              }
            }}
            onTaskChange={(val) => {
              if (val !== null && onModifyTask) {
                onModifyTask(appointment.id, Number(val));
              }
            }}
            onActivityChange={(val) => {
              if (onModifyActivity && syncedEntry) {
                onModifyActivity(appointment.id, appointment, syncedEntry, val);
              }
            }}
            onBemerkungChange={(val) => {
              if (onModifyBemerkung && syncedEntry) {
                onModifyBemerkung(appointment.id, appointment, syncedEntry, val);
              }
            }}
            onBillableChange={(val) => {
              if (onModifyBillable && syncedEntry) {
                onModifyBillable(appointment.id, appointment, syncedEntry, val);
              }
            }}
            onTimeChange={(useActual) => {
              if (onModifyTime && syncedEntry) {
                onModifyTime(appointment.id, appointment, syncedEntry, useActual);
              }
            }}
            workLocations={currentWorkLocations}
            workLocation={modifiedEntry?.newOrt ?? syncedEntry?.work_location_id ?? undefined}
            onWorkLocationChange={(val) => {
              if (onModifyWorkLocation && syncedEntry) {
                onModifyWorkLocation(appointment.id, appointment, syncedEntry, val);
              }
            }}
            onSync={() => modifiedEntry && isModified && onSaveModifiedSingle?.(modifiedEntry)}
            isSyncing={isSavingModifiedSingle}
            isSyncReady={isModified}
            syncTooltip={isSavingModifiedSingle ? "Wird gespeichert..." : !isModified ? "Keine Änderungen" : "Änderungen in ZEP speichern"}
          />
        </div>
      )}

      {/* Dropdowns for selected unsynchronized appointments */}
      {appointment.selected && !isSynced && (
        <div className="mt-3 pt-3 ml-8 border-t border-gray-100 flex items-end gap-2">
          <ProjectTaskActivityForm
            projects={projects}
            tasks={tasks}
            allTasks={allTasks}
            activities={activities}
            projectId={appointment.projectId}
            taskId={appointment.taskId}
            activityId={appointment.activityId}
            bemerkung={unsyncedBemerkungValues.bemerkung}
            bemerkungPlaceholder={appointment.subject}
            isCustomBemerkung={unsyncedBemerkungValues.isCustom}
            billable={appointment.billable}
            canChangeBillable={appointment.canChangeBillable}
            useActualTime={!!appointment.useActualTime}
            plannedTimeLabel={`${plannedDurationRounded.startFormatted}–${plannedDurationRounded.endFormatted}`}
            actualTimeLabel={actualDurationInfo ? `${actualDurationInfo.zepStart}–${actualDurationInfo.zepEnd}` : undefined}
            hasActualTime={!!actualDurationInfo}
            actualTimeDiffers={!!actualDurationInfo && actualDurationInfo.difference !== 0}
            loadingTasks={loadingTasks}
            onProjectChange={(val) => onProjectChange(appointment.id, val)}
            onTaskChange={(val) => onTaskChange(appointment.id, val)}
            onActivityChange={(val) => onActivityChange(appointment.id, val)}
            onBemerkungChange={(val) => onCustomRemarkChange?.(appointment.id, val)}
            onBillableChange={(val) => onBillableChange(appointment.id, val)}
            onTimeChange={(useActual) => onUseActualTimeChange?.(appointment.id, useActual)}
            workLocations={currentWorkLocations}
            workLocation={appointment.workLocation}
            onWorkLocationChange={(val) => onWorkLocationChange?.(appointment.id, val)}
            onSync={() => isSyncReady && onSyncSingle?.(appointment)}
            isSyncing={!!isSyncingSingle}
            isSyncReady={!!isSyncReady}
            syncTooltip={
              isSyncingSingle
                ? "Wird synchronisiert..."
                : !isSyncReady
                  ? "Erst Projekt und Task wählen"
                  : "Jetzt zu ZEP synchronisieren"
            }
          />
        </div>
      )}
    </div>
  );
}
