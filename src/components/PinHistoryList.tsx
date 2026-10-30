'use client';

import React from 'react';
import messages from '@/lib/messages';

export interface PinLogItem {
  id: number;
  action: 'CONFIRM' | 'UPDATE' | string;
  oldLatitude: number | null;
  oldLongitude: number | null;
  newLatitude: number;
  newLongitude: number;
  actorUsername: string;
  createdAt: string;
}

interface PinHistoryListProps {
  logs: PinLogItem[];
  loading?: boolean;
}

export function PinHistoryList({ logs, loading = false }: PinHistoryListProps) {
  if (loading) {
    return (
      <div className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mb-2" />
        <div>กำลังโหลดประวัติ...</div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div
        data-testid="no-pin-history"
        className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400"
      >
        {messages.map.noPinHistory}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="pin-history-list">
      <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        {messages.map.pinHistoryTitle} ({logs.length})
      </h4>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/50">
        {logs.map((log) => {
          const isConfirm = log.action === 'CONFIRM';
          const formattedDate = new Date(log.createdAt).toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={log.id}
              data-testid={`pin-log-item-${log.id}`}
              className="p-3 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                    isConfirm
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                  }`}
                >
                  {isConfirm ? messages.map.actionConfirm : messages.map.actionUpdate}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">{formattedDate}</span>
              </div>

              <div className="text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-500 dark:text-zinc-400">{messages.map.actor}: </span>
                <span className="font-medium">{log.actorUsername}</span>
              </div>

              <div className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                {!isConfirm && log.oldLatitude !== null && log.oldLongitude !== null ? (
                  <div className="flex items-center gap-1">
                    <span className="line-through text-zinc-400">
                      {log.oldLatitude.toFixed(6)}, {log.oldLongitude.toFixed(6)}
                    </span>
                    <span>→</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {log.newLatitude.toFixed(6)}, {log.newLongitude.toFixed(6)}
                    </span>
                  </div>
                ) : (
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {log.newLatitude.toFixed(6)}, {log.newLongitude.toFixed(6)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
