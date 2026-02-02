import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProjectTasks, readProjekte, mapVorgangToRestFormat } from "@/lib/zep-soap";

export async function GET(request: Request) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.ZEP_SOAP_TOKEN;
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const projektNr = searchParams.get("projektNr");
  const userId = searchParams.get("userId"); // Employee filter
  const dateStr = searchParams.get("date"); // Reference date for filtering (YYYY-MM-DD)

  if (!token) {
    return NextResponse.json(
      { error: "ZEP_SOAP_TOKEN not configured" },
      { status: 500 }
    );
  }

  if (!projectId && !projektNr) {
    return NextResponse.json(
      { error: "projectId or projektNr required" },
      { status: 400 }
    );
  }

  try {
    let searchProjektNr = projektNr;
    
    // Prefer projektNr (no additional SOAP call needed)
    // Only look up by projectId if projektNr is not provided
    if (!projektNr && projectId) {
      const projekte = await readProjekte(token, { id: parseInt(projectId, 10) });
      if (projekte.length === 0) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
      searchProjektNr = projekte[0].projektNr;
    }

    // Build filter options
    const filterOptions: { userId?: string; referenceDate?: Date } = {};
    if (userId) {
      filterOptions.userId = userId;
    }
    if (dateStr) {
      filterOptions.referenceDate = new Date(dateStr);
    }

    // Use getProjectTasks which filters by status, date range, and employee assignment
    const vorgaenge = await getProjectTasks(token, searchProjektNr!, filterOptions);
    const tasks = vorgaenge.map(mapVorgangToRestFormat);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("ZEP tasks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ZEP tasks" },
      { status: 500 }
    );
  }
}
