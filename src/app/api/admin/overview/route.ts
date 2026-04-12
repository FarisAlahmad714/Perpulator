import { auth } from '@/auth';
import { db } from '@/lib/db';
import { users, apiKeys, apiRequestLogs } from '@/lib/schema';
import { eq, sql, gte, desc } from 'drizzle-orm';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'farisalahmad714@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase());

function isAdmin(email: string | null | undefined) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // All users who have at least one API key
  const allKeys = await db
    .select({
      keyId: apiKeys.id,
      keyName: apiKeys.name,
      keyCreatedAt: apiKeys.createdAt,
      keyLastUsedAt: apiKeys.lastUsedAt,
      keyTotalRequests: apiKeys.totalRequests,
      userId: users.id,
      userEmail: users.email,
      userName: users.name,
      userImage: users.image,
    })
    .from(apiKeys)
    .leftJoin(users, eq(apiKeys.userId, users.id))
    .orderBy(desc(apiKeys.totalRequests));

  // Global totals
  const [totalRequestsRow] = await db
    .select({ total: sql<number>`sum(${apiKeys.totalRequests})::int` })
    .from(apiKeys);

  const [requestsTodayRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(apiRequestLogs)
    .where(gte(apiRequestLogs.createdAt, oneDayAgo));

  // Daily usage last 7 days (global)
  const dailyRows = await db
    .select({
      date: sql<string>`to_char(DATE("createdAt"), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(apiRequestLogs)
    .where(gte(apiRequestLogs.createdAt, sevenDaysAgo))
    .groupBy(sql`DATE("createdAt")`)
    .orderBy(sql`DATE("createdAt") ASC`);

  const dailyMap = new Map(dailyRows.map((r) => [r.date, r.count]));
  const dailyUsage: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyUsage.push({ date: key, count: dailyMap.get(key) ?? 0 });
  }

  // Recent activity (last 30 log entries)
  const recentActivity = await db
    .select({
      id: apiRequestLogs.id,
      endpoint: apiRequestLogs.endpoint,
      status: apiRequestLogs.status,
      createdAt: apiRequestLogs.createdAt,
      keyId: apiRequestLogs.keyId,
      userEmail: users.email,
    })
    .from(apiRequestLogs)
    .leftJoin(users, eq(apiRequestLogs.userId, users.id))
    .orderBy(desc(apiRequestLogs.createdAt))
    .limit(30);

  // Group keys by user
  const userMap = new Map<string, {
    userId: string;
    email: string | null;
    name: string | null;
    image: string | null;
    keys: typeof allKeys;
  }>();

  for (const row of allKeys) {
    const uid = row.userId ?? 'unknown';
    if (!userMap.has(uid)) {
      userMap.set(uid, {
        userId: uid,
        email: row.userEmail,
        name: row.userName,
        image: row.userImage,
        keys: [],
      });
    }
    userMap.get(uid)!.keys.push(row);
  }

  return Response.json({
    stats: {
      totalUsers: userMap.size,
      totalKeys: allKeys.length,
      totalRequests: totalRequestsRow?.total ?? 0,
      requestsToday: requestsTodayRow?.count ?? 0,
      dailyUsage,
    },
    users: Array.from(userMap.values()),
    recentActivity,
  });
}
