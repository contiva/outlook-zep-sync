import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  // Only optimize the "/" → "/dashboard" redirect for returning users.
  // Dashboard auth protection stays client-side (useSession) to avoid
  // interfering with the Azure AD callback → dashboard redirect chain.
  if (request.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  // Teams app uses its own SSO auth flow
  if (request.nextUrl.searchParams.get("inTeams") === "true") {
    return NextResponse.next();
  }

  // Check for next-auth session cookie (works on both HTTP and HTTPS)
  const hasSession =
    request.cookies.has("next-auth.session-token") ||
    request.cookies.has("__Secure-next-auth.session-token");

  if (hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
