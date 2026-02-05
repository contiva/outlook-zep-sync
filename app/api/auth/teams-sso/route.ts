/**
 * Teams SSO API Route
 *
 * Exchanges a Teams SSO token for a full access token using OAuth2 On-Behalf-Of (OBO) flow.
 * This allows the Teams tab to silently authenticate without user interaction.
 */

import { NextResponse } from "next/server";

const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;

// Scopes needed by the application
const REQUIRED_SCOPES = "openid profile email User.Read Calendars.Read offline_access";

interface OBOTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

interface OBOErrorResponse {
  error: string;
  error_description: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  // Validate Azure AD configuration
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    console.error("[Teams SSO] Azure AD credentials not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { teamsToken } = body;

    if (!teamsToken) {
      return NextResponse.json(
        { error: "Teams token is required" },
        { status: 400 }
      );
    }

    console.log("[Teams SSO] Starting OBO token exchange");

    // Perform On-Behalf-Of (OBO) token exchange
    const tokenEndpoint = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: teamsToken,
        requested_token_use: "on_behalf_of",
        scope: REQUIRED_SCOPES,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      const errorData = tokenData as OBOErrorResponse;
      console.error("[Teams SSO] OBO token exchange failed:", errorData);

      // Handle specific error cases
      if (errorData.error === "invalid_grant") {
        return NextResponse.json(
          {
            error: "Token exchange failed",
            details: "The Teams token may have expired or is invalid",
          },
          { status: 401 }
        );
      }

      if (errorData.error === "interaction_required") {
        // User needs to consent - this shouldn't happen with proper Azure AD setup
        return NextResponse.json(
          {
            error: "Consent required",
            details: "User consent is required. Please contact your administrator.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: "Token exchange failed",
          details: errorData.error_description || errorData.error,
        },
        { status: 400 }
      );
    }

    const successData = tokenData as OBOTokenResponse;
    console.log("[Teams SSO] OBO token exchange successful");

    // Return the exchanged tokens
    return NextResponse.json({
      accessToken: successData.access_token,
      expiresIn: successData.expires_in,
      tokenType: successData.token_type,
      scope: successData.scope,
      refreshToken: successData.refresh_token,
    });
  } catch (error) {
    console.error("[Teams SSO] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
