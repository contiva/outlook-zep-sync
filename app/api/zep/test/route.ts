import { NextResponse } from "next/server";
import { 
  getZepEmployeeProjects, 
  getZepProjects,
  getZepProjectsForEmployee 
} from "@/lib/zep-api";

export async function GET(request: Request) {
  const token = process.env.ZEP_API_TOKEN;
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") || "sbrandt";
  const startDate = searchParams.get("startDate") || new Date().toISOString().split('T')[0];
  const endDate = searchParams.get("endDate") || new Date().toISOString().split('T')[0];

  if (!token) {
    return NextResponse.json({ error: "ZEP_API_TOKEN not configured" }, { status: 500 });
  }

  const today = new Date().toISOString().split('T')[0];
  
  const results: Record<string, unknown> = {
    employeeId,
    dateRange: { startDate, endDate },
    today,
  };

  try {
    // 1. Get ALL employee project assignments (unfiltered)
    console.log(`Testing ZEP API for employee: ${employeeId}`);
    const allAssignments = await getZepEmployeeProjects(token, employeeId);
    results.allAssignments = {
      count: allAssignments.length,
      data: allAssignments.map(a => ({
        project_id: a.project_id,
        from: a.from,
        to: a.to,
        isCurrentlyValid: (!a.from || a.from <= endDate) && (!a.to || a.to >= startDate),
      })),
    };

    // 2. Get filtered projects for employee (with date filter)
    const employeeProjects = await getZepProjectsForEmployee(token, employeeId, startDate, endDate);
    results.filteredProjects = {
      count: employeeProjects.length,
      data: employeeProjects.map(p => ({ 
        id: p.id, 
        name: p.name, 
        description: p.description,
        end_date: p.end_date,
      })),
    };

  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(results, { status: 200 });
}
