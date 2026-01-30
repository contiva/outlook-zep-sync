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
}

export interface CalendarResponse {
  value: OutlookEvent[];
}

export async function getCalendarEvents(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<OutlookEvent[]> {
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarview");
  url.searchParams.set("startDateTime", `${startDate}T00:00:00`);
  url.searchParams.set("endDateTime", `${endDate}T23:59:59`);
  url.searchParams.set("$orderby", "start/dateTime");
  url.searchParams.set("$top", "100");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Graph API error: ${response.status}`);
  }

  const data: CalendarResponse = await response.json();
  return data.value;
}
