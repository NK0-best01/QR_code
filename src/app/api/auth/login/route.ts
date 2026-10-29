import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserByUsername } from "@/lib/auth/user-repo";
import { verifyPassword } from "@/lib/auth/password";
import { signSession, buildSetCookieHeader } from "@/lib/auth/session";
import { safeNextPath, homePathForRole } from "@/lib/auth/guards";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { messages } from "@/lib/messages";

const MAX_BODY_BYTES = 64 * 1024; // 64 KB limit
const LOGIN_RATE_LIMIT = 10; // 10 attempts per minute per IP
const LOGIN_WINDOW_MS = 60_000;

// Valid pre-computed bcrypt hash (cost 10) used for constant-time dummy verification
const DUMMY_BCRYPT_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

const loginSchema = z.object({
  username: z
    .string({ required_error: messages.auth.usernameRequired })
    .trim()
    .min(1, messages.auth.usernameRequired)
    .max(128),
  password: z
    .string({ required_error: messages.auth.passwordRequired })
    .min(1, messages.auth.passwordRequired)
    .max(128),
  next: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // 1. Rate Limiting Check (10 attempts/min per IP)
  const clientIp = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`login:${clientIp}`, {
    limit: LOGIN_RATE_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  });

  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(rateLimit.reset),
  };

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: messages.auth.tooManyLoginAttempts },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(rateLimit.retryAfter),
        },
      }
    );
  }

  // 2. Body Size Check (Header)
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: messages.api.payloadTooLarge },
        { status: 413, headers: rateLimitHeaders }
      );
    }
  }

  // 3. Body Text Extraction & Size Check
  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json(
      { error: messages.api.invalidJson },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  if (rawText.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: messages.api.payloadTooLarge },
      { status: 413, headers: rateLimitHeaders }
    );
  }

  // 4. JSON Parse
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: messages.api.invalidJson },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  // 5. Schema Validation
  const parseResult = loginSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const firstError =
      parseResult.error.issues?.[0]?.message ||
      parseResult.error.errors?.[0]?.message ||
      messages.auth.invalidCredentials;
    return NextResponse.json(
      { error: firstError },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  const { username, password, next } = parseResult.data;

  // 6. User Lookup & Timing-Attack-Safe Verification
  const user = await findUserByUsername(username);

  let passwordValid = false;
  if (user) {
    passwordValid = await verifyPassword(password, user.passwordHash);
  } else {
    // Perform dummy hash comparison so execution time remains indistinguishable
    await verifyPassword(password, DUMMY_BCRYPT_HASH);
  }

  if (!user || !passwordValid) {
    return NextResponse.json(
      { error: messages.auth.invalidCredentials },
      { status: 401, headers: rateLimitHeaders }
    );
  }

  // 7. Sign Session JWT (24h)
  const token = await signSession({
    sub: String(user.id),
    username: user.username,
    role: user.role,
  });

  const setCookieHeader = buildSetCookieHeader(token);
  const defaultHome = homePathForRole(user.role);
  const targetNext = safeNextPath(next, defaultHome);

  const response = NextResponse.json(
    {
      success: true,
      role: user.role,
      username: user.username,
      redirectTo: targetNext,
    },
    {
      status: 200,
      headers: rateLimitHeaders,
    }
  );

  response.headers.set("Set-Cookie", setCookieHeader);
  return response;
}
