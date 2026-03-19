'use client';

import { useEffect } from 'react';

export default function PlanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Plan page error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 gap-6">
      <p className="text-loss font-600">Something went wrong loading the Probability Planner.</p>
      <p className="text-gray-500 text-xs">{error.message}</p>
      <button
        onClick={reset}
        className="btn-primary text-sm px-6 py-2"
      >
        Try again
      </button>
    </div>
  );
}
