import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBookableProjects, mapProjektToRestFormat } from "@/lib/zep-soap";

export async function GET(request: Request) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.ZEP_SOAP_TOKEN;
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const referenceDate = searchParams.get("date"); // Date for which to check bookability

  if (!token) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId required" },
      { status: 400 }
    );
  }

  try {
    const projekte = await getBookableProjects(
      token,
      employeeId,
      referenceDate || undefined
    );
    const projects = projekte.map(mapProjektToRestFormat);
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch employee projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee projects" },
      { status: 500 }
    );
  }
}
