"use client";

import { useState, useEffect, useMemo } from "react";
import { Video, ArrowDown, PartyPopper, Quote } from "lucide-react";
import dailyQuotes from "@/lib/daily-quotes.json";

interface Appointment {
  id: string;
  subject: string;
  start: { dateTime: string };
  end: { dateTime: string };
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
  onlineMeeting?: { joinUrl?: string };
  bodyPreview?: string;
}

interface UpcomingMeetingBarProps {
  appointments: Appointment[];
  isToday?: boolean;
  onJumpToAppointment?: (appointmentId: string, highlight: "running" | "upcoming") => void;
}

// Helper to extract Teams URL from body
function getTeamsJoinUrlFromBody(apt: Appointment): string | null {
  if (!apt.bodyPreview) return null;
  const teamsUrlMatch = apt.bodyPreview.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s<>"]+/);
  return teamsUrlMatch ? teamsUrlMatch[0] : null;
}

// Helper to get Zoom URL from body
function getZoomUrlFromBody(apt: Appointment): string | null {
  if (!apt.bodyPreview) return null;
  const zoomMatch = apt.bodyPreview.match(/https:\/\/[a-z0-9-]*\.?zoom\.us\/j\/[^\s<>"]+/i);
  return zoomMatch ? zoomMatch[0] : null;
}

function getDailyQuote(): { text: string; author?: string } {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const raw = dailyQuotes[dayOfYear % dailyQuotes.length];
  const parts = raw.split(" — ");
  return parts.length > 1
    ? { text: parts[0], author: parts[1] }
    : { text: raw };
}

export default function UpcomingMeetingBar({ appointments, isToday = false, onJumpToAppointment }: UpcomingMeetingBarProps) {
  const [now, setNow] = useState(new Date());

  // Update current time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Find meetings that are currently running or starting in the next 5 minutes
  const upcomingMeetings = useMemo(() => {
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    return appointments
      .filter((apt) => {
        const start = new Date(apt.start.dateTime);
        const end = new Date(apt.end.dateTime);

        // Currently running
        if (start <= now && now <= end) {
          return true;
        }

        // Starting in the next 5 minutes
        if (now < start && start <= fiveMinutesFromNow) {
          return true;
        }

        return false;
      })
      .map((apt) => {
        const start = new Date(apt.start.dateTime);
        const end = new Date(apt.end.dateTime);
        const isRunning = start <= now && now <= end;
        const minutesUntilStart = Math.ceil((start.getTime() - now.getTime()) / 60000);

        // Get join URL
        let joinUrl = apt.onlineMeeting?.joinUrl || null;
        if (!joinUrl) {
          joinUrl = getTeamsJoinUrlFromBody(apt) || getZoomUrlFromBody(apt);
        }

        return {
          ...apt,
          isRunning,
          minutesUntilStart: isRunning ? 0 : minutesUntilStart,
          joinUrl,
        };
      })
      .sort((a, b) => {
        // Running meetings first, then by start time
        if (a.isRunning && !b.isRunning) return -1;
        if (!a.isRunning && b.isRunning) return 1;
        return new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime();
      });
  }, [appointments, now]);

  // Today's appointments
  const todayAppointments = useMemo(() => {
    if (!isToday) return [];
    const todayStr = now.toISOString().split("T")[0];
    return appointments.filter((apt) => apt.start.dateTime.startsWith(todayStr));
  }, [isToday, appointments, now]);

  // Check if all appointments for today are done
  const allDoneForToday = useMemo(() => {
    if (todayAppointments.length === 0) return false;
    return todayAppointments.every((apt) => new Date(apt.end.dateTime) < now);
  }, [todayAppointments, now]);

  // Find next upcoming appointment (more than 5 min away)
  const nextAppointment = useMemo(() => {
    if (!isToday || todayAppointments.length === 0) return null;
    const future = todayAppointments
      .filter((apt) => new Date(apt.start.dateTime) > now)
      .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());
    return future[0] || null;
  }, [isToday, todayAppointments, now]);

  if (upcomingMeetings.length === 0) {
    if (allDoneForToday) {
      const quote = getDailyQuote();
      const fullLength = quote.text.length + (quote.author?.length || 0);
      const quoteSize = fullLength > 120 ? "text-sm" : fullLength > 80 ? "text-base" : "text-lg";
      const authorSize = fullLength > 120 ? "text-[9px]" : "text-[11px]";
      return (
        <div className="flex items-center px-4 py-2.5 text-sm border-t bg-green-50/50 border-green-100">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-green-600">
              Geschafft <PartyPopper className="inline w-3.5 h-3.5 -mt-0.5" />
            </span>
            <span className="text-gray-300 shrink-0">|</span>
            <Quote className="shrink-0 w-3.5 h-3.5 text-gray-400 -mr-3 -mt-3" />
            <span className="min-w-0">
              <span className={`text-gray-800 ${quoteSize}`} style={{ fontFamily: "var(--font-caveat)" }}>
                {quote.text}
              </span>
              {quote.author && (
                <span className={`text-gray-400 ${authorSize} ml-1.5`}>
                  — {quote.author}
                </span>
              )}
            </span>
          </div>
        </div>
      );
    }
    if (nextAppointment) {
      const nextStart = new Date(nextAppointment.start.dateTime).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return (
        <div className="flex items-center px-4 py-2.5 text-sm border-t bg-blue-50/50 border-blue-100">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-xs font-medium uppercase tracking-wide text-blue-500">
              Nächster Termin
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-700 truncate font-medium">{nextAppointment.subject || "(Kein Titel)"}</span>
            <span className="text-gray-400 text-xs shrink-0">
              um {nextStart}
            </span>
          </div>
        </div>
      );
    }
    return null;
  }

  // Show only the first (most relevant) meeting
  const meeting = upcomingMeetings[0];
  const startTime = new Date(meeting.start.dateTime).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = new Date(meeting.end.dateTime).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 text-sm border-t ${
        meeting.isRunning
          ? "bg-red-50/50 border-red-100"
          : "bg-amber-50/50 border-amber-100"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={`shrink-0 w-1.5 h-1.5 rounded-full ${
            meeting.isRunning ? "bg-red-500 animate-pulse" : "bg-amber-500"
          }`}
        />
        <span
          className={`text-xs font-medium uppercase tracking-wide ${
            meeting.isRunning ? "text-red-600" : "text-amber-600"
          }`}
        >
          {meeting.isRunning ? "Läuft" : `In ${meeting.minutesUntilStart} Min`}
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-700 truncate font-medium">{meeting.subject || "(Kein Titel)"}</span>
        <span className="text-gray-400 text-xs shrink-0">
          {startTime}–{endTime}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        {onJumpToAppointment && (
          <button
            onClick={() => onJumpToAppointment(meeting.id, meeting.isRunning ? "running" : "upcoming")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
              meeting.isRunning
                ? "border-red-300 text-red-600 hover:bg-red-50"
                : "border-amber-300 text-amber-600 hover:bg-amber-50"
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            Erfassung
          </button>
        )}
        {meeting.joinUrl && (
          <a
            href={meeting.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-white font-medium transition-colors ${
              meeting.isRunning
                ? "bg-red-500 hover:bg-red-600"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Beitreten
          </a>
        )}
      </div>
    </div>
  );
}
