'use client';

interface NavToggleProps {
  active: 'calc' | 'plan' | 'keys';
}

export default function NavToggle({ active }: NavToggleProps) {
  return (
    <div className="flex w-full rounded-xl overflow-hidden border border-slate-700/60 mt-5">
      <a
        href="/"
        className={`flex-1 py-3 text-center text-xs font-600 tracking-widest uppercase transition-all border-r ${
          active === 'calc'
            ? 'bg-neutral/15 text-neutral border-neutral/30'
            : 'bg-transparent text-gray-500 border-slate-700/60 hover:text-gray-300 hover:bg-white/5'
        }`}
      >
        Calculator
      </a>
      <a
        href="/plan"
        className={`flex-1 py-3 text-center text-xs font-600 tracking-widest uppercase transition-all border-r ${
          active === 'plan'
            ? 'bg-neutral/15 text-neutral border-neutral/30'
            : 'bg-transparent text-gray-500 border-slate-700/60 hover:text-gray-300 hover:bg-white/5'
        }`}
      >
        Planner
      </a>
      <a
        href="/settings"
        className={`flex-1 py-3 text-center text-xs font-600 tracking-widest uppercase transition-all ${
          active === 'keys'
            ? 'bg-neutral/15 text-neutral'
            : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
        }`}
      >
        API Keys
      </a>
    </div>
  );
}
