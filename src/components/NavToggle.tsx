'use client';

interface NavToggleProps {
  active: 'calc' | 'plan' | 'keys' | 'docs';
}

export default function NavToggle({ active }: NavToggleProps) {
  const tabs = [
    { id: 'calc', label: 'Calculator', href: '/' },
    { id: 'plan', label: 'Planner', href: '/plan' },
    { id: 'keys', label: 'API Keys', href: '/settings' },
    { id: 'docs', label: 'Docs', href: '/docs' },
  ] as const;

  return (
    <div className="flex w-full rounded-xl overflow-hidden border border-slate-700/60 mt-5">
      {tabs.map((tab, i) => (
        <a
          key={tab.id}
          href={tab.href}
          className={`flex-1 py-3 text-center text-xs font-600 tracking-widest uppercase transition-all ${
            i < tabs.length - 1 ? 'border-r border-slate-700/60' : ''
          } ${
            active === tab.id
              ? 'bg-neutral/15 text-neutral border-neutral/30'
              : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
          }`}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}
