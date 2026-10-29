/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma, ensurePrismaSqliteConfig } from "../lib/db";
import { GET as listRegistrationsHandler } from "../app/api/registrations/route";
import { POST as confirmHandler } from "../app/api/registrations/[id]/confirm/route";
import { PATCH as updatePinHandler } from "../app/api/registrations/[id]/pin/route";
import { GET as getLogsHandler } from "../app/api/registrations/[id]/logs/route";
import { signSession } from "../lib/auth/session";
import { hashPassword } from "../lib/auth/password";
import { createRegistration } from "../lib/registration-repo";

function createJsonRequest(
  url: string,
  method = "GET",
  body?: unknown,
  token?: string
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) {
    headers["cookie"] = `session=${token}`;
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Phase 14: Registration Status, Pinning & Audit Logs API Tests", () => {
  let adminToken: string;
  let userToken: string;
  let adminId: number;
  let userId: number;

  beforeAll(async () => {
    await ensurePrismaSqliteConfig();
    process.env.AUTH_SECRET =
      process.env.AUTH_SECRET ||
      "development-super-secret-key-at-least-32-chars-long-for-tests";
  });

  beforeEach(async () => {
    await prisma.registrationPinLog.deleteMany();
    await prisma.registration.deleteMany();
    await prisma.deviceCounter.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    const pwdHash = await hashPassword("1234");
    const admin = await prisma.user.create({
      data: { username: "admin1", passwordHash: pwdHash, role: "admin" },
    });
    const user = await prisma.user.create({
      data: { username: "user1", passwordHash: pwdHash, role: "user" },
    });

    adminId = admin.id;
    userId = user.id;

    adminToken = await signSession({
      sub: String(adminId),
      username: "admin1",
      role: "admin",
    });

    userToken = await signSession({
      sub: String(userId),
      username: "user1",
      role: "user",
    });
  });

  afterAll(async () => {
    await prisma.registrationPinLog.deleteMany();
    await prisma.registration.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe("GET /api/registrations (Listing & Counts)", () => {
    it("ไม่มี session → 401 Unauthorized", async () => {
      const req = createJsonRequest("http://localhost:3000/api/registrations");
      const res = await listRegistrationsHandler(req);
      expect(res.status).toBe(401);
    });

    it("user และ admin สามารถเรียกดูรายการได้ → 200 พร้อม counts ครบทั้ง 2 สถานะ", async () => {
      // Create 2 UNREGISTERED
      await createRegistration({
        uid: "TEST-01",
        region: "เหนือ",
        province: "เชียงใหม่",
        deviceType: "KSK",
      });
      await createRegistration({
        uid: "TEST-02",
        region: "กลาง",
        province: "กรุงเทพมหานคร",
        deviceType: "KSK",
      });

      const reqUser = createJsonRequest(
        "http://localhost:3000/api/registrations",
        "GET",
        undefined,
        userToken
      );
      const resUser = await listRegistrationsHandler(reqUser);
      expect(resUser.status).toBe(200);

      const json = await resUser.json();
      expect(json.counts.UNREGISTERED).toBe(2);
      expect(json.counts.REGISTERED).toBe(0);
      expect(json.items.length).toBe(2);
      expect(json.total).toBe(2);
    });

    it("กรองด้วย status=UNREGISTERED และ status=REGISTERED ทำงานถูกต้อง", async () => {
      const r1 = await createRegistration({
        uid: "STATUS-01",
        region: "เหนือ",
        province: "เชียงใหม่",
        deviceType: "KSK",
      });

      // Manually mark one as REGISTERED
      await prisma.registration.update({
        where: { id: r1.id },
        data: {
          status: "REGISTERED",
          latitude: 18.7883,
          longitude: 98.9853,
          confirmedAt: new Date(),
          confirmedById: adminId,
        },
      });

      // Create an UNREGISTERED one
      await createRegistration({
        uid: "STATUS-02",
        region: "กลาง",
        province: "กรุงเทพมหานคร",
        deviceType: "KSK",
      });

      // Filter: REGISTERED
      const reqReg = createJsonRequest(
        "http://localhost:3000/api/registrations?status=REGISTERED",
        "GET",
        undefined,
        adminToken
      );
      const resReg = await listRegistrationsHandler(reqReg);
      const jsonReg = await resReg.json();
      expect(jsonReg.total).toBe(1);
      expect(jsonReg.items[0].status).toBe("REGISTERED");
      expect(jsonReg.counts.REGISTERED).toBe(1);
      expect(jsonReg.counts.UNREGISTERED).toBe(1);

      // Filter: UNREGISTERED
      const reqUnreg = createJsonRequest(
        "http://localhost:3000/api/registrations?status=UNREGISTERED",
        "GET",
        undefined,
        adminToken
      );
      const resUnreg = await listRegistrationsHandler(reqUnreg);
      const jsonUnreg = await resUnreg.json();
      expect(jsonUnreg.total).toBe(1);
      expect(jsonUnreg.items[0].status).toBe("UNREGISTERED");
    });

    it("ส่ง status ที่ไม่ถูกต้อง → 400", async () => {
      const req = createJsonRequest(
        "http://localhost:3000/api/registrations?status=INVALID_STATUS",
        "GET",
        undefined,
        adminToken
      );
      const res = await listRegistrationsHandler(req);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/registrations/[id]/confirm", () => {
    it("user ทั่วไปยืนยันไม่ได้ → 403 Forbidden", async () => {
      const reg = await createRegistration({
        uid: "CONF-USER",
        region: "เหนือ",
        province: "เชียงใหม่",
        deviceType: "KSK",
      });

      const req = createJsonRequest(
        `http://localhost:3000/api/registrations/${reg.id}/confirm`,
        "POST",
        { latitude: 18.7883, longitude: 98.9853 },
        userToken
      );

      const res = await confirmHandler(req, {
        params: Promise.resolve({ id: String(reg.id) }),
      });
      expect(res.status).toBe(403);
    });

    it("พิกัดอยู่นอกจังหวัด → 400 PIN_OUTSIDE_PROVINCE", async () => {
      const reg = await createRegistration({
        uid: "CONF-OUTSIDE",
        region: "เหนือ",
        province: "เชียงใหม่",
        deviceType: "KSK",
      });

      // Coordinates for Bangkok sent for Chiang Mai
      const req = createJsonRequest(
        `http://localhost:3000/api/registrations/${reg.id}/confirm`,
        "POST",
        { latitude: 13.7563, longitude: 100.5018 },
        adminToken
      );

      const res = await confirmHandler(req, {
        params: Promise.resolve({ id: String(reg.id) }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("PIN_OUTSIDE_PROVINCE");
    });

    it("admin ยืนยันพิกัดถูกต้อง → 200, สถานะเปลี่ยนเป็น REGISTERED และบันทึก pinLog CONFIRM", async () => {
      const reg = await createRegistration({
        uid: "CONF-SUCCESS",
        region: "เหนือ",
        province: "เชียงใหม่",
        deviceType: "KSK",
      });

      const req = createJsonRequest(
        `http://localhost:3000/api/registrations/${reg.id}/confirm`,
        "POST",
        { latitude: 18.7883, longitude: 98.9853 },
        adminToken
      );

      const res = await confirmHandler(req, {
        params: Promise.resolve({ id: String(reg.id) }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe("REGISTERED");
      expect(json.latitude).toBe(18.7883);
      expect(json.longitude).toBe(98.9853);
      expect(json.confirmedById).toBe(adminId);

      // Verify pin log
      const logs = await prisma.registrationPinLog.findMany({
        where: { registrationId: reg.id },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe("CONFIRM");
      expect(logs[0].oldLatitude).toBeNull();
      expect(logs[0].newLatitude).toBe(18.7883);
      expect(logs[0].actorId).toBe(adminId);
    });

    it("ยืนยันซ้ำรายการเดิมที่ยืนยันแล้ว → 409 ALREADY_REGISTERED", async () => {
      const reg = await createRegistration({
        uid: "CONF-DUP",
        region: "เหนือ",
        province: "เชียงใหม่",
        deviceType: "KSK",
      });

      // First confirm
      const req1 = createJsonRequest(
        `http://localhost:3000/api/registrations/${reg.id}/confirm`,
        "POST",
        { latitude: 18.7883, longitude: 98.9853 },
        adminToken
      );
      const res1 = await confirmHandler(req1, {
        params: Promise.resolve({ id: String(reg.id) }),
      });
      expect(res1.status).toBe(200);

      // Second confirm attempt must fail with 409
      const req2 = createJsonRequest(
        `http://localhost:3000/api/registrations/${reg.id}/confirm`,
        "POST",
        { latitude: 18.7883, longitude: 98.9853 },
        adminToken
      );
      const res2 = await confirmHandler(req2, {
        params: Promise.resolve({ id: String(reg.id) }),
      });
      expect(res2.status).toBe(409);
      const json2 = await res2.json();
      expect(json2.code).toBe("ALREADY_REGISTERED");
    });
  });

  describe("PATCH /api/registrations/[id]/pin (Update Coordinates)", () => {
    it("แก้ไขพิกัดรายการที่ยังไม่ยืนยัน (UNREGISTERED) → 409 NOT_REGISTERED", async () => {
      const reg = await createRegistration({
        uid: "PIN-UNREG",
        region: "เหนือ",
        province: "เชียงใหม่",
        deviceType: "KSK",
      });

      const req = createJsonRequest(
        `http://localhost:3000/api/registrations/${reg.id}/pin`,
        "PATCH",
        { latitude: 18.79, longitude: 98.99 },
        adminToken
      );

      const res = await updatePinHandler(req, {
        params: Promise.resolve({ id: String(reg.id) }),
      });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.code).toBe("NOT_REGISTERED");
    });

    it("แก้ไขพิกัดเป็นค่าเดิมเป๊ะ → 200 โดยไม่เขียน log ซ้ำ", async () => {
      const reg = await createRegistration({
        uid: "PIN-SAME",
        region: "เหนือ",
        province: "เชียงใหม่",
        deviceType: "KSK",
      });

      // Confirm first
      await prisma.registration.update({
        where: { id: reg.id },
        data: {
          status: "REGISTERED",
          latitude: 18.7883,
          longitude: 98.9853,
          confirmedAt: new Date(),
          confirmedById: adminId,
        },
      });

      const req = createJsonRequest(
        `http://localhost:3000/api/registrations/${reg.id}/pin`,
        "PATCH",
        { latitude: 18.7883, longitude: 98.9853 },
        adminToken
      );

      const res = await updatePinHandler(req, {
        params: Promise.resolve({ id: String(reg.id) }),
      });
      expect(res.status).toBe(200);

      // Verify no UPDATE log was written
      const logs = await prisma.registrationPinLog.findMany({
        where: { registrationId: reg.id },
      });
      expect(logs.length).toBe(0);
    });

    it("แก้ไขพิกัดใหม่ในจังหวัดสำเร็จ → 200 และบันทึก pinLog action UPDATE", async () => {
      const reg = await createRegistration({
        uid: "PIN-CHANGE",
        region: "เหนือ",
        province: "เชียงใหม่",
        deviceType: "KSK",
      });

      // Confirm first
      await prisma.registration.update({
        where: { id: reg.id },
        data: {
          status: "REGISTERED",
          latitude: 18.7883,
          longitude: 98.9853,
          confirmedAt: new Date(),
          confirmedById: adminId,
        },
      });

      // Update to new valid Chiang Mai coordinate
      const newLat = 18.7905;
      const newLng = 98.986;

      const req = createJsonRequest(
        `http://localhost:3000/api/registrations/${reg.id}/pin`,
        "PATCH",
        { latitude: newLat, longitude: newLng },
        adminToken
      );

      const res = await updatePinHandler(req, {
        params: Promise.resolve({ id: String(reg.id) }),
      });
      expect(res.status).toBe(200);

      const updated = await prisma.registration.findUnique({
        where: { id: reg.id },
      });
      expect(updated?.latitude).toBe(newLat);
      expect(updated?.longitude).toBe(newLng);

      const logs = await prisma.registrationPinLog.findMany({
        where: { registrationId: reg.id },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe("UPDATE");
      expect(logs[0].oldLatitude).toBe(18.7883);
      expect(logs[0].newLatitude).toBe(newLat);
    });
  });

  describe("GET /api/registrations/[id]/logs (Audit History)", () => {
    it("user เข้าดู logs ไม่ได้ → 403 Forbidden", async () => {
      const reg = await createRegistration({
        uid: "LOGS-USER",
        region: "เหนือ",
        province: "เชียงใหม่",
        deviceType: "KSK",
      });

      const req = createJsonRequest(
        `http://localhost:3000/api/registrations/${reg.id}/logs`,
        "GET",
        undefined,
        userToken
      );

      const res = await getLogsHandler(req, {
        params: Promise.resolve({ id: String(reg.id) }),
      });
      expect(res.status).toBe(403);
    });

    it("admin เข้าดู logs → 200 เรียงใหม่สุดก่อน พร้อมชื่อ actorUsername", async () => {
      const reg = await createRegistration({
        uid: "LOGS-ADMIN",
        region: "เหนือ",
        province: "เชียงใหม่",
        deviceType: "KSK",
      });

      // Add CONFIRM log
      await prisma.registrationPinLog.create({
        data: {
          registrationId: reg.id,
          action: "CONFIRM",
          oldLatitude: null,
          oldLongitude: null,
          newLatitude: 18.7883,
          newLongitude: 98.9853,
          actorId: adminId,
          createdAt: new Date(Date.now() - 10000),
        },
      });

      // Add UPDATE log
      await prisma.registrationPinLog.create({
        data: {
          registrationId: reg.id,
          action: "UPDATE",
          oldLatitude: 18.7883,
          oldLongitude: 98.9853,
          newLatitude: 18.7905,
          newLongitude: 98.986,
          actorId: adminId,
          createdAt: new Date(),
        },
      });

      const req = createJsonRequest(
        `http://localhost:3000/api/registrations/${reg.id}/logs`,
        "GET",
        undefined,
        adminToken
      );

      const res = await getLogsHandler(req, {
        params: Promise.resolve({ id: String(reg.id) }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.items.length).toBe(2);
      expect(json.items[0].action).toBe("UPDATE"); // Newest first
      expect(json.items[0].actorUsername).toBe("admin1");
      expect(json.items[1].action).toBe("CONFIRM");
    });
  });
});
