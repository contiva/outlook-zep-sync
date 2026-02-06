"use client";

import { MapPin, Ban } from "lucide-react";
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

/** Shared join button / idle icon for any meeting provider */
function MeetingProviderButton({
  provider,
  url,
  isLive,
  isUpcoming,
  isMuted,
}: {
  provider: "teams" | "zoom" | "calendly" | "meet";
  url: string | null;
  isLive: boolean;
  isUpcoming: boolean;
  isMuted: boolean;
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
        className={`group inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 transition-all ${
          isLive ? colors.live : colors.idle
        }`}
        title={labels.title}
      >
        <MeetingProviderIcon provider={provider} variant="live" />
        {labels.label}
      </a>
    );
  }

  return <MeetingProviderIcon provider={provider} variant="idle" isMuted={isMuted} />;
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
  const hasAltTitle = zepNote && zepNote !== (appointment.subject || "").trim();

  return (
    <>
      {/* Title row with duration */}
      <div className="flex items-center gap-1.5 min-h-5">
        {/* Title and organizer grouped with center alignment */}
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Live Badge */}
          {isLive && (
            <span className="inline-flex items-center gap-0.5 px-1 rounded text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-600 shrink-0 leading-4">
              <span className="w-2 h-2 rounded-full bg-red-500 motion-safe:animate-pulse" />
              Jetzt
            </span>
          )}
          {/* Upcoming Badge */}
          {!isLive && isUpcoming && (
            <span className="inline-flex items-center gap-1 px-1 rounded text-[10px] text-blue-500 uppercase border border-blue-300 bg-blue-50 shrink-0 leading-4">
              {isStartingSoon && (
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-blue-500 motion-safe:animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-1 rounded-full bg-blue-500 motion-safe:animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-1 rounded-full bg-blue-500 motion-safe:animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
              In K\u00fcrze
            </span>
          )}
          {/* Title */}
          {hasAltTitle ? (
            <span className={`font-bold text-sm truncate ${isMuted ? "text-gray-400" : "text-gray-900"}`}>{zepNote}</span>
          ) : appointment.subject ? (
            <span className={`font-bold text-sm truncate ${isMuted ? "text-gray-400" : "text-gray-900"}`}>{appointment.subject}</span>
          ) : (
            <span className="font-medium text-gray-400 text-sm italic">Kein Titel definiert</span>
          )}
          {/* Organizer - inline after title */}
          {appointment.organizer && (
            <span
              className={`text-xs font-light shrink-0 ${isMuted ? "text-gray-400" : "text-gray-500"}`}
              title={appointment.organizer.emailAddress.address}
            >
              {appointment.isOrganizer
                ? "von Dir"
                : `von ${formatName(appointment.organizer.emailAddress.name) || appointment.organizer.emailAddress.address}`}
            </span>
          )}
        </div>
        {/* Separator after organizer */}
        {appointment.organizer && (
          <span className={`text-xs ${isMuted ? "text-gray-200" : "text-gray-300"}`}>&bull;</span>
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
          <span className={`text-xs ${isMuted ? "text-gray-200" : "text-gray-300"}`}>&bull;</span>
        )}
        {/* Location */}
        {hasVisibleLocation && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs ${isMuted ? "text-gray-400" : "text-gray-500"}`}
            title={locationName}
          >
            <MapPin size={12} className="shrink-0" />
            <span className="truncate max-w-30">{locationName}</span>
          </span>
        )}
        {/* Cancelled badge */}
        {appointment.isCancelled && (
          <span
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium cursor-help"
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
        {/* Teams Meeting */}
        {isTeams && (
          <MeetingProviderButton
            provider="teams"
            url={appointment.onlineMeeting?.joinUrl || getTeamsJoinUrlFromBody(appointment)}
            isLive={isLive}
            isUpcoming={isUpcoming}
            isMuted={isMuted}
          />
        )}
        {/* Zoom Meeting */}
        {isZoom && (
          <MeetingProviderButton
            provider="zoom"
            url={getZoomJoinUrl(appointment)}
            isLive={isLive}
            isUpcoming={isUpcoming}
            isMuted={isMuted}
          />
        )}
        {/* Calendly Meeting */}
        {isCalendly && (
          <MeetingProviderButton
            provider="calendly"
            url={getCalendlyUrl(appointment)}
            isLive={isLive}
            isUpcoming={isUpcoming}
            isMuted={isMuted}
          />
        )}
        {/* Google Meet */}
        {isGoogleMeet && (
          <MeetingProviderButton
            provider="meet"
            url={getGoogleMeetUrl(appointment)}
            isLive={isLive}
            isUpcoming={isUpcoming}
            isMuted={isMuted}
          />
        )}
        {/* Call badges */}
        {appointment.type === "call" && (
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
                title={appointment.direction === "incoming" ? "Eingehender Anruf" : "Ausgehender Anruf"}
              >
                {appointment.direction === "incoming" ? "\ud83d\udce5" : "\ud83d\udce4"}
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
    </>
  );
}
