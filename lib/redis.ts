import { Redis } from '@upstash/redis';

// Redis client singleton using Vercel KV environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export { redis };

// TTL: 180 days in seconds
const SYNC_MAPPING_TTL = 180 * 24 * 60 * 60;

export interface RedisSyncMapping {
  outlookEventId: string;
  zepAttendanceId: number;
  subject: string;
  date: string;
  projectId: number;
  taskId: number;
  activityId: string;
  syncedAt: string;
}

function getSyncKey(userId: string, outlookEventId: string): string {
  return `sync:${userId}:${outlookEventId}`;
}

/**
 * Save a single sync mapping to Redis.
 * Key format: sync:{userId}:{outlookEventId}
 * TTL: 180 days
 */
export async function saveSyncMapping(userId: string, mapping: RedisSyncMapping): Promise<void> {
  const key = getSyncKey(userId, mapping.outlookEventId);
  await redis.set(key, mapping, { ex: SYNC_MAPPING_TTL });
}

/**
 * Get a single sync mapping by userId and outlookEventId.
 * @upstash/redis returns parsed JSON directly, no need for JSON.parse.
 */
export async function getSyncMapping(
  userId: string,
  outlookEventId: string,
): Promise<RedisSyncMapping | null> {
  const key = getSyncKey(userId, outlookEventId);
  const data = await redis.get<RedisSyncMapping>(key);
  return data ?? null;
}

/**
 * Get all sync mappings for a user using SCAN with pattern matching.
 * Pattern: sync:{userId}:*
 */
export async function getSyncMappingsByUser(userId: string): Promise<RedisSyncMapping[]> {
  const pattern = `sync:${userId}:*`;
  const mappings: RedisSyncMapping[] = [];
  let cursor = '0';

  do {
    const result = await redis.scan(cursor, {
      match: pattern,
      count: 100,
    });
    const nextCursor = String(result[0]);
    const keys = result[1] as string[];
    cursor = nextCursor;

    if (keys.length > 0) {
      const values = await Promise.all(keys.map((key) => redis.get<RedisSyncMapping>(key)));
      for (const value of values) {
        if (value) {
          mappings.push(value);
        }
      }
    }
  } while (cursor !== '0');

  return mappings;
}

/**
 * Delete a single sync mapping.
 */
export async function deleteSyncMapping(userId: string, outlookEventId: string): Promise<void> {
  const key = getSyncKey(userId, outlookEventId);
  await redis.del(key);
}

/**
 * Save multiple sync mappings at once using Promise.all.
 */
export async function batchSaveSyncMappings(
  userId: string,
  mappings: RedisSyncMapping[],
): Promise<void> {
  await Promise.all(mappings.map((mapping) => saveSyncMapping(userId, mapping)));
}

// --- Notification user registration ---

const NOTIFICATION_USERS_KEY = 'notification-users';

/**
 * Register a user for notifications (stores azureId → email mapping).
 */
export async function registerUserForNotifications(azureId: string, email: string): Promise<void> {
  await redis.hset(NOTIFICATION_USERS_KEY, { [azureId]: email });
}

/**
 * Get all registered users for notifications.
 * Returns an array of { azureId, email } objects.
 */
export async function getRegisteredUsers(): Promise<{ azureId: string; email: string }[]> {
  const data = await redis.hgetall<Record<string, string>>(NOTIFICATION_USERS_KEY);
  if (!data) return [];
  return Object.entries(data).map(([azureId, email]) => ({ azureId, email }));
}
