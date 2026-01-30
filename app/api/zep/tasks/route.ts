import { NextResponse } from "next/server";
import { getZepProjectTasks } from "@/lib/zep-api";

export async function GET(request: Request) {
  const token = process.env.ZEP_API_TOKEN;
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const employeeId = searchParams.get("employeeId");

  if (!token) {
    return NextResponse.json(
      { error: "ZEP_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId required" },
      { status: 400 }
    );
  }

  try {
    const tasks = await getZepProjectTasks(
      token, 
      parseInt(projectId, 10),
      employeeId || undefined
    );
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("ZEP tasks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ZEP tasks" },
      { status: 500 }
    );
  }
}
