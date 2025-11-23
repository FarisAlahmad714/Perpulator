'use client';

import { Position } from '@/types/position';
import { Trash2, ChevronRight, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';

interface SavedPositionsListProps {
  positions: Position[];
  onLoadPosition: (position: Position) => void;
  onDeletePosition: (id: string) => void;
  onRenamePosition: (id: string, newName: string) => void;
}

export default function SavedPositionsList({
  positions,
  onLoadPosition,
  onDeletePosition,
  onRenamePosition,
}: SavedPositionsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const formatNumber = (value: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate current position size
  const getPositionSize = (position: Position) => {
    let openSize = 0;
    let closedSize = 0;

    for (const entry of position.entries) {
      if (entry.type === 'subtract') {
        closedSize += entry.size;
      } else {
        openSize += entry.size;
      }
    }

    return Math.max(openSize - closedSize, 0);
  };

  // Calculate average entry price
  const getAverageEntryPrice = (position: Position) => {
    let openSize = 0;
    let closedSize = 0;
    let openWeightedEntryPrice = 0;

    for (const entry of position.entries) {
      if (entry.type === 'subtract') {
        closedSize += entry.size;
      } else {
        openSize += entry.size;
        openWeightedEntryPrice += entry.size * entry.entryPrice;
      }
    }

    const remainingSize = Math.max(openSize - closedSize, 0);

    if (openSize > 0 && remainingSize > 0) {
      const scaleFactor = remainingSize / openSize;
      return (openWeightedEntryPrice * scaleFactor) / remainingSize;
    }

    return 0;
  };

  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No saved positions yet. Create and save your first position!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {positions.map((position) => {
        const positionSize = getPositionSize(position);
        const avgEntry = getAverageEntryPrice(position);
        const isLong = position.sideEntry === 'long';

        const handleStartEdit = (e: React.MouseEvent, id: string, currentName: string) => {
          e.stopPropagation();
          setEditingId(id);
          setEditingName(currentName);
        };

        const handleSaveEdit = (e: React.MouseEvent, id: string) => {
          e.stopPropagation();
          if (editingName.trim()) {
            onRenamePosition(id, editingName.trim());
          }
          setEditingId(null);
          setEditingName('');
        };

        const handleCancelEdit = (e: React.MouseEvent) => {
          e.stopPropagation();
          setEditingId(null);
          setEditingName('');
        };

        return (
          <div
            key={position.id}
            className="card-bg hover:bg-opacity-75 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              <div
                className="flex-1"
                onClick={() => onLoadPosition(position)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`text-sm font-700 px-3 py-1 rounded ${
                      isLong
                        ? 'bg-profit/20 text-profit'
                        : 'bg-loss/20 text-loss'
                    }`}
                  >
                    {position.sideEntry.toUpperCase()}
                  </span>

                  {editingId === position.id ? (
                    <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 bg-gray-700 border border-neutral/50 rounded px-3 py-1 text-sm text-white focus:outline-none focus:border-neutral"
                        placeholder="Enter custom name..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(e as any, position.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit(e as any);
                          }
                        }}
                      />
                      <button
                        onClick={(e) => handleSaveEdit(e, position.id)}
                        className="p-1 text-profit hover:bg-profit/20 rounded transition-colors"
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 text-gray-400 hover:bg-loss/20 rounded transition-colors"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <h4 className="text-label">{position.customName || 'Untitled Position'}</h4>
                        <p className="text-xs text-gray-500 mt-1">{position.name}</p>
                      </div>
                      <button
                        onClick={(e) => handleStartEdit(e, position.id, position.customName || '')}
                        className="p-1 text-gray-400 hover:text-neutral hover:bg-neutral/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Rename position"
                      >
                        <Edit2 size={16} />
                      </button>
                    </>
                  )}

                  <span className="text-xs text-gray-500">{position.symbol}</span>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Size (USD)</p>
                    <p className="text-lg font-600 text-metric">${formatNumber(positionSize)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Entry Price</p>
                    <p className="text-lg font-600 text-metric">${formatNumber(avgEntry)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Entries</p>
                    <p className="text-lg font-600 text-metric">{position.entries.length}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500">Saved {formatDate(position.savedAt)}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onLoadPosition(position)}
                  className="hidden group-hover:flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral/20 text-neutral hover:bg-neutral/30 transition-colors text-sm font-600"
                  title="Load this position"
                >
                  Load
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePosition(position.id);
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-loss hover:bg-loss/20 transition-colors"
                  title="Delete this position"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
