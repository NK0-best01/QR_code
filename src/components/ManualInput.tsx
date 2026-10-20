'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  validateUidLocally,
  checkUidExists,
  buildRegisterUrl,
} from '@/lib/uid-navigation';
import messages from '@/lib/messages';

interface ManualInputProps {
  onCancel?: () => void;
  onSuccess?: (uid: string) => void;
}

export function ManualInput({ onCancel, onSuccess }: ManualInputProps) {
  const router = useRouter();
  const [uid, setUid] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Local validation (trim, not empty, max length, no control chars)
    const localValidation = validateUidLocally(uid);
    if (!localValidation.isValid || !localValidation.trimmedUid) {
      setError(localValidation.error || messages.manualInput.emptyError);
      return;
    }

    const trimmed = localValidation.trimmedUid;
    setIsChecking(true);

    try {
      // 2. Check UID duplicate on server
      const exists = await checkUidExists(trimmed);
      if (exists) {
        setError(messages.register.uidAlreadyRegistered);
        setIsChecking(false);
        return;
      }

      // 3. Save to sessionStorage and navigate or trigger success
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('register_uid', trimmed);
        } catch {
          // ignore
        }
      }

      if (onSuccess) {
        onSuccess(trimmed);
      } else {
        router.push(buildRegisterUrl(trimmed));
      }
    } catch {
      setError(messages.register.unknownError);
      setIsChecking(false);
    }
  };

  return (
    <form
      data-testid="manual-input-form"
      onSubmit={handleSubmit}
      className="w-full max-w-md mx-auto p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-md space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {messages.manualInput.title}
        </h2>
        {onCancel && (
          <button
            type="button"
            id="btn-cancel-manual-uid"
            data-testid="btn-cancel-manual-uid"
            onClick={onCancel}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
          >
            ยกเลิก
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <input
          id="input-manual-uid"
          data-testid="input-manual-uid"
          type="text"
          value={uid}
          onChange={(e) => {
            setUid(e.target.value);
            if (error) setError(null);
          }}
          disabled={isChecking}
          placeholder={messages.manualInput.placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? 'manual-uid-error' : undefined}
          autoFocus
          className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />

        {error && (
          <p
            id="manual-uid-error"
            role="alert"
            data-testid="manual-uid-error"
            className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900"
          >
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          id="btn-submit-manual-uid"
          data-testid="btn-submit-manual-uid"
          disabled={isChecking}
          className="w-full py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>กำลังตรวจสอบ...</span>
            </>
          ) : (
            <span>{messages.manualInput.submit}</span>
          )}
        </button>
      </div>
    </form>
  );
}

export default ManualInput;
