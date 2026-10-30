# Deployment & Database Migration Checklist (Phase 9)

เอกสารสรุปข้อควรปฏิบัติ ขั้นตอน และเช็คลิสต์ก่อนนำระบบ QR Code Registration ขึ้น Production Environment และการย้ายฐานข้อมูลจาก SQLite สู่ PostgreSQL

---

## 1. การเปลี่ยนฐานข้อมูลจาก SQLite ไปเป็น PostgreSQL

### เหตุผลและข้อจำกัดของ SQLite บน Production / Serverless
- บน Serverless / PaaS (เช่น Vercel, Netlify, AWS Lambda) ระบบ filesystem เป็นแบบ Read-Only ชั่วคราว (Ephemeral) ไฟล์ SQLite ไม่คงทนและไม่สามารถแชร์ข้าม instances ได้
- แม้จะโฮสต์บน VPS หรือ Docker Container หากมีโหลดผู้ใช้พร้อมกันจำนวนมาก SQLite รองรับการเขียนพร้อมกันแบบ 1 Writer เท่านั้น (`SQLITE_BUSY`)
- **เป้าหมาย**: ย้ายไปใช้ Managed PostgreSQL (เช่น Supabase, Neon, AWS RDS, GCP Cloud SQL) หรือ self-hosted PostgreSQL

### แผนการย้าย Schema และ Prisma Configuration
1. **แก้ไข `prisma/schema.prisma`**:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. **ปรับปรุง Sequence Handling ใน `src/lib/registration-repo.ts`**:
   - ปัจจุบันโค้ดใช้ Transaction ป้องกัน Race Condition บนตาราง `DeviceCounter`
   - เมื่อย้ายไป PostgreSQL โค้ดของ `createRegistration` สามารถรันได้ทันทีโดยไม่ต้องแก้ Business Logic เพราะใช้ Prisma Transaction (`prisma.$transaction`) ที่เป็นมาตรฐาน
   - สำหรับ high-throughput เพิ่มเติม สามารถเลือกใช้ PostgreSQL native `SEQUENCE` หรือ row-level locking (`SELECT ... FOR UPDATE`)
3. **Migration สคริปต์**:
   - รัน `npx prisma migrate dev --name init_postgres` เพื่อสร้าง DDL สำหรับ PostgreSQL
   - ย้ายข้อมูลเก่า: Export จาก SQLite เป็น SQL dump หรือ JSON แล้ว import เข้า PostgreSQL โดยตรวจสอบว่า `DeviceCounter.lastSeq` มีค่าเท่ากับ `MAX(seq)` ของแต่ละ device type

---

## 2. Environment Variables Checklist

ก่อน deploy ให้ตรวจสอบว่าได้กำหนดตัวแปรใน `.env.production` ครบถ้วน:

| ตัวแปร | คำอธิบาย | ตัวอย่าง |
|---|---|---|
| `DATABASE_URL` | Connection string ของ PostgreSQL (ใช้ connection pooling เช่น PgBouncer / Prisma Accelerate ถ้าเป็น Serverless) | `postgresql://user:password@host:5432/dbname?pgbouncer=true` |
| `NODE_ENV` | กำหนดเป็น production | `production` |
| `PORT` | พอร์ตที่ต้องการให้ service รับ request | `3000` |
| `NEXT_PUBLIC_APP_URL` | URL สาธารณะของแอป | `https://qrcode.yourdomain.com` |

---

## 3. SSL / HTTPS & Hardware Access Requirements

- **Camera & Screen Capture API**:
  - `navigator.mediaDevices.getUserMedia` และ `navigator.mediaDevices.getDisplayMedia` ต้องรันบน **Secure Context (HTTPS)** เท่านั้น
  - ในเครื่อง Dev ใช้ `--experimental-https` ของ Next.js
  - บน Production ต้องมี SSL Certificate ที่ถูกต้อง (เช่น Let's Encrypt / Cloudflare SSL)
- **HTTP Security Headers**:
  - ตรวจสอบ `next.config.ts` ว่า `Permissions-Policy` อนุญาต `camera=(self), display-capture=(self)` และไม่ถูก CDN หรือ Reverse Proxy (Nginx/Traefik) ทับหรือตัดทอน
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 4. Rate Limiting & Proxy Configuration

- ปัจจุบัน Rate Limiter ทำงานแบบ **In-memory** (`src/lib/rate-limit.ts`) ซึ่งเหมาะกับ Single-instance (VPS/Docker)
- หาก deploy แบบ Multi-instance / Serverless:
  - ให้ปรับ `src/lib/rate-limit.ts` มาใช้ **Upstash Redis** หรือ **Redis Key-Value** ส่วนกลาง
  - ตรวจสอบ Header `X-Forwarded-For` หรือ Cloudflare `CF-Connecting-IP` เพื่อให้ได้ Client Real IP ที่ถูกต้อง

---

## 5. การสำรองข้อมูลและการกู้คืน (Backup & Disaster Recovery)

- ตั้งเวลาสำรองข้อมูลอัตโนมัติ (Daily Automated Backup)
- ทดสอบกู้คืนข้อมูล (Restore Drill) จาก backup เพื่อยืนยันว่า `Registration` และ `DeviceCounter` มีความสอดคล้องกัน
- เปิด Point-In-Time-Recovery (PITR) หากใช้ Managed PostgreSQL

---

## 6. ข้อกำหนดด้านความปลอดภัยและส่วนขยาย Phase 10–17 (Auth, Dashboard & Map)

- **AUTH_SECRET ใน Production:**
  - ต้องสร้างคีย์สุ่มความยาวไม่ต่ำกว่า 32 ไบต์ (เช่น ด้วยคำสั่ง `openssl rand -base64 32`) และกำหนดใน `.env.production`
  - ห้ามใช้ Default Secret หรือปล่อยว่างเด็ดขาด
- **ปิดการใช้งาน Seed บัญชีตัวอย่างใน Production:**
  - สคริปต์ `prisma/seed.ts` มีการตรวจสอบ `NODE_ENV === 'production'` และจะยกเลิกการทำงานทันที
  - ลบบัญชีตัวอย่าง `admin1` / `user1` หรือเปลี่ยนรหัสผ่านทันทีหลังขึ้นระบบจริง
- **การ Migrate ตารางใหม่สู่ PostgreSQL:**
  - ตาราง `User`, `Session`, `RegistrationPinLog` และฟิลด์ใหม่ใน `Registration` (`status`, `latitude`, `longitude`, `confirmedAt`, `confirmedById`) ต้องรัน migration บน PostgreSQL ผ่าน `npx prisma migrate deploy`
  - ยืนยันว่า Foreign Key และ Index บน `RegistrationPinLog` (`registrationId`, `actorId`, `createdAt`) สร้างอย่างถูกต้อง
- **การทดสอบ Concurrency บน PostgreSQL:**
  - ทดสอบกรณี Admin ปักหมุด/ยืนยันข้อมูลเดียวกันพร้อมกันด้วย Row-level locking บน PostgreSQL
  - ยืนยันว่า Transaction Rollback ไม่ก่อให้เกิดข้อมูลตกหล่น

---

## 7. Pre-flight Verification Steps

- [x] รัน `npm run lint` ผ่าน 100% 0 errors, 0 warnings
- [x] รัน `npm test` ผ่านครบทุก unit/integration tests (23 test files / 214 tests)
- [x] รัน `npx playwright test` ผ่านครบทุก E2E tests (58 tests)
- [x] รัน `npm run build` ผ่าน 100% ไม่มี dynamic code leakage
- [x] ตรวจสอบ Security Checklist: ไม่มีรหัสผ่านรั่วไหล, พิกัดนอกจังหวัดถูกบล็อก, Rate limiting ทำงาน

