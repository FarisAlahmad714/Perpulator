import { auth } from '@/auth';
import { db } from '@/lib/db';
import { apiKeys, apiRequestLogs } from '@/lib/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify this key belongs to the authenticated user
  const [key] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, params.id), eq(apiKeys.userId, session.user.id)));

  if (!key) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Requests in the current hour (for rate limit indicator)
  const [hourRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(apiRequestLogs)
    .where(and(eq(apiRequestLogs.keyId, params.id), gte(apiRequestLogs.createdAt, oneHourAgo)));

  // Daily usage for the last 7 days
  const dailyRows = await db
    .select({
      date: sql<string>`to_char(DATE("createdAt"), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(apiRequestLogs)
    .where(and(eq(apiRequestLogs.keyId, params.id), gte(apiRequestLogs.createdAt, sevenDaysAgo)))
    .groupBy(sql`DATE("createdAt")`)
    .orderBy(sql`DATE("createdAt") ASC`);

  // Fill in missing days with 0 so the chart always shows 7 bars
  const dailyMap = new Map(dailyRows.map((r) => [r.date, r.count]));
  const dailyUsage: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyUsage.push({ date: key, count: dailyMap.get(key) ?? 0 });
  }

  return Response.json({
    hourlyUsed: hourRow?.count ?? 0,
    hourlyLimit: 100,
    dailyUsage,
  });
}
