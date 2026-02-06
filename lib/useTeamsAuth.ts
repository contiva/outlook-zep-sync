"use client";

/**
 * Custom hook for Teams SSO authentication
 *
 * Handles the Teams-specific authentication flow when the app
 * is running inside Microsoft Teams.
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface TeamsUser {
  name: string | null;
  email: string | null;
}

interface TeamsAuthState {
  isInTeams: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  user: TeamsUser | null;
}

// sessionStorage cache for OBO token (survives in-tab navigation, cleared on tab close)
const TOKEN_CACHE_KEY = "teams-obo-token";

interface CachedToken {
  accessToken: string;
  expiresAt: number; // timestamp
  userEmail: string | null;
  userName: string | null;
}

function getCachedToken(): CachedToken | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(TOKEN_CACHE_KEY);
    if (!stored) return null;
    const cached = JSON.parse(stored) as CachedToken;
    // Add 60s buffer before expiry to avoid using a token that's about to expire
    if (Date.now() > cached.expiresAt - 60_000) return null;
    return cached;
  } catch {
    return null;
  }
}

function setCachedToken(token: CachedToken) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(token));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook to handle Teams SSO authentication
 * Returns authentication state and the access token if available
 */
export function useTeamsAuth(): TeamsAuthState {
  const { data: session, status } = useSession();
  const [state, setState] = useState<TeamsAuthState>({
    isInTeams: false,
    isLoading: true,
    error: null,
    accessToken: null,
    user: null,
  });

  const performTeamsAuth = useCallback(async () => {
    // Check sessionStorage cache first (avoids full OBO exchange on navigation)
    const cached = getCachedToken();
    if (cached) {
      console.log("[Teams Auth] Using cached OBO token");
      setState({
        isInTeams: true,
        isLoading: false,
        error: null,
        accessToken: cached.accessToken,
        user: { name: cached.userName, email: cached.userEmail },
      });
      return;
    }

    // Dynamic import to avoid SSR issues
    const teamsSDK = await import("@/lib/teams-sdk");

    try {
      // Initialize Teams SDK
      await teamsSDK.initializeTeamsSDK();

      // Parallelize: get context + SSO token at the same time (both only need SDK init)
      const [context, teamsToken] = await Promise.all([
        teamsSDK.getTeamsContext(),
        teamsSDK.getTeamsSSOToken(),
      ]);

      if (!context) {
        throw new Error("Could not get Teams context");
      }
      if (!teamsToken) {
        throw new Error("Could not get Teams SSO token");
      }

      // Use Teams context email immediately (available now, no extra API call)
      const contextEmail = context.user?.userPrincipalName || null;
      const contextName = context.user?.displayName || context.user?.userPrincipalName?.split("@")[0] || null;

      console.log("[Teams Auth] Context + SSO token obtained:", contextEmail);

      // Exchange Teams token for app access token via OBO flow
      const response = await fetch("/api/auth/teams-sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamsToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Token exchange failed");
      }

      const tokenData = await response.json();

      // Set state immediately with context data — don't wait for Graph API or notifyAppLoaded
      setState({
        isInTeams: true,
        isLoading: false,
        error: null,
        accessToken: tokenData.accessToken,
        user: { name: contextName, email: contextEmail },
      });

      // Cache OBO token in sessionStorage
      setCachedToken({
        accessToken: tokenData.accessToken,
        expiresAt: Date.now() + (tokenData.expiresIn || 3600) * 1000,
        userEmail: contextEmail,
        userName: contextName,
      });

      // Fire-and-forget: notify Teams + fetch better user info from Graph API
      teamsSDK.notifyAppLoaded().catch(() => {});

      // Background: update user info from Graph API (more reliable email/name)
      fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName", {
        headers: { Authorization: `Bearer ${tokenData.accessToken}` },
      })
        .then(res => res.ok ? res.json() : null)
        .then(meData => {
          if (!meData) return;
          const betterEmail = meData.mail || meData.userPrincipalName || contextEmail;
          const betterName = meData.displayName || contextName;
          // Only update if Graph API returned better data
          if (betterEmail !== contextEmail || betterName !== contextName) {
            setState(prev => ({
              ...prev,
              user: { name: betterName, email: betterEmail },
            }));
            // Update cache with better data
            setCachedToken({
              accessToken: tokenData.accessToken,
              expiresAt: Date.now() + (tokenData.expiresIn || 3600) * 1000,
              userEmail: betterEmail,
              userName: betterName,
            });
          }
        })
        .catch(() => {}); // Silently ignore — context data is good enough

      console.log("[Teams Auth] Authentication successful for:", contextName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Teams Auth] Authentication failed:", errorMessage);

      // Notify Teams that the app failed to load (fire-and-forget)
      import("@/lib/teams-sdk").then(sdk => sdk.notifyAppLoadFailed(errorMessage)).catch(() => {});

      setState({
        isInTeams: true,
        isLoading: false,
        error: errorMessage,
        accessToken: null,
        user: null,
      });
    }
  }, []);

  useEffect(() => {
    // Check if we're in Teams context
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const inTeams = params.get("inTeams") === "true";

    if (!inTeams) {
      // Not in Teams - use normal NextAuth session
      setState({
        isInTeams: false,
        isLoading: status === "loading",
        error: null,
        accessToken: session?.accessToken || null,
        user: null,
      });
      return;
    }

    // In Teams - perform SSO authentication
    performTeamsAuth();
  }, [session?.accessToken, status, performTeamsAuth]);

  // Check URL parameter to determine if we're in Teams context
  // This is needed because state.isInTeams is set async in useEffect
  const urlIndicatesTeams = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("inTeams") === "true";

  // When not in Teams (both state and URL), return NextAuth session state
  if (!state.isInTeams && !urlIndicatesTeams && status !== "loading") {
    return {
      isInTeams: false,
      isLoading: false,
      error: session?.error || null,
      accessToken: session?.accessToken || null,
      user: null,
    };
  }

  return state;
}

/**
 * Check if the current page is loaded inside Teams
 * Can be called before React is hydrated
 */
export function checkIsInTeams(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("inTeams") === "true";
}
