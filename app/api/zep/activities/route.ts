import { NextResponse } from "next/server";
import { getZepActivities } from "@/lib/zep-api";

export async function GET() {
  const token = process.env.ZEP_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "ZEP_API_TOKEN not configured" },
      { status: 500 }
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
