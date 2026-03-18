'use client';

import Link from 'next/link';

interface NavToggleProps {
  active: 'calc' | 'plan';
}

export default function NavToggle({ active }: NavToggleProps) {
  return (
    <div className="flex w-full rounded-xl overflow-hidden border border-slate-700/60 mt-5">
      <Link
        href="/"
        className={`flex-1 py-3 text-center text-xs font-600 tracking-widest uppercase transition-all ${
          active === 'calc'
            ? 'bg-neutral/15 text-neutral border-r border-neutral/30'
            : 'bg-transparent text-gray-500 border-r border-slate-700/60 hover:text-gray-300 hover:bg-white/5'
        }`}
      >
        Calculator
      </Link>
      <Link
        href="/plan"
        className={`flex-1 py-3 text-center text-xs font-600 tracking-widest uppercase transition-all ${
          active === 'plan'
            ? 'bg-neutral/15 text-neutral'
            : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
        }`}
      >
        Probability Planner
      </Link>
    </div>
  );
}
