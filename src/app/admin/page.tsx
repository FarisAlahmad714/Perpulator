'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Users, Key, Activity, TrendingUp, Clock, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import PriceIndicator from '@/components/PriceIndicator';
import AuthButton from '@/components/AuthButton';

interface DailyUsage { date: string; count: number }

interface EndpointStat { endpoint: string; count: number }

interface AdminKey {
  keyId: string;
  keyName: string;
  keyCreatedAt: string;
  keyLastUsedAt: string | null;
  keyTotalRequests: number;
  endpointBreakdown: EndpointStat[];
}

interface AdminUser {
  userId: string;
  email: string | null;
  name: string | null;
  image: string | null;
  keys: AdminKey[];
}

interface RecentActivity {
  id: string;
  endpoint: string;
  status: number;
  createdAt: string;
  keyId: string;
  userEmail: string | null;
}

interface AdminData {
  stats: {
    totalUsers: number;
    totalKeys: number;
    totalRequests: number;
    requestsToday: number;
    dailyUsage: DailyUsage[];
  };
  users: AdminUser[];
  recentActivity: RecentActivity[];
}

function formatDate(s: string | null) {
  if (!s) return 'Never';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(s: string) {
  return new Date(s).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatDay(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

// Shorten endpoint label for display
function shortEndpoint(ep: string) {
  return ep.replace('/api/v1/', '/').replace('/api/', '/');
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl p-5 space-y-2" style={{ backgroundColor: '#0A0F2E', border: '1px solid rgba(148,163,184,0.10)' }}>
      <div className="flex items-center gap-2 text-gray-500">
        <Icon size={13} />
        <span className="text-xs uppercase tracking-widest font-600">{label}</span>
      </div>
      <p className="text-2xl font-700 text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

function GlobalChart({ dailyUsage }: { dailyUsage: DailyUsage[] }) {
  const max = Math.max(...dailyUsage.map((d) => d.count), 1);
  const total = dailyUsage.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#0A0F2E', border: '1px solid rgba(148,163,184,0.10)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest font-600 text-gray-500">API Requests — Last 7 Days</p>
        <span className="text-xs font-600 text-neutral">{total.toLocaleString()} total</span>
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {dailyUsage.map((d) => {
          const h = max > 0 ? Math.max((d.count / max) * 100, d.count > 0 ? 8 : 3) : 3;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-sm"
                style={{ height: `${h}%`, minHeight: '3px', backgroundColor: d.count > 0 ? 'rgba(0,212,255,0.55)' : 'rgba(255,255,255,0.05)' }}
              />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap z-10 border border-white/10">
                {d.count} req
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        {dailyUsage.map((d) => (
          <div key={d.date} className="flex-1 text-center text-gray-700 text-[9px]">{formatDay(d.date)}</div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: number }) {
  const color = status < 300 ? '#4ade80' : status < 500 ? '#fbbf24' : '#f87171';
  return <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color }} />;
}

// ── Key breakdown row ──────────────────────────────────────────────────────────
function KeyCard({ k, onRevoke }: { k: AdminKey; onRevoke: (id: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const totalBreakdown = k.endpointBreakdown.reduce((s, e) => s + e.count, 0);

  return (
    <div className="border-t border-white/5">
      <div className="flex items-center gap-3 px-4 py-3 pl-14">
        <Key size={11} className="text-gray-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-300 font-600 truncate">{k.keyName}</p>
            {k.endpointBreakdown.length > 0 && (
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-0.5 text-gray-600 hover:text-neutral transition-colors"
                title="Endpoint breakdown"
              >
                {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-600">
            Created {formatDate(k.keyCreatedAt)}
            {k.keyLastUsedAt && <span className="ml-2">· Last used {formatDate(k.keyLastUsedAt)}</span>}
          </p>

          {/* Endpoint breakdown */}
          {open && k.endpointBreakdown.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {k.endpointBreakdown.map((ep) => {
                const pct = totalBreakdown > 0 ? (ep.count / totalBreakdown) * 100 : 0;
                return (
                  <div key={ep.endpoint} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <code className="text-[10px] text-gray-400 font-mono">{shortEndpoint(ep.endpoint)}</code>
                      <span className="text-[10px] text-gray-500 font-mono">{ep.count} req · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: 'rgba(0,212,255,0.4)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-600 font-mono text-neutral">
            {k.keyTotalRequests.toLocaleString()} req
          </span>
          <button
            onClick={() => onRevoke(k.keyId, k.keyName)}
            className="p-1.5 rounded text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Revoke key"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Revoke confirm modal ───────────────────────────────────────────────────────
function RevokeModal({ keyName, onConfirm, onCancel, revoking }: {
  keyName: string; onConfirm: () => void; onCancel: () => void; revoking: boolean;
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
          <span className="text-gray-200">"{keyName}"</span> will be immediately revoked. Any integrations using it will stop working.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-lg border border-slate-600/60 text-gray-400 font-600 text-sm hover:text-white transition-all">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={revoking}
            className="flex-1 py-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 font-600 text-sm hover:bg-red-500/25 transition-all disabled:opacity-50"
          >
            {revoking ? 'Revoking…' : 'Revoke Key'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<{ id: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/overview');
    if (res.status === 403) { setForbidden(true); return; }
    setData(await res.json());
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { setLoading(false); return; }
    fetchData().finally(() => setLoading(false));
  }, [status, fetchData]);

  const handleRevoke = async () => {
    if (!pendingRevoke) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/admin/keys/${pendingRevoke.id}`, { method: 'DELETE' });
      if (res.ok) {
        // Remove the key from local state
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            stats: { ...prev.stats, totalKeys: prev.stats.totalKeys - 1 },
            users: prev.users.map((u) => ({
              ...u,
              keys: u.keys.filter((k) => k.keyId !== pendingRevoke.id),
            })).filter((u) => u.keys.length > 0),
          };
        });
        setPendingRevoke(null);
      }
    } finally {
      setRevoking(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={20} className="text-neutral animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated' || forbidden || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-sm">Access denied.</p>
      </div>
    );
  }

  const { stats, users, recentActivity } = data;

  return (
    <>
      {pendingRevoke && (
        <RevokeModal
          keyName={pendingRevoke.name}
          onConfirm={handleRevoke}
          onCancel={() => setPendingRevoke(null)}
          revoking={revoking}
        />
      )}

      <PriceIndicator />
      <div className="flex flex-col items-center min-h-screen px-4 sm:px-6 py-12 sm:py-16">
        <div className="w-full max-w-3xl space-y-10">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <a href="/">
                <img src="/assets/logos/header.png" alt="Perpulator" className="h-10 w-auto mb-1" />
              </a>
              <p className="text-xs text-gray-600 uppercase tracking-widest font-600">Admin Dashboard</p>
            </div>
            <AuthButton />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Users" value={stats.totalUsers} />
            <StatCard icon={Key} label="API Keys" value={stats.totalKeys} />
            <StatCard icon={TrendingUp} label="Total Req" value={stats.totalRequests} />
            <StatCard icon={Activity} label="Today" value={stats.requestsToday} sub="last 24 hours" />
          </div>

          {/* Global chart */}
          <GlobalChart dailyUsage={stats.dailyUsage} />

          {/* Users & Keys */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest font-600 text-gray-500 flex items-center gap-2">
              <Users size={12} />
              Users ({users.length})
            </p>
            {users.length === 0 ? (
              <p className="text-gray-600 text-sm">No users with API keys yet.</p>
            ) : (
              users.map((u) => {
                const totalReq = u.keys.reduce((s, k) => s + k.keyTotalRequests, 0);
                const isOpen = expandedUser === u.userId;
                return (
                  <div key={u.userId} className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A0F2E', border: '1px solid rgba(148,163,184,0.10)' }}>
                    {/* User header row */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                      onClick={() => setExpandedUser(isOpen ? null : u.userId)}
                    >
                      {u.image ? (
                        <img src={u.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-neutral/20 flex items-center justify-center shrink-0">
                          <Users size={12} className="text-neutral" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-600 truncate">{u.name ?? u.email ?? 'Unknown'}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-600">{u.keys.length} key{u.keys.length !== 1 ? 's' : ''}</span>
                        <span className="text-xs font-600 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,212,255,0.08)', color: '#00d4ff' }}>
                          {totalReq.toLocaleString()} req
                        </span>
                        {isOpen ? <ChevronDown size={13} className="text-gray-600" /> : <ChevronRight size={13} className="text-gray-600" />}
                      </div>
                    </button>

                    {/* Keys list */}
                    {isOpen && u.keys.map((k) => (
                      <KeyCard
                        key={k.keyId}
                        k={k}
                        onRevoke={(id, name) => setPendingRevoke({ id, name })}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {/* Recent Activity */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest font-600 text-gray-500 flex items-center gap-2">
              <Clock size={12} />
              Recent Activity (last 30)
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.10)' }}>
              {recentActivity.length === 0 ? (
                <p className="text-gray-600 text-sm p-4">No API activity yet.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentActivity.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 px-4 py-2.5" style={{ backgroundColor: '#0A0F2E' }}>
                      <StatusDot status={r.status} />
                      <code className="text-xs text-gray-300 font-mono flex-1 truncate">{shortEndpoint(r.endpoint)}</code>
                      <span className="text-xs font-600 font-mono shrink-0" style={{
                        color: r.status < 300 ? '#4ade80' : r.status < 500 ? '#fbbf24' : '#f87171'
                      }}>{r.status}</span>
                      <span className="text-xs text-gray-600 shrink-0 hidden sm:block truncate max-w-[150px]">{r.userEmail}</span>
                      <span className="text-xs text-gray-700 shrink-0 hidden sm:block">{formatTime(r.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
