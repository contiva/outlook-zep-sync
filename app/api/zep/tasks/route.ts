import { NextResponse } from "next/server";
import { getZepProjectTasks } from "@/lib/zep-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const projectId = searchParams.get("projectId");

  if (!token || !projectId) {
    return NextResponse.json(
      { error: "token and projectId required" },
      { status: 400 }
    );
  }

  try {
    const tasks = await getZepProjectTasks(token, parseInt(projectId, 10));
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("ZEP tasks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ZEP tasks" },
      { status: 500 }
    );
  }
}
