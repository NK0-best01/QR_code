'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RegisterForm } from '@/components/RegisterForm';
import messages from '@/lib/messages';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawParam = searchParams.get('uid');
  const uid = rawParam && rawParam.trim() ? decodeURIComponent(rawParam.trim()) : null;

  useEffect(() => {
    if (!uid) {
      router.replace('/');
    }
  }, [uid, router]);

  const handleBackHome = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('register_uid');
      } catch {
        // ignore
      }
    }
    router.replace('/');
  };

  if (!uid) {
    return (
      <div
        role="status"
        aria-label="กำลังโหลดข้อมูล..."
        className="flex items-center justify-center min-h-[300px]"
      >
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
          aria-hidden="true"
        />
        <span className="sr-only">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-8 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-md space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-700">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {messages.register.title}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            UID: <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{uid}</span>
          </p>
        </div>

        {/* Back button to change UID */}
        <button
          type="button"
          id="btn-back-home"
          data-testid="btn-back-home"
          onClick={handleBackHome}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium py-1.5 px-3 rounded-lg border border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
        >
          {messages.register.backToChangeUid}
        </button>
      </div>

      {/* Main Registration Form with key={uid} to guarantee clean state per UID */}
      <RegisterForm key={uid} uid={uid} onBackHome={handleBackHome} />
    </div>
  );
}

export default function RegisterClient() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="กำลังโหลดข้อมูล..."
          className="flex items-center justify-center min-h-[300px]"
        >
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
            aria-hidden="true"
          />
          <span className="sr-only">กำลังโหลดข้อมูล...</span>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
