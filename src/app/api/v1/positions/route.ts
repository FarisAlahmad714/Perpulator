import { validateApiKey, extractBearerToken } from '@/lib/apiKey';
import { db } from '@/lib/db';
import { positions } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { Position } from '@/types/position';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: Request) {
  const headers = corsHeaders();

  const rawKey = extractBearerToken(req);
  if (!rawKey) {
    return Response.json(
      { error: 'Missing API key. Set Authorization: Bearer perp_...' },
      { status: 401, headers }
    );
  }
  let userId: string | null;
  try {
    userId = await validateApiKey(rawKey);
  } catch {
    return Response.json({ error: 'Service temporarily unavailable' }, { status: 503, headers });
  }
  if (!userId) {
    return Response.json({ error: 'Invalid or expired API key' }, { status: 401, headers });
  }

  const rows = await db
    .select()
    .from(positions)
    .where(eq(positions.userId, userId));

  const result = rows.map((row) => {
    const data = row.data as Position;
    return {
      ...data,
      timestamp: new Date(data.timestamp),
      savedAt: new Date(data.savedAt),
    };
  });

  return Response.json(result, { headers });
}
