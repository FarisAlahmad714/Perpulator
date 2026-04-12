'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Users, Key, Activity, TrendingUp, Clock } from 'lucide-react';
import PriceIndicator from '@/components/PriceIndicator';
import AuthButton from '@/components/AuthButton';

interface DailyUsage { date: string; count: number }

interface AdminKey {
  keyId: string;
  keyName: string;
  keyCreatedAt: string;
  keyLastUsedAt: string | null;
  keyTotalRequests: number;
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
  return new Date(s).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDay(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
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
                style={{
                  height: `${h}%`,
                  minHeight: '3px',
                  backgroundColor: d.count > 0 ? 'rgba(0,212,255,0.55)' : 'rgba(255,255,255,0.05)',
                }}
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
  return <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { setLoading(false); return; }

    fetch('/api/admin/overview')
      .then(async (res) => {
        if (res.status === 403) { setForbidden(true); return; }
        setData(await res.json());
      })
      .finally(() => setLoading(false));
  }, [status]);

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
      <PriceIndicator />
      <div className="flex flex-col items-center min-h-screen px-4 sm:px-6 py-12 sm:py-16">
        <div className="w-full max-w-3xl space-y-10">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <a href="/" className="flex items-center gap-3 mb-1">
                <img src="/assets/logos/header.png" alt="Perpulator" className="h-10 w-auto" />
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
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-white/5 divide-y divide-white/5">
                        {u.keys.map((k) => (
                          <div key={k.keyId} className="flex items-center gap-3 px-4 py-3 pl-14">
                            <Key size={11} className="text-gray-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-300 font-600 truncate">{k.keyName}</p>
                              <p className="text-xs text-gray-600">
                                Created {formatDate(k.keyCreatedAt)}
                                {k.keyLastUsedAt && <span className="ml-2">· Last used {formatDate(k.keyLastUsedAt)}</span>}
                              </p>
                            </div>
                            <span className="text-xs font-600 font-mono text-neutral shrink-0">
                              {k.keyTotalRequests.toLocaleString()} req
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5" style={{ backgroundColor: '#0A0F2E' }}>
                      <StatusDot status={r.status} />
                      <code className="text-xs text-gray-300 font-mono flex-1 truncate">{r.endpoint}</code>
                      <span className="text-xs font-600 font-mono shrink-0" style={{
                        color: r.status < 300 ? '#4ade80' : r.status < 500 ? '#fbbf24' : '#f87171'
                      }}>{r.status}</span>
                      <span className="text-xs text-gray-600 shrink-0 hidden sm:block truncate max-w-[140px]">{r.userEmail}</span>
                      <span className="text-xs text-gray-700 shrink-0">{formatTime(r.createdAt)}</span>
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
