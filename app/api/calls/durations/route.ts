import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { normalizeJoinUrl, getDurationKey } from "@/lib/teams-utils";

// Azure AD credentials for Application permissions (CallRecords.Read.All requires this)
const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;

// Batch size for fetching call details
const BATCH_SIZE = 20;

// Get Application token (client credentials flow)
async function getAppToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Failed to get app token");
  }
  return data.access_token;
}

// Get current user using their delegated token (/me endpoint)
async function getCurrentUserFromToken(
  userToken: string
): Promise<{ id: string; displayName: string }> {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=id,displayName",
    {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch current user: ${response.status}`);
  }

  return response.json();
}

interface CallRecordBasic {
  id: string;
  startDateTime: string;
  endDateTime: string;
  type?: string;
  joinWebUrl?: string;
}

interface Participant {
  user?: {
    id?: string;
    displayName?: string;
  };
}

interface CallRecordWithParticipants extends CallRecordBasic {
  participants?: Participant[];
}

interface GraphCallRecordsResponse {
  value: CallRecordBasic[];
  "@odata.nextLink"?: string;
}

// Fetch call record details including participants
async function fetchCallDetails(
  accessToken: string,
  callId: string
): Promise<CallRecordWithParticipants | null> {
  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/communications/callRecords/${callId}?$select=id,startDateTime,endDateTime,type,joinWebUrl,participants`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// Check if user participated in the call
function userParticipatedInCall(
  details: CallRecordWithParticipants,
  userId: string,
  userName: string
): boolean {
  if (!details.participants) return false;

  return details.participants.some(
    (p) =>
      p.user?.id === userId ||
      p.user?.displayName?.toLowerCase().includes(userName.toLowerCase())
  );
}

interface DurationsResponse {
  durations: {
    [normalizedJoinUrl: string]: {
      actualStart: string;
      actualEnd: string;
    };
  };
}

export async function GET(
  request: Request
): Promise<NextResponse<DurationsResponse | { error: string }>> {
  // Support both NextAuth session and Authorization header (for Teams SSO)
  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  // Prefer Authorization header (Teams SSO), fallback to NextAuth session
  let userAccessToken: string | null = bearerToken;

  if (!userAccessToken) {
    const session = await getServerSession(authOptions);
    userAccessToken = session?.accessToken || null;
  }

  // User must be logged in
  if (!userAccessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if Azure AD credentials are configured
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Azure AD credentials not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  let startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate required" },
      { status: 400 }
    );
  }

  // Microsoft Graph Call Records API has ~30 day retention
  // Automatically limit startDate to max 29 days ago
  const maxDaysBack = 29;
  const minStartDate = new Date();
  minStartDate.setDate(minStartDate.getDate() - maxDaysBack);
  const minStartDateStr = minStartDate.toISOString().split("T")[0];

  if (startDate < minStartDateStr) {
    console.log(
      `[/api/calls/durations] Adjusting startDate from ${startDate} to ${minStartDateStr} (30-day retention limit)`
    );
    startDate = minStartDateStr;
  }

  // Call Records have a processing delay (~15-30 min, sometimes longer)
  // Limit endDateTime to 1 hour ago to get reliable data for today
  const oneHourAgo = new Date(Date.now() - 5 * 60 * 1000);
  // Use UTC date from oneHourAgo to avoid timezone issues
  const oneHourAgoDateStr = oneHourAgo.toISOString().split("T")[0];

  // Determine the effective end datetime for the API query
  let endDateTime: string;
  if (endDate >= oneHourAgoDateStr) {
    // If endDate is today or future, limit to 1 hour ago (full ISO string)
    endDateTime = oneHourAgo.toISOString();
    console.log(
      `[/api/calls/durations] Using endDateTime=${endDateTime} (1 hour ago, call records processing delay)`
    );
  } else {
    // For past dates, use end of day
    endDateTime = `${endDate}T23:59:59Z`;
  }

  // Check if we have a valid time range
  const startDateTime = `${startDate}T00:00:00Z`;
  if (new Date(startDateTime) > new Date(endDateTime)) {
    console.log(
      `[/api/calls/durations] No valid date range (${startDateTime} > ${endDateTime}), returning empty`
    );
    return NextResponse.json({ durations: {} });
  }

  try {
    // Get current user from their token (to filter by participation)
    const currentUser = await getCurrentUserFromToken(userAccessToken);

    // Use Application token (client credentials) for CallRecords.Read.All
    const accessToken = await getAppToken();

    // First, get all call record IDs for group calls in the date range
    const callIds: string[] = [];
    let callUrl: string | null = `https://graph.microsoft.com/v1.0/communications/callRecords?$filter=startDateTime ge ${startDateTime} and startDateTime le ${endDateTime}&$select=id,type,joinWebUrl`;

    while (callUrl) {
      const res: Response = await fetch(callUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(
          "[/api/calls/durations] Graph API error:",
          res.status,
          errorText
        );
        break;
      }

      const data: GraphCallRecordsResponse = await res.json();

      // Collect IDs of group calls with joinWebUrl
      for (const record of data.value) {
        if (record.type === "groupCall" && record.joinWebUrl) {
          callIds.push(record.id);
        }
      }

      callUrl = data["@odata.nextLink"] || null;
    }

    console.log(
      `[/api/calls/durations] Found ${callIds.length} group calls, fetching details for user ${currentUser.displayName}`
    );

    // Fetch details in parallel batches and filter by user participation
    const durations: DurationsResponse["durations"] = {};

    for (let i = 0; i < callIds.length; i += BATCH_SIZE) {
      const batch = callIds.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map((id) => fetchCallDetails(accessToken, id))
      );

      for (const details of results) {
        if (!details) continue;
        if (!details.joinWebUrl) continue;

        // Security: Only include meetings where the current user participated
        if (!userParticipatedInCall(details, currentUser.id, currentUser.displayName)) {
          continue;
        }

        const normalizedUrl = normalizeJoinUrl(details.joinWebUrl);
        if (normalizedUrl) {
          // Use date from the call record's start time to create unique key per occurrence
          // This is critical for recurring meetings which share the same joinWebUrl
          const callDate = details.startDateTime.split("T")[0];
          const durationKey = getDurationKey(normalizedUrl, callDate);

          // If we already have this meeting on this day, keep the one with the longest duration
          // (in case a meeting was restarted)
          const existing = durations[durationKey];
          if (existing) {
            const existingDuration =
              new Date(existing.actualEnd).getTime() -
              new Date(existing.actualStart).getTime();
            const newDuration =
              new Date(details.endDateTime).getTime() -
              new Date(details.startDateTime).getTime();
            if (newDuration > existingDuration) {
              durations[durationKey] = {
                actualStart: details.startDateTime,
                actualEnd: details.endDateTime,
              };
            }
          } else {
            durations[durationKey] = {
              actualStart: details.startDateTime,
              actualEnd: details.endDateTime,
            };
          }
        }
      }
    }

    console.log(
      `[/api/calls/durations] Returning ${Object.keys(durations).length} meeting durations for user ${currentUser.displayName}`
    );

    return NextResponse.json({ durations });
  } catch (error) {
    console.error("Call durations fetch error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (
      errorMessage.includes("401") ||
      errorMessage.includes("unauthorized")
    ) {
      return NextResponse.json(
        { error: "Token expired - please sign out and sign in again" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: `Failed to fetch call durations: ${errorMessage}` },
      { status: 500 }
    );
  }
}
