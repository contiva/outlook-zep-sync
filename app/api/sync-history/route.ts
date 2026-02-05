import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helper";
import { findEmployeeByEmail } from "@/lib/zep-soap";
import {
  getSyncMapping,
  getSyncMappingsByUser,
  batchSaveSyncMappings,
  deleteSyncMapping,
  RedisSyncMapping,
} from "@/lib/redis";

// Helper: Validate that the requested userId matches the logged-in user
async function validateUserAccess(
  request: Request,
  requestedUserId: string,
  token: string
): Promise<{ valid: boolean; error?: string; status?: number }> {
  const user = await getAuthenticatedUser(request);

  if (!user?.email) {
    return { valid: false, error: "Nicht authentifiziert", status: 401 };
  }

  // Find the ZEP employee for the logged-in user
  const employee = await findEmployeeByEmail(token, user.email);

  if (!employee) {
    return {
      valid: false,
      error: "Kein ZEP-Benutzer für diesen Account gefunden",
      status: 403,
    };
  }

  // Check if the requested userId matches the logged-in user's ZEP username
  if (employee.userId !== requestedUserId) {
    console.warn(
      `Security: User ${user.email} (ZEP: ${employee.userId}) tried to access sync history for ${requestedUserId}`
    );
    return {
      valid: false,
      error:
        "Zugriff verweigert: Sie können nur Ihre eigene Sync-Historie abrufen",
      status: 403,
    };
  }

  return { valid: true };
}

// GET: Fetch sync mappings for a user
// Query params: userId (required), outlookEventId (optional - returns single mapping if provided)
export async function GET(request: Request) {
  const token = process.env.ZEP_SOAP_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const outlookEventId = searchParams.get("outlookEventId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  // Security: Validate that user can only access their own data
  const accessCheck = await validateUserAccess(request, userId, token);
  if (!accessCheck.valid) {
    return NextResponse.json(
      { error: accessCheck.error },
      { status: accessCheck.status || 403 }
    );
  }

  try {
    if (outlookEventId) {
      // Return single mapping
      const mapping = await getSyncMapping(userId, outlookEventId);
      if (!mapping) {
        return NextResponse.json(
          { error: "Sync mapping not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(mapping);
    } else {
      // Return all mappings for user
      const mappings = await getSyncMappingsByUser(userId);
      return NextResponse.json(mappings);
    }
  } catch (error) {
    console.error("Failed to fetch sync history:", error);
    return NextResponse.json(
      { error: "Failed to fetch sync history" },
      { status: 500 }
    );
  }
}

// POST: Save sync mappings
// Body: { userId: string, mappings: RedisSyncMapping[] }
export async function POST(request: Request) {
  const token = process.env.ZEP_SOAP_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body: { userId: string; mappings: RedisSyncMapping[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { userId, mappings } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
    return NextResponse.json(
      { error: "mappings array is required and must not be empty" },
      { status: 400 }
    );
  }

  // Security: Validate that user can only save their own data
  const accessCheck = await validateUserAccess(request, userId, token);
  if (!accessCheck.valid) {
    return NextResponse.json(
      { error: accessCheck.error },
      { status: accessCheck.status || 403 }
    );
  }

  try {
    await batchSaveSyncMappings(userId, mappings);
    return NextResponse.json({
      message: `${mappings.length} Sync-Mappings gespeichert`,
      count: mappings.length,
    });
  } catch (error) {
    console.error("Failed to save sync mappings:", error);
    return NextResponse.json(
      { error: "Failed to save sync mappings" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a sync mapping
// Query params: userId (required), outlookEventId (required)
export async function DELETE(request: Request) {
  const token = process.env.ZEP_SOAP_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const outlookEventId = searchParams.get("outlookEventId");

  if (!userId || !outlookEventId) {
    return NextResponse.json(
      { error: "userId and outlookEventId are required" },
      { status: 400 }
    );
  }

  // Security: Validate that user can only delete their own data
  const accessCheck = await validateUserAccess(request, userId, token);
  if (!accessCheck.valid) {
    return NextResponse.json(
      { error: accessCheck.error },
      { status: accessCheck.status || 403 }
    );
  }

  try {
    await deleteSyncMapping(userId, outlookEventId);
    return NextResponse.json({
      message: "Sync-Mapping gelöscht",
    });
  } catch (error) {
    console.error("Failed to delete sync mapping:", error);
    return NextResponse.json(
      { error: "Failed to delete sync mapping" },
      { status: 500 }
    );
  }
}
