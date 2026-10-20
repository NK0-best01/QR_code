import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma, ensurePrismaSqliteConfig } from '../lib/db';
import { POST as registerHandler } from '../app/api/registrations/route';
import { GET as existsHandler } from '../app/api/uids/[uid]/exists/route';
import { GET as nextHandler } from '../app/api/device-types/[code]/next/route';

function createJsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Phase 4A: API Route Handlers Tests', () => {
  beforeAll(async () => {
    await ensurePrismaSqliteConfig();
  });

  beforeEach(async () => {
    await prisma.registration.deleteMany();
    await prisma.deviceCounter.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/registrations', () => {
    it('ข้อมูลครบ → 201 และ deviceId ขึ้นต้นด้วย deviceType', async () => {
      const req = createJsonRequest('http://localhost:3000/api/registrations', {
        uid: 'API-UID-001',
        region: 'เหนือ',
        province: 'เชียงใหม่',
        deviceType: 'KSK',
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.deviceId).toBe('KSK-0001');
      expect(json.uid).toBe('API-UID-001');
      expect(json.deviceType).toBe('KSK');
      expect(json.region).toBe('เหนือ');
      expect(json.province).toBe('เชียงใหม่');
    });

    it('ข้อมูลไม่ครบ หรือ deviceType ผิด → 400', async () => {
      // Missing province
      const req1 = createJsonRequest('http://localhost:3000/api/registrations', {
        uid: 'BAD-1',
        region: 'เหนือ',
        deviceType: 'KSK',
      });
      const res1 = await registerHandler(req1);
      expect(res1.status).toBe(400);

      // Invalid deviceType
      const req2 = createJsonRequest('http://localhost:3000/api/registrations', {
        uid: 'BAD-2',
        region: 'เหนือ',
        province: 'เชียงใหม่',
        deviceType: 'ROBOT',
      });
      const res2 = await registerHandler(req2);
      expect(res2.status).toBe(400);
    });

    it('จังหวัดไม่อยู่ในภาคที่ระบุ → 400', async () => {
      const req = createJsonRequest('http://localhost:3000/api/registrations', {
        uid: 'BAD-REGION-PROV',
        region: 'เหนือ',
        province: 'กรุงเทพมหานคร', // กทม. อยู่ภาคกลาง ไม่ใช่เหนือ
        deviceType: 'KSK',
      });
      const res = await registerHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Validation failed');
    });

    it('uid ยาวเกิน 128 ตัวอักษร หรือมีอักขระควบคุม → 400', async () => {
      // Long UID > 128 chars
      const longUid = 'U'.repeat(129);
      const req1 = createJsonRequest('http://localhost:3000/api/registrations', {
        uid: longUid,
        region: 'กลาง',
        province: 'กรุงเทพมหานคร',
        deviceType: 'KPD',
      });
      const res1 = await registerHandler(req1);
      expect(res1.status).toBe(400);

      // Control char (\x00)
      const req2 = createJsonRequest('http://localhost:3000/api/registrations', {
        uid: 'UID\x00INJECTION',
        region: 'กลาง',
        province: 'กรุงเทพมหานคร',
        deviceType: 'KPD',
      });
      const res2 = await registerHandler(req2);
      expect(res2.status).toBe(400);
    });

    it('POST uid ซ้ำ → 409 และ counter ไม่เพิ่ม', async () => {
      const body = {
        uid: 'REPEAT-UID-123',
        region: 'ใต้',
        province: 'สงขลา',
        deviceType: 'MNU',
      };

      const res1 = await registerHandler(
        createJsonRequest('http://localhost:3000/api/registrations', body)
      );
      expect(res1.status).toBe(201);

      // Second request with same UID
      const res2 = await registerHandler(
        createJsonRequest('http://localhost:3000/api/registrations', body)
      );
      expect(res2.status).toBe(409);

      const json2 = await res2.json();
      expect(json2.error).toContain('ลงทะเบียนแล้ว');

      // Verify counter stayed at 1
      const counter = await prisma.deviceCounter.findUnique({
        where: { deviceType: 'MNU' },
      });
      expect(counter?.lastSeq).toBe(1);
    });

    it('SQL injection ใน uid เช่น \'; DROP TABLE-- → เก็บเป็นข้อความธรรมดา ตารางยังอยู่', async () => {
      const sqlInjectionUid = "'; DROP TABLE Registration;--";
      const req = createJsonRequest('http://localhost:3000/api/registrations', {
        uid: sqlInjectionUid,
        region: 'ตะวันออก',
        province: 'ระยอง',
        deviceType: 'KSK',
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.uid).toBe(sqlInjectionUid);

      // Verify table is intact
      const count = await prisma.registration.count();
      expect(count).toBe(1);
    });

    it('ยิง POST พร้อมกัน 20 request ผ่าน route handler → deviceId ไม่ซ้ำ', async () => {
      const count = 20;
      const promises = Array.from({ length: count }, (_, i) =>
        registerHandler(
          createJsonRequest('http://localhost:3000/api/registrations', {
            uid: `PARALLEL-API-${i + 1}`,
            region: 'กลาง',
            province: 'กรุงเทพมหานคร',
            deviceType: 'KSK',
          })
        )
      );

      const responses = await Promise.all(promises);
      const statuses = responses.map((r) => r.status);
      expect(statuses.every((s) => s === 201)).toBe(true);

      const bodies = await Promise.all(responses.map((r) => r.json()));
      const deviceIds = new Set(bodies.map((b) => b.deviceId));
      expect(deviceIds.size).toBe(count);
    });
  });

  describe('GET /api/device-types/[code]/next', () => {
    it('code ที่มีอยู่ → 200 { deviceId } และไม่เพิ่ม counter', async () => {
      const req = new NextRequest('http://localhost:3000/api/device-types/KSK/next');
      const res = await nextHandler(req, {
        params: Promise.resolve({ code: 'KSK' }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.deviceId).toBe('KSK-0001');

      // Check counter was not incremented in DB
      const counter = await prisma.deviceCounter.findUnique({
        where: { deviceType: 'KSK' },
      });
      expect(counter).toBeNull();
    });

    it('code ที่ไม่มี → 404', async () => {
      const req = new NextRequest('http://localhost:3000/api/device-types/UNKNOWN/next');
      const res = await nextHandler(req, {
        params: Promise.resolve({ code: 'UNKNOWN' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/uids/[uid]/exists', () => {
    it('คืนค่าถูกต้องทั้งกรณีมีและไม่มี รวมถึง uid ที่มีอักขระพิเศษ', async () => {
      // 1. When UID does not exist
      const req1 = new NextRequest('http://localhost:3000/api/uids/NOT-EXIST/exists');
      const res1 = await existsHandler(req1, {
        params: Promise.resolve({ uid: 'NOT-EXIST' }),
      });
      expect(res1.status).toBe(200);
      expect((await res1.json()).exists).toBe(false);

      // Create record with special chars in UID
      const specialUid = 'SN#123/45=X%2B&THAI_ไทย';
      await registerHandler(
        createJsonRequest('http://localhost:3000/api/registrations', {
          uid: specialUid,
          region: 'ใต้',
          province: 'ตรัง',
          deviceType: 'KPD',
        })
      );

      // 2. When UID exists (with URI encoding)
      const encodedParam = encodeURIComponent(specialUid);
      const req2 = new NextRequest(
        `http://localhost:3000/api/uids/${encodedParam}/exists`
      );
      const res2 = await existsHandler(req2, {
        params: Promise.resolve({ uid: encodedParam }),
      });
      expect(res2.status).toBe(200);
      expect((await res2.json()).exists).toBe(true);
    });
  });
});
