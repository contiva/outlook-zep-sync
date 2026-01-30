import { NextResponse } from "next/server";
import { getZepProjects } from "@/lib/zep-api";

export async function GET() {
  const token = process.env.ZEP_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "ZEP_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  try {
    const projects = await getZepProjects(token);
    return NextResponse.json(projects);
  } catch (error) {
    console.error("ZEP projects fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ZEP projects" },
      { status: 500 }
    );
  }
}
