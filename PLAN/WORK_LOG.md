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

## Part 3: Phase 12 — Login Page & Route Protection (Proxy / Middleware)
- **Branch:** `auth-login`
- **สถานะ:** ✅ สำเร็จสมบูรณ์ (Completed) — 2026-10-29

### 1. สิ่งที่ทำ (Actions Taken)
1. **Branch Management:** แตก branch ใหม่ `auth-login` จาก `auth-session`
2. **Next.js 16 Proxy Convention (`src/proxy.ts` & `src/lib/auth/middleware-logic.ts`):**
   - พัฒนา pure logic `evaluateAuthMiddleware` ให้ทดสอบได้โดยไม่ต้องรันเซิร์ฟเวอร์
   - ใช้งาน `src/proxy.ts` (Next.js 16 standard proxy convention)
   - กำหนด `config.matcher` ครอบคลุมเฉพาะ `['/dashboard', '/dashboard/:path*', '/admin', '/admin/:path*', '/login']`
   - **Isolation Rule สำเร็จ 100%:** หน้า `/`, `/register`, และ API สาธารณะ ไม่อยู่ใน matcher โดยสิ้นเชิง และไม่มีการแตะโค้ดเดิมของหน้าแรก
3. **UI Components & Pages:**
   - `src/components/LoginForm.tsx`:
     - พัฒนาด้วย React Hook Form + Zod
     - Input `username` (`autoComplete="username"`) และ `password` (`type="password"`, `autoComplete="current-password"`)
     - **ไม่มี Checkbox "จดจำฉัน"** ตามข้อกำหนดเด็ดขาดของผู้ใช้
     - ปุ่ม submit แสดงสถานะกำลังส่ง (`disabled` พร้อม spinner และข้อความ "กำลังเข้าสู่ระบบ...")
     - Error banner แสดงด้วย `role="alert"` ถูกต้องตามมาตรฐาน Accessibility
   - `src/app/login/page.tsx`: Server Component ตรวจสอบ session หากมี session อยู่แล้วจะ redirect ไป `/dashboard` หรือ target path ทันที
   - `src/app/(portal)/layout.tsx`: Portal layout ตรวจสอบ session ซ้ำฝั่ง Server (Defense-in-depth)
   - `src/app/(portal)/dashboard/page.tsx`: หน้าแดชบอร์ด placeholder พร้อมปุ่มออกจากระบบและแสดง role ผู้ใช้
   - `src/app/(portal)/admin/page.tsx`: Redirect ไป `/dashboard` เสมอ
   - `src/app/(portal)/admin/map/page.tsx`: Admin map placeholder พร้อม Server-side role check ซ้ำ (กัน user เข้า)
   - `src/app/api/auth/logout/route.ts`: รองรับทั้ง standard HTML Form submit (303 See Other redirect ไป `/login`) และ AJAX Fetch (200 JSON) พร้อมเคลียร์ cookie
4. **Testing Infrastructure & E2E Helpers:**
   - `e2e/helpers/auth.ts`: Helper สำหรับ login ทาง UI (`loginViaUi`) และการตั้ง cookie session จำลอง (`setAuthCookie`)
   - `src/__tests__/auth-login-flow.test.tsx`: 14 unit & component tests สำหรับ matcher, middleware logic และ LoginForm UI
   - `e2e/auth-route-guards.spec.ts`: 10 Playwright E2E tests สำหรับ route protection, public route isolation, role enforcement, open redirect protection, และ logout flow

### 2. ปัญหาและ Error ที่พบระหว่างทาง (Issues Encountered)
1. **Next.js 16 Middleware Deprecation Warning:**
   - *Error:* `The "middleware" file convention is deprecated. Please use "proxy" instead.`
   - *สาเหตุ:* Next.js 16 แนะนำให้เปลี่ยนชื่อ convention จาก `middleware.ts` เป็น `proxy.ts`
2. **Zod v4 Parameter Compatibility:**
   - *Error:* `Object literal may only specify known properties, and 'required_error' does not exist in type '$ZodStringParams'.` ใน `login/route.ts`, `LoginForm.tsx`, และ `roles.ts`
   - *สาเหตุ:* Zod v4 เปลี่ยน signature ไม่รับ `required_error` และ `errorMap` ในลักษณะเดิม
3. **TypeScript Readonly `process.env.NODE_ENV`:**
   - *Error:* `Cannot assign to 'NODE_ENV' because it is a read-only property.` ใน `auth-user.test.ts` ระหว่าง `next build`
4. **HTML Form Logout Response Type:**
   - *Error:* เมื่อกดปุ่ม logout ที่เป็น standard `<form action="/api/auth/logout" method="POST">` browser ค้างอยู่ที่หน้า JSON แทนที่จะ redirect
   - *สาเหตุ:* Endpoint เดิมตอบเฉพาะ `NextResponse.json` ไม่ได้ส่ง HTTP redirect 303 สำหรับ browser form navigation
5. **Cross-Realm CryptoKey ใน Vitest UI Tests:**
   - *Error:* เมื่อรัน UI test ร่วมกับ `signSession` ใน jsdom พบข้อความ `TypeError: Received an instance of Uint8Array`

### 3. วิธีการแก้ไข (Solutions & Fixes)
1. ปรับมาใช้ `src/proxy.ts` แทน `src/middleware.ts` ตามมาตรฐาน Next.js 16 พร้อมคง export ฟังก์ชัน `middleware` และ `proxy` ไว้เพื่อ backward compatibility
2. ปรับ Zod schema ให้เข้ากันได้กับ Zod v4: ใช้ `z.string().min(1, messages.auth.usernameRequired)` และ `z.enum(["admin", "user"], { message: ... })`
3. Cast `(process.env as Record<string, string | undefined>).NODE_ENV = 'production'` ใน test
4. ตรวจสอบ header `accept.includes("text/html")` ใน `POST /api/auth/logout`: หากเป็น Form POST จากเบราว์เซอร์ ให้ redirect 303 ไปที่ `/login` พร้อมส่ง Set-Cookie ล้าง session
5. อัปเกรด `src/lib/auth/session.ts` ให้ใช้ `crypto.subtle.importKey` (`CryptoKey`) ซึ่งทำงานได้สมบูรณ์แบบข้ามทุกสภาพแวดล้อม (Node.js, Edge, Browser, และ Vitest jsdom)

### 4. ผลลัพธ์และการทดสอบ (Results & Test Verification)
- **Unit & Integration Tests (`npm test`):** ผ่าน **17 test files / 153 tests (100% Passed)**
- **Playwright E2E Tests (`npm run test:e2e`):** ผ่าน **46/46 tests (100% Passed)** รวมถึง 10 tests ใหม่ของ Phase 12
- **Next.js Production Build (`npm run build`):** ผ่านฉลุย 100% ไร้ warning ไร้ type error
- **Lint Check (`npm run lint`):** ผ่าน **0 errors, 0 warnings**
- ติ๊ก Checklist ครบถ้วนใน `PLAN/PROJECT_PLAN_AUTH_MAP.md`

---

## Part 4: Phase 13 — 77 Provinces Boundary Data & Point-in-Polygon Engine
- **Branch:** `geo-provinces`
- **สถานะ:** ✅ สำเร็จสมบูรณ์ (Completed) — 2026-10-29

### 1. สิ่งที่ทำ (Actions Taken)
1. **Branch Management:** แตก branch ใหม่ `geo-provinces` จาก `auth-login`
2. **Data Acquisition & Mapping (`src/data/thailand-provinces.json`):**
   - นำเข้าชุดข้อมูลขอบเขตทั้ง 77 จังหวัดของประเทศไทยจาก `apisit/thailand.json` (Open Data / MIT License)
   - ประกอบด้วย 69 Polygon และ 8 MultiPolygon (เกาะต่างๆ เช่น ภูเก็ต, ตราด, สุราษฎร์ธานี ฯลฯ)
   - ทำ Mapping จับคู่ชื่อภาษาอังกฤษและภาษาไทยให้ตรงกับ `src/data/thai-regions.ts` ครบถ้วน 100% (77/77 จังหวัด ทั้งบึงกาฬ และกรุงเทพมหานคร)
   - คำนวณ Bounding Box (`bbox`: `[minLng, minLat, maxLng, maxLat]`) และ Representative Internal Point (`sample_point`) บันทึกฝังไว้ใน properties ล่วงหน้า
3. **Point-in-Polygon Engine (`src/lib/province-geo.ts`):**
   - พัฒนาอัลกอริทึม Planar Ray-Casting Point-in-Polygon ทำงานได้ทั้ง Polygon และ MultiPolygon (รวมถึงการตรวจ hole/รูพรุน)
   - **O(1) BBox Pre-check:** กรองพิกัดที่อยู่นอก Bounding Box ออกทันทีในระดับ O(1) ก่อนเข้าคำนวณ polygon rays
   - **In-Memory Cache:** ดัชนีข้อมูล `Map<string, ProvinceFeature>` ครั้งเดียวตอนโหลดโมดูล ไม่ parse ซ้ำในแต่ละ request
   - **Coordinate Sanity & Anti-Swap Guard:**
     - ตรวจสอบ `NaN`, `Infinity`, null, undefined, และพิกัดนอกช่วงโลก (`lat < -90 || lat > 90 || lng < -180 || lng > 180`) คืน `false` อย่างปลอดภัย
     - ตรวจสอบชื่อจังหวัดที่ไม่มีในระบบ: `throw Error` ชัดเจน
   - มี helper functions: `getAllProvincesGeo`, `getAllProvinceNames`, `getProvinceBBox`, `getProvinceSamplePoint`, `findProvinceFeature`
4. **Architectural Decisions (`DECISIONS.md`):**
   - บันทึกแหล่งที่มาของข้อมูล (apisit/thailand.json, MIT License)
   - บันทึกเหตุผลการเลือก Planar Ray-Casting แทน spherical projection (ไม่ติดปัญหา winding order และเร็วระดับไมโครวินาที)
5. **Testing Suite (`src/__tests__/province-geo.test.ts`):**
   - 16 tests ครอบคลุม:
     - 77 จังหวัดตรงกับ thai-regions.ts 100%
     - พิกัดสถานที่จริง (เชียงใหม่, กทม., ภูเก็ต, อุบลราชธานี, สงขลา)
     - จุดของจังหวัดหนึ่งไม่อยู่ในอีกจังหวัดหนึ่ง
     - จุดกลางอ่าวไทยไม่อยู่ในจังหวัดใด
     - การสลับค่า lat/lng ตั้งใจคืน `false`
     - จุดตัวแทน (`sample_point`) ทั้ง 77 จังหวัด ผ่านการตรวจของจังหวัดตัวเองครบ 100%
     - ชื่อจังหวัดผิด throw Error
     - NaN/Infinity คืน `false`
     - Performance Benchmark: 1,000 ครั้งใช้เวลาเพียง ~39ms (< 50ms)

### 2. ปัญหาและ Error ที่พบระหว่างทาง (Issues Encountered)
1. **TypeScript Tuple Incompatibility ใน JSON Import:**
   - *Error:* `Conversion of type ... to type '{ features: ProvinceFeature[]; }' may be a mistake ... Target requires 4 element(s) but source may have fewer.`
   - *สาเหตุ:* TypeScript infer ฟิลด์ `bbox` จากการ import JSON เป็น `number[]` ทั่วไป ไม่ตรงกับ tuple `[number, number, number, number]` ของ interface

### 3. วิธีการแก้ไข (Solutions & Fixes)
1. ปรับการ type cast ขณะ import ผ่าน `unknown`: `(thailandGeoData as unknown as { features: ProvinceFeature[] }).features` ทำให้ build ผ่านและคง Type safety ครบถ้วน

### 4. ผลลัพธ์และการทดสอบ (Results & Test Verification)
- **Unit & Integration Tests (`npm test`):** ผ่าน **18 test files / 169 tests (100% Passed)**
- **Next.js Production Build (`npm run build`):** ผ่านฉลุย 100% ไร้ warning ไร้ type error
- **Lint Check (`npm run lint`):** ผ่าน **0 errors, 0 warnings**
- ติ๊ก Checklist ครบถ้วนใน `PLAN/PROJECT_PLAN_AUTH_MAP.md`

---

## Part 5: Phase 14 — Registration Status, Admin Confirmation, Pin Update & Audit Logs
- **Branch:** `registration-status`
- **สถานะ:** ✅ สำเร็จสมบูรณ์ (Completed) — 2026-10-29

### 1. สิ่งที่ทำ (Actions Taken)
1. **Branch Management:** แตก branch ใหม่ `registration-status` จาก `geo-provinces`
2. **Prisma Schema & Database Migration:**
   - ปรับปรุงโมเดล `Registration` ใน `prisma/schema.prisma`:
     - เพิ่มฟิลด์ `status` String (default "UNREGISTERED") พร้อม index `status` และ composite index `[status, createdAt]`
     - เพิ่มฟิลด์พิกัดหมุด `latitude` Float? และ `longitude` Float?
     - เพิ่มฟิลด์บันทึกผู้ยืนยัน `confirmedAt` DateTime?, `confirmedById` Int? พร้อม relation กับโมเดล `User`
     - เพิ่ม relation `pinLogs` ไปยังโมเดลประวัติหมุด
   - สร้างโมเดล `RegistrationPinLog` สำหรับ Audit Trail:
     - ฟิลด์: `id`, `registrationId`, `action` ("CONFIRM" | "UPDATE"), `oldLatitude`, `oldLongitude`, `newLatitude`, `newLongitude`, `actorId`, `createdAt`
     - Relations: เชื่อมกับ `Registration` (onDelete: Cascade) และ `User` (actor)
     - Indexes: `registrationId`, `actorId`, `createdAt`
   - รัน Migration: `20261029102056_add_registration_status_and_pin_logs` และ generate Prisma Client
3. **Data Types & Constants (`src/data/registration-status.ts`):**
   - กำหนด `REGISTRATION_STATUSES = ['UNREGISTERED', 'REGISTERED'] as const`
   - สร้าง helper dictionary: `REGISTRATION_STATUS_LABELS`, `REGISTRATION_STATUS_BADGES` (สีและสไตล์ตามดีไซน์ซิสเต็ม)
   - Zod schema: `registrationStatusSchema`
4. **Repository Layer Functions (`src/lib/registration-repo.ts`):**
   - สร้าง Custom Error Classes: `NotFoundError` (404), `AlreadyRegisteredError` (409), `NotRegisteredError` (409), `PinOutsideProvinceError` (400)
   - **Atomic Confirmation (`confirmRegistration`):**
     - ตรวจสอบ Point-in-Polygon ด้วย `isPointInProvince` เพื่อความมั่นใจว่าพิกัดอยู่ในจังหวัดที่ลงทะเบียนจริง
     - ใช้ Prisma Transaction ร่วมกับ `updateMany({ where: { id, status: 'UNREGISTERED' }, data: ... })` เพื่อป้องกัน Race Condition จาก Admin กดยืนยันพร้อมกัน
     - บันทึก `RegistrationPinLog` ชนิด `CONFIRM` โดยอัตโนมัติใน transaction เดียวกัน
   - **Compare-and-Swap Pin Update (`updatePin`):**
     - ตรวจสอบ Point-in-Polygon ซ้ำ
     - หากพิกัดใหม่เท่ากับพิกัดเดิมเป๊ะ จะ return ทันทีโดยไม่สร้าง log ซ้ำซ้อน
     - ใช้ Compare-and-Swap retry loop (สูงสุด 3 ครั้ง) เพื่อรับมือ Concurrent Updates อย่างแม่นยำ
     - บันทึก `RegistrationPinLog` ชนิด `UPDATE` ใน transaction
   - **Listing & Analytics Functions:**
     - `listRegistrations`: รองรับ status filter ("ALL" | "UNREGISTERED" | "REGISTERED") พร้อม pagination และดึง counts สรุปภาพรวม
     - `listPinLogs`: ดึงประวัติการแก้ไขหมุด เรียงจากล่าสุดไปเก่าสุด พร้อมชื่อผู้ดำเนินการ (`actor.username`)
     - `listConfirmedPins`: ดึงเฉพาะหมุดที่ยืนยันแล้ว สำหรับแสดงผลบนแผนที่
5. **REST API Route Handlers:**
   - `GET /api/registrations`: ดึงรายการลงทะเบียน พร้อม pagination และ metadata (ป้องกันด้วย `requireSession`)
   - `POST /api/registrations/[id]/confirm`: แอดมินยืนยันสถานะและปักหมุดครั้งแรก (ป้องกันด้วย `requireRole('admin')`)
   - `PATCH /api/registrations/[id]/pin`: แอดมินแก้ไขพิกัดหมุด (ป้องกันด้วย `requireRole('admin')`)
   - `GET /api/registrations/[id]/logs`: ดึงประวัติ Audit Log การปักหมุด (ป้องกันด้วย `requireRole('admin')`)
6. **Testing Suite (`src/__tests__/registration-status-api.test.ts`):**
   - 13 integration tests ครอบคลุม:
     - สิทธิ์การเข้าถึง (401 เมื่อไม่มี session, 403 เมื่อไม่ใช่ admin)
     - Pagination และ Status Filtering
     - การยืนยันสถานะสำเร็จและการบันทึกพิกัด + log
     - ปฏิเสธการยืนยันซ้ำ (409)
     - ปฏิเสธพิกัดนอกจังหวัด (400)
     - แก้ไขพิกัดหมุดสำเร็จและบันทึกประวัติ (409 หากยังไม่ลงทะเบียน)
     - ไม่สร้าง log เมื่อส่งพิกัดเดิมซ้ำ
     - Audit log เรียงลำดับถูกต้องพร้อมชื่อแอดมิน

### 2. ปัญหาและ Error ที่พบระหว่างทาง (Issues Encountered)
1. **Schema Validation Regression ใน `POST /api/registrations`:**
   - *Error:* `src/__tests__/api-routes.test.ts` ล้ม 2 tests เนื่องจากคาดหวัง `json.error = 'Validation failed'`
   - *สาเหตุ:* ระหว่างเพิ่มฟังก์ชัน `GET` ใน route handler มีการเปลี่ยนรูปแบบ response เมื่อ validation fail จากเดิม
2. **Zod v4 Incompatibility กับ `required_error` ใน `coordsSchema`:**
   - *Error:* Next.js build ล้มด้วย `TS2353: Object literal may only specify known properties, and 'required_error' does not exist in type '$ZodNumberParams'`
   - *สาเหตุ:* Zod v4 เปลี่ยน signature ของ `z.number()` โดยยกเลิก `required_error` และให้ใช้ `{ message: ... }` แทน
3. **ESLint Unused Variable Warning:**
   - *Warning:* `'session' is assigned a value but never used` ใน `GET /api/registrations`

### 3. วิธีการแก้ไข (Solutions & Fixes)
1. คืนค่ารูปแบบ response เดิมของ `POST /api/registrations` เป็น `{ error: 'Validation failed', details: parseResult.error.format() }`
2. ปรับ `coordsSchema` ใน route handler ของ `confirm` และ `pin` ให้ใช้ `z.number({ message: "..." })` ตามมาตรฐาน Zod v4
3. เปลี่ยนการ destructure ใน `GET /api/registrations` เป็น `const { errorResponse } = await requireSession(request);`

### 4. ผลลัพธ์และการทดสอบ (Results & Test Verification)
- **Unit & Integration Tests (`npm test`):** ผ่าน **19 test files / 182 tests (100% Passed)**
- **Playwright E2E Tests (`npx playwright test`):** ผ่าน **46 tests (100% Passed)**
- **Next.js Production Build (`npm run build`):** ผ่านฉลุย 100% รัน SSG และ Route Manifest ครบทุกหน้า
- **Lint Check (`npm run lint`):** ผ่าน **0 errors, 0 warnings**
- ติ๊ก Checklist ครบถ้วนใน `PLAN/PROJECT_PLAN_AUTH_MAP.md`

---

## Part 6: Phase 15 — Portal Layout, Sidebar, and Dashboard
- **Branch:** `dashboard`
- **สถานะ:** ✅ สำเร็จสมบูรณ์ (Completed) — 2026-10-29

### 1. สิ่งที่ทำ (Actions Taken)
1. **Branch Management:** แตก branch ใหม่ `dashboard` จาก `registration-status`
2. **Google Maps Helper (`src/lib/google-maps.ts`):**
   - พัฒนาฟังก์ชัน `buildGoogleMapsUrl(latitude, longitude)` สร้าง URL `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`
   - ป้องกันค่าที่ไม่ใช่ finite number (โยน TypeError)
   - Unit tests ครอบคลุมพิกัดปกติ, ค่าลบ, ค่าศูนย์, และ validation
3. **Portal Layout & Responsive Sidebar (`src/components/PortalSidebar.tsx`, `src/app/(portal)/layout.tsx`):**
   - ปรับ `PortalLayout` รองรับ Grid responsive layout (Desktop มี Sidebar ซ้ายมือความกว้าง `w-64`, Mobile มี Header Bar ด้านบน)
   - `PortalSidebar` ตรวจสอบ Role อย่างเข้มงวด:
     - `user`: แสดงเฉพาะเมนู "แดชบอร์ด" (ไม่มีลิงก์ "แผนที่" ปรากฏใน DOM เด็ดขาด)
     - `admin`: แสดงทั้งเมนู "แดชบอร์ด" และ "แผนที่" (`/admin/map`)
     - มีลิงก์กลับหน้าสาธารณะ "ไปหน้าสแกน QR" (`/`)
     - แสดงชื่อผู้ใช้, ป้ายบทบาท, และปุ่ม "ออกจากระบบ" (`#btn-logout`)
     - รองรับคีย์บอร์ดและ Accessibility: `aria-current="page"`, Mobile drawer ปิดด้วย `Esc`, `aria-expanded` สลับสถานะถูกต้อง
4. **Status Filter Buttons (`src/components/StatusFilterButtons.tsx`):**
   - ปุ่มกรองสถานะ 2 ปุ่ม: "ยังไม่ลงทะเบียน (N)" และ "ลงทะเบียน (N)"
   - ใช้งาน `aria-pressed`: เริ่มต้นเป็น `false` ทั้ง 2 ปุ่ม (แสดงทุกสถานะ)
   - กดปุ่ม = กรองสถานะนั้น (`aria-pressed="true"`), กดซ้ำ = กลับไปแสดงทั้งหมด
   - ตัวเลขบนปุ่มเชื่อมโยงกับ `counts` ของ API โดยตรง
5. **Registration Card Component (`src/components/RegistrationCard.tsx`):**
   - แสดงข้อมูลอุปกรณ์ครบถ้วน: Device ID, UID, ประเภทอุปกรณ์, ภาค, จังหวัด, วันที่ลงทะเบียน
   - ป้ายสถานะเป็นข้อความเสมอ (ไม่พึ่งพาแค่สี) ตามมาตรฐานการเข้าถึง
   - ส่วนพิกัดหมุด:
     - มี pin: แสดงพิกัด + ลิงก์ "เปิดใน Google Maps" (`target="_blank"`, `rel="noopener noreferrer"`) + หากเป็น admin จะมีปุ่ม "แก้ไข pin"
     - ไม่มี pin: แสดง "ยังไม่มี pin" + หากเป็น admin จะมีปุ่ม "เพิ่ม pin" + หากเป็น user จะแสดง "รอผู้ดูแลเพิ่ม pin" (ไม่มีปุ่ม)
6. **Dashboard Client & Page (`src/components/DashboardClient.tsx`, `src/app/(portal)/dashboard/page.tsx`):**
   - ครอบด้วย React `Suspense` boundary เพื่อรองรับ `useSearchParams`
   - จัดการ State: Loading, Error (พร้อมปุ่ม "ลองใหม่อีกครั้ง"), และ Empty ("ไม่มีข้อมูล")
   - จัดวาง Grid แสดงการ์ด 12 รายการต่อหน้า พร้อมระบบแบ่งหน้า (Previous / Next / Page Indicator)
   - เชื่อมโยง URL search parameter `?status=` และ `?page=`
   - ปฏิบัติตามมาตรฐาน Read-Only ของ Dashboard (ไม่มี mutation เกิดขึ้นในหน้านี้)
7. **PortalSidebar Integration for Scan QR & Register (`src/app/page.tsx`, `src/app/register/page.tsx`, `src/components/ScanClient.tsx`, `src/components/RegisterClient.tsx`):**
   - ตรวจสอบ Session แบบ Dynamic ในหน้า `/` และ `/register`
   - หากผู้ใช้ล็อกอินอยู่ (`user` หรือ `admin`): แสดง `PortalSidebar` ทั้งแบบ Desktop และ Mobile Drawer พร้อมสถานะ Active บนเมนู "ไปหน้าสแกน QR" และซ่อนปุ่ม "เข้าสู่ระบบเจ้าหน้าที่"
   - หากเป็น Guest ทั่วไป: แสดงหน้า Standalone แบบดั้งเดิม 100% รักษาหลัก Public Isolation
8. **Comprehensive Test Suite:**
   - Unit & Component tests (`src/__tests__/portal-dashboard-components.test.tsx`): 10 tests ครอบคลุม Sidebar role isolation, Mobile drawer, StatusFilterButtons, RegistrationCard, และ DashboardClient states
   - E2E tests (`e2e/auth-route-guards.spec.ts` & `e2e/dashboard-flow.spec.ts`): ทดสอบทั้ง Authenticated Sidebar บนหน้า `/` และ Guest isolation

### 2. ปัญหาและ Error ที่พบระหว่างทาง (Issues Encountered)
1. **TypeScript Literal Infer ใน `navItems`:**
   - *Error:* `Type '"แผนที่"' is not assignable to type '"แดชบอร์ด"'`
   - *สาเหตุ:* `navItems` ถูก TypeScript infer ชนิดข้อมูลจากไอเทมแรกที่ใช้ข้อความ `messages.portal.dashboard` (as const)
2. **Playwright E2E Helper ขาด `process.env.AUTH_SECRET`:**
   - *Error:* `AUTH_SECRET is not set or is shorter than 32 characters!` เมื่อเรียก `setAuthCookie` ใน Playwright
   - *สาเหตุ:* Playwright test runner ทำงานแยก Process และไม่ได้โหลด `.env` อัตโนมัติ
3. **WCAG 2.1 AA Color Contrast Violation (Axe Core):**
   - *Error:* Contrast ratio 2.62 ต่ำกว่าเกณฑ์ 4.5:1 บนข้อความ footer ของ `/login` และ label รหัสอุปกรณ์/ยังไม่มี pin ของการ์ด
   - *สาเหตุ:* ใช้สี `text-zinc-400` บนพื้นหลังสีขาว `#ffffff`
4. **React 19 `react-hooks/set-state-in-effect` Linter Error:**
   - *Error:* `Calling setState synchronously within an effect can trigger cascading renders`
   - *สาเหตุ:* ฟังก์ชัน `fetchData` เรียก `setLoading(true)` ในทันทีแบบ synchronous เมื่อ `useEffect` ทำงาน
5. **Logout / Auth Redirect ติด Non-Routable IP `0.0.0.0` (ERR_ADDRESS_INVALID):**
   - *Error:* เมื่อกดออกจากระบบ เบราว์เซอร์ขึ้น `This site can't be reached (ERR_ADDRESS_INVALID)` โดย URL เด้งไปที่ `https://0.0.0.0:3000/login`
   - *สาเหตุ:* เซิร์ฟเวอร์รันด้วยคำสั่ง `next dev -p 3000 -H 0.0.0.0 --experimental-https` ทำให้ค่า `request.url` ผูกกับ host `0.0.0.0:3000` เมื่อใช้ `NextResponse.redirect(new URL('/login', request.url))` จึงคืน URL `0.0.0.0` ซึ่งเบราว์เซอร์ไม่อนุญาตให้นำทางไปหา

### 3. วิธีการแก้ไข (Solutions & Fixes)
1. กำหนด interface `NavItem` ที่มี `label: string` ให้กับอาเรย์ `navItems: NavItem[]` อย่างชัดเจน
2. เพิ่ม `process.loadEnvFile()` ใน `e2e/helpers/auth.ts` เมื่อตรวจพบว่าไม่มี `AUTH_SECRET`
3. ปรับสีฟอนต์เป็น `text-zinc-600 dark:text-zinc-400` และ `text-zinc-700` ทำให้มี Contrast Ratio เกิน 4.5:1 (ผ่านเกณฑ์ WCAG AA 100%)
4. ปรับโครงสร้าง Effect ใน `DashboardClient.tsx` ให้ใช้ async loader pattern และอัปเดต State เมื่อ Promise สำเร็จหรือล้มเหลวแบบ asynchronous
5. ปรับการ Resolve Origin ใน `POST /api/auth/logout` และ `handleAuthMiddleware` ให้ตรวจจับ Header `host` และ `x-forwarded-host` จากการเข้าใช้งานจริง และป้องกันการนำทางไปที่ `0.0.0.0` โดยแปลงเป็น `localhost` เสมอ
6. แยก Client Logic สำหรับหน้า `/` และ `/register` เป็น `ScanClient` และ `RegisterClient` พร้อมกำหนด `export const dynamic = 'force-dynamic'` เพื่อให้ Server Component ตรวจจับคุกกี้ Session และเรนเดอร์ `PortalSidebar` ให้กับผู้ใช้ที่ล็อกอินได้อย่างแม่นยำ

### 4. ผลลัพธ์และการทดสอบ (Results & Test Verification)
- **Unit & Integration Tests (`npm test`):** ผ่าน **21 test files / 195 tests (100% Passed)**
- **Playwright E2E Tests (`npx playwright test`):** ผ่าน **53 tests (100% Passed)**
- **Next.js Production Build (`npm run build`):** ผ่านฉลุย 100% รัน SSG และ Dynamic Routes ครบทุกหน้า
- **Lint Check (`npm run lint`):** ผ่าน **0 errors, 0 warnings**
- ติ๊ก Checklist ครบถ้วนใน `PLAN/PROJECT_PLAN_AUTH_MAP.md`

---
*(Part 7: Phase 16 จะถูกบันทึกต่อในหัวข้อถัดไป)*
