import { NextResponse } from "next/server";
import { createZepAttendance, ZepAttendance } from "@/lib/zep-api";

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
  token: string;
  entries: AttendanceInput[];
}

export async function POST(request: Request) {
  const body: RequestBody = await request.json();
  const { token, entries } = body;

  if (!token || !entries?.length) {
    return NextResponse.json(
      { error: "token and entries required" },
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
