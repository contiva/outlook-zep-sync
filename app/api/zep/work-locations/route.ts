import { NextResponse } from "next/server";
import { readOrtsliste, mapOrtToRestFormat } from "@/lib/zep-soap";
import { getAuthenticatedUser } from "@/lib/auth-helper";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;

  try {
    const orte = await readOrtsliste(token, date);
    const workLocations = orte.map(mapOrtToRestFormat);
    return NextResponse.json(workLocations);
  } catch (error) {
    console.error("ZEP work locations fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ZEP work locations" },
      { status: 500 }
    );
  }
}
