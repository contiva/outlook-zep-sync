import { NextResponse } from "next/server";
import { getBookableProjects, mapProjektToRestFormat, findEmployeeByEmail } from "@/lib/zep-soap";
import { getAuthenticatedUser } from "@/lib/auth-helper";

export async function GET(request: Request) {
  // Check authentication (supports both NextAuth and Teams SSO)
  const user = await getAuthenticatedUser(request);
  if (!user?.email) {
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

  // Security: Validate that the requested employeeId matches the logged-in user
  try {
    const employee = await findEmployeeByEmail(token, user.email);
    if (!employee) {
      return NextResponse.json(
        { error: "Kein ZEP-Benutzer für diesen Account gefunden" },
        { status: 403 }
      );
    }
    if (employee.userId !== employeeId) {
      console.warn(`Security: User ${user.email} (ZEP: ${employee.userId}) tried to access projects for ${employeeId}`);
      return NextResponse.json(
        { error: "Zugriff verweigert: Sie können nur Ihre eigenen Projekte abrufen" },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("Employee validation error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Benutzervalidierung" },
      { status: 500 }
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
