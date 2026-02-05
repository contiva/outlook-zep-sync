import { NextResponse } from "next/server";
import {
  readProjektzeiten,
  createProjektzeit,
  updateProjektzeit,
  mapProjektzeitToRestFormat,
  readProjekte,
  readVorgang,
  formatSoapDate,
  formatSoapStartTime,
  formatSoapEndTime,
  findEmployeeByEmail,
  determineBillable
} from "@/lib/zep-soap";
import { getAuthenticatedUser } from "@/lib/auth-helper";

// Helper: Validate that the requested employeeId matches the logged-in user
async function validateEmployeeAccess(request: Request, requestedEmployeeId: string, token: string): Promise<{ valid: boolean; error?: string; status?: number }> {
  const user = await getAuthenticatedUser(request);

  if (!user?.email) {
    return { valid: false, error: "Nicht authentifiziert", status: 401 };
  }

  // Find the ZEP employee for the logged-in user
  const employee = await findEmployeeByEmail(token, user.email);

  if (!employee) {
    return { valid: false, error: "Kein ZEP-Benutzer für diesen Account gefunden", status: 403 };
  }

  // Check if the requested employeeId matches the logged-in user's ZEP username
  if (employee.userId !== requestedEmployeeId) {
    console.warn(`Security: User ${user.email} (ZEP: ${employee.userId}) tried to access data for ${requestedEmployeeId}`);
    return { valid: false, error: "Zugriff verweigert: Sie können nur Ihre eigenen Einträge abrufen", status: 403 };
  }

  return { valid: true };
}

// GET: Fetch existing time entries for employee in date range
export async function GET(request: Request) {
  const token = process.env.ZEP_SOAP_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!employeeId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "employeeId, startDate, and endDate required" },
      { status: 400 }
    );
  }

  // Security: Validate that user can only access their own data
  const accessCheck = await validateEmployeeAccess(request, employeeId, token);
  if (!accessCheck.valid) {
    return NextResponse.json(
      { error: accessCheck.error },
      { status: accessCheck.status || 403 }
    );
  }

  try {
    const projektzeiten = await readProjektzeiten(token, {
      von: startDate,
      bis: endDate,
      userIdListe: { userId: [employeeId] },
    });
    const attendances = projektzeiten.map(mapProjektzeitToRestFormat);
    return NextResponse.json(attendances);
  } catch (error) {
    console.error("Failed to fetch attendances:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendances" },
      { status: 500 }
    );
  }
}

interface AttendanceInput {
  date: string;
  from: string;
  to: string;
  employee_id: string;
  note: string | null;
  billable: boolean;
  activity_id: string;
  project_id: number;
  project_task_id: number;
  // SOAP-specific fields (optional, will be looked up if not provided)
  projektNr?: string;
  vorgangNr?: string;
}

interface RequestBody {
  entries: AttendanceInput[];
}

// Cache for projekt lookups during batch creation
// Stores full project data for billability determination
interface ProjektCacheEntry {
  projektNr: string;
  voreinstFakturierbarkeit?: number;
  defaultFakt?: number;
}
interface VorgangCacheEntry {
  vorgangNr: string;
  defaultFakt?: number;
}
const projektCache = new Map<number, ProjektCacheEntry>();
const vorgangCache = new Map<number, VorgangCacheEntry>();

export async function POST(request: Request) {
  const token = process.env.ZEP_SOAP_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const body: RequestBody = await request.json();
  const { entries } = body;

  if (!entries?.length) {
    return NextResponse.json(
      { error: "entries required" },
      { status: 400 }
    );
  }

  // Security: Validate that all entries belong to the logged-in user
  const uniqueEmployeeIds = [...new Set(entries.map(e => e.employee_id))];
  
  for (const employeeId of uniqueEmployeeIds) {
    const accessCheck = await validateEmployeeAccess(request, employeeId, token);
    if (!accessCheck.valid) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.status || 403 }
      );
    }
  }

  try {
    // Pre-fetch projekt and vorgang info for entries that don't have projektNr/vorgangNr
    // Also fetch billability settings from projekt and vorgang
    for (const entry of entries) {
      if (entry.project_id && !projektCache.has(entry.project_id)) {
        const projekte = await readProjekte(token, { id: entry.project_id });
        if (projekte.length > 0) {
          const projekt = projekte[0];
          projektCache.set(entry.project_id, {
            projektNr: projekt.projektNr,
            voreinstFakturierbarkeit: projekt.voreinstFakturierbarkeit,
            defaultFakt: projekt.defaultFakt,
          });
        }
      }
      if (!entry.projektNr && entry.project_id) {
        const cached = projektCache.get(entry.project_id);
        entry.projektNr = cached?.projektNr;
      }
      
      if (entry.project_task_id && !vorgangCache.has(entry.project_task_id)) {
        const vorgaenge = await readVorgang(token, { id: entry.project_task_id });
        if (vorgaenge.length > 0) {
          const vorgang = vorgaenge[0];
          vorgangCache.set(entry.project_task_id, {
            vorgangNr: vorgang.vorgangNr,
            defaultFakt: vorgang.defaultFakt,
          });
        }
      }
      if (!entry.vorgangNr && entry.project_task_id) {
        const cached = vorgangCache.get(entry.project_task_id);
        entry.vorgangNr = cached?.vorgangNr;
      }
    }

    const results = await Promise.allSettled(
      entries.map(async (entry) => {
        if (!entry.projektNr || !entry.vorgangNr) {
          throw new Error(`Missing projektNr or vorgangNr for project_id ${entry.project_id}`);
        }

        // Parse date and times
        const entryDate = new Date(entry.date);
        const [fromHours, fromMinutes] = entry.from.split(":").map(Number);
        const [toHours, toMinutes] = entry.to.split(":").map(Number);
        
        const fromDate = new Date(entryDate);
        fromDate.setHours(fromHours, fromMinutes, 0, 0);
        
        const toDate = new Date(entryDate);
        toDate.setHours(toHours, toMinutes, 0, 0);

        // Use billable value from client (already validated by UI based on projekt/vorgang settings)
        // Fall back to determineBillable only if not explicitly set
        const istFakturierbar = entry.billable;

        const soapEntry = {
          userId: entry.employee_id,
          datum: formatSoapDate(entryDate),
          von: formatSoapStartTime(fromDate),
          bis: formatSoapEndTime(toDate),
          projektNr: entry.projektNr,
          vorgangNr: entry.vorgangNr,
          taetigkeit: entry.activity_id,
          bemerkung: entry.note || undefined,
          istFakturierbar: istFakturierbar,
        };

        const id = await createProjektzeit(token, soapEntry);
        return { id };
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");
    
    const errors = failed.map((r) => {
      if (r.status === "rejected") {
        return r.reason?.message || "Unknown error";
      }
      return null;
    }).filter(Boolean);

    // Extract created ZEP IDs from fulfilled results
    const createdEntries: { index: number; zepId: string }[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const { id } = result.value;
        if (id) {
          createdEntries.push({ index, zepId: id });
        }
      }
    });

    return NextResponse.json({
      message: `${succeeded} Eintraege erstellt, ${failed.length} fehlgeschlagen`,
      succeeded,
      failed: failed.length,
      errors,
      createdEntries,
    });
  } catch (error) {
    console.error("ZEP attendance creation error:", error);
    return NextResponse.json(
      { error: "Failed to create attendances" },
      { status: 500 }
    );
  }
}

// PATCH: Modify existing time entries (rebooking to different project/task)
interface ModifyEntryInput {
  id: string;                 // ZEP Projektzeit ID
  projektNr: string;          // New project number
  vorgangNr: string;          // New task number
  taetigkeit: string;         // New activity
  // These are needed for the SOAP call
  userId: string;
  datum: string;
  von: string;
  bis: string;
  bemerkung?: string;
  istFakturierbar?: boolean;  // Optional - will be recalculated if not provided
  // Optional: project/task IDs for billability lookup
  project_id?: number;
  project_task_id?: number;
}

interface ModifyRequestBody {
  entries: ModifyEntryInput[];
}

// Cache for PATCH requests (separate from POST to avoid conflicts)
const patchProjektCache = new Map<string, ProjektCacheEntry>();
const patchVorgangCache = new Map<string, VorgangCacheEntry>();

export async function PATCH(request: Request) {
  const token = process.env.ZEP_SOAP_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const body: ModifyRequestBody = await request.json();
  const { entries } = body;

  if (!entries?.length) {
    return NextResponse.json(
      { error: "entries required" },
      { status: 400 }
    );
  }

  // Security: Validate that all entries belong to the logged-in user
  const uniqueUserIds = [...new Set(entries.map(e => e.userId))];
  
  for (const userId of uniqueUserIds) {
    const accessCheck = await validateEmployeeAccess(request, userId, token);
    if (!accessCheck.valid) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.status || 403 }
      );
    }
  }

  try {
    // Pre-fetch projekt and vorgang info for billability determination
    for (const entry of entries) {
      // Use projektNr as cache key since we may not have project_id
      if (entry.projektNr && !patchProjektCache.has(entry.projektNr)) {
        const projekte = await readProjekte(token, { projektNr: entry.projektNr });
        if (projekte.length > 0) {
          const projekt = projekte[0];
          patchProjektCache.set(entry.projektNr, {
            projektNr: projekt.projektNr,
            voreinstFakturierbarkeit: projekt.voreinstFakturierbarkeit,
            defaultFakt: projekt.defaultFakt,
          });
        }
      }
      
      // Use vorgangNr as cache key
      const cacheKey = `${entry.projektNr}:${entry.vorgangNr}`;
      if (entry.vorgangNr && !patchVorgangCache.has(cacheKey)) {
        const vorgaenge = await readVorgang(token, { 
          projektNr: entry.projektNr,
          vorgangNr: entry.vorgangNr 
        });
        if (vorgaenge.length > 0) {
          const vorgang = vorgaenge[0];
          patchVorgangCache.set(cacheKey, {
            vorgangNr: vorgang.vorgangNr,
            defaultFakt: vorgang.defaultFakt,
          });
        }
      }
    }

    const results = await Promise.allSettled(
      entries.map(async (entry) => {
        if (!entry.id || !entry.projektNr || !entry.vorgangNr) {
          throw new Error(`Missing required fields: id, projektNr, or vorgangNr`);
        }

        // Fakturierbarkeit: Verwende den explizit gesendeten Wert wenn vorhanden,
        // ansonsten berechne basierend auf Projekt-/Vorgang-Einstellungen
        let istFakturierbar: boolean;
        if (typeof entry.istFakturierbar === 'boolean') {
          // Explizit vom Client gesendet - verwenden
          istFakturierbar = entry.istFakturierbar;
        } else {
          // Ermittle Fakturierbarkeit basierend auf neuer Projekt-/Vorgang-Zuordnung
          const projektData = patchProjektCache.get(entry.projektNr);
          const vorgangCacheKey = `${entry.projektNr}:${entry.vorgangNr}`;
          const vorgangData = patchVorgangCache.get(vorgangCacheKey);
          
          // Priorität: voreinstFakturierbarkeit > defaultFakt auf Projekt-Ebene
          const projektFakt = projektData?.voreinstFakturierbarkeit ?? projektData?.defaultFakt;
          const vorgangFakt = vorgangData?.defaultFakt;
          
          // Berechne neue Fakturierbarkeit basierend auf dem neuen Projekt/Vorgang
          istFakturierbar = determineBillable(projektFakt, vorgangFakt);
        }

        const soapEntry = {
          id: entry.id,
          userId: entry.userId,
          datum: entry.datum,
          von: entry.von,
          bis: entry.bis,
          projektNr: entry.projektNr,
          vorgangNr: entry.vorgangNr,
          taetigkeit: entry.taetigkeit,
          bemerkung: entry.bemerkung,
          istFakturierbar: istFakturierbar,
        };

        await updateProjektzeit(token, soapEntry);
        return { id: entry.id };
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");
    
    const errors = failed.map((r) => {
      if (r.status === "rejected") {
        return r.reason?.message || "Unknown error";
      }
      return null;
    }).filter(Boolean);

    return NextResponse.json({
      message: `${succeeded} Eintraege aktualisiert, ${failed.length} fehlgeschlagen`,
      succeeded,
      failed: failed.length,
      errors,
    });
  } catch (error) {
    console.error("ZEP attendance modification error:", error);
    return NextResponse.json(
      { error: "Failed to modify attendances" },
      { status: 500 }
    );
  }
}
