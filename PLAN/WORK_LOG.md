# WORK_LOG.md — บันทึกประวัติการทำงาน ปัญหาที่พบ และวิธีแก้ไข (Execution & Problem-Solving Log)

> เอกสารนี้ใช้บันทึกประวัติการพัฒนาจริงแบบละเอียดสำหรับส่วนต่อขยาย Phase 10 – 17  
> **เกณฑ์การบันทึก:** บันทึกทุกขั้นตอนการทำงาน, ปัญหา/Error ที่พบระหว่างทาง, วิธีการแก้ไข, และผลลัพธ์การทดสอบของแต่ละ Part

---

## 📑 สารบัญบันทึกราย Part
- [โครงสร้างเริ่มต้น & การเตรียมการ](#การเตรียมการก่อนเริ่มงาน-2026-10-29)
- [Part 1: Phase 10 — User Model, Hash & Seed](#part-1-phase-10--user-model-password-hashing--seed)
- [Part 2: Phase 11 — 24h JWT Session & Auth API](#part-2-phase-11--session-jwt-24h--auth-api)
- [Part 3: Phase 12 — Login UI & Route Protection](#part-3-phase-12--หน้า-login-ui--route-protection)
- [Part 4: Phase 13 — 77 Province Geo Boundaries](#part-4-phase-13--ข้อมูลขอบเขต-77-จังหวัด--validator)
- [Part 5: Phase 14 — Registration Status, Pin Log & Admin API](#part-5-phase-14--สถานะลงทะเบียน-pin-log--admin-api)
- [Part 6: Phase 15 — Portal Layout, Sidebar & Dashboard](#part-6-phase-15--portal-layout-sidebar--dashboard)
- [Part 7: Phase 16 — Thailand Map & Province-Restricted Pinning](#part-7-phase-16--หน้า-map-react-simple-maps--ปักแก้-pin--ประวัติ)
- [Part 8: Phase 17 — Full Regression, Security Audit & Wrap-up](#part-8-phase-17--full-regression--security-review)

---

## การเตรียมการก่อนเริ่มงาน (2026-10-29)

### 1. สิ่งที่ทำ (Actions Taken)
- ตรวจสอบสถานะเดิมของโปรเจกต์ (Phase 0–9): Unit tests 106 tests ผ่าน 100%, Lint ผ่าน 0 warnings
- ย้ายและจัดระเบียบแผนงานเข้าสู่โฟลเดอร์ `PLAN/`:
  - `PLAN/PROJECT_PLAN.md`
  - `PLAN/PROJECT_PLAN_AUTH_MAP.md` (ฉบับแก้ไข v3 ล่าสุด)
  - `PLAN/WORKFLOW_STEPS.md` (คู่มือขั้นตอนและคำสั่ง Git แต่ละ Part)
  - `PLAN/WORK_LOG.md` (บันทึกประวัติการทำงาน ปัญหา และวิธีแก้)
- อัปเดต `DECISIONS.md` บันทึกการตัดสินใจสำคัญ:
  - หน้า `/` และ `/register` อยู่นอกระบบ Authen 100%
  - Session อายุ 24 ชั่วโมงตรงไปตรงมา **ไม่มีตัวเลือก "จดจำฉัน"** ตามคำสั่งของผู้ใช้

### 2. ปัญหาที่พบและวิธีแก้ไข (Issues & Solutions)
- **ปัญหา:** เอกสาร `PROJECT_PLAN_AUTH_MAP.md` เดิมมีข้อกำหนด Remember Me checkbox ซึ่งผู้ใช้ระบุว่าไม่ต้องการ
- **วิธีแก้ไข:** อัปเดตเอกสาร ปรับ Q10, Section 3 และตัดพารามิเตอร์ `remember` ออกจาก Phase 11 & 12 ใน `PROJECT_PLAN_AUTH_MAP.md` ให้เป็น Session 24 ชม. ค่าเดียว

---

## Part 1: Phase 10 — User Model, Password Hashing & Seed
- **Branch:** `auth-db`
- **สถานะ:** ✅ สำเร็จสมบูรณ์ (Completed) — 2026-10-29

### 1. สิ่งที่ทำ (Actions Taken)
1. **Git Branching:** แตก branch ใหม่ `auth-db` โดยต่อยอดจากโค้ดล่าสุดของ branch `setup` (ตามการตัดสินใจของผู้ใช้ข้อ 1)
2. **Database Migration:**
   - เพิ่มโมเดล `User` ใน `prisma/schema.prisma` (`id`, `username` @unique, `passwordHash`, `role`, `createdAt`)
   - รัน `npx prisma migrate dev --name add_user_model` สร้าง migration `20261029081413_add_user_model`
3. **Dependencies:**
   - ติดตั้ง `bcryptjs` และ `@types/bcryptjs` สำหรับการแฮชรหัสผ่าน
   - ติดตั้ง `tsx` สำหรับการรัน `prisma/seed.ts`
4. **Implementation:**
   - `src/data/roles.ts`: กำหนด `ROLES = ["admin", "user"]` พร้อม zod `roleSchema` ที่ปฏิเสธ `root`, `superadmin`, `ADMIN` (strict allow-list)
   - `src/lib/auth/password.ts`: ฟังก์ชัน `hashPassword` และ `verifyPassword` ด้วย cost 10 (ดักจับ error ไม่ throw คืน false เสมอ)
   - `src/lib/auth/user-repo.ts`: ฟังก์ชัน `findUserByUsername` (normalize username เป็น lowercase)
   - `prisma/seed.ts`: Upsert จำลอง `admin1` (admin) และ `user1` (user) รหัส `1234` ผ่าน hash เสมอ ป้องกันการรันบน `NODE_ENV=production`
   - `package.json`: เพิ่มสคริปต์ `"db:seed": "prisma db seed"` และ config `"prisma": { "seed": "tsx prisma/seed.ts" }`
   - `README.md`: บันทึกคำสั่ง seed และคำเตือนเรื่องบัญชีตัวอย่าง
5. **Testing:**
   - เขียนชุดทดสอบ `src/__tests__/auth-user.test.ts` ครอบคลุม 11 tests

### 2. ปัญหาและ Error ที่พบระหว่างทาง (Issues Encountered)
1. **PowerShell Command Chaining Error:**
   - *Error:* `The token '&&' is not a valid statement separator in this version.`
   - *สาเหตุ:* บน Windows PowerShell ไม่รองรับตัวคั่นคำสั่งแบบ `&&` ของ bash
2. **Prisma Seed TypeScript Execution:**
   - *Error:* Prisma CLI ต้องการ TypeScript runner สำหรับ execute `prisma/seed.ts`
   - *สาเหตุ:* ใน devDependencies เดิมยังไม่มี `tsx` หรือ `ts-node`
3. **Branch Confusion:**
   - *ข้อสังเกตจากผู้ใช้:* สอบถามเรื่อง branch `db` เดิมว่าทำไมไม่ใช้ branch นั้น
   - *สาเหตุ:* Branch `db` เก่าเป็นของ Phase 4A ที่ยังไม่มีโค้ด UI/Camera/Security ของ Phase 2-9

### 3. วิธีการแก้ไข (Solutions & Fixes)
1. ใช้เครื่องหมาย `;` ในการคั่นคำสั่งบน PowerShell แทน `&&`
2. ติดตั้ง `tsx` ใน devDependencies และตั้งค่า `"prisma": { "seed": "tsx prisma/seed.ts" }` ใน `package.json` ทำให้คำสั่ง `npm run db:seed` ทำงานได้ทันที
3. ปรึกษาและอธิบายให้ผู้ใช้เข้าใจสถานะของ git log และผู้ใช้เลือกข้อ 1 ให้แตก branch ใหม่ `auth-db` จากโค้ดสมบูรณ์ล่าสุดของ `setup`

### 4. ผลลัพธ์และการทดสอบ (Results & Test Verification)
- `npx vitest run src/__tests__/auth-user.test.ts`: ผ่านทั้งหมด 11/11 tests (100%)
- `npm test`: ผ่านทั้งหมด 15 test files / 117 tests (100% Passed โดยไม่กระทบ regression เดิม)
- `npm run lint`: ผ่าน 0 errors, 0 warnings
- ติ๊ก Checklist ครบถ้วนใน `PLAN/PROJECT_PLAN_AUTH_MAP.md`

---

## Part 2: Phase 11 — Session JWT (24h) & Auth API
- **Branch:** `auth-session`
- **สถานะ:** ✅ สำเร็จสมบูรณ์ (Completed) — 2026-10-29

### 1. สิ่งที่ทำ (Actions Taken)
1. **Branch Management:** แตก branch ใหม่ `auth-session` สั้นกระชับจาก `auth-db`
2. **Dependencies & Environment:**
   - ติดตั้ง `jose` สำหรับการลงนามและตรวจสอบ JWT Session แบบ Edge/Node runtime compatible
   - เพิ่มตัวแปร `AUTH_SECRET` ใน `.env` และ `.env.example`
3. **Thai Messages:**
   - เพิ่มหมวด `auth` ใน `src/lib/messages.ts` (ข้อความแจ้งเตือนภาษาไทยสำหรับ login, logout, unauthorized, forbidden, rate limit)
4. **Session & Security Implementation:**
   - `src/lib/auth/session.ts`:
     - ฟังก์ชัน `signSession` กำหนด expiration 24 ชั่วโมง (`SESSION_MAX_AGE_SECONDS = 86400`)
     - ฟังก์ชัน `verifySession` ตรวจสอบ JWT signature และ role against strict allow-list
     - ฟังก์ชัน `buildSetCookieHeader` เซ็ต cookie `session` แบบ `Max-Age=86400`, `HttpOnly`, `SameSite=Lax` (และ `Secure` ใน production)
     - ฟังก์ชัน `buildClearCookieHeader` ลบ cookie ด้วย `Max-Age=0`
     - ฟังก์ชัน `extractTokenFromCookieHeader` และ `getSessionFromRequest` ดึง session จาก cookie header
   - `src/lib/auth/guards.ts`:
     - ฟังก์ชัน `safeNextPath` ป้องกัน Open Redirect Attack (บล็อก absolute URLs, `//`, `/\`, และ dangerous schemes)
     - ฟังก์ชัน `homePathForRole` กำหนด default path ตามบทบาทผู้ใช้
     - ฟังก์ชัน `requireSession` และ `requireRole` ป้องกัน API routes
5. **API Route Handlers:**
   - `POST /api/auth/login`:
     - Rate limit ≤ 10 req/min ต่อ IP ด้วย `checkRateLimit` (คืน 429 + Retry-After)
     - Body size limit 64KB (Content-Length header & raw text, คืน 413)
     - ป้องกัน Timing Attack: ถ้าไม่พบ user ให้รัน `verifyPassword` เทียบกับ `DUMMY_BCRYPT_HASH` เพื่อให้เวลาประมวลผลใกล้เคียงกัน
     - ป้องกัน User Enumeration: กรณีรหัสผิดหรือไม่พบ user คืน status 401 พร้อมข้อความเดียวกันเป๊ะ ("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
     - ตั้งค่า Set-Cookie header 24 ชั่วโมงและตอบกลับ `200 { success: true, role, username, redirectTo }`
   - `POST /api/auth/logout`: ล้าง session cookie (ตอบ `200 { success: true }` พร้อม Set-Cookie `Max-Age=0`)
   - `GET /api/auth/me`: ตรวจสอบ session ปัจจุบัน (คืน 401 ถ้ายังไม่ล็อกอิน, คืน `200 { authenticated: true, user: { id, username, role } }`)
6. **Testing:**
   - สร้างชุดทดสอบ `src/__tests__/auth-api.test.ts` ครอบคลุม 22 tests (JWT sign/verify, tampered token, cookie helpers, Open redirect sanitization, login success/failure, user enumeration defense, rate limiting 429, payload too large 413, logout, และ me endpoint)

### 2. ปัญหาและ Error ที่พบระหว่างทาง (Issues Encountered)
1. **Vitest jsdom Realm Issue (`TypeError: Key for the HS256 algorithm must be one of type CryptoKey, KeyObject, JSON Web Key, or Uint8Array. Received an instance of Uint8Array`):**
   - *สาเหตุ:* โปรเจคตั้งค่า `environment: 'jsdom'` เป็นค่าเริ่มต้นใน `vitest.config.ts` ทำให้ `Uint8Array` ที่สร้างจาก `TextEncoder` ใน test environment อยู่คนละ realm กับ `Uint8Array` ใน package `jose` ที่โหลดผ่าน Node module loader ทำให้การเช็ค `key instanceof Uint8Array` ใน jsdom คืนค่าเป็น `false`
2. **JWT Subject Claim Type Error (`TypeError: "sub" claim must be a string`):**
   - *สาเหตุ:* โมเดล `User` ใน Prisma schema มีฟิลด์ `id` เป็นตัวเลข auto-increment (`Int`) แต่เมธอด `setSubject()` ใน `jose` บังคับรับค่าเป็น `string`
3. **Zod v4 Error Structure (`TypeError: Cannot read properties of undefined (reading '0')`):**
   - *สาเหตุ:* โค้ดเดิมพยายามเข้าถึง `parseResult.error.errors[0]` แต่ Zod v4 ในโปรเจคเก็บข้อผิดพลาดไว้ใน array `parseResult.error.issues`

### 3. วิธีการแก้ไข (Solutions & Fixes)
1. ระบุ docblock `/** @vitest-environment node */` ที่ส่วนหัวของไฟล์ `src/__tests__/auth-api.test.ts` เพื่อให้ API test รันบน native Node environment อย่างถูกต้องและตรงตามการทำงานจริงของ Backend
2. แปลง `user.id` เป็น string ด้วย `String(user.id)` ใน `POST /api/auth/login` และใส่ `String(payload.sub)` ป้องกันใน `signSession`
3. ปรับการดึง error message จาก Zod ให้ปลอดภัยด้วย optional chaining: `parseResult.error.issues?.[0]?.message || parseResult.error.errors?.[0]?.message || messages.auth.invalidCredentials`

### 4. ผลลัพธ์และการทดสอบ (Results & Test Verification)
- `npx vitest run src/__tests__/auth-api.test.ts`: ผ่านทั้งหมด 22/22 tests (100%)
- `npm test`: ผ่านทั้งหมด 16 test files / 139 tests (100% Passed โดยไม่กระทบ regression เดิม)
- `npm run lint`: ผ่าน 0 errors, 0 warnings
- ติ๊ก Checklist ครบถ้วนใน `PLAN/PROJECT_PLAN_AUTH_MAP.md`

---
*(Part 3: Phase 12 จะถูกบันทึกต่อในหัวข้อถัดไป)*

