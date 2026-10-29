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
*(Part 2: Phase 11 จะถูกบันทึกต่อในหัวข้อถัดไป)*
