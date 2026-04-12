import { db } from '@/lib/db';
import { apiKeys } from '@/lib/schema';
import { eq } from 'drizzle-orm';

const PREFIX = 'perp_';

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
 * Returns the userId if valid, null otherwise.
 * Updates lastUsedAt fire-and-forget on success.
 */
export async function validateApiKey(rawKey: string): Promise<string | null> {
  if (!rawKey?.startsWith(PREFIX)) return null;

  const hash = await hashKey(rawKey);

  const [row] = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys)
    .where(eq(apiKeys.key, hash))
    .limit(1);

  if (!row) return null;

  // Fire-and-forget — non-critical audit trail
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .execute()
    .catch(() => {});

  return row.userId;
}

/** Extract bearer token from Authorization header */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}
