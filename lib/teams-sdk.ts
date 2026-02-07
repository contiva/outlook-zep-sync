/**
 * Microsoft Teams JavaScript SDK Helper
 *
 * Handles Teams SDK initialization and SSO token retrieval
 * for embedded Teams Tab applications.
 */

import * as microsoftTeams from '@microsoft/teams-js';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Check if the current context is within Microsoft Teams
 */
export function isInTeams(): boolean {
  if (typeof window === 'undefined') return false;

  // Check URL parameter (set by Teams when loading the tab)
  const params = new URLSearchParams(window.location.search);
  if (params.get('inTeams') === 'true') return true;

  // Check if Teams SDK context is available
  // This is a more reliable check once SDK is initialized
  return false;
}

/**
 * Initialize the Teams SDK
 * Must be called before any other Teams SDK operations
 */
export async function initializeTeamsSDK(): Promise<void> {
  if (isInitialized) return;

  // Prevent multiple initialization attempts
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await microsoftTeams.app.initialize();
      isInitialized = true;
      console.log('[Teams SDK] Initialized successfully');
    } catch (error) {
      console.error('[Teams SDK] Initialization failed:', error);
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Get the Teams context (user info, tenant, etc.)
 */
export async function getTeamsContext(): Promise<microsoftTeams.app.Context | null> {
  if (!isInitialized) {
    await initializeTeamsSDK();
  }

  try {
    const context = await microsoftTeams.app.getContext();
    return context;
  } catch (error) {
    console.error('[Teams SDK] Failed to get context:', error);
    return null;
  }
}

/**
 * Get SSO token from Teams
 * This token can be exchanged for a full access token via OBO flow
 */
export async function getTeamsSSOToken(): Promise<string | null> {
  if (!isInitialized) {
    await initializeTeamsSDK();
  }

  try {
    const result = await microsoftTeams.authentication.getAuthToken();
    console.log('[Teams SDK] SSO token obtained');
    return result;
  } catch (error) {
    console.error('[Teams SDK] Failed to get SSO token:', error);
    return null;
  }
}

/**
 * Notify Teams that the app has successfully loaded
 */
export async function notifyAppLoaded(): Promise<void> {
  if (!isInitialized) {
    await initializeTeamsSDK();
  }

  try {
    microsoftTeams.app.notifySuccess();
    console.log('[Teams SDK] App loaded notification sent');
  } catch (error) {
    console.error('[Teams SDK] Failed to notify app loaded:', error);
  }
}

/**
 * Notify Teams that the app failed to load
 */
export async function notifyAppLoadFailed(reason: string): Promise<void> {
  if (!isInitialized) {
    await initializeTeamsSDK();
  }

  try {
    microsoftTeams.app.notifyFailure({
      reason: microsoftTeams.app.FailedReason.Other,
      message: reason,
    });
    console.log('[Teams SDK] App failure notification sent:', reason);
  } catch (error) {
    console.error('[Teams SDK] Failed to notify app failure:', error);
  }
}
