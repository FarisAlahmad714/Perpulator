import { validateApiKey, extractBearerToken, logApiRequest } from '@/lib/apiKey';
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

  let result: Awaited<ReturnType<typeof validateApiKey>>;
  try {
    result = await validateApiKey(rawKey);
  } catch {
    return Response.json({ error: 'Service temporarily unavailable' }, { status: 503, headers });
  }

  if (result === null) {
    return Response.json({ error: 'Invalid or expired API key' }, { status: 401, headers });
  }
  if (result === 'rate_limited') {
    return Response.json(
      { error: 'Rate limit exceeded. Max 100 requests per hour per key.' },
      { status: 429, headers }
    );
  }

  const { userId, keyId } = result;

  const rows = await db.select().from(positions).where(eq(positions.userId, userId));

  const data = rows.map((row) => {
    const pos = row.data as Position;
    return {
      ...pos,
      timestamp: new Date(pos.timestamp),
      savedAt: new Date(pos.savedAt),
    };
  });

  logApiRequest(keyId, userId, '/api/v1/positions', 200);
  return Response.json(data, { headers });
}
