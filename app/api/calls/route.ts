import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

// Constants
const MIN_DURATION_SECONDS = 300; // 5 minutes
const BATCH_SIZE = 20;

// Azure AD credentials for Application permissions (CallRecords.Read.All requires this)
const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;

// Get Application token (client credentials flow)
async function getAppToken(): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Failed to get app token');
  }
  return data.access_token;
}

// Types
interface CallRecord {
  id: string;
  subject: string;
  start: string;
  end: string;
  type: 'call';
  callType: 'Phone' | 'Video' | 'ScreenShare';
  direction: 'incoming' | 'outgoing';
  participants: string[];
  organizer: string;
}

interface CallsResponse {
  calls: CallRecord[];
}

// Microsoft Graph API types for call records
interface IdentityUser {
  id?: string;
  displayName?: string;
  userPrincipalName?: string;
}

interface IdentityPhone {
  id: string;
}

interface IdentityGuest {
  displayName?: string;
}

interface IdentityApplication {
  displayName?: string;
}

interface Identity {
  user?: IdentityUser;
  phone?: IdentityPhone;
  guest?: IdentityGuest;
  application?: IdentityApplication;
}

interface AssociatedIdentity {
  id?: string;
  displayName?: string;
  userPrincipalName?: string;
}

interface Endpoint {
  associatedIdentity?: AssociatedIdentity;
  identity?: Identity;
}

interface Session {
  caller?: Endpoint;
  callee?: Endpoint;
}

interface Participant {
  user?: IdentityUser;
}

interface OrganizerIdentity {
  user?: IdentityUser;
}

interface OrganizerV2 {
  identity?: OrganizerIdentity;
}

interface CallRecordDetails {
  id: string;
  startDateTime: string;
  endDateTime: string;
  type?: string;
  joinWebUrl?: string;
  modalities?: string[];
  participants?: Participant[];
  sessions?: Session[];
  organizer?: Identity;
  organizer_v2?: OrganizerV2;
}

// Module-level maps for name resolution
let phoneToUser: Map<string, string>;
let userIdToUser: Map<string, string>;

// Helper functions
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[^\d]/g, '');
  normalized = normalized.replace(/^49(0)/, '49');
  if (normalized.startsWith('00')) normalized = normalized.substring(2);
  return normalized;
}

function phoneVariants(phone: string): string[] {
  const normalized = normalizePhone(phone);
  const variants = [normalized, '+' + normalized];
  if (normalized.startsWith('49')) {
    variants.push(normalized.substring(2), '0' + normalized.substring(2));
  }
  return variants;
}

function resolveName(
  identity: Identity | Participant | OrganizerIdentity | null | undefined,
): string {
  if (!identity) return 'Unknown';

  if ('user' in identity && identity.user) {
    if (identity.user.displayName) return identity.user.displayName;
    if (identity.user.id) {
      const resolved = userIdToUser.get(identity.user.id);
      if (resolved) return resolved;
    }
    return identity.user.userPrincipalName || `User: ${identity.user.id}`;
  }

  if ('phone' in identity && identity.phone) {
    const phoneId = identity.phone.id;
    for (const v of phoneVariants(phoneId)) {
      const name = phoneToUser.get(v);
      if (name) return `${name} (${phoneId})`;
    }
    return phoneId;
  }

  if ('guest' in identity && identity.guest) return identity.guest.displayName || 'Guest';
  if ('application' in identity && identity.application)
    return identity.application.displayName || 'App';
  return 'Unknown';
}

function resolveEndpoint(endpoint: Endpoint | null | undefined): string {
  if (!endpoint) return 'Unknown';
  if (endpoint.associatedIdentity) {
    const ai = endpoint.associatedIdentity;
    if (ai.id?.startsWith('+')) {
      for (const v of phoneVariants(ai.id)) {
        const name = phoneToUser.get(v);
        if (name) return `${name} (${ai.id})`;
      }
      return ai.id;
    }
    if (ai.displayName) return ai.displayName;
    if (ai.id) {
      const resolved = userIdToUser.get(ai.id);
      if (resolved) return resolved;
    }
    return ai.userPrincipalName || ai.id || 'Unknown';
  }
  return resolveName(endpoint.identity);
}

function normalizeJoinUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/19[:%]meeting_([a-zA-Z0-9-]+)/i);
  return match ? match[1].toLowerCase() : url.toLowerCase();
}

function determineCallType(modalities: string[]): CallRecord['callType'] {
  if (modalities.includes('videoBasedScreenSharing')) return 'ScreenShare';
  if (modalities.includes('video')) return 'Video';
  return 'Phone';
}

// Get current user using their delegated token (/me endpoint)
async function getCurrentUserFromToken(
  userToken: string,
): Promise<{ id: string; displayName: string }> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName', {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch current user: ${response.status}`);
  }

  return response.json();
}

interface GraphUsersResponse {
  value: Array<{
    id: string;
    displayName: string;
    userPrincipalName: string;
    mobilePhone?: string;
    businessPhones?: string[];
  }>;
  '@odata.nextLink'?: string;
}

interface GraphCalendarResponse {
  value: Array<{
    isOnlineMeeting?: boolean;
    onlineMeeting?: { joinUrl?: string };
  }>;
  '@odata.nextLink'?: string;
}

interface GraphCallRecordsResponse {
  value: Array<{ id: string }>;
  '@odata.nextLink'?: string;
}

async function buildUserMappings(accessToken: string): Promise<void> {
  phoneToUser = new Map();
  userIdToUser = new Map();

  let userUrl: string | null =
    'https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mobilePhone,businessPhones&$top=999';

  while (userUrl) {
    const res: Response = await fetch(userUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;
    const data: GraphUsersResponse = await res.json();

    for (const u of data.value) {
      userIdToUser.set(u.id, u.displayName);
      if (u.mobilePhone) {
        phoneVariants(u.mobilePhone).forEach((v) => phoneToUser.set(v, u.displayName));
      }
      if (u.businessPhones) {
        u.businessPhones.forEach((p: string) =>
          phoneVariants(p).forEach((v) => phoneToUser.set(v, u.displayName)),
        );
      }
    }
    userUrl = data['@odata.nextLink'] || null;
  }
}

async function getScheduledMeetingUrls(
  accessToken: string,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<Set<string>> {
  const scheduledUrls = new Set<string>();
  let calUrl: string | null =
    `https://graph.microsoft.com/v1.0/users/${userId}/calendarView?startDateTime=${startDate}T00:00:00Z&endDateTime=${endDate}T23:59:59Z&$select=isOnlineMeeting,onlineMeeting&$top=250`;

  while (calUrl) {
    const res: Response = await fetch(calUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="Europe/Berlin"',
      },
    });
    if (!res.ok) break;
    const data: GraphCalendarResponse = await res.json();

    for (const e of data.value) {
      if (e.isOnlineMeeting && e.onlineMeeting?.joinUrl) {
        const norm = normalizeJoinUrl(e.onlineMeeting.joinUrl);
        if (norm) scheduledUrls.add(norm);
      }
    }
    calUrl = data['@odata.nextLink'] || null;
  }

  return scheduledUrls;
}

async function getCallRecordIds(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<string[]> {
  const callIds: string[] = [];
  let callUrl: string | null =
    `https://graph.microsoft.com/v1.0/communications/callRecords?$filter=startDateTime ge ${startDate}T00:00:00Z and startDateTime le ${endDate}T23:59:59Z`;

  while (callUrl) {
    const res: Response = await fetch(callUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;
    const data: GraphCallRecordsResponse = await res.json();
    callIds.push(...data.value.map((c) => c.id));
    callUrl = data['@odata.nextLink'] || null;
  }

  return callIds;
}

async function fetchCallDetails(
  accessToken: string,
  callId: string,
): Promise<CallRecordDetails | null> {
  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/communications/callRecords/${callId}?$expand=sessions($select=caller,callee)`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function processCallRecord(
  details: CallRecordDetails,
  targetUserId: string,
  targetUserName: string,
  scheduledUrls: Set<string>,
): CallRecord | null {
  // Check user participation
  const userParticipated = (details.participants || []).some(
    (p: Participant) =>
      p.user?.id === targetUserId ||
      p.user?.displayName?.toLowerCase().includes(targetUserName.toLowerCase()),
  );
  if (!userParticipated) return null;

  // Skip scheduled meetings
  const normUrl = normalizeJoinUrl(details.joinWebUrl);
  if (details.type === 'groupCall' && normUrl && scheduledUrls.has(normUrl)) {
    return null;
  }

  // Duration check
  const start = new Date(details.startDateTime);
  const end = new Date(details.endDateTime);
  const durationSec = Math.round((end.getTime() - start.getTime()) / 1000);
  if (durationSec < MIN_DURATION_SECONDS) return null;

  // Extract participants
  const participants = new Set<string>();
  for (const p of details.participants || []) {
    const name = resolveName(p);
    if (name !== 'Unknown') participants.add(name);
  }
  if (details.sessions?.[0]) {
    const caller = resolveEndpoint(details.sessions[0].caller);
    const callee = resolveEndpoint(details.sessions[0].callee);
    if (caller !== 'Unknown') participants.add(caller);
    if (callee !== 'Unknown') participants.add(callee);
  }

  // Organizer & direction
  const orgIdentity = details.organizer_v2?.identity || details.organizer;
  const organizer = resolveName(orgIdentity);
  const isOrganizer = orgIdentity?.user?.id === targetUserId;

  // Build subject from participants (excluding current user)
  const otherParticipants = Array.from(participants).filter(
    (p) => !p.toLowerCase().includes(targetUserName.toLowerCase()),
  );
  const subject =
    otherParticipants.length > 0
      ? `Call mit ${otherParticipants.join(', ')}`
      : `Call mit ${organizer}`;

  return {
    id: details.id,
    subject,
    start: details.startDateTime,
    end: details.endDateTime,
    type: 'call',
    callType: determineCallType(details.modalities || []),
    direction: isOrganizer ? 'outgoing' : 'incoming',
    participants: Array.from(participants),
    organizer,
  };
}

export async function GET(
  request: Request,
): Promise<NextResponse<CallsResponse | { error: string }>> {
  // Support both NextAuth session and Authorization header (for Teams SSO)
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Prefer Authorization header (Teams SSO), fallback to NextAuth session
  let userAccessToken: string | null = bearerToken;

  if (!userAccessToken) {
    const session = await getServerSession(authOptions);
    userAccessToken = session?.accessToken || null;
  }

  // User must be logged in
  if (!userAccessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if Azure AD credentials are configured
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json({ error: 'Azure AD credentials not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  let startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });
  }

  // Microsoft Graph Call Records API has ~30 day retention
  // Automatically limit startDate to max 29 days ago
  const maxDaysBack = 29;
  const minStartDate = new Date();
  minStartDate.setDate(minStartDate.getDate() - maxDaysBack);
  const minStartDateStr = minStartDate.toISOString().split('T')[0];

  if (startDate < minStartDateStr) {
    console.log(
      `[/api/calls] Adjusting startDate from ${startDate} to ${minStartDateStr} (30-day retention limit)`,
    );
    startDate = minStartDateStr;
  }

  try {
    // Get current user from their token (to get ID and name)
    const currentUser = await getCurrentUserFromToken(userAccessToken);

    // Use Application token (client credentials) for CallRecords.Read.All
    const accessToken = await getAppToken();

    // 2. Build user mappings for name resolution
    await buildUserMappings(accessToken);

    // 3. Fetch scheduled meeting URLs to exclude
    const scheduledUrls = await getScheduledMeetingUrls(
      accessToken,
      currentUser.id,
      startDate,
      endDate,
    );

    // 4. Fetch call record IDs
    const callIds = await getCallRecordIds(accessToken, startDate, endDate);
    console.log(
      `[/api/calls] Found ${callIds.length} call record IDs for ${startDate} to ${endDate}`,
    );

    // 5. Fetch details in parallel batches
    const calls: CallRecord[] = [];

    for (let i = 0; i < callIds.length; i += BATCH_SIZE) {
      const batch = callIds.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(batch.map((id) => fetchCallDetails(accessToken, id)));

      for (const details of results) {
        if (!details) continue;

        const callRecord = processCallRecord(
          details,
          currentUser.id,
          currentUser.displayName,
          scheduledUrls,
        );

        if (callRecord) {
          calls.push(callRecord);
        }
      }
    }

    // Sort by start date
    calls.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json({ calls });
  } catch (error) {
    console.error('Calls fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a token expiry issue
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return NextResponse.json(
        { error: 'Token expired - please sign out and sign in again' },
        { status: 401 },
      );
    }

    return NextResponse.json({ error: `Failed to fetch calls: ${errorMessage}` }, { status: 500 });
  }
}
