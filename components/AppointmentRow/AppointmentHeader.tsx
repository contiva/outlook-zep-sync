"use client";

import { MapPin, Ban, RotateCcw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  formatName,
  hasTeamsLinkInBody,
  getTeamsJoinUrlFromBody,
  isZoomMeeting,
  getZoomJoinUrl,
  isCalendlyMeeting,
  getCalendlyUrl,
  isGoogleMeetMeeting,
  getGoogleMeetUrl,
} from "./helpers";
import type { Appointment, Attendee, SyncedEntry } from "./types";
import { MeetingProviderIcon } from "./MeetingProviderIcon";
import AttendeePopover from "./AttendeePopover";

export interface AppointmentHeaderProps {
  appointment: Appointment;
  isMuted: boolean;
  isLive: boolean;
  isUpcoming: boolean;
  isStartingSoon: boolean;
  isSynced: boolean;
  syncedEntry?: SyncedEntry | null;
  attendees: Attendee[];
  onRestoreSubject?: () => void;
  isRestoringSubject?: boolean;
}

// Provider color config for join buttons
const providerColors: Record<string, { live: string; idle: string }> = {
  teams: {
    live: "bg-indigo-600 text-white hover:bg-indigo-700",
    idle: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200",
  },
  zoom: {
    live: "bg-blue-600 text-white hover:bg-blue-700",
    idle: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  },
  calendly: {
    live: "bg-blue-600 text-white hover:bg-blue-700",
    idle: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  },
  meet: {
    live: "bg-green-600 text-white hover:bg-green-700",
    idle: "bg-green-100 text-green-700 hover:bg-green-200",
  },
};

// Labels for join buttons
const providerJoinLabels: Record<string, { title: string; label: string }> = {
  teams: { title: "Teams Meeting beitreten", label: "Beitreten" },
  zoom: { title: "Zoom Meeting beitreten", label: "Beitreten" },
  calendly: { title: "Calendly Meeting \u00f6ffnen", label: "\u00d6ffnen" },
  meet: { title: "Google Meet beitreten", label: "Beitreten" },
};

/** Shared join button for any meeting provider (only renders the clickable button variant) */
function MeetingProviderButton({
  provider,
  url,
  isLive,
  isUpcoming,
}: {
  provider: "teams" | "zoom" | "calendly" | "meet";
  url: string | null;
  isLive: boolean;
  isUpcoming: boolean;
}) {
  const colors = providerColors[provider];
  const labels = providerJoinLabels[provider];

  if ((isLive || isUpcoming) && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`group inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium shrink-0 transition-all ${
          isLive ? colors.live : colors.idle
        }`}
        title={labels.title}
      >
        <MeetingProviderIcon provider={provider} variant="live" />
        {labels.label}
      </a>
    );
  }

  return null;
}

/** Whether the location text should be hidden (it's a meeting service URL, redundant with icons) */
function isLocationRedundant(displayName: string): boolean {
  const lower = displayName.toLowerCase();
  return (
    lower.includes("microsoft teams") ||
    lower.includes("calendly.com") ||
    lower.includes("zoom.us") ||
    lower.includes("meet.google.com")
  );
}

export default function AppointmentHeader({
  appointment,
  isMuted,
  isLive,
  isUpcoming,
  isStartingSoon,
  isSynced,
  syncedEntry,
  attendees,
  onRestoreSubject,
  isRestoringSubject,
}: AppointmentHeaderProps) {
  const attendeeCount = attendees.length;

  // Determine visible location
  const locationName = appointment.location?.displayName;
  const hasVisibleLocation = locationName && !isLocationRedundant(locationName);

  // Meeting provider detection
  const isTeams =
    (appointment.isOnlineMeeting && appointment.onlineMeetingProvider === "teamsForBusiness") ||
    hasTeamsLinkInBody(appointment);
  const isZoom =
    appointment.onlineMeetingProvider !== "teamsForBusiness" &&
    !hasTeamsLinkInBody(appointment) &&
    isZoomMeeting(appointment);
  const isCalendly = isCalendlyMeeting(appointment);
  const isGoogleMeet = isGoogleMeetMeeting(appointment);

  // Whether we need a separator after attendees
  const hasAfterAttendeesContent =
    hasVisibleLocation ||
    appointment.isCancelled ||
    appointment.isOnlineMeeting ||
    hasTeamsLinkInBody(appointment) ||
    isZoomMeeting(appointment) ||
    isCalendlyMeeting(appointment) ||
    isGoogleMeetMeeting(appointment);

  // Title logic
  const zepNote = isSynced && syncedEntry?.note ? syncedEntry.note.trim() : null;
  const effectiveSubject = (appointment.subject || "").trim() || "Kein Titel";
  const hasAltTitle = zepNote && zepNote !== effectiveSubject;

  // Whether the join button is shown in row 1 (live/upcoming with a provider)
  const showJoinButton = isLive || isUpcoming;

  // Collect provider URLs for the join button area
  const teamsUrl = isTeams ? (appointment.onlineMeeting?.joinUrl || getTeamsJoinUrlFromBody(appointment)) : null;
  const zoomUrl = isZoom ? getZoomJoinUrl(appointment) : null;
  const calendlyUrl = isCalendly ? getCalendlyUrl(appointment) : null;
  const meetUrl = isGoogleMeet ? getGoogleMeetUrl(appointment) : null;

  return (
    <>
      {/* Row 1: Badges + Title + Join Button */}
      <div className="flex items-center gap-2 min-h-5">
        {/* Live Badge */}
        {isLive && (
          <span className="inline-flex items-center gap-0.5 px-1 rounded text-xs font-bold uppercase tracking-wide bg-red-100 text-red-600 shrink-0 leading-4">
            <span className="w-2 h-2 rounded-full bg-red-500 motion-safe:animate-pulse" />
            Jetzt
          </span>
        )}
        {/* Upcoming Badge */}
        {!isLive && isUpcoming && (
          <span className="inline-flex items-center gap-1 px-1 rounded text-xs text-blue-500 uppercase border border-blue-300 bg-blue-50 shrink-0 leading-4">
            {isStartingSoon && (
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-blue-500 motion-safe:animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-blue-500 motion-safe:animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-blue-500 motion-safe:animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            )}
            In K{"\u00fc"}rze
          </span>
        )}
        {/* Title */}
        {hasAltTitle ? (
          <span className={`font-semibold text-sm truncate ${isMuted ? "text-gray-400" : "text-gray-900"}`}>{zepNote}</span>
        ) : appointment.subject ? (
          <span className={`font-semibold text-sm truncate ${isMuted ? "text-gray-400" : "text-gray-900"}`}>{appointment.subject}</span>
        ) : (
          <span className="font-medium text-gray-400 text-sm italic">Kein Titel definiert</span>
        )}
        {/* Join Button(s) - only when live/upcoming, pushed to right */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {isTeams && showJoinButton && (
            <MeetingProviderButton
              provider="teams"
              url={teamsUrl}
              isLive={isLive}
              isUpcoming={isUpcoming}
            />
          )}
          {isZoom && showJoinButton && (
            <MeetingProviderButton
              provider="zoom"
              url={zoomUrl}
              isLive={isLive}
              isUpcoming={isUpcoming}
            />
          )}
          {isCalendly && showJoinButton && (
            <MeetingProviderButton
              provider="calendly"
              url={calendlyUrl}
              isLive={isLive}
              isUpcoming={isUpcoming}
            />
          )}
          {isGoogleMeet && showJoinButton && (
            <MeetingProviderButton
              provider="meet"
              url={meetUrl}
              isLive={isLive}
              isUpcoming={isUpcoming}
            />
          )}
        </div>
      </div>

      {/* Struck-through original Outlook title - clickable to restore in ZEP */}
      {isSynced && syncedEntry?.note && syncedEntry.note.trim() !== effectiveSubject && (
        onRestoreSubject ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRestoreSubject();
            }}
            disabled={isRestoringSubject}
            className={`group flex items-center gap-1 text-xs truncate ml-0.5 -mt-0.5 transition-colors ${
              isRestoringSubject
                ? "text-gray-300 cursor-wait"
                : isMuted
                  ? "text-gray-300 hover:text-gray-500"
                  : "text-gray-400 hover:text-gray-600 cursor-pointer"
            }`}
            title="Klicken um Original-Titel in ZEP wiederherzustellen"
          >
            <span className="line-through truncate">{appointment.subject || <span className="italic">(Kein Titel)</span>}</span>
            {isRestoringSubject ? (
              <Loader2 size={10} className="shrink-0 animate-spin" />
            ) : (
              <RotateCcw size={10} className="shrink-0 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        ) : (
          <div className={`text-xs truncate line-through ml-0.5 -mt-0.5 ${isMuted ? "text-gray-300" : "text-gray-400"}`}>
            {appointment.subject || <span className="italic">(Kein Titel)</span>}
          </div>
        )
      )}

      {/* Row 2: Metadata line */}
      <div className={`flex items-center gap-1.5 text-xs mt-0.5 ${isMuted ? "text-gray-400" : "text-gray-500"}`}>
        {/* Organizer */}
        {appointment.organizer && (
          <span
            className="shrink-0"
            title={appointment.organizer.emailAddress.address}
          >
            {appointment.isOrganizer
              ? "von Dir"
              : `von ${formatName(appointment.organizer.emailAddress.name) || appointment.organizer.emailAddress.address}`}
          </span>
        )}
        {/* Separator after organizer */}
        {appointment.organizer && attendeeCount > 0 && (
          <span className={isMuted ? "text-gray-200" : "text-gray-300"}>&bull;</span>
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
        {/* Separator after attendees */}
        {attendeeCount > 0 && hasAfterAttendeesContent && (
          <span className={isMuted ? "text-gray-200" : "text-gray-300"}>&bull;</span>
        )}
        {/* Location */}
        {hasVisibleLocation && (
          <span
            className="inline-flex items-center gap-0.5"
            title={locationName}
          >
            <MapPin size={12} className="shrink-0" />
            <span className="truncate max-w-30">{locationName}</span>
          </span>
        )}
        {/* Meeting Provider Icons (idle variant - shown when NOT live/upcoming) */}
        {isTeams && !showJoinButton && (
          <MeetingProviderIcon provider="teams" variant="idle" isMuted={isMuted} />
        )}
        {isZoom && !showJoinButton && (
          <MeetingProviderIcon provider="zoom" variant="idle" isMuted={isMuted} />
        )}
        {isCalendly && !showJoinButton && (
          <MeetingProviderIcon provider="calendly" variant="idle" isMuted={isMuted} />
        )}
        {isGoogleMeet && !showJoinButton && (
          <MeetingProviderIcon provider="meet" variant="idle" isMuted={isMuted} />
        )}
        {/* Cancelled badge */}
        {appointment.isCancelled && (
          <span
            className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium cursor-help"
            title={
              appointment.lastModifiedDateTime
                ? `Abgesagt am ${format(new Date(appointment.lastModifiedDateTime), "dd.MM.yyyy 'um' HH:mm", { locale: de })}`
                : "Abgesagt"
            }
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
        {/* Call badges */}
        {appointment.type === "call" && (
          <>
            <span
              className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800"
              title="Anruf"
            >
              Call
            </span>
            {appointment.callType && (
              <span
                className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600"
                title={`Anruftyp: ${appointment.callType}`}
              >
                {appointment.callType}
              </span>
            )}
            {appointment.direction && (
              <span
                className="text-xs"
                title={appointment.direction === "incoming" ? "Eingehender Anruf" : "Ausgehender Anruf"}
              >
                {appointment.direction === "incoming" ? "\ud83d\udce5" : "\ud83d\udce4"}
              </span>
            )}
          </>
        )}
      </div>

    </>
  );
}
