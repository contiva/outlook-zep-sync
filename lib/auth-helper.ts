/**
 * Authentication Helper
 *
 * Provides unified authentication for both NextAuth sessions and Teams SSO.
 * Use this in API routes to get the current user regardless of auth method.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface AuthenticatedUser {
  email: string;
  name?: string;
}

/**
 * Get the authenticated user from either NextAuth session or Teams SSO token.
 *
 * @param request - The incoming request (to read Authorization header)
 * @returns The authenticated user or null if not authenticated
 */
export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  // First, check for Authorization header (Teams SSO)
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (bearerToken) {
    // Fetch user info from Microsoft Graph API using the token
    try {
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName',
        {
          headers: { Authorization: `Bearer ${bearerToken}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const email = data.mail || data.userPrincipalName;
        if (email) {
          return {
            email: email.toLowerCase(),
            name: data.displayName,
          };
        }
      }
    } catch (error) {
      console.error('[Auth Helper] Failed to fetch user from Graph API:', error);
    }
  }

  // Fallback to NextAuth session
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    return {
      email: session.user.email.toLowerCase(),
      name: session.user.name || undefined,
    };
  }

  return null;
}
