// Sync History Management
// Stores mapping between Outlook Event IDs and ZEP Attendance IDs in localStorage

const STORAGE_KEY = 'outlook-zep-sync-history';
const MAX_RECORDS = 500;
const RETENTION_DAYS = 90;

export interface SyncRecord {
  outlookEventId: string;
  zepAttendanceId: number;
  subject: string;
  date: string; // ISO date string
  syncedAt: string; // ISO timestamp
}

interface SyncHistoryData {
  records: SyncRecord[];
  lastUpdated: string;
}

// Get all sync records from localStorage
export function getAllSyncRecords(): SyncRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const data: SyncHistoryData = JSON.parse(stored);

    // Filter out records older than retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    return data.records.filter((record) => {
      const syncedAt = new Date(record.syncedAt);
      return syncedAt >= cutoffDate;
    });
  } catch {
    return [];
  }
}

// Get a single sync record by Outlook Event ID
export function getSyncRecord(outlookEventId: string): SyncRecord | null {
  const records = getAllSyncRecords();
  return records.find((r) => r.outlookEventId === outlookEventId) || null;
}

// Get ZEP Attendance ID for an Outlook Event
export function getZepIdForOutlookEvent(outlookEventId: string): number | null {
  const record = getSyncRecord(outlookEventId);
  return record?.zepAttendanceId || null;
}

// Save new sync records (appends to existing)
export function saveSyncRecords(newRecords: SyncRecord[]): void {
  if (typeof window === 'undefined') return;

  try {
    const existingRecords = getAllSyncRecords();

    // Merge: new records override existing ones with same outlookEventId
    const recordMap = new Map<string, SyncRecord>();

    existingRecords.forEach((r) => recordMap.set(r.outlookEventId, r));
    newRecords.forEach((r) => recordMap.set(r.outlookEventId, r));

    // Convert back to array and sort by syncedAt (newest first)
    let allRecords = Array.from(recordMap.values());
    allRecords.sort((a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime());

    // Limit to MAX_RECORDS (FIFO - keep newest)
    if (allRecords.length > MAX_RECORDS) {
      allRecords = allRecords.slice(0, MAX_RECORDS);
    }

    const data: SyncHistoryData = {
      records: allRecords,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save sync history:', error);
  }
}

// Clear all sync history
export function clearSyncHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// Generate URL to view attendance in ZEP
export function getZepAttendanceUrl(zepAttendanceId: number): string {
  // ZEP attendance detail URL pattern
  return `https://www.zep-online.de/zepcontiva/next/projektzeit/${zepAttendanceId}`;
}

// Check if an Outlook event has been synced (by ID)
export function isEventSynced(outlookEventId: string): boolean {
  return getSyncRecord(outlookEventId) !== null;
}

// Get sync statistics
export function getSyncStats(): { totalSynced: number; lastSync: string | null } {
  const records = getAllSyncRecords();
  return {
    totalSynced: records.length,
    lastSync: records.length > 0 ? records[0].syncedAt : null,
  };
}
