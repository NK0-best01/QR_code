import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { isValidRole, type Role } from "@/data/roles";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 86400; // 24 hours in seconds

export interface SessionPayload extends JWTPayload {
  sub: string;
  username: string;
  role: Role;
}

export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error("AUTH_SECRET is not set or is shorter than 32 characters!");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Returns a CryptoKey for HS256 signing and verification.
 * Works seamlessly across Node.js, Next.js Edge, Browsers, and Vitest jsdom realms.
 */
export async function getAuthKey(): Promise<CryptoKey | Uint8Array> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error("AUTH_SECRET is not set or is shorter than 32 characters!");
  }

  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const raw = new TextEncoder().encode(secret);
      return await crypto.subtle.importKey(
        "raw",
        raw,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      );
    } catch {
      // Fallback to Uint8Array if WebCrypto is unavailable
    }
  }

  return new TextEncoder().encode(secret);
}

/**
 * Signs a new JWT session with 24 hours expiration.
 */
export async function signSession(payload: { sub: string; username: string; role: Role }): Promise<string> {
  const key = await getAuthKey();
  return new SignJWT({
    username: payload.username,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(key);
}

/**
 * Verifies JWT token and validates role against strict allow-list.
 * Returns decoded SessionPayload or null if invalid, expired, or tampered.
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const key = await getAuthKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }
    if (!payload.username || typeof payload.username !== "string") {
      return null;
    }
    if (!payload.role || typeof payload.role !== "string" || !isValidRole(payload.role)) {
      return null;
    }

    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch {
    return null;
  }
}

/**
 * Builds the Set-Cookie header value for establishing a session.
 */
export function buildSetCookieHeader(token: string, isProduction = process.env.NODE_ENV === "production"): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Builds the Set-Cookie header value for destroying a session on logout.
 */
export function buildClearCookieHeader(isProduction = process.env.NODE_ENV === "production"): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Extracts session token from Cookie header string.
 */
export function extractTokenFromCookieHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookie) {
    return null;
  }

  const token = sessionCookie.substring(SESSION_COOKIE_NAME.length + 1).trim();
  return token || null;
}

/**
 * Verifies session directly from request Cookie header.
 */
export async function getSessionFromRequest(request: Request): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get("cookie");
  const token = extractTokenFromCookieHeader(cookieHeader);
  if (!token) {
    return null;
  }
  return verifySession(token);
}
