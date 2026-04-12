import { NextRequest, NextResponse } from 'next/server';

interface CacheEntry {
  data: Record<string, { price: number; change24h: number }>;
  timestamp: number;
}

const priceCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 15000; // 15 seconds

// Twelve Data uses "BTC/USD" format
function toTDSymbol(s: string) {
  return `${s.toUpperCase()}/USD`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawSymbols = searchParams.get('symbols')?.split(',').map((s) => s.toUpperCase().trim()) ?? [];

  if (!rawSymbols.length) {
    return NextResponse.json({ error: 'No symbols provided' }, { status: 400 });
  }

  const cacheKey = [...rawSymbols].sort().join(',');
  const now = Date.now();

  const cached = priceCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data);
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'TWELVE_DATA_API_KEY not configured' }, { status: 500 });
  }

  try {
    const tdSymbols = rawSymbols.map(toTDSymbol).join(',');
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(tdSymbols)}&apikey=${apiKey}`;

    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`);

    const raw = await res.json();

    // Single symbol returns object directly; multiple returns { "BTC/USD": {...}, ... }
    const entries = rawSymbols.length === 1
      ? { [toTDSymbol(rawSymbols[0])]: raw }
      : raw;

    const result: Record<string, { price: number; change24h: number }> = {};

    for (const symbol of rawSymbols) {
      const entry = entries[toTDSymbol(symbol)];
      if (entry && entry.close && entry.status !== 'error') {
        result[symbol] = {
          price: parseFloat(entry.close),
          change24h: parseFloat(entry.percent_change ?? '0'),
        };
      }
    }

    // Return cached data as fallback if API gave no usable data
    if (Object.keys(result).length === 0 && cached) {
      return NextResponse.json(cached.data);
    }

    priceCache.set(cacheKey, { data: result, timestamp: now });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Twelve Data fetch error:', err.message);
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
