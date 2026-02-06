import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { JWT } from "next-auth/jwt";
import { registerUserForNotifications } from "@/lib/redis";

// Allowed email domains for login
const ALLOWED_DOMAINS = ["contiva.com"];

// Refresh access token using Azure AD refresh token
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
        scope: "openid profile email User.Read Calendars.Read offline_access",
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("[Auth] Token refresh failed:", refreshedTokens);
      throw refreshedTokens;
    }

    console.log("[Auth] Token refreshed successfully");

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.error("[Auth] Error refreshing access token:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid profile email User.Read Calendars.Read offline_access",
        },
      },
    }),
  ],
  pages: {
    error: "/auth/error", // Custom error page for access denied
  },
  callbacks: {
    async signIn({ user, profile }) {
      // Check if user email belongs to an allowed domain
      const email = user.email || (profile as { email?: string })?.email;
      
      if (!email) {
        console.warn("[Auth] Login rejected: No email provided");
        return false;
      }
      
      const domain = email.split("@")[1]?.toLowerCase();
      const isAllowed = ALLOWED_DOMAINS.includes(domain);
      
      if (!isAllowed) {
        console.warn(`[Auth] Login rejected: ${email} is not from an allowed domain`);
        return false;
      }
      
      console.log(`[Auth] Login accepted: ${email}`);
      return true;
    },
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        // Register user for month-end notifications
        if (account.providerAccountId && token.email) {
          registerUserForNotifications(account.providerAccountId, token.email as string).catch((err) =>
            console.error("[Auth] Failed to register user for notifications:", err)
          );
        }

        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          refreshToken: account.refresh_token,
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to refresh it
      console.log("[Auth] Access token expired, refreshing...");
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
};
