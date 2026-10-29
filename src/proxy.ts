import { NextRequest } from "next/server";
import { handleAuthMiddleware } from "@/lib/auth/middleware-logic";

export async function proxy(request: NextRequest) {
  return handleAuthMiddleware(request);
}

// Keep export for backwards compatibility
export async function middleware(request: NextRequest) {
  return handleAuthMiddleware(request);
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
    "/login",
  ],
};
