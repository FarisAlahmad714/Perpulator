import { validateApiKey, extractBearerToken, logApiRequest } from '@/lib/apiKey';

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

  if (result === null) return Response.json({ error: 'Invalid or expired API key' }, { status: 401, headers });
  if (result === 'rate_limited') {
    return Response.json({ error: 'Rate limit exceeded. Max 100 requests per hour per key.' }, { status: 429, headers });
  }

  const { userId, keyId } = result;

  const { searchParams } = new URL(req.url);
  const rawSymbols = searchParams.get('symbols')?.split(',').map((s) => s.toUpperCase().trim()).filter(Boolean) ?? [];

  if (rawSymbols.length === 0) {
    logApiRequest(keyId, userId, '/api/v1/prices', 400);
    return Response.json({ error: 'Provide at least one symbol: ?symbols=BTC,ETH' }, { status: 400, headers });
  }

  if (rawSymbols.length > 10) {
    logApiRequest(keyId, userId, '/api/v1/prices', 400);
    return Response.json({ error: 'Maximum 10 symbols per request' }, { status: 400, headers });
  }

  // Proxy through the internal prices endpoint (already has caching + Twelve Data logic)
  const internalUrl = new URL('/api/prices', new URL(req.url).origin);
  internalUrl.searchParams.set('symbols', rawSymbols.join(','));

  try {
    const res = await fetch(internalUrl.toString());
    if (!res.ok) throw new Error(`Internal price fetch failed: ${res.status}`);
    const data = await res.json();

    logApiRequest(keyId, userId, '/api/v1/prices', 200);
    return Response.json(data, { headers });
  } catch (err: any) {
    console.error('v1/prices error:', err.message);
    logApiRequest(keyId, userId, '/api/v1/prices', 502);
    return Response.json({ error: 'Failed to fetch prices' }, { status: 502, headers });
  }
}
