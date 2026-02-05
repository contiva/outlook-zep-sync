import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helper";

/**
 * API endpoint to send Teams activity notification with badge count
 *
 * This uses the Microsoft Graph API to send activity feed notifications
 * which appear as badges on the Teams app icon.
 */

interface BadgeRequest {
  count: number;
  userId?: string; // Azure AD user ID (optional, will be fetched if not provided)
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

    // Get the access token from the Authorization header
    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token required for Teams badge" },
        { status: 401 }
      );
    }

    // Get user's Azure AD ID from Graph API
    const meResponse = await fetch("https://graph.microsoft.com/v1.0/me?$select=id", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      console.error("Failed to get user ID:", errorText);
      return NextResponse.json(
        { error: "Failed to get user ID from Graph API" },
        { status: 500 }
      );
    }

    const meData = await meResponse.json();
    const userId = meData.id;

    // App ID from environment or manifest
    const appId = process.env.AZURE_AD_CLIENT_ID || "edf73da0-7ec5-4d6e-8f2e-4a86f2fdb9a6";

    // Send activity notification via Graph API
    // This requires an app-only token with TeamsActivity.Send.User permission
    // For now, we'll use the delegated token which has limited capabilities

    // The activity notification endpoint
    const activityUrl = `https://graph.microsoft.com/v1.0/users/${userId}/teamwork/sendActivityNotification`;

    const activityPayload = {
      topic: {
        source: "entityUrl",
        value: `https://graph.microsoft.com/v1.0/users/${userId}/teamwork/installedApps/${appId}`
      },
      activityType: "pendingAppointments",
      previewText: {
        content: count > 0
          ? `${count} unbearbeitete Termine für heute`
          : "Alle Termine bearbeitet"
      },
      templateParameters: [
        {
          name: "count",
          value: count.toString()
        }
      ]
    };

    const activityResponse = await fetch(activityUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(activityPayload),
    });

    if (!activityResponse.ok) {
      const errorText = await activityResponse.text();
      console.error("Failed to send activity notification:", errorText);

      // Activity notifications require specific permissions
      // Return success anyway but log the issue
      return NextResponse.json({
        success: false,
        message: "Activity notification not sent (permissions may be required)",
        count,
        debug: process.env.NODE_ENV === "development" ? errorText : undefined
      });
    }

    return NextResponse.json({
      success: true,
      count,
      message: "Badge updated successfully"
    });

  } catch (error) {
    console.error("Badge API error:", error);
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
