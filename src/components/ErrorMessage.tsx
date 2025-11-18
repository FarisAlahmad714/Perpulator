'use client';

import { AlertCircle, X } from 'lucide-react';
import { ReactNode } from 'react';

interface ErrorMessageProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function ErrorMessage({
  message,
  type = 'error',
  onDismiss,
  action,
}: ErrorMessageProps) {
  const bgColorMap = {
    error: 'bg-red-900/20 border-red-500',
    warning: 'bg-yellow-900/20 border-yellow-500',
    info: 'bg-blue-900/20 border-blue-500',
  };

  const textColorMap = {
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
  };

  const iconColorMap = {
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  return (
    <div className={`flex items-start gap-3 ${bgColorMap[type]} border rounded-lg p-4`}>
      <AlertCircle size={20} className={`${iconColorMap[type]} flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        <p className={`font-semibold ${textColorMap[type]}`}>{message}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {action && (
          <button
            onClick={action.onClick}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              type === 'error'
                ? 'bg-red-600/40 hover:bg-red-600/60 text-red-300'
                : type === 'warning'
                ? 'bg-yellow-600/40 hover:bg-yellow-600/60 text-yellow-300'
                : 'bg-blue-600/40 hover:bg-blue-600/60 text-blue-300'
            }`}
          >
            {action.label}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}
