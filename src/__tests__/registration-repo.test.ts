import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { prisma, ensurePrismaSqliteConfig } from '../lib/db';
import {
  createRegistration,
  peekNextSeq,
  findByUid,
  DuplicateUidError,
} from '../lib/registration-repo';
import { PrismaClient } from '@prisma/client';

describe('Phase 4A: Registration Repository Tests', () => {
  beforeAll(async () => {
    await ensurePrismaSqliteConfig();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.registration.deleteMany();
    await prisma.deviceCounter.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('จอง KSK 2 ครั้ง, KPD 1 ครั้ง → KSK-0001, KSK-0002, KPD-0001', async () => {
    const ksk1 = await createRegistration({
      uid: 'KSK-U1',
      region: 'เหนือ',
      province: 'เชียงใหม่',
      deviceType: 'KSK',
    });
    expect(ksk1.deviceId).toBe('KSK-0001');
    expect(ksk1.seq).toBe(1);

    const ksk2 = await createRegistration({
      uid: 'KSK-U2',
      region: 'เหนือ',
      province: 'เชียงราย',
      deviceType: 'KSK',
    });
    expect(ksk2.deviceId).toBe('KSK-0002');
    expect(ksk2.seq).toBe(2);

    const kpd1 = await createRegistration({
      uid: 'KPD-U1',
      region: 'กลาง',
      province: 'กรุงเทพมหานคร',
      deviceType: 'KPD',
    });
    expect(kpd1.deviceId).toBe('KPD-0001');
    expect(kpd1.seq).toBe(1);
  });

  it('peekNextSeq ไม่เปลี่ยน lastSeq และคืน 1 เมื่อยังไม่มีข้อมูล', async () => {
    const nextSeqBefore = await peekNextSeq('KSK');
    expect(nextSeqBefore).toBe(1);

    // Verify counter record was not created/changed
    const counterBefore = await prisma.deviceCounter.findUnique({
      where: { deviceType: 'KSK' },
    });
    expect(counterBefore).toBeNull();

    // Register one device
    await createRegistration({
      uid: 'PEEK-1',
      region: 'ใต้',
      province: 'ภูเก็ต',
      deviceType: 'KSK',
    });

    const nextSeqAfter = await peekNextSeq('KSK');
    expect(nextSeqAfter).toBe(2);
  });

  it('Concurrency: Promise.all 50 ตัว (uid ต่างกัน ประเภทเดียวกัน) → seq 1–50 ครบ ไม่ซ้ำ ไม่ข้าม', async () => {
    const count = 50;
    const promises = Array.from({ length: count }, (_, i) =>
      createRegistration({
        uid: `CONCUR-KSK-${i + 1}`,
        region: 'เหนือ',
        province: 'เชียงใหม่',
        deviceType: 'KSK',
      })
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(count);

    const seqs = results.map((r) => r.seq).sort((a, b) => a - b);
    const deviceIds = new Set(results.map((r) => r.deviceId));

    expect(deviceIds.size).toBe(count);
    expect(seqs[0]).toBe(1);
    expect(seqs[count - 1]).toBe(count);

    // Verify all sequence numbers from 1 to count exist
    for (let i = 1; i <= count; i++) {
      expect(seqs[i - 1]).toBe(i);
    }
  });

  it('Concurrency สามประเภทผสมกัน → แต่ละประเภทรันอิสระถูกต้อง', async () => {
    const tasks = [
      ...Array.from({ length: 10 }, (_, i) => ({
        uid: `MIX-KSK-${i}`,
        deviceType: 'KSK' as const,
        region: 'เหนือ',
        province: 'เชียงใหม่',
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        uid: `MIX-KPD-${i}`,
        deviceType: 'KPD' as const,
        region: 'กลาง',
        province: 'กรุงเทพมหานคร',
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        uid: `MIX-MNU-${i}`,
        deviceType: 'MNU' as const,
        region: 'ใต้',
        province: 'ภูเก็ต',
      })),
    ];

    // Shuffle tasks
    tasks.sort(() => Math.random() - 0.5);

    const results = await Promise.all(tasks.map((t) => createRegistration(t)));
    expect(results).toHaveLength(30);

    const kskSeqs = results
      .filter((r) => r.deviceType === 'KSK')
      .map((r) => r.seq)
      .sort((a, b) => a - b);
    const kpdSeqs = results
      .filter((r) => r.deviceType === 'KPD')
      .map((r) => r.seq)
      .sort((a, b) => a - b);
    const mnuSeqs = results
      .filter((r) => r.deviceType === 'MNU')
      .map((r) => r.seq)
      .sort((a, b) => a - b);

    expect(kskSeqs).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
    expect(kpdSeqs).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
    expect(mnuSeqs).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
  });

  it('Concurrency: 20 request uid เดียวกัน → สำเร็จ 1, 409 อีก 19, lastSeq เพิ่มแค่ 1', async () => {
    const sameUid = 'IDENTICAL-UID-999';
    const promises = Array.from({ length: 20 }, () =>
      createRegistration({
        uid: sameUid,
        region: 'กลาง',
        province: 'กรุงเทพมหานคร',
        deviceType: 'KSK',
      })
    );

    const outcomes = await Promise.allSettled(promises);
    const fulfilled = outcomes.filter((o) => o.status === 'fulfilled');
    const rejected = outcomes.filter((o) => o.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(19);

    rejected.forEach((rej) => {
      if (rej.status === 'rejected') {
        expect(rej.reason).toBeInstanceOf(DuplicateUidError);
      }
    });

    const counter = await prisma.deviceCounter.findUnique({
      where: { deviceType: 'KSK' },
    });
    expect(counter?.lastSeq).toBe(1);
  });

  it('Rollback: บังคับให้ registration.create ล้ม → lastSeq ไม่เพิ่ม', async () => {
    // First successful registration
    await createRegistration({
      uid: 'SUCCESS-UID',
      region: 'กลาง',
      province: 'กรุงเทพมหานคร',
      deviceType: 'KSK',
    });

    const counterBefore = await prisma.deviceCounter.findUnique({
      where: { deviceType: 'KSK' },
    });
    expect(counterBefore?.lastSeq).toBe(1);

    // Attempt registration with identical UID (which fails at registration.create due to unique constraint)
    await expect(
      createRegistration({
        uid: 'SUCCESS-UID',
        region: 'เหนือ',
        province: 'เชียงใหม่',
        deviceType: 'KSK',
      })
    ).rejects.toThrow(DuplicateUidError);

    // Counter must remain 1 (rolled back)
    const counterAfter = await prisma.deviceCounter.findUnique({
      where: { deviceType: 'KSK' },
    });
    expect(counterAfter?.lastSeq).toBe(1);
  });

  it('Constraint: insert deviceId / (deviceType, seq) / uid ซ้ำตรงๆ → DB ปฏิเสธ', async () => {
    await prisma.registration.create({
      data: {
        uid: 'UID-A',
        region: 'กลาง',
        province: 'กรุงเทพมหานคร',
        deviceType: 'KSK',
        seq: 1,
        deviceId: 'KSK-0001',
      },
    });

    // 1. Duplicate uid
    await expect(
      prisma.registration.create({
        data: {
          uid: 'UID-A',
          region: 'กลาง',
          province: 'นนทบุรี',
          deviceType: 'KSK',
          seq: 2,
          deviceId: 'KSK-0002',
        },
      })
    ).rejects.toThrow();

    // 2. Duplicate deviceId
    await expect(
      prisma.registration.create({
        data: {
          uid: 'UID-B',
          region: 'กลาง',
          province: 'นนทบุรี',
          deviceType: 'KSK',
          seq: 2,
          deviceId: 'KSK-0001',
        },
      })
    ).rejects.toThrow();

    // 3. Duplicate (deviceType, seq)
    await expect(
      prisma.registration.create({
        data: {
          uid: 'UID-C',
          region: 'กลาง',
          province: 'นนทบุรี',
          deviceType: 'KSK',
          seq: 1,
          deviceId: 'KSK-0003',
        },
      })
    ).rejects.toThrow();
  });

  it('ปิดแล้วเปิด connection ใหม่ → เลขรันต่อจากเดิม ไม่ถอยหลัง', async () => {
    await createRegistration({
      uid: 'CONN-1',
      region: 'ใต้',
      province: 'กระบี่',
      deviceType: 'MNU',
    });

    // Create a new fresh client instance to simulate restart
    const newClient = new PrismaClient();
    try {
      const nextSeq = await peekNextSeq('MNU', newClient);
      expect(nextSeq).toBe(2);

      const mnu2 = await createRegistration(
        {
          uid: 'CONN-2',
          region: 'ใต้',
          province: 'พังงา',
          deviceType: 'MNU',
        },
        newClient
      );
      expect(mnu2.deviceId).toBe('MNU-0002');
      expect(mnu2.seq).toBe(2);
    } finally {
      await newClient.$disconnect();
    }
  });

  it('findByUid ค้นหาข้อมูลได้ตรงตามที่บันทึก', async () => {
    await createRegistration({
      uid: 'FIND-ME-123',
      region: 'ตะวันออก',
      province: 'ชลบุรี',
      deviceType: 'KSK',
    });

    const found = await findByUid('FIND-ME-123');
    expect(found).not.toBeNull();
    expect(found?.uid).toBe('FIND-ME-123');
    expect(found?.province).toBe('ชลบุรี');

    const notFound = await findByUid('DOES-NOT-EXIST');
    expect(notFound).toBeNull();
  });
});
