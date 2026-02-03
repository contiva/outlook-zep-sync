import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { normalizeJoinUrl } from "@/lib/teams-utils";

// Azure AD credentials for Application permissions (CallRecords.Read.All requires this)
const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;

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

interface CallRecordBasic {
  id: string;
  startDateTime: string;
  endDateTime: string;
  type?: string;
  joinWebUrl?: string;
}

interface GraphCallRecordsResponse {
  value: CallRecordBasic[];
  "@odata.nextLink"?: string;
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
  const session = await getServerSession(authOptions);

  // User must be logged in
  if (!session?.accessToken) {
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
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
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
    // Use Application token (client credentials) for CallRecords.Read.All
    const accessToken = await getAppToken();

    // Fetch call records with joinWebUrl (group calls only, which are scheduled meetings)
    // We only need the basic info - no participant resolution needed
    const durations: DurationsResponse["durations"] = {};

    let callUrl: string | null = `https://graph.microsoft.com/v1.0/communications/callRecords?$filter=startDateTime ge ${startDateTime} and startDateTime le ${endDateTime}&$select=id,startDateTime,endDateTime,type,joinWebUrl`;

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

      // Process each call record
      for (const record of data.value) {
        // Only process group calls (scheduled meetings) with joinWebUrl
        if (record.type === "groupCall" && record.joinWebUrl) {
          const normalizedUrl = normalizeJoinUrl(record.joinWebUrl);
          if (normalizedUrl) {
            // If we already have this meeting, keep the one with the longest duration
            // (in case a meeting was restarted)
            const existing = durations[normalizedUrl];
            if (existing) {
              const existingDuration =
                new Date(existing.actualEnd).getTime() -
                new Date(existing.actualStart).getTime();
              const newDuration =
                new Date(record.endDateTime).getTime() -
                new Date(record.startDateTime).getTime();
              if (newDuration > existingDuration) {
                durations[normalizedUrl] = {
                  actualStart: record.startDateTime,
                  actualEnd: record.endDateTime,
                };
              }
            } else {
              durations[normalizedUrl] = {
                actualStart: record.startDateTime,
                actualEnd: record.endDateTime,
              };
            }
          }
        }
      }

      callUrl = data["@odata.nextLink"] || null;
    }

    console.log(
      `[/api/calls/durations] Returning ${Object.keys(durations).length} meeting durations`
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
