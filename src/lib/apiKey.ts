import { db } from '@/lib/db';
import { apiKeys, apiRequestLogs } from '@/lib/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

const PREFIX = 'perp_';

// Rate limit: max requests per window
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Generate a cryptographically random API key — format: perp_<64 hex chars> */
export function generateRawKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${PREFIX}${hex}`;
}

/** SHA-256 hash a key for storage — raw keys are never persisted */
export async function hashKey(rawKey: string): Promise<string> {
  const data = new TextEncoder().encode(rawKey);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate an API key from a request.
 * Returns { userId, keyId } if valid, null if invalid, 'rate_limited' if over quota.
 */
export async function validateApiKey(
  rawKey: string
): Promise<{ userId: string; keyId: string } | null | 'rate_limited'> {
  if (!rawKey?.startsWith(PREFIX)) return null;

  const hash = await hashKey(rawKey);

  const [row] = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys)
    .where(eq(apiKeys.key, hash))
    .limit(1);

  if (!row) return null;

  // Rate limit check — count requests in the last hour
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS);
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(apiRequestLogs)
    .where(and(eq(apiRequestLogs.keyId, row.id), gte(apiRequestLogs.createdAt, windowStart)));

  if ((countRow?.count ?? 0) >= RATE_LIMIT) return 'rate_limited';

  return { userId: row.userId, keyId: row.id };
}

/**
 * Log a completed API request and update usage counters.
 * Call this after the response is determined (fire-and-forget).
 */
export function logApiRequest(
  keyId: string,
  userId: string,
  endpoint: string,
  status: number
): void {
  Promise.all([
    db.insert(apiRequestLogs).values({ keyId, userId, endpoint, status }).execute(),
    db
      .update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        totalRequests: sql`${apiKeys.totalRequests} + 1`,
      })
      .where(eq(apiKeys.id, keyId))
      .execute(),
  ]).catch(() => {});
}

/** Extract bearer token from Authorization header */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}
