import { NextResponse } from "next/server";
import { getZepProjects } from "@/lib/zep-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zepUrl = searchParams.get("zepUrl");
  const token = searchParams.get("token");

  if (!zepUrl || !token) {
    return NextResponse.json(
      { error: "zepUrl and token required" },
      { status: 400 }
    );
  }

  try {
    const projects = await getZepProjects(zepUrl, token);
    return NextResponse.json(projects);
  } catch (error) {
    console.error("ZEP projects fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ZEP projects" },
      { status: 500 }
    );
  }
}
