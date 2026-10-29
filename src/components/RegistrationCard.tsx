'use client';

import Link from 'next/link';
import messages from '@/lib/messages';
import {
  RegistrationStatus,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_BADGES,
} from '@/data/registration-status';
import { Role } from '@/data/roles';
import { buildGoogleMapsUrl } from '@/lib/google-maps';

export interface RegistrationItem {
  id: number;
  uid: string;
  region: string;
  province: string;
  deviceType: string;
  deviceId: string;
  status: RegistrationStatus;
  latitude: number | null;
  longitude: number | null;
  createdAt: string | Date;
  confirmedAt?: string | Date | null;
}

interface RegistrationCardProps {
  item: RegistrationItem;
  userRole: Role;
}

export default function RegistrationCard({
  item,
  userRole,
}: RegistrationCardProps) {
  const hasPin = item.latitude !== null && item.longitude !== null;
  const statusLabel =
    REGISTRATION_STATUS_LABELS[item.status] || item.status;
  const statusBadgeClass =
    REGISTRATION_STATUS_BADGES[item.status] ||
    'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200';

  const formattedDate = new Date(item.createdAt).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article
      data-testid={`card-registration-${item.id}`}
      className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
    >
      {/* Top Header: Device ID & Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            {messages.dashboard.deviceId}
          </span>
          <h2
            data-testid={`card-device-id-${item.id}`}
            className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight"
          >
            {item.deviceId}
          </h2>
        </div>

        <span
          data-testid={`card-status-badge-${item.id}`}
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm border-y border-zinc-100 dark:border-zinc-800 py-3">
        <div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
            {messages.dashboard.uid}
          </span>
          <span
            data-testid={`card-uid-${item.id}`}
            className="font-medium text-zinc-800 dark:text-zinc-200 break-all"
          >
            {item.uid}
          </span>
        </div>

        <div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
            {messages.dashboard.deviceType}
          </span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {item.deviceType}
          </span>
        </div>

        <div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
            {messages.dashboard.region}
          </span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {item.region}
          </span>
        </div>

        <div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
            {messages.dashboard.province}
          </span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {item.province}
          </span>
        </div>
      </div>

      {/* Date info */}
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        <span>{messages.dashboard.registeredAt}: </span>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {formattedDate}
        </span>
      </div>

      {/* Pin Section */}
      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2.5">
        {hasPin ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>
                  {item.latitude?.toFixed(6)}, {item.longitude?.toFixed(6)}
                </span>
              </span>

              <a
                href={buildGoogleMapsUrl(item.latitude!, item.longitude!)}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-google-maps-${item.id}`}
                className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition"
              >
                <span>{messages.dashboard.openInGoogleMaps}</span>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>

            {userRole === 'admin' && (
              <Link
                href={`/admin/map?registrationId=${item.id}`}
                data-testid={`btn-edit-pin-${item.id}`}
                className="w-full text-center px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition"
              >
                {messages.dashboard.editPin}
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
                <span>{messages.dashboard.noPin}</span>
              </span>

              {userRole === 'user' && (
                <span className="italic text-zinc-600 dark:text-zinc-400">
                  {messages.dashboard.waitingAdminPin}
                </span>
              )}
            </div>

            {userRole === 'admin' && (
              <Link
                href={`/admin/map?registrationId=${item.id}`}
                data-testid={`btn-add-pin-${item.id}`}
                className="w-full text-center px-3 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition"
              >
                {messages.dashboard.addPin}
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
