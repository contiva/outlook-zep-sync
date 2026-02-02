import { NextResponse } from "next/server";
import { readMitarbeiter, findEmployeeByEmail, mapMitarbeiterToRestFormat } from "@/lib/zep-soap";

// GET /api/zep/employees?email=robert.fels@contiva.com
// Returns matching ZEP employee or 404
export async function GET(request: Request) {
  const token = process.env.ZEP_SOAP_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "ZEP_SOAP_TOKEN not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "email parameter required" },
      { status: 400 }
    );
  }

  try {
    const employee = await findEmployeeByEmail(token, email);

    if (!employee) {
      return NextResponse.json(
        { error: "No matching employee found for this email" },
        { status: 404 }
      );
    }

    return NextResponse.json(mapMitarbeiterToRestFormat(employee));
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees from ZEP" },
      { status: 500 }
    );
  }
}
