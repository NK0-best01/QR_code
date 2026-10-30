import React from 'react';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import PortalSidebar from '@/components/PortalSidebar';
import RegisterClient from '@/components/RegisterClient';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row">
        <PortalSidebar username={session.username} role={session.role} />
        <div className="flex-1 md:pl-64 flex flex-col min-w-0">
          <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative min-h-screen">
            <RegisterClient />
          </main>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      <RegisterClient />
    </main>
  );
}
