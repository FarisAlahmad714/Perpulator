'use client';

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import NavToggle from '@/components/NavToggle';
import AuthButton from '@/components/AuthButton';
import PriceIndicator from '@/components/PriceIndicator';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-neutral transition-colors shrink-0">
      {copied ? <Check size={12} className="text-profit" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(148,163,184,0.10)' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-xs text-gray-600 font-mono">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="px-4 py-4 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">{code}</pre>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    GET: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa' },
    POST: { bg: 'rgba(34,197,94,0.12)', text: '#4ade80' },
    DELETE: { bg: 'rgba(239,68,68,0.12)', text: '#f87171' },
  };
  const c = colors[method] ?? colors.GET;
  return (
    <span className="shrink-0 text-xs font-700 font-mono px-2 py-0.5 rounded" style={{ backgroundColor: c.bg, color: c.text }}>
      {method}
    </span>
  );
}

function StatusBadge({ code }: { code: number }) {
  const color = code < 300 ? '#4ade80' : code < 500 ? '#fbbf24' : '#f87171';
  return <span className="font-mono text-xs font-600" style={{ color }}>{code}</span>;
}

interface EndpointProps {
  method: string;
  path: string;
  desc: string;
  request?: { field: string; type: string; required: boolean; description: string }[];
  queryParams?: { field: string; type: string; required: boolean; description: string }[];
  responses: { code: number; description: string }[];
  example: { request?: string; response: string };
}

function Endpoint({ method, path, desc, request, queryParams, responses, example }: EndpointProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A0F2E', border: '1px solid rgba(148,163,184,0.10)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <MethodBadge method={method} />
        <code className="text-sm text-gray-200 font-mono flex-1">{path}</code>
        <span className="text-xs text-gray-500 hidden sm:block mr-4">{desc}</span>
        {open ? <ChevronDown size={14} className="text-gray-600 shrink-0" /> : <ChevronRight size={14} className="text-gray-600 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-white/5 px-5 py-5 space-y-6">
          <p className="text-sm text-gray-400">{desc}</p>

          {queryParams && (
            <div className="space-y-3">
              <p className="text-xs font-600 text-gray-500 uppercase tracking-widest">Query Parameters</p>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                {queryParams.map((p, i) => (
                  <div key={p.field} className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                    <code className="text-xs text-neutral font-mono w-28 shrink-0">{p.field}</code>
                    <span className="text-xs text-gray-600 font-mono w-16 shrink-0">{p.type}</span>
                    <span className={`text-xs shrink-0 ${p.required ? 'text-red-400' : 'text-gray-600'}`}>{p.required ? 'required' : 'optional'}</span>
                    <span className="text-xs text-gray-400">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {request && (
            <div className="space-y-3">
              <p className="text-xs font-600 text-gray-500 uppercase tracking-widest">Request Body</p>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                {request.map((p, i) => (
                  <div key={p.field} className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                    <code className="text-xs text-neutral font-mono w-28 shrink-0">{p.field}</code>
                    <span className="text-xs text-gray-600 font-mono w-16 shrink-0">{p.type}</span>
                    <span className={`text-xs shrink-0 ${p.required ? 'text-red-400' : 'text-gray-600'}`}>{p.required ? 'required' : 'optional'}</span>
                    <span className="text-xs text-gray-400">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-600 text-gray-500 uppercase tracking-widest">Responses</p>
            <div className="flex flex-wrap gap-3">
              {responses.map((r) => (
                <div key={r.code} className="flex items-center gap-2">
                  <StatusBadge code={r.code} />
                  <span className="text-xs text-gray-500">{r.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-600 text-gray-500 uppercase tracking-widest">Example</p>
            {example.request && <CodeBlock code={example.request} language="curl" />}
            <CodeBlock code={example.response} language="json" />
          </div>
        </div>
      )}
    </div>
  );
}

const BASE = 'https://perpulator.vercel.app/api/v1';

const ENDPOINTS: EndpointProps[] = [
  {
    method: 'POST',
    path: '/api/v1/calculate',
    desc: 'Calculate liquidation price, risk/reward, PnL, and notional size for a position.',
    request: [
      { field: 'symbol', type: 'string', required: true, description: 'Asset ticker — e.g. "BTC", "ETH", "SOL"' },
      { field: 'side', type: 'string', required: true, description: '"long" or "short"' },
      { field: 'entryPrice', type: 'number', required: true, description: 'Entry price in USD' },
      { field: 'positionSize', type: 'number', required: true, description: 'Margin in USD (not notional)' },
      { field: 'leverage', type: 'number', required: true, description: 'Leverage multiplier (1–125)' },
      { field: 'stopLoss', type: 'number', required: false, description: 'Stop loss price' },
      { field: 'takeProfit', type: 'number', required: false, description: 'Take profit price' },
      { field: 'currentPrice', type: 'number', required: false, description: 'Current market price — enables live PnL' },
    ],
    responses: [
      { code: 200, description: 'Calculation result' },
      { code: 401, description: 'Missing or invalid API key' },
      { code: 422, description: 'Validation error' },
      { code: 429, description: 'Rate limit exceeded (100 req/hr)' },
    ],
    example: {
      request: `curl -X POST ${BASE}/calculate \\
  -H "Authorization: Bearer $PERPULATOR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"BTC","side":"long","entryPrice":71000,"positionSize":1000,"leverage":10,"stopLoss":65000,"takeProfit":82000}'`,
      response: `{
  "symbol": "BTC",
  "side": "long",
  "entryPrice": 71000,
  "positionSize": 1000,
  "leverage": 10,
  "notionalSize": 10000,
  "liquidationPrice": 63900,
  "stopLoss": 65000,
  "takeProfit": 82000,
  "riskAmount": 845.07,
  "rewardAmount": 1549.30,
  "riskRewardRatio": 1.83,
  "currentPrice": null,
  "pnl": null,
  "pnlPercentage": null
}`,
    },
  },
  {
    method: 'GET',
    path: '/api/v1/positions',
    desc: 'Retrieve all saved positions for the authenticated account.',
    responses: [
      { code: 200, description: 'Array of saved positions' },
      { code: 401, description: 'Missing or invalid API key' },
      { code: 429, description: 'Rate limit exceeded' },
    ],
    example: {
      request: `curl ${BASE}/positions \\
  -H "Authorization: Bearer $PERPULATOR_API_KEY"`,
      response: `[
  {
    "id": "abc-123",
    "name": "BTC LONG @ $71,000",
    "symbol": "BTC",
    "sideEntry": "long",
    "entries": [{ "entryPrice": 71000, "size": 1000, "leverage": 10 }],
    "stopLoss": 65000,
    "takeProfit": 82000,
    "timestamp": "2025-04-12T00:00:00.000Z",
    "savedAt": "2025-04-12T00:00:00.000Z"
  }
]`,
    },
  },
  {
    method: 'POST',
    path: '/api/v1/positions',
    desc: 'Save a position to your account.',
    request: [
      { field: 'symbol', type: 'string', required: true, description: 'Asset ticker' },
      { field: 'side', type: 'string', required: true, description: '"long" or "short"' },
      { field: 'entryPrice', type: 'number', required: true, description: 'Entry price in USD' },
      { field: 'positionSize', type: 'number', required: true, description: 'Margin in USD' },
      { field: 'leverage', type: 'number', required: true, description: 'Leverage (1–125)' },
      { field: 'stopLoss', type: 'number', required: false, description: 'Stop loss price' },
      { field: 'takeProfit', type: 'number', required: false, description: 'Take profit price' },
      { field: 'name', type: 'string', required: false, description: 'Custom name for the position' },
    ],
    responses: [
      { code: 201, description: 'Position saved' },
      { code: 401, description: 'Missing or invalid API key' },
      { code: 422, description: 'Validation error' },
      { code: 429, description: 'Rate limit exceeded' },
    ],
    example: {
      request: `curl -X POST ${BASE}/positions \\
  -H "Authorization: Bearer $PERPULATOR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"BTC","side":"long","entryPrice":71000,"positionSize":1000,"leverage":10,"stopLoss":65000,"name":"My BTC trade"}'`,
      response: `{
  "id": "abc-123",
  "name": "My BTC trade",
  "symbol": "BTC",
  "sideEntry": "long",
  "savedAt": "2025-04-12T00:00:00.000Z"
}`,
    },
  },
  {
    method: 'DELETE',
    path: '/api/v1/positions/:id',
    desc: 'Delete a saved position by ID.',
    responses: [
      { code: 200, description: 'Position deleted' },
      { code: 401, description: 'Missing or invalid API key' },
      { code: 404, description: 'Position not found or not yours' },
      { code: 429, description: 'Rate limit exceeded' },
    ],
    example: {
      request: `curl -X DELETE ${BASE}/positions/abc-123 \\
  -H "Authorization: Bearer $PERPULATOR_API_KEY"`,
      response: `{ "deleted": "abc-123" }`,
    },
  },
  {
    method: 'GET',
    path: '/api/v1/prices',
    desc: 'Get live prices for up to 10 crypto assets. Data sourced from Twelve Data.',
    queryParams: [
      { field: 'symbols', type: 'string', required: true, description: 'Comma-separated tickers — e.g. BTC,ETH,SOL (max 10)' },
    ],
    responses: [
      { code: 200, description: 'Price data keyed by symbol' },
      { code: 400, description: 'Missing or too many symbols' },
      { code: 401, description: 'Missing or invalid API key' },
      { code: 429, description: 'Rate limit exceeded' },
    ],
    example: {
      request: `curl "${BASE}/prices?symbols=BTC,ETH" \\
  -H "Authorization: Bearer $PERPULATOR_API_KEY"`,
      response: `{
  "BTC": { "price": 71234.50, "change24h": 2.34 },
  "ETH": { "price": 3812.10, "change24h": -0.87 }
}`,
    },
  },
  {
    method: 'POST',
    path: '/api/v1/plan',
    desc: 'Generate a probability-based trading plan across 6 strategy tiers (Swing, Position, Grind, Balanced, Conviction, Moonshot).',
    request: [
      { field: 'capital', type: 'number', required: true, description: 'Account size in USD' },
      { field: 'riskPct', type: 'number', required: true, description: 'Risk per trade as % of capital (e.g. 2 for 2%)' },
      { field: 'targetProfit', type: 'number', required: true, description: 'Profit goal in USD' },
      { field: 'timeframeDays', type: 'number', required: true, description: 'Days to reach the goal' },
      { field: 'volatility24h', type: 'number', required: true, description: "Asset's 24h price change % (e.g. 3.5)" },
    ],
    responses: [
      { code: 200, description: '6 strategy tiers with trades needed, leverage, EV, and realism rating' },
      { code: 401, description: 'Missing or invalid API key' },
      { code: 422, description: 'Validation error' },
      { code: 429, description: 'Rate limit exceeded' },
    ],
    example: {
      request: `curl -X POST ${BASE}/plan \\
  -H "Authorization: Bearer $PERPULATOR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"capital":10000,"riskPct":2,"targetProfit":3000,"timeframeDays":30,"volatility24h":3.5}'`,
      response: `{
  "input": { "capital": 10000, "riskPct": 2, "targetProfit": 3000, "timeframeDays": 30, "volatility24h": 3.5 },
  "tiers": [
    {
      "id": "swing",
      "title": "Patient Swing",
      "rrRatio": 2,
      "winRate": 0.48,
      "riskPerTrade": 200,
      "rewardPerTrade": 400,
      "evPerTrade": 96,
      "tradesNeeded": 32,
      "tradesPerDay": 1.07,
      "suggestedLeverage": "2x – 3x",
      "realism": "green",
      "realismLabel": "Achievable",
      "isViable": true
    }
  ]
}`,
    },
  },
];

export default function DocsPage() {
  return (
    <>
      <PriceIndicator />
      <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-12 sm:py-16">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="mb-20 sm:mb-28">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-6xl sm:text-7xl font-700 text-white tracking-tighter leading-tight">
                  <img src="/assets/logos/header.png" alt="Perpulator" className="h-16 sm:h-20 w-auto" />
                </h1>
                <AuthButton />
              </div>
              <p className="text-neutral text-sm sm:text-base tracking-widest font-600 uppercase">
                Professional Perpetual Futures Analysis
              </p>
              <NavToggle active="docs" />
            </div>
            <div className="mt-10 sm:mt-14 h-px bg-gradient-to-r from-transparent via-neutral/30 to-transparent" />
          </div>

          {/* Intro */}
          <div className="mb-12 space-y-4">
            <p className="text-label text-neutral">API Reference</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              The Perpulator API lets you calculate perpetual futures positions, manage saved trades, and fetch live prices — all programmatically. Authenticate with an API key from{' '}
              <a href="/settings" className="text-neutral hover:underline">Settings</a>.
            </p>

            {/* Auth */}
            <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#0A0F2E', border: '1px solid rgba(148,163,184,0.10)' }}>
              <p className="text-xs font-600 text-gray-500 uppercase tracking-widest">Authentication</p>
              <p className="text-xs text-gray-400">Pass your API key as a Bearer token on every request:</p>
              <CodeBlock code={`Authorization: Bearer perp_...`} language="header" />
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                <div>
                  <p className="text-xs text-gray-500">Base URL</p>
                  <code className="text-xs text-gray-300 font-mono">{BASE}</code>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Rate limit</p>
                  <code className="text-xs text-gray-300 font-mono">100 requests / hour / key</code>
                </div>
              </div>
            </div>

            {/* Error format */}
            <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#0A0F2E', border: '1px solid rgba(148,163,184,0.10)' }}>
              <p className="text-xs font-600 text-gray-500 uppercase tracking-widest">Error Format</p>
              <CodeBlock code={`{ "error": "human-readable message", "details": ["field-level errors"] }`} language="json" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {[
                  { code: 400, label: 'Bad request' },
                  { code: 401, label: 'Invalid key' },
                  { code: 404, label: 'Not found' },
                  { code: 422, label: 'Validation failed' },
                  { code: 429, label: 'Rate limited' },
                  { code: 503, label: 'Service unavailable' },
                ].map(({ code, label }) => (
                  <div key={code} className="flex items-center gap-2">
                    <StatusBadge code={code} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Endpoints */}
          <div className="space-y-3">
            {ENDPOINTS.map((ep) => (
              <Endpoint key={`${ep.method}-${ep.path}`} {...ep} />
            ))}
          </div>

          {/* OpenClaw */}
          <div className="mt-16 pt-10 border-t border-gray-800/50">
            <div
              className="rounded-xl p-5 space-y-4"
              style={{ backgroundColor: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)' }}
            >
              <p className="text-xs font-600 text-neutral uppercase tracking-widest">OpenClaw — Claude Code Skill</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                Run position analysis directly inside Claude Code with <code className="text-neutral font-mono">/openclaw</code>. No browser required.
              </p>
              <CodeBlock
                code={`# Install once
cp .claude/skills/openclaw.md ~/.claude/skills/
export PERPULATOR_API_KEY=perp_...

# Use anywhere in Claude Code
/openclaw BTC long 71000 1000 10x SL:65000 TP:82000`}
                language="bash"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
