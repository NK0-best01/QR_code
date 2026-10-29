import { NextResponse } from "next/server";
import { type Role, isValidRole } from "@/data/roles";
import { getSessionFromRequest, type SessionPayload } from "@/lib/auth/session";
import { messages } from "@/lib/messages";

export const DEFAULT_AUTH_REDIRECT = "/dashboard";

/**
 * Validates and sanitizes the next path parameter to prevent Open Redirect attacks.
 * Allowed: Paths starting with a single '/' followed by valid path characters.
 * Blocked: Absolute URLs, protocol-relative '//', backslash escape '/\', javascript:, data:, etc.
 */
export function safeNextPath(next: string | null | undefined, defaultPath = DEFAULT_AUTH_REDIRECT): string {
  if (!next || typeof next !== "string") {
    return defaultPath;
  }

  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return defaultPath;
  }

  // Reject dangerous protocols or control characters even if encoded
  const lowercase = trimmed.toLowerCase();
  if (
    lowercase.includes("javascript:") ||
    lowercase.includes("data:") ||
    lowercase.includes("vbscript:") ||
    /[\x00-\x1F\x7F]/.test(trimmed)
  ) {
    return defaultPath;
  }

  return trimmed;
}

/**
 * Returns default home path based on user role.
 * In this project, both admin and user default to /dashboard (Q3).
 */
export function homePathForRole(role: Role): string {
  if (isValidRole(role)) {
    return "/dashboard";
  }
  return DEFAULT_AUTH_REDIRECT;
}

/**
 * Guard for API routes: Requires an authenticated session.
 * Returns either the verified session or an unauthorized 401 NextResponse.
 */
export async function requireSession(request: Request): Promise<
  | { session: SessionPayload; errorResponse: null }
  | { session: null; errorResponse: NextResponse }
> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: messages.auth.unauthorized },
        { status: 401 }
      ),
    };
  }

  return { session, errorResponse: null };
}

/**
 * Guard for API routes: Requires session with specific allowed role(s).
 * Enforces strict allow-list check.
 */
export async function requireRole(
  request: Request,
  allowedRoles: Role | Role[]
): Promise<
  | { session: SessionPayload; errorResponse: null }
  | { session: null; errorResponse: NextResponse }
> {
  const { session, errorResponse } = await requireSession(request);
  if (errorResponse) {
    return { session: null, errorResponse };
  }

  const allowedList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!allowedList.includes(session.role)) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: messages.auth.forbidden },
        { status: 403 }
      ),
    };
  }

  return { session, errorResponse: null };
}
