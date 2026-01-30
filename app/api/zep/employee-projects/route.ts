import { NextResponse } from "next/server";
import { getZepProjectsForEmployee } from "@/lib/zep-api";

export async function GET(request: Request) {
  const token = process.env.ZEP_API_TOKEN;
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!token) {
    return NextResponse.json(
      { error: "ZEP_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId required" },
      { status: 400 }
    );
  }

  try {
    const projects = await getZepProjectsForEmployee(
      token,
      employeeId,
      startDate || undefined,
      endDate || undefined
    );
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch employee projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee projects" },
      { status: 500 }
    );
  }
}
