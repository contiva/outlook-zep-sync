'use client';

import { Check, X, Users } from 'lucide-react';
import { usePopover } from './usePopover';
import { isInternalDomain } from './helpers';
import type { Attendee } from './types';

// --- Internal components (not exported) ---

function AttendeeStatusIcon({ response }: { response: string }) {
  switch (response) {
    case 'accepted':
      return <Check size={12} className="text-green-600" />;
    case 'tentativelyAccepted':
      return <span className="text-amber-500 text-[10px]">?</span>;
    case 'declined':
      return <X size={12} className="text-red-500" />;
    case 'organizer':
      return <span className="text-blue-600 text-xs font-medium">&#9733;</span>;
    default:
      return <span className="text-gray-400 text-[10px]">&ndash;</span>;
  }
}

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

// --- Exported interface & component ---

export interface AttendeePopoverProps {
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

export default function AttendeePopover({
  attendees,
  organizer,
  isOrganizer,
  isMuted,
}: AttendeePopoverProps) {
  const { isOpen, triggerProps, popoverProps } = usePopover({
    popoverId: 'attendee-popover',
  });

  // Check if organizer is already in attendees list
  const organizerInAttendees =
    organizer &&
    attendees.some(
      (a) => a.emailAddress.address.toLowerCase() === organizer.emailAddress.address.toLowerCase(),
    );
  // Total count includes organizer if not already in attendees
  const attendeeCount = attendees.length + (organizer && !organizerInAttendees ? 1 : 0);

  // Collect all domains including organizer
  const attendeeDomainList = attendees
    .map((a) => a.emailAddress.address.split('@')[1])
    .filter(Boolean);
  if (organizer && !organizerInAttendees) {
    const organizerDomain = organizer.emailAddress.address.split('@')[1];
    if (organizerDomain) attendeeDomainList.push(organizerDomain);
  }
  const allDomains = [...new Set(attendeeDomainList)];

  // Filter out internal domains from displayed domains
  const domains = allDomains.filter((d) => !isInternalDomain(d));

  // Check if all attendees are from internal domains
  const isInternalOnly = attendeeCount > 0 && allDomains.every((d) => isInternalDomain(d));

  // Filter out organizer from attendees list (will be shown separately)
  const filteredAttendees = organizer
    ? attendees.filter(
        (a) =>
          a.emailAddress.address.toLowerCase() !== organizer.emailAddress.address.toLowerCase(),
      )
    : attendees;

  // Group attendees by status
  const accepted = filteredAttendees.filter((a) => a.status.response === 'accepted');
  const tentative = filteredAttendees.filter((a) => a.status.response === 'tentativelyAccepted');
  const declined = filteredAttendees.filter((a) => a.status.response === 'declined');
  const noResponse = filteredAttendees.filter(
    (a) =>
      !['accepted', 'tentativelyAccepted', 'declined', 'organizer'].includes(a.status.response),
  );

  // Only show trigger if there are attendees
  if (attendeeCount === 0) {
    return null;
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        {...triggerProps}
        className={`flex items-center gap-1 text-xs hover:text-gray-700 transition-colors ${isMuted ? 'text-gray-400' : 'text-gray-500'}`}
        title="Teilnehmer anzeigen"
      >
        <Users size={11} />
        <span>{attendeeCount}</span>
        {!isInternalOnly && domains.length > 0 && (
          <span className="text-gray-400">
            {domains.length <= 2 ? `(${domains.join(', ')})` : `(${domains.length} extern)`}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          {...popoverProps}
          className={`absolute left-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-70 max-w-90 font-[Inter] ${popoverProps.className}`}
        >
          <div className="text-xs font-medium text-gray-700 mb-2">{attendeeCount} Teilnehmer</div>

          {/* Organizer - highlighted at top */}
          {organizer && (
            <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-[10px] uppercase tracking-wide text-blue-600 font-medium mb-1">
                Organisator
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-blue-600 font-bold">&#9733;</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-gray-800 font-medium">
                    {isOrganizer
                      ? 'Du'
                      : organizer.emailAddress.name || organizer.emailAddress.address.split('@')[0]}
                  </div>
                  <div className="truncate text-gray-400 text-[10px]">
                    {organizer.emailAddress.address}
                  </div>
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
