import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/microsoft-graph";

export async function GET(request: Request) {
  // Support both NextAuth session and Authorization header (for Teams SSO)
  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  // Prefer Authorization header (Teams SSO), fallback to NextAuth session
  let accessToken: string | null = bearerToken;

  if (!accessToken) {
    const session = await getServerSession(authOptions);
    accessToken = session?.accessToken || null;
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate required" },
      { status: 400 }
    );
  }

  try {
    const events = await getCalendarEvents(
      accessToken,
      startDate,
      endDate
    );
    return NextResponse.json(events);
  } catch (error) {
    console.error("Calendar fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check if it's a token expiry issue
    if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
      return NextResponse.json(
        { error: "Token expired - please sign out and sign in again" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to fetch calendar: ${errorMessage}` },
      { status: 500 }
    );
  }
}
