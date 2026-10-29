import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import Link from "next/link";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1
            data-testid="dashboard-heading"
            className="text-2xl font-bold tracking-tight"
          >
            แผงควบคุมระบบ (Dashboard)
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            ยินดีต้อนรับคุณ{" "}
            <span data-testid="user-username" className="font-semibold text-zinc-800 dark:text-zinc-200">
              {session.username}
            </span>{" "}
            บทบาท:{" "}
            <span
              data-testid="user-role"
              className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            >
              {session.role}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {session.role === "admin" && (
            <Link
              href="/admin/map"
              data-testid="link-admin-map"
              className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
            >
              แผนที่อุปกรณ์
            </Link>
          )}

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              id="btn-logout"
              data-testid="btn-logout"
              className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition cursor-pointer"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      </header>

      <main className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <h2 className="text-lg font-semibold">ภาพรวมระบบ (Phase 12 Placeholder)</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          ระบบยืนยันตัวตนทำงานสมบูรณ์แล้ว หน้ารายการลงทะเบียนแบบเต็มจะพัฒนาต่อใน Phase 15
        </p>
      </main>
    </div>
  );
}
