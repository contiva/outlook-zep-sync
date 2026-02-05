"use client";

/**
 * Custom hook for Teams SSO authentication
 *
 * Handles the Teams-specific authentication flow when the app
 * is running inside Microsoft Teams.
 */

import { useState, useEffect, useCallback } from "react";
import { signIn, useSession } from "next-auth/react";

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
    // Dynamic import to avoid SSR issues
    const teamsSDK = await import("@/lib/teams-sdk");

    try {
      // Initialize Teams SDK
      await teamsSDK.initializeTeamsSDK();

      // Get context to verify we're in Teams
      const context = await teamsSDK.getTeamsContext();
      if (!context) {
        throw new Error("Could not get Teams context");
      }

      console.log("[Teams Auth] Context obtained:", context.user?.userPrincipalName);

      // Get SSO token from Teams
      const teamsToken = await teamsSDK.getTeamsSSOToken();
      if (!teamsToken) {
        throw new Error("Could not get Teams SSO token");
      }

      // Exchange Teams token for app access token via OBO flow
      const response = await fetch("/api/auth/teams-sso", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamsToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Token exchange failed");
      }

      const tokenData = await response.json();

      // Notify Teams that the app loaded successfully
      await teamsSDK.notifyAppLoaded();

      // Extract user info from Teams context
      const userName = context.user?.displayName || context.user?.userPrincipalName?.split("@")[0] || null;
      const userEmail = context.user?.userPrincipalName || null;

      setState({
        isInTeams: true,
        isLoading: false,
        error: null,
        accessToken: tokenData.accessToken,
        user: {
          name: userName,
          email: userEmail,
        },
      });

      console.log("[Teams Auth] Authentication successful for:", userName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Teams Auth] Authentication failed:", errorMessage);

      // Notify Teams that the app failed to load
      const teamsSDK = await import("@/lib/teams-sdk");
      await teamsSDK.notifyAppLoadFailed(errorMessage);

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

  // When not in Teams, return NextAuth session state
  if (!state.isInTeams && status !== "loading") {
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
