'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import messages from '@/lib/messages';

const loginFormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, messages.auth.usernameRequired)
    .max(128),
  password: z
    .string()
    .min(1, messages.auth.passwordRequired)
    .max(128),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

const zod4Resolver =
  <T extends z.ZodTypeAny>(schema: T) =>
  async (values: unknown) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues || []) {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = { type: issue.code, message: issue.message };
      }
    }
    return { values: {}, errors };
  };

interface LoginFormProps {
  nextDestination?: string;
  onSuccessRedirect?: (redirectTo: string) => void;
}

export function LoginForm({ nextDestination, onSuccessRedirect }: LoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zod4Resolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
          next: nextDestination,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setServerError(json.error || messages.auth.invalidCredentials);
        return;
      }

      const redirectTo = json.redirectTo || '/dashboard';
      if (onSuccessRedirect) {
        onSuccessRedirect(redirectTo);
      } else {
        window.location.href = redirectTo;
      }
    } catch {
      setServerError(messages.register.unknownError);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    void handleSubmit(onSubmit)(e);
  };

  return (
    <form
      data-testid="login-form"
      onSubmit={handleFormSubmit}
      noValidate
      className="space-y-5"
    >
      {/* Server Error Alert */}
      {serverError && (
        <div
          role="alert"
          data-testid="login-error-banner"
          className="p-3.5 rounded-xl border bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-start gap-2.5 animate-fade-in"
        >
          <svg
            className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium leading-relaxed">{serverError}</span>
        </div>
      )}

      {/* Username Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="username"
          className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300"
        >
          ชื่อผู้ใช้
        </label>
        <input
          id="username"
          data-testid="input-username"
          type="text"
          autoComplete="username"
          disabled={isSubmitting}
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? 'username-error' : undefined}
          {...register('username')}
          className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 transition text-sm ${
            errors.username
              ? 'border-red-500 focus:ring-red-400/40'
              : 'border-zinc-300 dark:border-zinc-700 focus:ring-blue-500/40 focus:border-blue-500'
          }`}
          placeholder="กรอกชื่อผู้ใช้ของคุณ"
        />
        {errors.username && (
          <p
            id="username-error"
            role="alert"
            data-testid="username-error-msg"
            className="text-xs text-red-600 dark:text-red-400 font-medium pt-0.5"
          >
            {errors.username.message}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300"
        >
          รหัสผ่าน
        </label>
        <input
          id="password"
          data-testid="input-password"
          type="password"
          autoComplete="current-password"
          disabled={isSubmitting}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
          className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 transition text-sm ${
            errors.password
              ? 'border-red-500 focus:ring-red-400/40'
              : 'border-zinc-300 dark:border-zinc-700 focus:ring-blue-500/40 focus:border-blue-500'
          }`}
          placeholder="กรอกรหัสผ่าน"
        />
        {errors.password && (
          <p
            id="password-error"
            role="alert"
            data-testid="password-error-msg"
            className="text-xs text-red-600 dark:text-red-400 font-medium pt-0.5"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          id="btn-login-submit"
          data-testid="btn-login-submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none transition shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>กำลังเข้าสู่ระบบ...</span>
            </>
          ) : (
            <span>เข้าสู่ระบบ</span>
          )}
        </button>
      </div>
    </form>
  );
}
