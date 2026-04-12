'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { LogIn, LogOut, User } from 'lucide-react';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') return null;

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt=""
              className="w-6 h-6 rounded-full ring-1 ring-neutral/30"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-neutral/20 flex items-center justify-center">
              <User size={12} className="text-neutral" />
            </div>
          )}
          <span className="text-xs text-gray-400 hidden sm:block max-w-[120px] truncate">
            {session.user.email}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          title="Sign out"
        >
          <LogOut size={13} />
          <span className="hidden sm:block">Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="flex items-center gap-2 text-xs font-600 px-3 py-1.5 rounded-lg bg-neutral/10 border border-neutral/30 text-neutral hover:bg-neutral/20 hover:border-neutral/50 transition-all"
    >
      <LogIn size={13} />
      <span>Sign in</span>
    </button>
  );
}
