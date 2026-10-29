/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma, ensurePrismaSqliteConfig } from "../lib/db";
import { POST as loginHandler } from "../app/api/auth/login/route";
import { POST as logoutHandler } from "../app/api/auth/logout/route";
import { GET as meHandler } from "../app/api/auth/me/route";
import {
  signSession,
  verifySession,
  buildSetCookieHeader,
  buildClearCookieHeader,
  extractTokenFromCookieHeader,
  getSessionFromRequest,
  SESSION_MAX_AGE_SECONDS,
} from "../lib/auth/session";
import { safeNextPath, requireSession, requireRole } from "../lib/auth/guards";
import { hashPassword } from "../lib/auth/password";
import { resetRateLimitStore } from "../lib/rate-limit";
import messages from "../lib/messages";

function createJsonRequest(
  url: string,
  body: unknown,
  options?: { headers?: Record<string, string>; method?: string }
): NextRequest {
  const method = options?.method || "POST";
  return new NextRequest(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(options?.headers || {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function createGetRequest(
  url: string,
  options?: { headers?: Record<string, string> }
): NextRequest {
  return new NextRequest(url, {
    method: "GET",
    headers: options?.headers || {},
  });
}

describe("Phase 11: Auth API & Session Tests", () => {
  beforeAll(async () => {
    await ensurePrismaSqliteConfig();
  });

  beforeEach(async () => {
    resetRateLimitStore();
    await prisma.user.deleteMany();

    // Seed test users
    const adminHash = await hashPassword("1234");
    const userHash = await hashPassword("1234");

    await prisma.user.create({
      data: {
        username: "admin1",
        passwordHash: adminHash,
        role: "admin",
      },
    });

    await prisma.user.create({
      data: {
        username: "user1",
        passwordHash: userHash,
        role: "user",
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe("Session JWT & Cookie Helpers", () => {
    it("signSession และ verifySession คืนข้อมูล payload ถูกต้อง", async () => {
      const token = await signSession({
        sub: "user-123",
        username: "testuser",
        role: "admin",
      });

      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);

      const payload = await verifySession(token);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe("user-123");
      expect(payload?.username).toBe("testuser");
      expect(payload?.role).toBe("admin");
    });

    it("verifySession คืน null เมื่อ token เสีย หรือถูกดัดแปลง", async () => {
      const invalidToken = "invalid.jwt.token";
      expect(await verifySession(invalidToken)).toBeNull();

      const validToken = await signSession({
        sub: "user-123",
        username: "testuser",
        role: "user",
      });

      // Tamper signature
      const tampered = validToken.slice(0, -4) + "XXXX";
      expect(await verifySession(tampered)).toBeNull();
    });

    it("buildSetCookieHeader มีค่า Max-Age=86400, HttpOnly, SameSite=Lax", () => {
      const header = buildSetCookieHeader("fake-jwt-token", false);
      expect(header).toContain("session=fake-jwt-token");
      expect(header).toContain("Path=/");
      expect(header).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);
      expect(header).toContain("HttpOnly");
      expect(header).toContain("SameSite=Lax");
      expect(header).not.toContain("Secure");

      // In production mode, must include Secure
      const prodHeader = buildSetCookieHeader("fake-jwt-token", true);
      expect(prodHeader).toContain("Secure");
    });

    it("buildClearCookieHeader มีค่า Max-Age=0 เพื่อลบ cookie", () => {
      const header = buildClearCookieHeader(false);
      expect(header).toContain("session=");
      expect(header).toContain("Max-Age=0");
      expect(header).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    });

    it("extractTokenFromCookieHeader ดึงค่า token จาก cookie header ได้อย่างถูกต้อง", () => {
      const cookieStr = "foo=bar; session=jwt_token_value_123; other=baz";
      expect(extractTokenFromCookieHeader(cookieStr)).toBe("jwt_token_value_123");
      expect(extractTokenFromCookieHeader("other=baz")).toBeNull();
      expect(extractTokenFromCookieHeader("")).toBeNull();
      expect(extractTokenFromCookieHeader(null)).toBeNull();
    });

    it("getSessionFromRequest ดึง session จาก request ได้", async () => {
      const token = await signSession({
        sub: "user-001",
        username: "user1",
        role: "user",
      });

      const req = createGetRequest("http://localhost:3000/api/auth/me", {
        headers: { cookie: `session=${token}` },
      });

      const session = await getSessionFromRequest(req);
      expect(session).not.toBeNull();
      expect(session?.username).toBe("user1");
    });
  });

  describe("Auth Guards & URL Sanitization", () => {
    it("safeNextPath อนุญาตเฉพาะ relative path ที่ปลอดภัย", () => {
      expect(safeNextPath("/dashboard")).toBe("/dashboard");
      expect(safeNextPath("/admin/users")).toBe("/admin/users");
      expect(safeNextPath("/profile?tab=settings")).toBe("/profile?tab=settings");

      // Open redirect patterns must be blocked and fallback to /dashboard
      expect(safeNextPath("//evil.com")).toBe("/dashboard");
      expect(safeNextPath("/\\evil.com")).toBe("/dashboard");
      expect(safeNextPath("https://evil.com")).toBe("/dashboard");
      expect(safeNextPath("javascript:alert(1)")).toBe("/dashboard");
      expect(safeNextPath(null)).toBe("/dashboard");
      expect(safeNextPath("")).toBe("/dashboard");
    });

    it("requireSession คืน 401 เมื่อไม่มี session", async () => {
      const req = createGetRequest("http://localhost:3000/api/test");
      const { session, errorResponse } = await requireSession(req);
      expect(session).toBeNull();
      expect(errorResponse).not.toBeNull();
      expect(errorResponse?.status).toBe(401);
    });

    it("requireRole ปฏิเสธเมื่อ role ไม่ได้รับอนุญาต (403)", async () => {
      const token = await signSession({
        sub: "u-1",
        username: "user1",
        role: "user",
      });
      const req = createGetRequest("http://localhost:3000/api/admin-only", {
        headers: { cookie: `session=${token}` },
      });

      const { session, errorResponse } = await requireRole(req, "admin");
      expect(session).toBeNull();
      expect(errorResponse?.status).toBe(403);
    });

    it("requireRole อนุญาตเมื่อ role ตรงกับ allow-list", async () => {
      const token = await signSession({
        sub: "u-1",
        username: "admin1",
        role: "admin",
      });
      const req = createGetRequest("http://localhost:3000/api/admin-only", {
        headers: { cookie: `session=${token}` },
      });

      const { session, errorResponse } = await requireRole(req, "admin");
      expect(errorResponse).toBeNull();
      expect(session).not.toBeNull();
      expect(session?.role).toBe("admin");
    });
  });

  describe("POST /api/auth/login", () => {
    it("เข้าสู่ระบบ admin สำเร็จ → 200, role admin, redirectTo /dashboard, Set-Cookie 24h", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/login", {
        username: "admin1",
        password: "1234",
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.role).toBe("admin");
      expect(json.username).toBe("admin1");
      expect(json.redirectTo).toBe("/dashboard");

      const cookieHeader = res.headers.get("Set-Cookie");
      expect(cookieHeader).not.toBeNull();
      expect(cookieHeader).toContain("session=");
      expect(cookieHeader).toContain("Max-Age=86400");
    });

    it("เข้าสู่ระบบ user สำเร็จ และรองรับ safe next parameter", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/login", {
        username: "user1",
        password: "1234",
        next: "/devices",
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.role).toBe("user");
      expect(json.redirectTo).toBe("/devices");
    });

    it("ป้องกัน Open Redirect เมื่อส่ง next เป็นภายนอก", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/login", {
        username: "user1",
        password: "1234",
        next: "https://evil.com/phishing",
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.redirectTo).toBe("/dashboard");
    });

    it("รหัสผ่านผิด → 401 ข้อความเดียวกันเป๊ะ", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/login", {
        username: "admin1",
        password: "wrongpassword",
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toBe(messages.auth.invalidCredentials);
    });

    it("ไม่พบชื่อผู้ใช้ → 401 ข้อความเดียวกันเป๊ะ (User Enumeration Defense)", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/login", {
        username: "nonexistent_user",
        password: "anypassword",
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toBe(messages.auth.invalidCredentials);
    });

    it("ไม่กรอก username หรือ password → 400", async () => {
      const reqEmpty = createJsonRequest("http://localhost:3000/api/auth/login", {
        username: "",
        password: "123",
      });
      const resEmpty = await loginHandler(reqEmpty);
      expect(resEmpty.status).toBe(400);

      const reqNoPass = createJsonRequest("http://localhost:3000/api/auth/login", {
        username: "admin1",
        password: "",
      });
      const resNoPass = await loginHandler(reqNoPass);
      expect(resNoPass.status).toBe(400);
    });

    it("JSON ไม่ถูกต้อง → 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ bad json",
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe(messages.api.invalidJson);
    });

    it("Payload เกิน 64KB → 413", async () => {
      const largeData = "x".repeat(65 * 1024);
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(largeData.length),
        },
        body: largeData,
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.error).toBe(messages.api.payloadTooLarge);
    });

    it("Rate Limiting: ยิงเกิน 10 ครั้งต่อนาทีต่อ IP → 429 และ Retry-After", async () => {
      // Send 10 valid or invalid attempts
      for (let i = 0; i < 10; i++) {
        const req = createJsonRequest(
          "http://localhost:3000/api/auth/login",
          { username: "admin1", password: "wrong" },
          { headers: { "x-forwarded-for": "192.168.1.100" } }
        );
        const res = await loginHandler(req);
        expect(res.status).toBe(401);
      }

      // 11th request must receive 429
      const req11 = createJsonRequest(
        "http://localhost:3000/api/auth/login",
        { username: "admin1", password: "wrong" },
        { headers: { "x-forwarded-for": "192.168.1.100" } }
      );
      const res11 = await loginHandler(req11);
      expect(res11.status).toBe(429);
      expect(res11.headers.get("Retry-After")).not.toBeNull();
      const json11 = await res11.json();
      expect(json11.error).toBe(messages.auth.tooManyLoginAttempts);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("ออกจากระบบสำเร็จ → 200 และคืน Set-Cookie เคลียร์ session", async () => {
      const res = await logoutHandler();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);

      const cookieHeader = res.headers.get("Set-Cookie");
      expect(cookieHeader).not.toBeNull();
      expect(cookieHeader).toContain("session=");
      expect(cookieHeader).toContain("Max-Age=0");
    });
  });

  describe("GET /api/auth/me", () => {
    it("ยังไม่เข้าสู่ระบบ → 401", async () => {
      const req = createGetRequest("http://localhost:3000/api/auth/me");
      const res = await meHandler(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.authenticated).toBe(false);
      expect(json.error).toBe(messages.auth.unauthorized);
    });

    it("เข้าสู่ระบบแล้ว → 200 พร้อมข้อมูล id, username, role", async () => {
      const token = await signSession({
        sub: "user-id-999",
        username: "admin1",
        role: "admin",
      });

      const req = createGetRequest("http://localhost:3000/api/auth/me", {
        headers: { cookie: `session=${token}` },
      });

      const res = await meHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.authenticated).toBe(true);
      expect(json.user.id).toBe("user-id-999");
      expect(json.user.username).toBe("admin1");
      expect(json.user.role).toBe("admin");
    });
  });
});
