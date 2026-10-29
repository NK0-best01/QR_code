'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import messages from '@/lib/messages';
import { RegistrationStatus } from '@/data/registration-status';
import { Role } from '@/data/roles';
import StatusFilterButtons from '@/components/StatusFilterButtons';
import RegistrationCard, { RegistrationItem } from '@/components/RegistrationCard';

interface DashboardResponse {
  counts: {
    UNREGISTERED: number;
    REGISTERED: number;
  };
  items: RegistrationItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface DashboardClientProps {
  userRole: Role;
}

export default function DashboardClient({ userRole }: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read current filter and page from URL
  const rawStatus = searchParams.get('status');
  const currentStatus: RegistrationStatus | null =
    rawStatus === 'UNREGISTERED' || rawStatus === 'REGISTERED'
      ? rawStatus
      : null;

  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadRegistrations() {
      const params = new URLSearchParams();
      if (currentStatus) {
        params.set('status', currentStatus);
      }
      params.set('page', String(currentPage));
      params.set('pageSize', '12');

      try {
        const res = await fetch(`/api/registrations?${params.toString()}`);
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || messages.dashboard.errorLoading);
        }

        const json: DashboardResponse = await res.json();
        if (active) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (active) {
          const message =
            err instanceof Error ? err.message : messages.dashboard.errorLoading;
          setError(message);
          setLoading(false);
        }
      }
    }

    loadRegistrations();

    return () => {
      active = false;
    };
  }, [currentStatus, currentPage, refreshKey, router]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setRefreshKey((k) => k + 1);
  };

  // Handle status filter change
  const handleStatusChange = (status: RegistrationStatus | null) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) {
      params.set('status', status);
    }
    params.set('page', '1'); // Reset to page 1 on filter change
    router.push(`/dashboard?${params.toString()}`);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentStatus) {
      params.set('status', currentStatus);
    }
    params.set('page', String(newPage));
    router.push(`/dashboard?${params.toString()}`);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 12)) : 1;
  const counts = data?.counts || { UNREGISTERED: 0, REGISTERED: 0 };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1
            data-testid="dashboard-heading"
            className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            {messages.dashboard.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {messages.dashboard.subtitle}
          </p>
        </div>

        {/* Status Filter Buttons */}
        <StatusFilterButtons
          currentStatus={currentStatus}
          counts={counts}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Content Area */}
      {loading ? (
        <div
          data-testid="dashboard-loading"
          className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3"
        >
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {messages.dashboard.loading}
          </p>
        </div>
      ) : error ? (
        <div
          data-testid="dashboard-error"
          className="p-8 text-center bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-2xl space-y-3"
        >
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            {error}
          </p>
          <button
            type="button"
            id="btn-dashboard-retry"
            data-testid="btn-dashboard-retry"
            onClick={handleRetry}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition cursor-pointer"
          >
            {messages.dashboard.retry}
          </button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div
          data-testid="dashboard-empty"
          className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-3"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">
            {messages.dashboard.noData}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            {currentStatus
              ? `ไม่มีรายการที่อยู่ในสถานะ "${currentStatus === 'UNREGISTERED' ? messages.dashboard.unregistered : messages.dashboard.registered}"`
              : 'ยังไม่มีข้อมูลการลงทะเบียนอุปกรณ์ในระบบ สามารถลงทะเบียนผ่านหน้าแรกได้'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card Grid (12 items max per page) */}
          <div
            data-testid="registration-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {data.items.map((item) => (
              <RegistrationCard
                key={item.id}
                item={item}
                userRole={userRole}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              data-testid="dashboard-pagination"
              className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800"
            >
              <button
                type="button"
                id="btn-page-prev"
                data-testid="btn-page-prev"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition cursor-pointer"
              >
                {messages.dashboard.prevPage}
              </button>

              <span
                data-testid="pagination-info"
                className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
              >
                หน้า {currentPage} จาก {totalPages} (ทั้งหมด {data.total} รายการ)
              </span>

              <button
                type="button"
                id="btn-page-next"
                data-testid="btn-page-next"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition cursor-pointer"
              >
                {messages.dashboard.nextPage}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
