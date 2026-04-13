import { validateApiKey, extractBearerToken, logApiRequest, extractRequestMeta } from '@/lib/apiKey';
import { db } from '@/lib/db';
import { positions } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
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

  if (result === null) return Response.json({ error: 'Invalid or expired API key' }, { status: 401, headers });
  if (result === 'rate_limited') {
    return Response.json({ error: 'Rate limit exceeded. Max 100 requests per hour per key.' }, { status: 429, headers });
  }

  const { userId, keyId } = result;
  const meta = extractRequestMeta(req);
  const { id } = params;

  const deleted = await db
    .delete(positions)
    .where(and(eq(positions.id, id), eq(positions.userId, userId)))
    .returning({ id: positions.id });

  if (deleted.length === 0) {
    logApiRequest(keyId, userId, `/api/v1/positions/${id}`, 404, meta);
    return Response.json({ error: 'Position not found' }, { status: 404, headers });
  }

  logApiRequest(keyId, userId, `/api/v1/positions/${id}`, 200, meta);
  return Response.json({ deleted: id }, { headers });
}
