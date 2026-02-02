import { NextResponse } from "next/server";
import { readProjekte, mapProjektToRestFormat } from "@/lib/zep-soap";

export async function GET() {
  const token = process.env.ZEP_SOAP_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "ZEP_SOAP_TOKEN not configured" },
      { status: 500 }
    );
  }

  try {
    const projekte = await readProjekte(token, {});
    const projects = projekte.map(mapProjektToRestFormat);
    return NextResponse.json(projects);
  } catch (error) {
    console.error("ZEP projects fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ZEP projects" },
      { status: 500 }
    );
  }
}
