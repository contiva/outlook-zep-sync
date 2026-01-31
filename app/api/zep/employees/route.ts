import { NextResponse } from "next/server";
import { getZepEmployees } from "@/lib/zep-api";

// GET /api/zep/employees?email=robert.fels@contiva.com
// Returns matching ZEP employee or 404
export async function GET(request: Request) {
  const token = process.env.ZEP_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "ZEP_API_TOKEN not configured" },
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
    const employees = await getZepEmployees(token);
    
    // Case-insensitive email match
    const match = employees.find(
      (emp) => emp.email?.toLowerCase() === email.toLowerCase()
    );

    if (!match) {
      return NextResponse.json(
        { error: "No matching employee found for this email" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      username: match.username,
      firstname: match.firstname,
      lastname: match.lastname,
      email: match.email,
    });
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees from ZEP" },
      { status: 500 }
    );
  }
}
