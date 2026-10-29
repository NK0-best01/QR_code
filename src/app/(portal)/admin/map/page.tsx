import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import Link from "next/link";

export default async function AdminMapPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
      <header className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1
            data-testid="admin-map-heading"
            className="text-2xl font-bold tracking-tight"
          >
            แผนที่ปักหมุดอุปกรณ์ (Admin Map - Phase 12 Placeholder)
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            ระบบแผนที่จะพัฒนาตัวแสดงผลและปักหมุดใน Phase 16
          </p>
        </div>

        <Link
          href="/dashboard"
          data-testid="link-back-dashboard"
          className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
        >
          ← กลับหน้าแดชบอร์ด
        </Link>
      </header>

      <main className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          เข้าถึงสำเร็จเฉพาะผู้ดูแลระบบ (Role: admin)
        </p>
      </main>
    </div>
  );
}
