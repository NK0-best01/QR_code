import React, { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import AdminMapClient from '@/components/AdminMapClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminMapPage({ searchParams }: PageProps) {
  // 1. Session and Role Guard (Server-Side)
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'admin') {
    redirect('/dashboard');
  }

  // 2. Parse query parameters
  const resolvedSearchParams = await searchParams;
  const rawId = resolvedSearchParams.registrationId;
  const parsedId =
    typeof rawId === 'string' && /^\d+$/.test(rawId) ? parseInt(rawId, 10) : null;

  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
          <div>กำลังโหลดข้อมูลแผนที่...</div>
        </div>
      }
    >
      <AdminMapClient initialRegistrationId={parsedId} />
    </Suspense>
  );
}
