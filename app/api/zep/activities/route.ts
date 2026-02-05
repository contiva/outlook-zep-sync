import { NextResponse } from "next/server";
import { readTaetigkeit, mapTaetigkeitToRestFormat } from "@/lib/zep-soap";
import { getAuthenticatedUser } from "@/lib/auth-helper";

export async function GET(request: Request) {
  // Check authentication (supports both NextAuth and Teams SSO)
  const user = await getAuthenticatedUser(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.ZEP_SOAP_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const taetigkeiten = await readTaetigkeit(token);
    const activities = taetigkeiten.map(mapTaetigkeitToRestFormat);
    return NextResponse.json(activities);
  } catch (error) {
    console.error("ZEP activities fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ZEP activities" },
      { status: 500 }
    );
  }
}
