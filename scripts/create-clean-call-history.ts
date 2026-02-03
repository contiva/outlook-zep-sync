/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Create Clean Call History (Optimized)
 *
 * - Parallel API requests für bessere Performance
 * - Nur Calls > 5 Minuten
 * - Ohne geplante Meetings
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const TENANT_ID = process.env.AZURE_AD_TENANT_ID!;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID!;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET!;

const TARGET_USER_ID = '5e7401e5-4606-41ca-a590-6f176a2af110';
const TARGET_USER_EMAIL = 'robert.fels@contiva.com';

const START_DATE = '2026-01-05';
const END_DATE = '2026-02-02';
const MIN_DURATION_SECONDS = 300; // 5 Minuten
const BATCH_SIZE = 20; // Parallel requests

// ============================================================================
// Types
// ============================================================================

interface CleanCall {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: 'Phone' | 'Video' | 'Teams' | 'ScreenShare';
  direction: 'incoming' | 'outgoing';
  participants: string[];
  organizer: string;
}

// ============================================================================
// Helpers
// ============================================================================

let phoneToUser: Map<string, string>;
let userIdToUser: Map<string, string>;

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[^\d]/g, '');
  normalized = normalized.replace(/^49(0)/, '49');
  if (normalized.startsWith('00')) normalized = normalized.substring(2);
  return normalized;
}

function phoneVariants(phone: string): string[] {
  const normalized = normalizePhone(phone);
  const variants = [normalized, '+' + normalized];
  if (normalized.startsWith('49')) {
    variants.push(normalized.substring(2), '0' + normalized.substring(2));
  }
  return variants;
}

function resolveName(identity: any): string {
  if (!identity) return 'Unknown';

  if (identity.user) {
    if (identity.user.displayName) return identity.user.displayName;
    const resolved = userIdToUser.get(identity.user.id);
    if (resolved) return resolved;
    return identity.user.userPrincipalName || `User: ${identity.user.id}`;
  }

  if (identity.phone) {
    const phoneId = identity.phone.id;
    for (const v of phoneVariants(phoneId)) {
      const name = phoneToUser.get(v);
      if (name) return `${name} (${phoneId})`;
    }
    return phoneId;
  }

  if (identity.guest) return identity.guest.displayName || 'Guest';
  if (identity.application) return identity.application.displayName || 'App';
  return 'Unknown';
}

function resolveEndpoint(endpoint: any): string {
  if (!endpoint) return 'Unknown';
  if (endpoint.associatedIdentity) {
    const ai = endpoint.associatedIdentity;
    if (ai.id?.startsWith('+')) {
      for (const v of phoneVariants(ai.id)) {
        const name = phoneToUser.get(v);
        if (name) return `${name} (${ai.id})`;
      }
      return ai.id;
    }
    if (ai.displayName) return ai.displayName;
    const resolved = userIdToUser.get(ai.id);
    if (resolved) return resolved;
    return ai.userPrincipalName || ai.id;
  }
  return resolveName(endpoint.identity);
}

function normalizeJoinUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/19[:%]meeting_([a-zA-Z0-9-]+)/i);
  return match ? match[1].toLowerCase() : url.toLowerCase();
}

function determineCallType(modalities: string[]): CleanCall['type'] {
  if (modalities.includes('videoBasedScreenSharing')) return 'ScreenShare';
  if (modalities.includes('video')) return 'Video';
  if (modalities.includes('audio')) return 'Phone';
  return 'Teams';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

async function getToken(): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  return (await res.json()).access_token;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const startMs = Date.now();
  console.log('📞 Clean Call History Generator (Optimized)\n');
  console.log(`User: ${TARGET_USER_EMAIL}`);
  console.log(`Range: ${START_DATE} - ${END_DATE} | Min: ${MIN_DURATION_SECONDS / 60} min\n`);

  const token = await getToken();

  // 1. Build user mappings (parallel-optimiert)
  console.log('👥 Loading users...');
  phoneToUser = new Map();
  userIdToUser = new Map();

  let userUrl: string | null = 'https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mobilePhone,businessPhones&$top=999';
  while (userUrl) {
    const res = await fetch(userUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) break;
    const data = await res.json();
    for (const u of data.value) {
      userIdToUser.set(u.id, u.displayName);
      if (u.mobilePhone) phoneVariants(u.mobilePhone).forEach(v => phoneToUser.set(v, u.displayName));
      if (u.businessPhones) u.businessPhones.forEach((p: string) => phoneVariants(p).forEach(v => phoneToUser.set(v, u.displayName)));
    }
    userUrl = data['@odata.nextLink'] || null;
  }
  console.log(`   ✓ ${userIdToUser.size} users\n`);

  // 2. Fetch scheduled meeting URLs
  console.log('📅 Loading calendar...');
  const scheduledUrls = new Set<string>();
  let calUrl: string | null = `https://graph.microsoft.com/v1.0/users/${TARGET_USER_ID}/calendarView?startDateTime=${START_DATE}T00:00:00Z&endDateTime=${END_DATE}T23:59:59Z&$select=isOnlineMeeting,onlineMeeting&$top=250`;

  while (calUrl) {
    const res = await fetch(calUrl, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="Europe/Berlin"' } });
    if (!res.ok) break;
    const data = await res.json();
    for (const e of data.value) {
      if (e.isOnlineMeeting && e.onlineMeeting?.joinUrl) {
        const norm = normalizeJoinUrl(e.onlineMeeting.joinUrl);
        if (norm) scheduledUrls.add(norm);
      }
    }
    calUrl = data['@odata.nextLink'] || null;
  }
  console.log(`   ✓ ${scheduledUrls.size} scheduled meetings\n`);

  // 3. Fetch call record IDs
  console.log('📞 Fetching call records...');
  const callIds: string[] = [];
  let callUrl: string | null = `https://graph.microsoft.com/v1.0/communications/callRecords?$filter=startDateTime ge ${START_DATE}T00:00:00Z and startDateTime le ${END_DATE}T23:59:59Z`;

  while (callUrl) {
    const res = await fetch(callUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) break;
    const data = await res.json();
    callIds.push(...data.value.map((c: any) => c.id));
    callUrl = data['@odata.nextLink'] || null;
  }
  console.log(`   ✓ ${callIds.length} records found\n`);

  // 4. Fetch details in parallel batches
  console.log('🔍 Processing (parallel)...');
  const cleanCalls: CleanCall[] = [];

  for (let i = 0; i < callIds.length; i += BATCH_SIZE) {
    const batch = callIds.slice(i, i + BATCH_SIZE);
    process.stdout.write(`\r   ${Math.min(i + BATCH_SIZE, callIds.length)}/${callIds.length}...`);

    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          const res = await fetch(
            `https://graph.microsoft.com/v1.0/communications/callRecords/${id}?$expand=sessions($select=caller,callee)`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return res.ok ? await res.json() : null;
        } catch {
          return null;
        }
      })
    );

    for (const details of results) {
      if (!details) continue;

      // Check Robert's participation
      const robertIn = (details.participants || []).some((p: any) =>
        p.user?.id === TARGET_USER_ID || p.user?.displayName?.toLowerCase().includes('robert fels')
      );
      if (!robertIn) continue;

      // Skip scheduled meetings
      const normUrl = normalizeJoinUrl(details.joinWebUrl);
      if (details.type === 'groupCall' && normUrl && scheduledUrls.has(normUrl)) continue;

      // Duration check
      const start = new Date(details.startDateTime);
      const end = new Date(details.endDateTime);
      const durationSec = Math.round((end.getTime() - start.getTime()) / 1000);
      if (durationSec < MIN_DURATION_SECONDS) continue;

      // Extract participants
      const participants = new Set<string>();
      for (const p of details.participants || []) {
        const name = resolveName(p);
        if (name !== 'Unknown') participants.add(name);
      }
      if (details.sessions?.[0]) {
        const caller = resolveEndpoint(details.sessions[0].caller);
        const callee = resolveEndpoint(details.sessions[0].callee);
        if (caller !== 'Unknown') participants.add(caller);
        if (callee !== 'Unknown') participants.add(callee);
      }

      // Organizer & direction
      const orgIdentity = details.organizer_v2?.identity || details.organizer;
      const organizer = resolveName(orgIdentity);
      const isOrganizer = orgIdentity?.user?.id === TARGET_USER_ID;

      cleanCalls.push({
        date: formatDate(details.startDateTime),
        startTime: formatTime(details.startDateTime),
        endTime: formatTime(details.endDateTime),
        durationMinutes: Math.round(durationSec / 60),
        type: determineCallType(details.modalities || []),
        direction: isOrganizer ? 'outgoing' : 'incoming',
        participants: Array.from(participants),
        organizer,
      });
    }
  }

  // Sort by date
  cleanCalls.sort((a, b) => {
    const dA = new Date(a.date.split('.').reverse().join('-') + 'T' + a.startTime);
    const dB = new Date(b.date.split('.').reverse().join('-') + 'T' + b.startTime);
    return dA.getTime() - dB.getTime();
  });

  console.log('\n');

  // Stats
  const totalMin = cleanCalls.reduce((s, c) => s + c.durationMinutes, 0);
  console.log('═'.repeat(60));
  console.log(`📊 ${cleanCalls.length} Calls | ${Math.floor(totalMin / 60)}h ${totalMin % 60}m total`);
  console.log('═'.repeat(60));

  // Display
  for (const c of cleanCalls) {
    const arrow = c.direction === 'outgoing' ? '📤' : '📥';
    const others = c.participants.filter(p => !p.includes('Robert Fels')).join(', ') || c.organizer;
    console.log(`${arrow} ${c.date} ${c.startTime}-${c.endTime} (${c.durationMinutes}m) [${c.type}]`);
    console.log(`   ${others}`);
  }

  // Export
  const exportPath = path.resolve(__dirname, '../call-history-clean.json');
  fs.writeFileSync(exportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    dateRange: { start: START_DATE, end: END_DATE },
    minDurationMinutes: MIN_DURATION_SECONDS / 60,
    totalCalls: cleanCalls.length,
    totalDurationMinutes: totalMin,
    calls: cleanCalls,
  }, null, 2));

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log(`\n✅ Exported | ${elapsed}s`);
}

main().catch(console.error);
