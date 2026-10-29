'use client';

import messages from '@/lib/messages';
import { RegistrationStatus } from '@/data/registration-status';

interface StatusFilterButtonsProps {
  currentStatus: RegistrationStatus | null;
  counts: {
    UNREGISTERED: number;
    REGISTERED: number;
  };
  onStatusChange: (status: RegistrationStatus | null) => void;
}

export default function StatusFilterButtons({
  currentStatus,
  counts,
  onStatusChange,
}: StatusFilterButtonsProps) {
  const handleToggle = (status: RegistrationStatus) => {
    if (currentStatus === status) {
      onStatusChange(null); // Click again -> Reset to all
    } else {
      onStatusChange(status);
    }
  };

  return (
    <div
      role="group"
      aria-label={messages.dashboard.filterByStatus}
      className="inline-flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80"
    >
      {/* Button: UNREGISTERED */}
      <button
        type="button"
        id="btn-filter-unregistered"
        data-testid="filter-unregistered"
        aria-pressed={currentStatus === 'UNREGISTERED'}
        onClick={() => handleToggle('UNREGISTERED')}
        className={`px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
          currentStatus === 'UNREGISTERED'
            ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-300 shadow-xs font-semibold'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-700/50'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
        <span>{messages.dashboard.unregistered}</span>
        <span
          data-testid="count-unregistered"
          className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 font-bold"
        >
          {counts.UNREGISTERED}
        </span>
      </button>

      {/* Button: REGISTERED */}
      <button
        type="button"
        id="btn-filter-registered"
        data-testid="filter-registered"
        aria-pressed={currentStatus === 'REGISTERED'}
        onClick={() => handleToggle('REGISTERED')}
        className={`px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer flex items-center gap-2 ${
          currentStatus === 'REGISTERED'
            ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-semibold'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-700/50'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <span>{messages.dashboard.registered}</span>
        <span
          data-testid="count-registered"
          className="ml-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-bold"
        >
          {counts.REGISTERED}
        </span>
      </button>
    </div>
  );
}
