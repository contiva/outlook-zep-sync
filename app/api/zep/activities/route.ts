import { NextResponse } from "next/server";
import { getZepActivities } from "@/lib/zep-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "token required" },
      { status: 400 }
    );
  }

  try {
    const activities = await getZepActivities(token);
    return NextResponse.json(activities);
  } catch (error) {
    console.error("ZEP activities fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ZEP activities" },
      { status: 500 }
    );
  }
}
