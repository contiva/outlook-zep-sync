// Helper: Check if domain is internal (contiva.com or subdomains)
export function isInternalDomain(domain: string): boolean {
  return domain === 'contiva.com' || domain.endsWith('.contiva.com');
}

// Helper: Format name from "Nachname, Vorname" to "Vorname Nachname"
export function formatName(name?: string | null): string | null {
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
export function canChangeBillableForTask(
  projektFakt?: number | string,
  vorgangFakt?: number | string,
): boolean {
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
export function extractZoomUrl(text?: string): string | null {
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
export function getBodyText(appointment: {
  bodyPreview?: string;
  body?: { content?: string };
}): string {
  // Prefer full body content, fall back to preview
  return appointment.body?.content?.toLowerCase() || appointment.bodyPreview?.toLowerCase() || '';
}

// Helper: Check if meeting has a Teams link in body (for meetings not marked as isOnlineMeeting)
export function hasTeamsLinkInBody(appointment: {
  bodyPreview?: string;
  body?: { content?: string };
}): boolean {
  const bodyText = getBodyText(appointment);
  return bodyText.includes('teams.microsoft.com') || bodyText.includes('teams.live.com');
}

// Helper: Extract Teams join URL from body
export function getTeamsJoinUrlFromBody(appointment: {
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
export function isCalendlyMeeting(appointment: {
  location?: { displayName?: string };
  bodyPreview?: string;
  body?: { content?: string };
}): boolean {
  const locationText = appointment.location?.displayName?.toLowerCase() || '';
  const bodyText = getBodyText(appointment);
  return locationText.includes('calendly.com') || bodyText.includes('calendly.com');
}

// Helper: Get Calendly URL from appointment
export function getCalendlyUrl(appointment: {
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
export function isZoomMeeting(appointment: {
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
export function getZoomJoinUrl(appointment: {
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
export function isGoogleMeetMeeting(appointment: {
  location?: { displayName?: string };
  bodyPreview?: string;
  body?: { content?: string };
}): boolean {
  const locationText = appointment.location?.displayName?.toLowerCase() || '';
  const bodyText = getBodyText(appointment);

  return locationText.includes('meet.google.com') || bodyText.includes('meet.google.com');
}

// Helper: Get Google Meet URL from appointment
export function getGoogleMeetUrl(appointment: {
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

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}min`;
  if (hours > 0) return `${hours}h`;
  return `${mins}min`;
}
