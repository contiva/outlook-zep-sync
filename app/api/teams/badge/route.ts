import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helper";

/**
 * API endpoint to send Teams activity notification with badge count
 *
 * This uses the Microsoft Graph API to send activity feed notifications
 * which appear as badges on the Teams app icon.
 *
 * Important: Uses App-Only token (Client Credentials) because a user cannot
 * send activity notifications to themselves with a delegated token.
 */

const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;

interface BadgeRequest {
  count: number;
}

// Cache for app-only token
let appTokenCache: { token: string; expiresAt: number } | null = null;

/**
 * Get an app-only access token using Client Credentials flow
 */
async function getAppOnlyToken(): Promise<string | null> {
  // Check cache
  if (appTokenCache && appTokenCache.expiresAt > Date.now() + 60000) {
    return appTokenCache.token;
  }

  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    console.error("[Teams Badge] Azure AD credentials not configured");
    return null;
  }

  try {
    const tokenEndpoint = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Teams Badge] Failed to get app-only token:", error);
      return null;
    }

    const data = await response.json();

    // Cache the token
    appTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return data.access_token;
  } catch (error) {
    console.error("[Teams Badge] Error getting app-only token:", error);
    return null;
  }
}

export async function POST(request: Request) {
  // Check authentication
  const user = await getAuthenticatedUser(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: BadgeRequest = await request.json();
    const { count } = body;

    if (typeof count !== "number" || count < 0) {
      return NextResponse.json(
        { error: "Invalid count parameter" },
        { status: 400 }
      );
    }

    // Get the user's access token to fetch their Azure AD ID
    const authHeader = request.headers.get("Authorization");
    const userToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!userToken) {
      return NextResponse.json(
        { error: "Access token required for Teams badge" },
        { status: 401 }
      );
    }

    // Get user's Azure AD ID from Graph API
    const meResponse = await fetch("https://graph.microsoft.com/v1.0/me?$select=id", {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      console.error("[Teams Badge] Failed to get user ID:", errorText);
      return NextResponse.json(
        { error: "Failed to get user ID from Graph API" },
        { status: 500 }
      );
    }

    const meData = await meResponse.json();
    const recipientUserId = meData.id;

    // Get app-only token for sending notifications
    const appToken = await getAppOnlyToken();
    if (!appToken) {
      return NextResponse.json({
        success: false,
        message: "Could not get app-only token for notifications",
        count,
      });
    }

    // First, get the Teams app installation ID for this user
    // Note: Teams assigns its own ID to sideloaded/custom apps, different from Azure AD Client ID
    // We search by app name "ZEP Sync" to find our app

    // Get all installed apps and find ours by name
    const installationsUrl = `https://graph.microsoft.com/v1.0/users/${recipientUserId}/teamwork/installedApps?$expand=teamsAppDefinition`;

    const installationsResponse = await fetch(installationsUrl, {
      headers: { Authorization: `Bearer ${appToken}` },
    });

    if (!installationsResponse.ok) {
      const errorText = await installationsResponse.text();
      console.error("[Teams Badge] Failed to get app installations:", errorText);
      return NextResponse.json({
        success: false,
        message: "Could not find Teams app installation",
        count,
        debug: process.env.NODE_ENV === "development" ? errorText : undefined,
      });
    }

    const installationsData = await installationsResponse.json();

    // Find our app by matching the display name "ZEP Sync"
    const installation = installationsData.value?.find(
      (app: { teamsAppDefinition?: { displayName?: string } }) =>
        app.teamsAppDefinition?.displayName === "ZEP Sync"
    );

    if (!installation) {
      console.log("[Teams Badge] ZEP Sync app not installed for user");
      return NextResponse.json({
        success: false,
        message: "ZEP Sync app not installed for this user",
        count,
      });
    }

    const teamsAppId = installation.teamsAppDefinition?.teamsAppId;
    console.log("[Teams Badge] Found ZEP Sync installation:", installation.id, "teamsAppId:", teamsAppId);

    // Send activity notification via Graph API using app-only token
    const activityUrl = `https://graph.microsoft.com/v1.0/users/${recipientUserId}/teamwork/sendActivityNotification`;

    const activityPayload = {
      topic: {
        source: "entityUrl",
        value: `https://graph.microsoft.com/v1.0/users/${recipientUserId}/teamwork/installedApps/${installation.id}`,
      },
      activityType: "pendingAppointments",
      previewText: {
        content: count > 0
          ? `${count} unbearbeitete Termine für heute`
          : "Alle Termine bearbeitet",
      },
      templateParameters: [
        {
          name: "count",
          value: count.toString(),
        },
      ],
    };

    const activityResponse = await fetch(activityUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(activityPayload),
    });

    if (!activityResponse.ok) {
      const errorText = await activityResponse.text();
      console.error("[Teams Badge] Failed to send activity notification:", errorText);

      return NextResponse.json({
        success: false,
        message: "Activity notification failed",
        count,
        debug: process.env.NODE_ENV === "development" ? errorText : undefined,
      });
    }

    console.log("[Teams Badge] Notification sent successfully for count:", count);

    return NextResponse.json({
      success: true,
      count,
      message: "Badge updated successfully",
    });

  } catch (error) {
    console.error("[Teams Badge] API error:", error);
    return NextResponse.json(
      { error: "Failed to update badge" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check the current badge status
 * Returns the count of unsynced appointments for today
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // This endpoint just returns that the badge feature is available
  // The actual count is calculated client-side from the appointments
  return NextResponse.json({
    available: true,
    message: "Use POST to update badge count"
  });
}
