import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

// Allowed email domains for login
const ALLOWED_DOMAINS = ["contiva.com"];

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid profile email User.Read Calendars.Read",
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
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
};
