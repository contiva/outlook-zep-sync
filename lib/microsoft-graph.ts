export interface Attendee {
  emailAddress: {
    name: string;
    address: string;
  };
  type: "required" | "optional" | "resource";
  status: {
    response: "none" | "organizer" | "tentativelyAccepted" | "accepted" | "declined" | "notResponded";
    time: string;
  };
}

export interface OutlookEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  bodyPreview?: string;
  attendees?: Attendee[];
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  isOrganizer?: boolean;
  // Für wiederkehrende Termine
  type?: "singleInstance" | "occurrence" | "exception" | "seriesMaster";
  seriesMasterId?: string;
  // Online Meeting Info
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: "teamsForBusiness" | "skypeForBusiness" | "skypeForConsumer" | "unknown";
  onlineMeeting?: {
    joinUrl?: string;
  };
  // Abgesagte Termine
  isCancelled?: boolean;
  // Letzte Änderung (bei abgesagten Terminen = Absage-Zeitpunkt)
  lastModifiedDateTime?: string;
  // Location
  location?: {
    displayName?: string;
    locationType?: string;
  };
}

export interface CalendarResponse {
  value: OutlookEvent[];
}

interface PaginatedCalendarResponse {
  value: OutlookEvent[];
  "@odata.nextLink"?: string;
}

export async function getCalendarEvents(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<OutlookEvent[]> {
  const allEvents: OutlookEvent[] = [];
  
  let url: string | null = (() => {
    const u = new URL("https://graph.microsoft.com/v1.0/me/calendarview");
    u.searchParams.set("startDateTime", `${startDate}T00:00:00`);
    u.searchParams.set("endDateTime", `${endDate}T23:59:59`);
    u.searchParams.set("$orderby", "start/dateTime");
    u.searchParams.set("$top", "250"); // Max allowed by Graph API
    u.searchParams.set("$select", "id,subject,start,end,bodyPreview,attendees,organizer,isOrganizer,type,seriesMasterId,isOnlineMeeting,onlineMeetingProvider,onlineMeeting,isCancelled,lastModifiedDateTime,location");
    return u.toString();
  })();

  // Fetch all pages
  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        // Request times in Europe/Berlin timezone
        // This ensures start.dateTime and end.dateTime are in local German time
        "Prefer": 'outlook.timezone="Europe/Berlin"',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Graph API error response:", errorBody);
      throw new Error(`Graph API error: ${response.status} - ${errorBody.slice(0, 200)}`);
    }

    const data: PaginatedCalendarResponse = await response.json();
    allEvents.push(...data.value);
    
    // Get next page URL if exists
    url = data["@odata.nextLink"] || null;
  }

  return allEvents;
}
