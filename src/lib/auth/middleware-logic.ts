import { NextResponse } from "next/server";
import { verifySession, extractTokenFromCookieHeader } from "@/lib/auth/session";
import { safeNextPath, homePathForRole } from "@/lib/auth/guards";

export interface MiddlewareResult {
  action: "next" | "redirect";
  redirectUrl?: string;
}

/**
 * Pure evaluation logic for auth route protection.
 * Can be tested directly with mock requests/cookies without running Next.js server.
 */
export async function evaluateAuthMiddleware(
  pathname: string,
  search: string,
  cookieHeader: string | null | undefined,
  origin: string
): Promise<MiddlewareResult> {
  const token = extractTokenFromCookieHeader(cookieHeader);
  const session = token ? await verifySession(token) : null;

  // 1. /login page
  if (pathname === "/login") {
    if (session) {
      // User is already logged in -> redirect to next destination or role home
      const searchParams = new URLSearchParams(search);
      const nextParam = searchParams.get("next");
      const destination = safeNextPath(nextParam, homePathForRole(session.role));
      return {
        action: "redirect",
        redirectUrl: new URL(destination, origin).toString(),
      };
    }
    return { action: "next" };
  }

  // 2. /admin exact path -> redirect to /dashboard (or role home)
  if (pathname === "/admin") {
    if (!session) {
      const loginUrl = new URL("/login?next=%2Fadmin", origin);
      return { action: "redirect", redirectUrl: loginUrl.toString() };
    }
    return {
      action: "redirect",
      redirectUrl: new URL("/dashboard", origin).toString(),
    };
  }

  // 3. /admin/* paths (e.g. /admin/map)
  if (pathname.startsWith("/admin/")) {
    if (!session) {
      const fullPath = pathname + search;
      const loginUrl = new URL(`/login?next=${encodeURIComponent(fullPath)}`, origin);
      return { action: "redirect", redirectUrl: loginUrl.toString() };
    }
    if (session.role !== "admin") {
      // Non-admin trying to access /admin/* -> redirect to /dashboard
      return {
        action: "redirect",
        redirectUrl: new URL("/dashboard", origin).toString(),
      };
    }
    return { action: "next" };
  }

  // 4. /dashboard and /dashboard/* paths
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!session) {
      const fullPath = pathname + search;
      const loginUrl = new URL(`/login?next=${encodeURIComponent(fullPath)}`, origin);
      return { action: "redirect", redirectUrl: loginUrl.toString() };
    }
    return { action: "next" };
  }

  // All other routes untouched
  return { action: "next" };
}

/**
 * Handle Next.js request using pure evaluation logic
 */
export async function handleAuthMiddleware(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (hostHeader) {
    url.host = hostHeader;
  }
  if (url.hostname === "0.0.0.0") {
    url.hostname = "localhost";
  }

  const cookieHeader = request.headers.get("cookie");

  const result = await evaluateAuthMiddleware(
    url.pathname,
    url.search,
    cookieHeader,
    url.origin
  );

  if (result.action === "redirect" && result.redirectUrl) {
    return NextResponse.redirect(result.redirectUrl);
  }

  return NextResponse.next();
}
