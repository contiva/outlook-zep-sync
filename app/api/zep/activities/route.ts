import { NextResponse } from "next/server";
import { readTaetigkeit, mapTaetigkeitToRestFormat } from "@/lib/zep-soap";

export async function GET() {
  const token = process.env.ZEP_SOAP_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "ZEP_SOAP_TOKEN not configured" },
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
