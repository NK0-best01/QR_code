# PROJECT_PLAN.md — ระบบสมัคร User ด้วยการสแกน QR Code

> เอกสารนี้เขียนเพื่อส่งต่อให้ AI coding agent ทำงานต่อ
> อ่านส่วน **0. วิธีทำงานกับเอกสารนี้** ก่อนเริ่มเขียนโค้ด

---

## 0. วิธีทำงานกับเอกสารนี้ (สำหรับ AI Agent)

1. ทำงานทีละ Phase ตาม **ลำดับในหัวข้อ 9** ห้ามข้าม Phase
2. ทุก Phase ต้อง **เขียน test ตามที่ระบุ และ test ต้องผ่าน** ก่อนไปต่อ
3. ห้ามเปลี่ยน "การตัดสินใจที่ล็อกแล้ว" (หัวข้อ 2) โดยไม่ถามผู้ใช้
4. ถ้าเจอสิ่งที่เอกสารไม่ได้ระบุ ให้เลือกค่าที่เรียบง่ายที่สุด และ **จดไว้ในไฟล์ `DECISIONS.md`**
5. เมื่อจบแต่ละ Phase ให้สรุป: ไฟล์ที่เพิ่ม/แก้, test ที่ผ่าน, สิ่งที่ยังค้าง
6. เมื่อ test ใดทดสอบอัตโนมัติไม่ได้ (เช่น อุปกรณ์จริง) ให้ใส่เป็น **Manual checklist** ใน `MANUAL_TESTS.md` และบอกผู้ใช้
7. ข้อความ UI ทั้งหมดเป็น **ภาษาไทย** และเก็บรวมไว้ที่ `src/lib/messages.ts`
8. โค้ดและชื่อตัวแปรเป็นภาษาอังกฤษ

---

## 1. ภาพรวมโปรเจค

เว็บแอปสำหรับลงทะเบียนอุปกรณ์/ผู้ใช้ โดยรับค่า **UID** จากการสแกน QR Code หรือกรอก text จากนั้นส่งไปหน้าสมัครเพื่อเลือกภาค จังหวัด ประเภทอุปกรณ์ แล้วบันทึกลงฐานข้อมูล และดาวน์โหลดผลลัพธ์เป็นไฟล์ `.json`

| หัวข้อ | รายละเอียด |
|---|---|
| Framework | Next.js (App Router) + TypeScript + Tailwind CSS |
| ฐานข้อมูล | Prisma ORM + SQLite (ตอนนี้) → PostgreSQL (อนาคต) |
| Validation | zod (ใช้ schema ร่วมกันทั้ง client/server) |
| ฟอร์ม | React Hook Form |
| QR decode | `jsqr` |
| Unit/Component test | Vitest + @testing-library/react |
| E2E | Playwright |
| การรัน | `https://localhost:3000` และผ่าน LAN เพื่อทดสอบหลายอุปกรณ์ (ยังไม่ deploy) |

### อุปกรณ์ผู้ใช้ 2 แบบ

| | PC (จอกว้าง) | Mobile (จอแคบ) |
|---|---|---|
| ปุ่ม 1 | **ลากเมาส์เลือกพื้นที่หน้าจอ** (Region Screenshot) เพื่อสแกน QR ในภาพ | **เปิดกล้อง** สแกน QR |
| ปุ่ม 2 | กรอก text เอง | กรอก text เอง (เหมือน PC) |

### Flow หลัก

```
หน้าแรก ──(สแกน QR / กรอก text)──► เช็ค UID ซ้ำ ──► /register?uid=...
                                      │ ซ้ำ → แจ้ง "UID นี้ลงทะเบียนแล้ว" อยู่หน้าแรก
                                      ▼
        เลือกภาค → จังหวัด → ประเภทอุปกรณ์ → กด "บันทึกข้อมูล"
                                      ▼
        POST /api/registrations  (จอง Device ID + บันทึก ใน transaction เดียว)
                                      ▼
        แสดง deviceId จริง + ดาวน์โหลด .json (สร้างจาก response ของ POST)
```

---

## 2. การตัดสินใจที่ล็อกแล้ว (ห้ามเปลี่ยนโดยไม่ถามผู้ใช้)

| เรื่อง | ข้อสรุป |
|---|---|
| การแบ่งภาค | **6 ภาค** ตามราชบัณฑิตยสภา (ดูข้อมูลอ้างอิงหัวข้อ 11) รวม 77 จังหวัด กรุงเทพฯ อยู่ภาคกลาง |
| ประเภทอุปกรณ์ | Kiosk = `KSK`, Keypad = `KPD`, Main = `MNU` |
| Device ID | รูปแบบ `KSK-0001` (เลข 4 หลัก pad ศูนย์) **เลขรันแยกตามประเภท** |
| การจองเลข | ทำ **ฝั่ง server ใน transaction เดียวกับการบันทึก** ห้ามจองฝั่ง client |
| Unique | บังคับที่ระดับ DB ด้วย constraint (ไม่พึ่งโค้ด client) |
| UID | **ห้ามซ้ำ** (`@unique`) และ **readonly** บนฟอร์ม (ผู้ใช้แก้ไม่ได้) |
| เลขที่ใช้แล้ว | ไม่ถูก reuse แม้ลบ record (counter ไม่ถอยหลัง) |
| การแยก PC/Mobile | ใช้ขนาดจอ (breakpoint `md` = 768px) เป็นหลัก + feature detection เป็น fallback |
| DB | SQLite ตอนนี้ แต่ต้องเขียนให้ย้ายไป PostgreSQL ได้โดยเปลี่ยนแค่ `provider` + migration ใหม่ |
| Deploy | **ยังไม่ทำ** รันที่ port 3000 เพื่อทดสอบหลายอุปกรณ์ |
| หน้าดู/ค้นหาข้อมูล | ยังไม่ทำ แต่ออกแบบให้ต่อยอดได้ |

---

## 3. ข้อควรรู้ทางเทคนิค (สำคัญ อ่านก่อนเขียนโค้ด)

1. **Region Screenshot (PC)** ใช้ `navigator.mediaDevices.getDisplayMedia()` จับ **เฟรมเดียว** ลง canvas แล้ว **หยุด stream ทันที** จากนั้นแสดงภาพบน overlay ให้ลากเมาส์เลือกพื้นที่ แล้ว crop และ decode ด้วย `jsQR` เบราว์เซอร์จะขอสิทธิ์ทุกครั้ง (เลี่ยงไม่ได้)
2. **กล้อง (Mobile)** ใช้ `getUserMedia({ video: { facingMode: "environment" } })`
3. **ต้องเป็น Secure Context** ทั้งกล้องและ `getDisplayMedia` ใช้ได้เฉพาะ HTTPS หรือ `localhost` การเปิดผ่าน `http://<IP>:3000` จะใช้ไม่ได้
4. **ขนาดจอไม่ได้บอกว่ามีกล้อง** ต้องเช็ค feature และมี fallback ไปปุ่มกรอก text เสมอ (มือถือส่วนใหญ่ โดยเฉพาะ iOS ไม่รองรับ `getDisplayMedia`)
5. **Hydration**: `useScanMode` ต้องเริ่มด้วย `undefined` แล้วกำหนดค่าหลัง mount เพื่อไม่ให้เกิด hydration mismatch (ระหว่างนั้นแสดง skeleton)
6. **readonly เป็นแค่ UI ไม่ใช่ความปลอดภัย** server ต้อง validate และเช็ค UID ซ้ำเสมอ
7. **ใช้ `readOnly` ไม่ใช้ `disabled`** กับช่อง UID เพื่อให้ค่าถูกส่งไปกับฟอร์มและคัดลอกได้
8. **SQLite**: เปิด WAL mode และตั้ง `busy_timeout` ไม่งั้นเจอ `SQLITE_BUSY` เมื่อมี request พร้อมกัน
9. **ไม่ใช้ Prisma `enum`** (SQLite ไม่รองรับแบบเดียวกับ PostgreSQL) เก็บเป็น `String` แล้ว validate ด้วย zod
10. **ห้ามใช้ raw SQL ที่เฉพาะ SQLite** ใน repository

---

## 4. Schema ฐานข้อมูล

```prisma
datasource db {
  provider = "sqlite"            // อนาคต: "postgresql"
  url      = env("DATABASE_URL") // file:./dev.db
}

generator client {
  provider = "prisma-client-js"
}

model DeviceCounter {
  deviceType String @id         // KSK | KPD | MNU
  lastSeq    Int    @default(0)
}

model Registration {
  id         Int      @id @default(autoincrement())
  uid        String   @unique
  region     String             // ชื่อภาค 6 ภาค
  province   String
  deviceType String             // KSK | KPD | MNU
  seq        Int
  deviceId   String   @unique   // เช่น KSK-0001
  createdAt  DateTime @default(now())

  @@unique([deviceType, seq])
}
```

### ขั้นตอนจอง ID (ต้องอยู่ใน transaction เดียว)

```ts
// lib/registration-repo.ts
export async function createRegistration(input: RegistrationInput) {
  return prisma.$transaction(async (tx) => {
    const counter = await tx.deviceCounter.upsert({
      where:  { deviceType: input.deviceType },
      update: { lastSeq: { increment: 1 } },
      create: { deviceType: input.deviceType, lastSeq: 1 },
    });

    return tx.registration.create({
      data: {
        ...input,
        seq: counter.lastSeq,
        deviceId: formatDeviceId(input.deviceType, counter.lastSeq),
      },
    });
  });
}
```

**การจัดการ error (Prisma `P2002`)**

| กรณี | พฤติกรรม |
|---|---|
| `uid` ซ้ำ | transaction rollback ทั้งหมด (เลขรันต้องไม่ถูกใช้) → ตอบ **409** ห้าม retry |
| `deviceId` หรือ `(deviceType, seq)` ชน | retry 1–3 ครั้ง ถ้ายังไม่ได้ตอบ 500 |

ต้องดูจาก `error.meta.target` ว่า field ใดซ้ำ เพื่อแยกสองกรณีนี้

### Device ID

```ts
// data/device-types.ts
export const DEVICE_TYPES = [
  { code: "KSK", label: "Kiosk" },
  { code: "KPD", label: "Keypad" },
  { code: "MNU", label: "Main" },
] as const;
export type DeviceTypeCode = (typeof DEVICE_TYPES)[number]["code"];

// lib/device-id.ts
export const formatDeviceId = (code: DeviceTypeCode, seq: number) =>
  `${code}-${String(seq).padStart(4, "0")}`;
// seq > 9999 ต้องไม่ crash: padStart จะไม่ตัด จึงกลายเป็น 5 หลักอัตโนมัติ
// parseDeviceId("MNU-0007") => { code: "MNU", seq: 7 }, รูปแบบผิดคืน null
```

---

## 5. API

| Endpoint | หน้าที่ | Response |
|---|---|---|
| `GET /api/uids/[uid]/exists` | เช็คว่า UID ถูกลงทะเบียนแล้วหรือยัง | `200 { exists: boolean }` |
| `GET /api/device-types/[code]/next` | คืนเลขตัวอย่างถัดไป (`lastSeq + 1`) **ไม่เพิ่ม counter** | `200 { deviceId }` / `404` ถ้า code ไม่มี |
| `POST /api/registrations` | validate → จอง ID + บันทึก | `201` record ทั้งก้อน / `400` ข้อมูลผิด / `409` UID ซ้ำ / `429` เกิน rate limit / `500` |

**Body ของ POST**
```json
{ "uid": "ABC123", "region": "เหนือ", "province": "เชียงใหม่", "deviceType": "KSK" }
```

**Server ต้อง validate (ห้ามเชื่อ client)**
- `uid`: trim แล้วไม่ว่าง, ความยาวไม่เกิน 128 (กำหนดเป็นค่าคงที่เดียวใช้ร่วม), ไม่มีอักขระควบคุม
- `deviceType`: ต้องเป็นหนึ่งใน `KSK | KPD | MNU`
- `region`: ต้องเป็นหนึ่งใน 6 ภาค
- `province`: ต้องอยู่ใน `region` ที่ส่งมาจริง

**ค่าที่แสดงในช่อง Device ID บนฟอร์มเป็นแค่ "ตัวอย่าง"** ID จริงมาจาก response ของ POST (อาจต่างจากตัวอย่างถ้ามีคนสมัครพร้อมกัน ซึ่งเป็นเรื่องปกติ)

---

## 6. โครงสร้างโฟลเดอร์

```
prisma/
├─ schema.prisma
└─ migrations/
src/
├─ app/
│  ├─ page.tsx                            # หน้าแรก (เลือกวิธีรับ UID)
│  ├─ register/page.tsx                   # หน้าสมัคร
│  └─ api/
│     ├─ uids/[uid]/exists/route.ts
│     ├─ device-types/[code]/next/route.ts
│     └─ registrations/route.ts
├─ components/
│  ├─ ScanPanel.tsx                       # สลับ PC/Mobile
│  ├─ RegionSnipper.tsx                   # PC: ลากเมาส์เลือกพื้นที่
│  ├─ CameraScanner.tsx                   # Mobile: เปิดกล้อง
│  ├─ ManualInput.tsx                     # กรอก text
│  └─ RegisterForm.tsx
├─ hooks/
│  ├─ useScanMode.ts
│  └─ useQrDecoder.ts
├─ lib/
│  ├─ db.ts                               # PrismaClient singleton (+ WAL, busy_timeout)
│  ├─ registration-repo.ts                # createRegistration, peekNextSeq, findByUid
│  ├─ device-id.ts
│  ├─ schemas.ts                          # zod ร่วม client/server
│  ├─ messages.ts                         # ข้อความภาษาไทยทั้งหมด
│  ├─ qr.ts                               # decode ภาพ -> text
│  ├─ crop.ts                             # แปลงพิกัดหน้าจอ -> พิกัดภาพจริง
│  └─ download.ts                         # ดาวน์โหลด JSON
└─ data/
   ├─ thai-regions.ts
   └─ device-types.ts
```

Repository ต้องแยกฟังก์ชันให้เพิ่มหน้าดูข้อมูลได้ภายหลัง: `createRegistration`, `findByUid`, `peekNextSeq` (อนาคตเพิ่ม `list`)

---

## 7. Phase การพัฒนา

> รูปแบบ: **งาน → เกณฑ์เสร็จ (Tests)** ทุกข้อใน Tests ต้องผ่าน

### Phase 0: วางโครงโปรเจค

**งาน**
- `create-next-app` (TypeScript, Tailwind, App Router, ESLint, `src/` dir)
- ติดตั้ง: `jsqr`, `zod`, `react-hook-form`, `@hookform/resolvers`, `prisma`, `@prisma/client`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@playwright/test`
- ตั้ง prettier, eslint, path alias `@/*`
- สคริปต์: `db:migrate`, `db:reset`, `test`, `test:e2e`
- **dev script:** `"dev": "next dev -p 3000 -H 0.0.0.0 --experimental-https"`
- DB ทดสอบแยกจาก dev (เช่น `DATABASE_URL=file:./test.db`)
- ตั้ง `allowedDevOrigins` ใน `next.config` ถ้ามีคำเตือน cross-origin ตาม IP ที่ใช้
- เขียน `README.md` อธิบายวิธีรันและวิธีเปิดผ่านมือถือ

**วิธีเปิดจากอุปกรณ์อื่น (ใส่ใน README)**
- เปิด `https://<IP เครื่อง dev>:3000` (certificate ออกเอง ต้องกดยอมรับ) หรือใช้ `ngrok http 3000`
- ต้องอยู่ Wi-Fi วงเดียวกัน และเปิด firewall port 3000

**Tests**
- [ ] `npm run dev`, `build`, `lint` ผ่านโดยไม่มี error
- [ ] smoke test ของ Vitest รันได้ 1 ไฟล์
- [ ] (Manual) มือถือเปิด `https://<IP>:3000` ได้และขอสิทธิ์กล้องได้
- [ ] (Manual) ทุกอุปกรณ์ใช้ DB ตัวเดียวกัน

---

### Phase 1: ข้อมูลภาค-จังหวัด (6 ภาค)

**งาน**
- `data/thai-regions.ts` โครงสร้าง `{ regionId, regionName, provinces: string[] }[]` ใช้ข้อมูลหัวข้อ 11
- `getProvincesByRegion(regionId)`
- zod helper: `isProvinceInRegion(region, province)`

**Tests**
- [ ] มีครบ 6 ภาค
- [ ] จังหวัดรวม = 77 ไม่ซ้ำข้ามภาค
- [ ] จำนวนต่อภาค: เหนือ 9, ตะวันออกเฉียงเหนือ 20, กลาง 22, ตะวันออก 7, ตะวันตก 5, ใต้ 14
- [ ] `getProvincesByRegion` ถูกต้องทุกภาค และคืน `[]` เมื่อ id ไม่มี
- [ ] `isProvinceInRegion` ปฏิเสธจังหวัดที่ไม่อยู่ในภาคนั้น

---

### Phase 4A: ฐานข้อมูลและ API (ทำก่อน Phase 2)

**งาน**
- Prisma schema ตามหัวข้อ 4 + migration แรก + `.env` (`DATABASE_URL`)
- `lib/db.ts`: PrismaClient singleton (กัน hot reload สร้างหลาย instance) และเปิด `PRAGMA journal_mode=WAL`, `busy_timeout`
- `registration-repo.ts`: `createRegistration`, `peekNextSeq`, `findByUid`
- Route handlers ตามหัวข้อ 5, zod validate ฝั่ง server
- แยกจัดการ `P2002` ตามตารางหัวข้อ 4

**Tests: Repository (SQLite ไฟล์ชั่วคราวต่อ test suite)**
- [ ] จอง KSK 2 ครั้ง, KPD 1 ครั้ง → `KSK-0001`, `KSK-0002`, `KPD-0001`
- [ ] **Concurrency:** `Promise.all` 50 ตัว (uid ต่างกัน ประเภทเดียวกัน) → seq 1–50 ครบ ไม่ซ้ำ ไม่ข้าม
- [ ] Concurrency สามประเภทผสมกัน → แต่ละประเภทรันอิสระถูกต้อง
- [ ] **Concurrency:** 20 request `uid` เดียวกัน → สำเร็จ 1, 409 อีก 19, `lastSeq` เพิ่มแค่ 1
- [ ] Rollback: บังคับให้ `registration.create` ล้ม → `lastSeq` ไม่เพิ่ม
- [ ] Constraint: insert `deviceId` / `(deviceType, seq)` / `uid` ซ้ำตรงๆ → DB ปฏิเสธ
- [ ] `peekNextSeq` ไม่เปลี่ยน `lastSeq` และคืน 1 เมื่อยังไม่มีข้อมูล
- [ ] ปิดแล้วเปิด connection ใหม่ → เลขรันต่อจากเดิม ไม่ถอยหลัง
- [ ] seq เกิน 9999 → `deviceId` ไม่ crash
- [ ] `formatDeviceId` / `parseDeviceId` ถูกต้อง (รวมรูปแบบผิดคืน `null`)

**Tests: API (เรียก route handler ตรง)**
- [ ] POST ข้อมูลครบ → 201, `deviceId` ขึ้นต้นด้วย `deviceType`
- [ ] POST ขาดฟิลด์ / `deviceType` ผิด / จังหวัดไม่อยู่ในภาค / `uid` ยาวเกิน-มีอักขระควบคุม → 400
- [ ] POST `uid` ซ้ำ → 409 และ counter ไม่เพิ่ม
- [ ] SQL injection ใน `uid` (เช่น `'; DROP TABLE--`) → เก็บเป็นข้อความธรรมดา ตารางยังอยู่
- [ ] `GET .../next` ด้วย code ที่ไม่มี → 404 และไม่เพิ่ม counter
- [ ] `GET /api/uids/[uid]/exists` ถูกต้องทั้งกรณีมี/ไม่มี และ uid ที่มีอักขระพิเศษ
- [ ] ยิง POST พร้อมกัน 20 request ผ่าน HTTP จริง → `deviceId` ไม่ซ้ำ

---

### Phase 2: Responsive Detection + Layout หน้าแรก

**งาน**
- `useScanMode`: `matchMedia("(max-width: 767px)")` + `matchMedia("(pointer: coarse)")` + เช็ค `getDisplayMedia` / `getUserMedia`
  - จอแคบ **หรือ** pointer เป็น coarse → โหมดกล้อง, นอกนั้นโหมด snip
  - ฟัง event `change` ของ media query (resize แล้วเปลี่ยนทันที)
  - ค่าเริ่มต้น `undefined` กัน hydration mismatch
- `ScanPanel`: ปุ่ม 1 ตามโหมด, ปุ่ม 2 กรอก text เหมือนกัน
- ถ้า API ของปุ่ม 1 ใช้ไม่ได้ → ปุ่ม disabled + ข้อความอธิบาย + ชี้ไปปุ่มกรอก text
- ลิงก์เล็กๆ "สลับโหมด" ให้ผู้ใช้เปลี่ยนเองถ้าระบบเดาผิด
- ในขั้นนี้ ปุ่ม 1 ยังเป็น placeholder (ทำจริงใน Phase 6/7)

**Tests**
- [ ] mock `matchMedia`: 1024px แสดงปุ่ม Snip, 375px แสดงปุ่มกล้อง
- [ ] resize ข้าม breakpoint → ปุ่มเปลี่ยนตาม
- [ ] `pointer: coarse` + จอกว้าง (iPad) → โหมดกล้อง
- [ ] ไม่มี `getDisplayMedia` → ปุ่ม Snip ใช้ไม่ได้ + ข้อความ
- [ ] ไม่มี `getUserMedia` → ปุ่มกล้อง disabled + ข้อความ
- [ ] ปุ่มสลับโหมดด้วยมือทำงาน
- [ ] E2E: viewport 1280×800 และ 390×844 เห็นปุ่มตรงที่กำหนด; `devices['iPad Pro 11']` ได้ปุ่มกล้อง
- [ ] ไม่มี hydration warning ใน console

---

### Phase 3: กรอก Text และส่ง UID ไปหน้าสมัคร

**งาน**
- `ManualInput`: input + ปุ่มยืนยัน, trim, ห้ามว่าง, จำกัดความยาว (ใช้ค่าคงที่ร่วมกับ server)
- ก่อน `router.push` เรียก `GET /api/uids/[uid]/exists` ถ้าซ้ำให้แจ้ง "UID นี้ลงทะเบียนแล้ว" และอยู่หน้าแรก
- ส่งผ่าน `/register?uid=...` ด้วย `encodeURIComponent`
- `/register` อ่าน `uid` จาก `useSearchParams` ถ้าไม่มี → redirect หน้าแรก
- ปุ่ม "ย้อนกลับเพื่อแก้ UID" ชัดเจนบนหน้าสมัคร (เพราะ UID แก้ในหน้านั้นไม่ได้)
- ฟังก์ชันส่งต่อ UID ควรแยกเป็นจุดเดียว เพื่อให้ Phase 6/7 เรียกใช้ซ้ำ

**Tests**
- [ ] ค่าว่าง / ช่องว่างล้วนไม่ผ่าน
- [ ] ค่าที่มี `& = # %` และภาษาไทย ส่งไปแล้วอ่านกลับตรงเดิม
- [ ] UID ซ้ำ → แจ้งเตือน ไม่ไปหน้าสมัคร
- [ ] E2E: กรอก "ABC123" → ไปหน้า register และ UID = "ABC123"
- [ ] E2E: เข้า `/register` ตรงๆ ไม่มี uid → redirect กลับ
- [ ] ปุ่มย้อนกลับทำงาน

---

### Phase 4B: ฟอร์มสมัคร

**งาน**
- `RegisterForm` (React Hook Form + zod resolver ใช้ schema จาก `lib/schemas.ts`)
- **UID**: `readOnly`
- **ภาค**: dropdown 6 ภาค → **จังหวัด**: disabled จนกว่าจะเลือกภาค, แสดงเฉพาะจังหวัดในภาคนั้น, **เปลี่ยนภาคแล้วรีเซ็ตจังหวัด**
- **ประเภทอุปกรณ์**: dropdown 3 ตัวเลือก (แสดง label เช่น "Kiosk (KSK)")
- **Device ID**: readonly แสดงเลขตัวอย่างจาก `GET .../next` พร้อม label "ตัวอย่าง" (เปลี่ยนประเภท → เรียกใหม่; ยังไม่เลือกประเภท → ว่าง)
- ปุ่ม "บันทึกข้อมูล" disabled จนกว่าจะครบ: uid, ภาค, จังหวัด, ประเภท; **disable ทันทีเมื่อกด** กันกดซ้ำ
- จัดการ error: 409 → "UID นี้ลงทะเบียนแล้ว" + ปุ่มกลับหน้าแรก (ไม่มีลองใหม่) / 400 แสดงข้อความ / 500 → ปุ่มลองใหม่ ฟอร์มคงข้อมูลเดิม
- หลังสำเร็จ → แสดง `deviceId` จริง และส่งต่อ Phase 5

**Tests**
- [ ] ฟอร์มแสดง 6 ภาค; เลือกแต่ละภาคแล้วจังหวัดกรองถูก
- [ ] เลือกจังหวัดแล้วเปลี่ยนภาค → จังหวัดถูกรีเซ็ต
- [ ] dropdown ประเภทมี 3 ตัวเลือก ค่า code = `KSK`/`KPD`/`MNU`
- [ ] ช่อง UID เป็น `readOnly` พิมพ์แล้วค่าไม่เปลี่ยน
- [ ] ปุ่มบันทึก disabled เมื่อขาดอย่างใดอย่างหนึ่ง, enabled เมื่อครบ
- [ ] เปลี่ยนประเภท → เรียก `next` ใหม่ ช่อง Device ID อัปเดต (mock fetch)
- [ ] เลือก dropdown อย่างเดียว → ไม่มีการเรียก POST
- [ ] กดบันทึกรัว → POST ครั้งเดียว
- [ ] แก้ค่า uid ผ่าน devtools แล้ว submit → server ยังเช็คซ้ำ
- [ ] 409 → ข้อความถูกต้อง ไม่มีปุ่มลองใหม่ / 500 → ฟอร์มคงข้อมูล ลองใหม่ได้
- [ ] E2E: เลือกทั้ง 3 ประเภทตามลำดับ (uid ต่างกัน) → `KSK-0001`, `KPD-0001`, `MNU-0001`
- [ ] E2E: ประเภทเดิมสองครั้ง (uid ต่างกัน) → เลขถัดไป และ refresh แล้วเลขไม่ถอย
- [ ] E2E: uid เดิมสมัครซ้ำ → ถูกปฏิเสธ
- [ ] E2E: สอง browser context สมัครประเภทเดียวกันพร้อมกัน → ID ต่างกัน
- [ ] E2E: ใช้ DB ทดสอบแยกและ reset ก่อนทุก test

**CI job เสริม (ไม่บล็อก) เตรียมย้าย PostgreSQL**
- [ ] รัน test suite ของ Phase 4A ชุดเดียวกันบน PostgreSQL (Docker/Testcontainers) โดยเฉพาะ concurrency
- [ ] ไม่มี raw SQL เฉพาะ SQLite ใน repository
- [ ] migration ข้อมูล SQLite → PostgreSQL แล้ว `lastSeq` ตรงกับ `MAX(seq)` ของแต่ละประเภท

---

### Phase 5: บันทึกเป็นไฟล์ JSON

**งาน**
- `lib/download.ts`: สร้าง `Blob` (`application/json;charset=utf-8`) + `URL.createObjectURL` + สั่งดาวน์โหลด + `revokeObjectURL`
- สร้างไฟล์จาก **response ของ POST** ไม่ใช่ค่าบนฟอร์ม
- ชื่อไฟล์ `user-{uid}-{timestamp}.json` โดย sanitize อักขระ `/ \ : * ? " < > |`
- `JSON.stringify(payload, null, 2)`
- แสดงข้อความสำเร็จหลังบันทึก

**รูปแบบไฟล์**
```json
{
  "uid": "ABC123",
  "region": "เหนือ",
  "province": "เชียงใหม่",
  "deviceType": "KSK",
  "deviceId": "KSK-0001",
  "createdAt": "2026-10-20T10:00:00.000Z"
}
```

**Tests**
- [ ] payload โครงสร้างและค่าถูกต้อง; `deviceId` ขึ้นต้นด้วย `deviceType`
- [ ] `region` เป็นหนึ่งใน 6 ภาคเท่านั้น
- [ ] sanitize ชื่อไฟล์เมื่อ uid มีอักขระต้องห้าม
- [ ] ภาษาไทยใน JSON ไม่เพี้ยน (UTF-8)
- [ ] E2E: `page.waitForEvent('download')` → อ่านไฟล์ → เนื้อหาตรงกับที่แสดงบนจอ

---

### Phase 6: สแกน QR ด้วยกล้อง (Mobile)

**งาน**
- `CameraScanner`: เปิดกล้องหลัง, แสดง `<video playsInline muted>`, วนอ่านเฟรมลง canvas ด้วย `requestAnimationFrame` (จำกัดอัตราเพื่อประหยัดแบต) แล้ว decode ด้วย `lib/qr.ts` (`jsQR`)
- เจอ QR → `track.stop()` ทุก track → เช็ค UID ซ้ำ → ไปหน้า register (ใช้ฟังก์ชันส่งต่อจาก Phase 3)
- จัดการ error: ปฏิเสธสิทธิ์ (`NotAllowedError`), ไม่พบกล้อง (`NotFoundError`), ไม่ใช่ HTTPS → ข้อความไทย + แนะนำใช้ปุ่มกรอก text
- ปุ่มปิดกล้อง และ cleanup เมื่อ unmount

**Tests**
- [ ] `qr.ts` decode ภาพ QR ตัวอย่างได้ข้อความตรง และคืน `null` เมื่อไม่มี QR
- [ ] mock `getUserMedia` reject แต่ละชนิด → ข้อความถูกต้อง
- [ ] unmount แล้วทุก track ถูก stop (ไม่ค้างไฟกล้อง)
- [ ] ไม่ยิงซ้ำเมื่อเจอ QR เดิมหลายเฟรมติดกัน (เรียกส่งต่อครั้งเดียว)
- [ ] E2E (Playwright + Chromium flag `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=qr.y4m` และ permission `camera`): สแกน QR ปลอมแล้วไปหน้า register พร้อม uid ถูกต้อง
- [ ] (Manual) iOS Safari และ Android Chrome จริง

---

### Phase 7: อัปโหลดภาพ QR จากโฟลเดอร์ (PC Image Upload Scanner) — ปรับปรุงจาก Region Screenshot

**บริบทการปรับปรุง (Pivot from Screen Snip to Image Upload):**
- เดิมใน Phase 7 ใช้ `RegionSnipper` ผ่าน `getDisplayMedia` แต่เบราว์เซอร์บังคับถาม "Choose what to share" ทุกครั้งเพื่อความปลอดภัยของ Web Sandbox ทำให้ UX ไม่ลื่นไหลเหมือน Native Snipping Tool
- จึงปรับปรุงระบบบน PC ให้เป็นการ **อัปโหลดภาพ QR Code จากโฟลเดอร์ในเครื่อง (File Picker)** ควบคู่กับ **Drag & Drop** และ **Clipboard Paste (`Ctrl + V`)**
- โค้ด `RegionSnipper.tsx` และ `lib/crop.ts` เดิมยังคงเก็บรักษาไว้ใน codebase ตามหลักการ "Nothing is Deleted"

**งาน**
- `ImageUploader.tsx`: กล่องรับไฟล์ภาพ QR รองรับ:
  1. คลิกปุ่ม "อัปโหลดภาพ QR จากโฟลเดอร์" หรือคลิกกล่องเพื่อเปิดหน้าต่างเลือกไฟล์ภาพจากโฟลเดอร์ในเครื่อง (`<input type="file" accept="image/*">`)
  2. ลากรูปภาพมาวาง (Drag & Drop)
  3. ดักจับ Clipboard Paste (`Ctrl + V`) เมื่อผู้ใช้แคปหน้าจอด้วย `Win + Shift + S` แล้ววาง
- แปลงไฟล์ภาพลง canvas และ decode QR ทันทีด้วย `decodeQrFromImageData` จาก `lib/qr.ts`
- หากพบ QR → ตรวจสอบรูปแบบ UID และตรวจ UID ซ้ำผ่าน `processScannedUid` → ส่งต่อไปยัง `/register?uid=...`
- หากไม่พบ QR ในภาพ → แสดง alert เตือนภาษาไทย พร้อมปุ่มเลือกภาพใหม่ หรือสลับไปกรอกข้อความเอง
- หากเลือกไฟล์ที่ไม่ใช่รูปภาพ → แสดง alert แจ้งเตือนประเภทไฟล์
- รองรับปุ่ม `Esc` หรือปุ่มยกเลิกเพื่อปิดกล่องอัปโหลดกลับสู่หน้าแรก

**Tests**
- [x] `image-uploader.test.tsx`: แสดงหน้าจอเริ่มต้น, dropzone, ปุ่มเลือกไฟล์, ปุ่มยกเลิก, และ fallback สลับไปกรอกข้อความ
- [x] เลือกไฟล์ภาพที่มี QR โค้ด → ถอดรหัสสำเร็จ → ตรวจ UID → navigate ไป `/register?uid=...`
- [x] เลือกไฟล์ภาพที่ไม่พบ QR โค้ด → แสดง error alert `qrNotFoundInImage` พร้อมปุ่มเลือกรูปใหม่
- [x] เลือกไฟล์ที่ไม่ใช่รูปภาพ (เช่น PDF/TXT) → แสดง error alert `invalidImageType`
- [x] สแกนพบ UID ที่เคยลงทะเบียนแล้ว → แสดง error `uidAlreadyRegistered`
- [x] ลากไฟล์ภาพมาวาง (Drag & Drop) → แสดงสถานะ dropzone และ decode สำเร็จ
- [x] กดวางภาพจากคลิปบอร์ด (`Ctrl + V`) → ดึงไฟล์ภาพและ decode สำเร็จ
- [x] กด `Esc` หรือปุ่มยกเลิก → ปิด uploader
- [x] `responsive-scan-mode.test.tsx`: บน Desktop แสดงปุ่ม "อัปโหลดภาพ QR จากโฟลเดอร์"
- [x] โค้ด Region Screenshot เดิม (`crop.test.ts`, `region-snipper.test.tsx`) ยังคงผ่านครบ 100%

---

### Phase 8: Polish, Security, Accessibility

**งาน**
- loading / error / empty states ครบทุกหน้า
- คีย์บอร์ด (tab order, focus ring, Enter ส่งฟอร์ม), `aria-label`, `role="alert"` ให้ข้อความ error
- ข้อความภาษาไทยทั้งหมดอยู่ใน `lib/messages.ts`
- **rate limit** ที่ `POST /api/registrations` (in-memory ก็พอในขั้นนี้) และตรวจขนาด body
- escape ข้อมูลที่แสดงผล, จำกัดความยาว uid
- ข้อความ fallback เมื่อเบราว์เซอร์ไม่รองรับ `getDisplayMedia` / `getUserMedia`

**Tests**
- [ ] Lighthouse Accessibility ≥ 90
- [ ] `@axe-core/playwright` ไม่พบ violation ระดับ serious/critical
- [ ] E2E: ใช้คีย์บอร์ดอย่างเดียวทำครบตั้งแต่กรอก text → บันทึก
- [ ] uid ที่ยาวเกินกำหนดถูกปฏิเสธ
- [ ] เกิน rate limit → 429
- [ ] เบราว์เซอร์ไม่รองรับ API → เห็นข้อความ fallback ไม่ crash

---

### Phase 9: ทดสอบรวมบนเครื่อง dev (ยังไม่ deploy)

**งาน**
- รัน E2E ทุก flow ทั้ง 2 viewport ใน CI (GitHub Actions)
- ทดสอบ `next build && next start -p 3000` (โหมด production บนเครื่อง)
- ตรวจ `Permissions-Policy` header ไม่บล็อก `camera` และ `display-capture`
- เก็บ checklist สำหรับวันย้ายไป PostgreSQL / deploy

**Tests (Regression)**

| Flow | PC | Mobile |
|---|---|---|
| กรอก text → สมัคร → ได้ JSON | ✅ | ✅ |
| สแกน QR → สมัคร → ได้ JSON | ✅ (snip) | ✅ (กล้อง) |
| ปฏิเสธสิทธิ์ → ใช้กรอก text แทนได้ | ✅ | ✅ |
| UID ซ้ำถูกปฏิเสธ | ✅ | ✅ |
| Resize ข้าม breakpoint ระหว่างใช้งาน | ✅ | ✅ |
| Refresh หน้า register แล้ว uid ไม่หาย | ✅ | ✅ |

- [ ] ข้อมูลจากมือถือและ PC เข้า DB เดียวกัน เลขไม่ซ้ำ
- [ ] CI ผ่านทั้งหมด (unit + E2E); production build ไม่มี warning สำคัญ
- [ ] (Manual) smoke test อุปกรณ์จริงอย่างน้อย 1 PC + 1 iOS + 1 Android

**เลื่อนไปตอน deploy (ยังไม่ต้องทำ)**
- SQLite ใช้บน Vercel/serverless ไม่ได้ (ไฟล์ไม่ถาวร + หลาย instance) ให้เลือก: VPS/Docker + persistent volume, PostgreSQL (Neon/Supabase) หรือ Turso
- restart แล้ว counter ยังอยู่, backup/restore DB
- รัน test suite ทั้งหมดบน PostgreSQL

---

## 8. ความเสี่ยงหลัก

| ความเสี่ยง | แนวทางรับมือ |
|---|---|
| พิกัด crop ผิดเมื่อมี scale/DPR | unit test หลายค่า + ทดสอบจอ HiDPI จริง |
| กล้อง/Screen Capture ใช้ไม่ได้บน HTTP | ใช้ HTTPS (`--experimental-https` หรือ ngrok) ตั้งแต่ Phase 0 |
| UID สแกนผิดแล้วแก้ไม่ได้ (readonly) | ปุ่มย้อนกลับชัดเจน + เช็คซ้ำก่อนเข้าหน้าสมัคร |
| เขียน SQLite พร้อมกัน (`SQLITE_BUSY`) | WAL + `busy_timeout` + concurrency test |
| ย้าย PostgreSQL แล้วพฤติกรรมต่าง | ไม่ใช้ enum/raw SQL, รัน suite บน PostgreSQL ใน CI |
| เลขหายเมื่อบันทึกล้มเหลว | จองเลขใน transaction เดียวกับ insert เท่านั้น |

---

## 9. ลำดับการทำงาน (ต้องทำตามนี้)

```
Phase 0 → 1 → 4A → 2 → 3 → 4B → 5 → 6 → 7 → 8 → 9
```

เหตุผล: ทำ DB และ API ที่เป็นแกนก่อน แล้วต่อด้วย UI ส่วน Phase 7 เสี่ยงสุด แนะนำทำ prototype เล็กๆ ของการ crop (`crop.ts` + unit test) ควบคู่ไปกับ Phase 2

**ขอบเขตงานรอบแรกที่แนะนำให้ส่งมอบ:** Phase 0 + 1 + 4A

---

## 10. สิ่งที่ "ไม่ทำ" ในตอนนี้ (Out of Scope)

- Deploy / production hosting
- หน้าดู/ค้นหา/แก้ไข/ลบข้อมูลที่สมัครแล้ว (แต่ต้องไม่ปิดทางต่อยอด)
- ระบบ login / สิทธิ์ผู้ใช้
- รองรับหลายภาษา (แค่เตรียมโครงรวมข้อความไว้ที่ `messages.ts`)

---

## 11. ข้อมูลอ้างอิง: 6 ภาค 77 จังหวัด (ราชบัณฑิตยสภา)

ใช้ชื่อภาคตามนี้เป็น `regionName` และต้องมีจำนวนตรงตามตาราง

| regionId | regionName | จำนวน | จังหวัด |
|---|---|---|---|
| `north` | เหนือ | 9 | เชียงราย, เชียงใหม่, น่าน, พะเยา, แพร่, แม่ฮ่องสอน, ลำปาง, ลำพูน, อุตรดิตถ์ |
| `northeast` | ตะวันออกเฉียงเหนือ | 20 | กาฬสินธุ์, ขอนแก่น, ชัยภูมิ, นครพนม, นครราชสีมา, บึงกาฬ, บุรีรัมย์, มหาสารคาม, มุกดาหาร, ยโสธร, ร้อยเอ็ด, เลย, สกลนคร, สุรินทร์, ศรีสะเกษ, หนองคาย, หนองบัวลำภู, อุดรธานี, อุบลราชธานี, อำนาจเจริญ |
| `central` | กลาง | 22 | กรุงเทพมหานคร, กำแพงเพชร, ชัยนาท, นครนายก, นครปฐม, นครสวรรค์, นนทบุรี, ปทุมธานี, พระนครศรีอยุธยา, พิจิตร, พิษณุโลก, เพชรบูรณ์, ลพบุรี, สมุทรปราการ, สมุทรสงคราม, สมุทรสาคร, สิงห์บุรี, สุโขทัย, สุพรรณบุรี, สระบุรี, อ่างทอง, อุทัยธานี |
| `east` | ตะวันออก | 7 | จันทบุรี, ฉะเชิงเทรา, ชลบุรี, ตราด, ปราจีนบุรี, ระยอง, สระแก้ว |
| `west` | ตะวันตก | 5 | กาญจนบุรี, ตาก, ประจวบคีรีขันธ์, เพชรบุรี, ราชบุรี |
| `south` | ใต้ | 14 | กระบี่, ชุมพร, ตรัง, นครศรีธรรมราช, นราธิวาส, ปัตตานี, พังงา, พัทลุง, ภูเก็ต, ยะลา, ระนอง, สงขลา, สตูล, สุราษฎร์ธานี |

รวม 9 + 20 + 22 + 7 + 5 + 14 = **77 จังหวัด**

> หมายเหตุ: ค่า `region` ที่เก็บใน DB และไฟล์ JSON ให้เก็บเป็น `regionName` ภาษาไทย (เช่น "เหนือ") ตามตัวอย่างในหัวข้อ Phase 5

---

## 12. Definition of Done (ทั้งโปรเจค)

- [ ] ทุก Phase ผ่าน Tests ที่ระบุ (ยกเว้นรายการ Manual ที่รายงานผู้ใช้แล้ว)
- [ ] `npm run lint`, `npm run build`, `npm test`, `npm run test:e2e` ผ่านทั้งหมด
- [ ] เปิดจากมือถือและ PC ผ่าน `https://<IP>:3000` ใช้ครบทุก flow ได้
- [ ] ไม่มี Device ID หรือ UID ซ้ำในทุกสถานการณ์ concurrency
- [ ] `README.md`, `DECISIONS.md`, `MANUAL_TESTS.md` อัปเดตครบ
