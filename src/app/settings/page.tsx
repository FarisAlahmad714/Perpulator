'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Key, Trash2, Plus, Copy, Check, AlertTriangle, X, Terminal, Loader2 } from 'lucide-react';
import NavToggle from '@/components/NavToggle';
import AuthButton from '@/components/AuthButton';
import PriceIndicator from '@/components/PriceIndicator';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface CreatedKey extends ApiKey {
  key: string; // raw key — only available at creation
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── One-time key reveal modal ──────────────────────────────────────────────────
function KeyRevealModal({ createdKey, onClose }: { createdKey: CreatedKey; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: '#0F1535', border: '1px solid rgba(148,163,184,0.15)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white font-600 text-lg">API Key Created</h3>
            <p className="text-gray-500 text-xs mt-0.5">{createdKey.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Warning */}
        <div
          className="flex items-start gap-3 rounded-lg p-3"
          style={{ backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)' }}
        >
          <AlertTriangle size={15} className="text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-yellow-300 text-xs leading-relaxed">
            Copy this key now — it will <strong>not</strong> be shown again. Store it securely like a password.
          </p>
        </div>

        {/* Key display */}
        <div
          className="flex items-center gap-3 rounded-lg p-3 font-mono text-xs text-neutral overflow-x-auto"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(148,163,184,0.12)' }}
        >
          <span className="flex-1 select-all break-all">{createdKey.key}</span>
          <button
            onClick={handleCopy}
            className="shrink-0 flex items-center gap-1.5 text-xs font-600 text-gray-400 hover:text-white transition-colors"
          >
            {copied ? <Check size={14} className="text-profit" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Quick start */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-600 uppercase tracking-widest">Quick Start</p>
          <div
            className="rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(148,163,184,0.10)' }}
          >
            <span className="text-gray-500">{'# '}</span>
            <span className="text-neutral">export</span>
            {` PERPULATOR_API_KEY="${createdKey.key.slice(0, 12)}..."`}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg bg-neutral/15 border border-neutral/30 text-neutral font-600 text-sm hover:bg-neutral/25 transition-all"
        >
          I've saved my key — Done
        </button>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ──────────────────────────────────────────────────
function DeleteConfirmModal({
  keyName,
  onConfirm,
  onCancel,
  deleting,
}: {
  keyName: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6"
        style={{ backgroundColor: '#0F1535', border: '1px solid rgba(148,163,184,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-600 text-lg mb-2">Revoke API Key?</h3>
        <p className="text-gray-400 text-sm mb-6">
          <span className="text-gray-200">"{keyName}"</span> will be immediately revoked. Any
          integrations using it will stop working.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-lg border border-slate-600/60 text-gray-400 font-600 text-sm hover:text-white hover:border-slate-500 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 font-600 text-sm hover:bg-red-500/25 transition-all disabled:opacity-50"
          >
            {deleting ? 'Revoking…' : 'Revoke Key'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiKey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/keys');
      if (res.ok) setKeys(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchKeys();
    if (status === 'unauthenticated') setLoading(false);
  }, [status, fetchKeys]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() || 'Default' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create key');
        return;
      }
      setCreatedKey(data);
      setKeys((prev) => [...prev, { id: data.id, name: data.name, createdAt: data.createdAt, lastUsedAt: null }]);
      setShowCreateForm(false);
      setNewKeyName('');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/keys/${pendingDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== pendingDelete.id));
        setPendingDelete(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const copySnippet = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // ── Redirect / loading states ─────────────────────────────────────────────
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={20} className="text-neutral animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <p className="text-gray-400 text-sm">Sign in to manage your API keys.</p>
        <button
          onClick={() => signIn()}
          className="btn-primary px-6 py-2.5 text-sm"
        >
          Sign In
        </button>
      </div>
    );
  }

  const curlSnippet = `curl -X POST https://perpulator.vercel.app/api/v1/calculate \\
  -H "Authorization: Bearer $PERPULATOR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"BTC","side":"long","entryPrice":71000,"positionSize":1000,"leverage":10,"stopLoss":65000,"takeProfit":82000}'`;

  return (
    <>
      {/* Modals */}
      {createdKey && (
        <KeyRevealModal createdKey={createdKey} onClose={() => setCreatedKey(null)} />
      )}
      {pendingDelete && (
        <DeleteConfirmModal
          keyName={pendingDelete.name}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
          deleting={deleting}
        />
      )}

      <PriceIndicator />
      <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-12 sm:py-16">
        <div className="w-full max-w-2xl">
          {/* Header — matches other pages */}
          <div className="mb-20 sm:mb-28">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-6xl sm:text-7xl font-700 text-white tracking-tighter leading-tight">
                  <img
                    src="/assets/logos/header.png"
                    alt="Perpulator"
                    className="h-16 sm:h-20 w-auto"
                  />
                </h1>
                <AuthButton />
              </div>
              <p className="text-neutral text-sm sm:text-base tracking-widest font-600 uppercase">
                Professional Perpetual Futures Analysis
              </p>
              <NavToggle active="keys" />
            </div>
            <div className="mt-10 sm:mt-14 h-px bg-gradient-to-r from-transparent via-neutral/30 to-transparent" />
          </div>

          {/* ── API Keys section ──────────────────────────────────────────── */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-label text-neutral flex items-center gap-2">
                  <Key size={14} />
                  API Keys ({keys.length}/5)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Use these keys to call the Perpulator API or run the OpenClaw skill.
                </p>
              </div>
              {!showCreateForm && keys.length < 5 && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2 text-xs font-600 px-4 py-2 rounded-lg bg-neutral/10 border border-neutral/30 text-neutral hover:bg-neutral/20 hover:border-neutral/50 transition-all"
                >
                  <Plus size={13} />
                  New Key
                </button>
              )}
            </div>

            {/* Create form */}
            {showCreateForm && (
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ backgroundColor: '#0F1535', border: '1px solid rgba(148,163,184,0.12)' }}
              >
                <p className="text-xs text-gray-400 font-600">Name this key (optional)</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="e.g. OpenClaw, Local Dev, CI…"
                    maxLength={64}
                    className="flex-1 bg-transparent border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-neutral/50 transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="px-4 py-2 rounded-lg bg-neutral/15 border border-neutral/30 text-neutral text-sm font-600 hover:bg-neutral/25 transition-all disabled:opacity-50"
                  >
                    {creating ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
                  </button>
                  <button
                    onClick={() => { setShowCreateForm(false); setNewKeyName(''); setError(null); }}
                    className="px-3 py-2 rounded-lg border border-slate-700/60 text-gray-500 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
              </div>
            )}

            {/* Keys list */}
            {keys.length === 0 ? (
              <div
                className="rounded-xl p-8 text-center"
                style={{ border: '1px dashed rgba(148,163,184,0.15)' }}
              >
                <Key size={24} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No API keys yet.</p>
                <p className="text-gray-600 text-xs mt-1">Create one to start using the API or OpenClaw.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ backgroundColor: '#0F1535', border: '1px solid rgba(148,163,184,0.10)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-600 truncate">{k.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Created {formatDate(k.createdAt)}
                        {k.lastUsedAt && (
                          <span className="ml-2 text-gray-600">· Last used {formatDate(k.lastUsedAt)}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setPendingDelete(k)}
                      className="ml-4 shrink-0 p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Revoke key"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── API Reference ─────────────────────────────────────────────── */}
          <div className="mt-16 pt-10 border-t border-gray-800/50 space-y-6">
            <div>
              <p className="text-label text-neutral flex items-center gap-2">
                <Terminal size={14} />
                API Reference
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Base URL: <span className="text-gray-400 font-mono">https://perpulator.vercel.app/api/v1</span>
              </p>
            </div>

            {/* Endpoint cards */}
            {[
              {
                method: 'POST',
                path: '/calculate',
                desc: 'Calculate a position — liq price, risk/reward, PnL',
              },
              {
                method: 'GET',
                path: '/positions',
                desc: 'Retrieve your saved positions',
              },
            ].map(({ method, path, desc }) => (
              <div
                key={path}
                className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{ backgroundColor: '#0F1535', border: '1px solid rgba(148,163,184,0.10)' }}
              >
                <span
                  className="shrink-0 text-xs font-700 font-mono px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: method === 'POST' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
                    color: method === 'POST' ? '#4ade80' : '#60a5fa',
                  }}
                >
                  {method}
                </span>
                <code className="text-xs text-gray-300 font-mono">{path}</code>
                <span className="text-xs text-gray-500 hidden sm:block">{desc}</span>
              </div>
            ))}

            {/* Auth header note */}
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: '#0F1535', border: '1px solid rgba(148,163,184,0.10)' }}
            >
              <p className="text-xs text-gray-500 mb-2 font-600 uppercase tracking-widest">Authentication</p>
              <code className="text-xs text-gray-300 font-mono">Authorization: Bearer perp_...</code>
            </div>

            {/* Example curl */}
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ backgroundColor: '#0F1535', border: '1px solid rgba(148,163,184,0.10)' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-600 uppercase tracking-widest">Example Request</p>
                <button
                  onClick={() => copySnippet(curlSnippet)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-neutral transition-colors"
                >
                  {copiedSnippet ? <Check size={12} className="text-profit" /> : <Copy size={12} />}
                  {copiedSnippet ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {curlSnippet}
              </pre>
            </div>

            {/* OpenClaw install */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: 'rgba(0, 212, 255, 0.04)',
                border: '1px solid rgba(0, 212, 255, 0.12)',
              }}
            >
              <p className="text-xs text-neutral font-600 uppercase tracking-widest">OpenClaw — Claude Code Skill</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Run position analysis directly in Claude Code with <code className="text-neutral font-mono">/openclaw</code>.
              </p>
              <div
                className="rounded-lg p-3 font-mono text-xs text-gray-300 space-y-1 overflow-x-auto"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <div><span className="text-gray-500"># Install once</span></div>
                <div>cp .claude/skills/openclaw.md ~/.claude/skills/</div>
                <div>export PERPULATOR_API_KEY=perp_...</div>
                <div className="pt-1"><span className="text-gray-500"># Use anywhere</span></div>
                <div className="text-neutral">/openclaw BTC long 71000 1000 10x SL:65000 TP:82000</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
