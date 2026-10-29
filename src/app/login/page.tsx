import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { safeNextPath, homePathForRole } from "@/lib/auth/guards";
import { LoginForm } from "@/components/LoginForm";
import Link from "next/link";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  const resolvedSearchParams = await searchParams;
  const nextParam = resolvedSearchParams.next;

  if (sessionToken) {
    const session = await verifySession(sessionToken);
    if (session) {
      const destination = safeNextPath(nextParam, homePathForRole(session.role));
      redirect(destination);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-zinc-50 via-zinc-100 to-zinc-200 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-zinc-200 dark:border-zinc-800 animate-fade-in space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            เข้าสู่ระบบ
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            ระบบจัดการและลงทะเบียนอุปกรณ์
          </p>
        </div>

        {/* Login Form */}
        <LoginForm nextDestination={nextParam} />

        {/* Footer Link */}
        <div className="pt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
          <Link
            href="/"
            className="hover:text-blue-600 dark:hover:text-blue-400 underline transition"
          >
            ← กลับสู่หน้าหลักการสแกน QR Code
          </Link>
        </div>
      </div>
    </main>
  );
}
