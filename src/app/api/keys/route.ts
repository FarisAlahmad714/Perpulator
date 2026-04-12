import { auth } from '@/auth';
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { generateRawKey, hashKey } from '@/lib/apiKey';

const MAX_KEYS_PER_USER = 5;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      totalRequests: apiKeys.totalRequests,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id));

  return Response.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim().slice(0, 64)
      : 'Default';

  // Enforce per-user key limit
  const existing = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id));

  if (existing.length >= MAX_KEYS_PER_USER) {
    return Response.json(
      { error: `Maximum ${MAX_KEYS_PER_USER} API keys allowed per account. Delete one first.` },
      { status: 429 }
    );
  }

  const rawKey = generateRawKey();
  const hash = await hashKey(rawKey);

  const [created] = await db
    .insert(apiKeys)
    .values({ userId: session.user.id, key: hash, name })
    .returning({ id: apiKeys.id, name: apiKeys.name, createdAt: apiKeys.createdAt });

  // Return the raw key exactly once — it cannot be retrieved again
  return Response.json({ ...created, key: rawKey }, { status: 201 });
}
