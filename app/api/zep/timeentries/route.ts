import { NextResponse } from "next/server";
import { createZepAttendance, getZepAttendances } from "@/lib/zep-api";

// GET: Fetch existing time entries for employee in date range
export async function GET(request: Request) {
  const token = process.env.ZEP_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "ZEP_API_TOKEN not configured" },
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

  try {
    const attendances = await getZepAttendances(token, employeeId, startDate, endDate);
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
}

interface RequestBody {
  entries: AttendanceInput[];
}

export async function POST(request: Request) {
  const token = process.env.ZEP_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "ZEP_API_TOKEN not configured" },
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

  try {
    const results = await Promise.allSettled(
      entries.map((entry) => createZepAttendance(token, entry))
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
      message: `${succeeded} Eintraege erstellt, ${failed.length} fehlgeschlagen`,
      succeeded,
      failed: failed.length,
      errors,
    });
  } catch (error) {
    console.error("ZEP attendance creation error:", error);
    return NextResponse.json(
      { error: "Failed to create attendances" },
      { status: 500 }
    );
  }
}
