# PROJECT_PLAN_AUTH_MAP.md — ส่วนต่อขยาย: Login, Role, Dashboard, สถานะลงทะเบียน, Map (ฉบับแก้ไข v3)

> เอกสารนี้ **ต่อจาก `PROJECT_PLAN.md`** (Phase 0–9 เสร็จแล้ว) ทำเป็น **Phase 10–17**
> กฎการทำงานในหัวข้อ 0 ของ `PROJECT_PLAN.md` ยังใช้ทั้งหมด (ทำทีละ Phase, test ต้องผ่านก่อนไปต่อ, UI เป็นภาษาไทยใน `lib/messages.ts`, โค้ดเป็นภาษาอังกฤษ, สิ่งที่ตัดสินเองให้จดใน `DECISIONS.md`)
>
> **v2:** หน้าสแกน/สมัครเป็น public, เพิ่ม Dashboard ที่ user และ admin เห็น, ข้อมูลที่ส่งจากหน้าสแกน/สมัครมีสถานะ และจะเป็น "ลงทะเบียน" ได้ก็ต่อเมื่อ admin ปัก pin แล้วยืนยัน, Map แสดง pin จากข้อมูลที่ลงทะเบียนแล้ว
>
> **v3 (ล่าสุด):** ① หน้า `/` (QR สแกน) **อยู่นอกระบบ authen ทั้งหมด** ② admin **แก้ pin หลังยืนยันได้** และต้อง **เก็บ log** ③ pin **ต้องอยู่ในจังหวัดของข้อมูลนั้น** (กันปักมั่ว) ④ Dashboard เปิดมา **แสดงทั้ง 2 สถานะ** เรียงวันที่ลงล่าสุดอยู่บน ⑤ Session **24 ชั่วโมง (ตรงไปตรงมา ไม่เอาตัวเลือกจดจำฉัน ตามคำสั่งผู้ใช้)** ⑥ เพิ่ม Phase 13 สำหรับข้อมูลขอบเขตจังหวัด (เลื่อน Phase ถัดๆ ไปทั้งหมด)

---

## 0. กฎเพิ่มเติมสำหรับ AI Agent

1. **ก่อนเริ่ม Phase 10** อ่านหัวข้อ 2 แล้ว **ถามผู้ใช้เป็นข้อความเดียวรวมเฉพาะข้อที่ยังเป็น "default" และไม่ชัด** (ข้อที่ผู้ใช้ตอบแล้วห้ามถามซ้ำ) จากนั้นจึงเริ่มงาน
2. ระหว่างทำงาน ถ้าเจอจุดที่เอกสารไม่ชัด และ **กระทบ security, route, สถานะข้อมูล หรือ log** → ถามผู้ใช้ก่อน ถ้าเป็นเรื่องเล็ก (ชื่อไฟล์, สี, ข้อความ) → เลือกแบบเรียบง่ายที่สุดแล้วจดใน `DECISIONS.md`
3. จบแต่ละ Phase ให้สรุป: ไฟล์ที่เพิ่ม/แก้, test ที่ผ่าน, สิ่งที่ยังค้าง แล้ว **หยุดรอผู้ใช้ยืนยันก่อนเริ่ม Phase ถัดไป**
4. **ห้ามทำให้ test เดิมที่ผ่านอยู่ (106 unit + 35 E2E) พัง** หน้า `/`, `/register` และ API สาธารณะเดิมไม่เกี่ยวกับ login จึงควรผ่านโดยไม่ต้องแก้ ยกเว้นจุดที่ response เพิ่มฟิลด์ใหม่ (แก้ test เฉพาะจุดนั้น ห้ามลบหรือ skip)
5. หัวข้อ 10 ใน `PROJECT_PLAN.md` เขียนว่า "ระบบ login / สิทธิ์ผู้ใช้ = Out of Scope" และ "หน้าดู/ค้นหาข้อมูล = ยังไม่ทำ" ให้ **แก้สองบรรทัดนั้น** ให้ตรงความจริง และใส่ลิงก์มาที่เอกสารนี้

---

## 1. สิ่งที่ผู้ใช้ต้องการ

**รอบแรก**
1. เพิ่มหน้า login และระบบ role
2. **Security: admin ≠ root** — role `admin` ไม่ใช่ root/superuser (ไม่มี role `root` ในระบบ)
3. ถ้าแก้ URL เข้าส่วนที่ต้องมีสิทธิ์โดยไม่เป็น role ใด → ย้ายไป login
4. หน้า admin มี **left sidebar** และมีเมนู **Map**
5. หน้า Map ใช้ **react-simple-maps** และ **เชื่อมกับ Google Maps**
6. จำลอง admin: `admin1` / `1234`
7. จำลอง user: `user1` / `1234`
8. รหัสผ่านต้อง **hash**

**รอบแก้ไข v2 (ทับข้อรอบแรกที่ขัดกัน)**
1. เพิ่มเมนู **Dashboard** ใน sidebar ให้ **user** ใช้ได้
2. **user เห็นแค่ Dashboard**
3. **admin เห็น Dashboard ได้** (และเห็น Map)
4. หน้า **สแกน/สมัคร ไม่ต้อง login** (v3: `/` คือหน้า QR สแกน และ **ไม่อยู่ในระบบ authen**)
5. **pin ในกล่องข้อมูลบน Dashboard ให้ admin เป็นคนเพิ่ม**
6. Dashboard แสดงข้อมูลที่ถูกเพิ่มเข้ามา โดยเริ่มต้นสถานะ **"ยังไม่ลงทะเบียน"**
7. 1 กล่องข้อมูล = **ข้อมูล + สถานะ + pin map** (pin ที่ยังไม่มีต้องให้ admin เพิ่ม)
8. Dashboard มี **ปุ่มแยกการแสดงผลตามชื่อสถานะ พร้อมจำนวน** สถานะมี 2 อัน: ① **ลงทะเบียน** ② **ยังไม่ลงทะเบียน**
9. หน้า **Map แสดง pin โดยอิงจากข้อมูลที่ลงทะเบียนแล้ว**
10. สถานะ "ลงทะเบียน" เกิดจาก **admin ปัก pin บนแผนที่ แล้วกดยืนยันการลงทะเบียน**

**รอบเสริม v3 (คำตอบของผู้ใช้)**
- `/` คือ QR สแกน ไม่ต้องอยู่ในระบบ authen
- Q6: **admin แก้ไข pin ได้ และต้องเก็บ log**
- Q7: Dashboard **แสดงทั้ง 2 สถานะก่อน แล้วค่อยเลือกกรองทีหลัง เรียงตามวันที่ลง ล่าสุดอยู่บน**
- Q8: **pin ต้องอยู่ในจังหวัดที่ข้อมูลนั้นระบุ** เพื่อไม่ให้ปักมั่ว
- Q10: **Session 24 ชั่วโมงตรงไปตรงมา (ไม่เอาตัวเลือกจดจำฉัน)**

> ข้อ "map default ไม่มี pin" ของรอบแรกถูกแทนด้วยข้อ 9 (v2): ถ้ายังไม่มีข้อมูลที่ลงทะเบียน แผนที่ก็ไม่มี pin ตามธรรมชาติ

---

## 2. คำถาม–คำตอบ (ข้อที่ผู้ใช้ตอบแล้ว = ล็อก ห้ามถามซ้ำ / ข้อ default = ถามยืนยันครั้งเดียวก่อนเริ่ม)

| # | คำถาม | คำตอบ / Default | สถานะ |
|---|---|---|---|
| Q1 | ส่วนที่ต้อง login คือหน้าไหน | **`/` (QR สแกน) อยู่นอกระบบ authen เลย** ไม่อ่าน session ไม่ redirect ไม่ผ่าน proxy; `/register` เป็นส่วนของ flow เดียวกัน จึง public เหมือนกัน; ต้อง login เฉพาะ **`/dashboard` และ `/admin/*`** |default | 
| Q2 | user พิมพ์ `/admin/map` ให้เกิดอะไร | redirect ไป `/dashboard` | default |
| Q3 | หลัง login ไปหน้าไหน | **ทั้ง admin และ user ไป `/dashboard`** (ถ้ามี `?next=` ที่ปลอดภัยและ role มีสิทธิ์ ให้ไปตามนั้น) | default |
| Q4 | "link กับ Google Map" หมายถึงอะไร | **ลิงก์ออกไป Google Maps** เปิดแท็บใหม่ด้วย `lat,lng` ของ pin ไม่ฝังแผนที่ ไม่ใช้ API key | default |
| Q5 | Admin ปัก pin อย่างไร | **คลิกบนแผนที่** วาง pin ตัวอย่าง + ช่องกรอก lat/lng (สำหรับคีย์บอร์ด/มือถือ) แล้วกดยืนยัน | default |
| Q6 | ยืนยันแล้ว admin แก้ pin ได้ไหม | **ได้ และต้องเก็บ log** (ใครแก้ เมื่อไหร่ จากพิกัดไหนเป็นพิกัดไหน) ส่วนการย้อนสถานะกลับเป็น "ยังไม่ลงทะเบียน" **ไม่ทำ** | ✅ ผู้ใช้ตอบ (ส่วนย้อนสถานะเป็นข้อสันนิษฐาน) |
| Q7 | Dashboard เปิดมาแสดงสถานะไหน / เรียงอย่างไร | **แสดงทั้ง 2 สถานะ** (ยังไม่เลือกปุ่มกรอง) กดปุ่มสถานะเพื่อกรอง กดซ้ำเพื่อกลับไปดูทั้งหมด; **เรียงตามวันที่ลง (`createdAt`) ล่าสุดอยู่บน** | ✅ ผู้ใช้ตอบ |
| Q8 | pin ต้องอยู่ในจังหวัดที่ข้อมูลระบุไหม | **ใช่ บังคับ** ทั้ง client (เตือนและกดยืนยันไม่ได้) และ **server (ปฏิเสธ 400)** | ✅ ผู้ใช้ตอบ |
| Q9 | ข้อความฝั่งสมัครเดิมใช้คำว่า "ลงทะเบียน" ซ้ำกับสถานะใหม่ | **เปลี่ยนถ้อยคำใน `messages.ts` เป็น "บันทึกข้อมูล/ส่งข้อมูล"** (ไม่เปลี่ยน key) หน้าสำเร็จบอก "รอผู้ดูแลยืนยัน (สถานะ: ยังไม่ลงทะเบียน)" | default |
| Q10 | Session | **หมดอายุ 24 ชั่วโมงตรงไปตรงมา** (ไม่เอาตัวเลือกจดจำฉัน): Cookie และ JWT `exp` มีอายุ 24 ชั่วโมงเสมอ (`Max-Age=86400`) | ✅ ผู้ใช้ตอบ |
| Q11 | `admin1/1234`, `user1/1234` เป็นแค่ตัวอย่างตอน dev ใช่ไหม | ใช่ seed เฉพาะ non-production | default |
| Q12 | "Security: admin ≠ root" หมายถึงอะไร | (ก) admin ไม่ใช่ superuser ไม่มี role `root` และ (ข) `/admin/*` ตรวจสิทธิ์แยกตามหัวข้อ 3 | default |
| Q13 | Dashboard แบ่งหน้า | หน้าละ 12 กล่อง; ตัวเลขบนปุ่มสถานะเป็นยอดรวมทั้งหมดของสถานะนั้น ไม่ใช่เฉพาะหน้าที่เห็น | default |
| Q14 | แผนที่ขอบจังหวัดอาจหยาบ ทำให้พิกัดจริงใกล้ชายแดนจังหวัดถูกปฏิเสธ | **ตรวจแบบเข้มงวด ไม่มี tolerance** ถ้าทดสอบแล้วพบพิกัดจริงถูกปฏิเสธบ่อย **ให้ถามผู้ใช้ก่อน** เพิ่ม tolerance หรือเปลี่ยนชุดข้อมูล | default |
| Q15 | จะมีลิงก์ไป `/login` บนหน้า `/` ไหม | **ไม่เพิ่มอะไรในหน้า `/` เลย** เข้า `/login` ด้วย URL ตรง (ถ้าผู้ใช้ต้องการลิงก์ static ที่ไม่อ่าน session ให้บอก) | default |

---

## 3. การตัดสินใจที่ล็อกแล้ว (ห้ามเปลี่ยนโดยไม่ถามผู้ใช้)

| เรื่อง | ข้อสรุป |
|---|---|
| **หน้า `/` อยู่นอกระบบ authen** | `/` และ `/register` และ API สาธารณะเดิมต้อง **ไม่อ่าน/ไม่ตรวจ session หรือ cookie ใดๆ** ไม่ผ่าน proxy (`matcher` ไม่ครอบคลุม) ไม่มี redirect จาก auth ใช้งานได้แม้มี cookie เสีย/หมดอายุ |
| Role | มี 2 ค่า: `admin`, `user` เก็บเป็น **String** (ไม่ใช้ Prisma enum) validate ด้วย zod + `data/roles.ts` |
| **admin ≠ root (Security)** | 1) **ไม่มี role `root`/`superadmin`** 2) ตรวจสิทธิ์แบบ **allow-list** (`role === "admin"`) ห้ามเขียนแบบ "ไม่ใช่ user = ผ่าน" 3) admin มีสิทธิ์เฉพาะที่ระบุในเอกสารนี้ (Dashboard, Map, ปัก/แก้ pin, ยืนยันลงทะเบียน, ดู log ของ pin) **ห้ามเพิ่มความสามารถระดับระบบ** เช่น จัดการ user, ดู/แก้ DB, อ่าน env, เปลี่ยน role ผ่านหน้าเว็บ **หรือแก้/ลบ log** 4) ห้ามตั้ง username `root`/`superadmin` ใน seed |
| สิทธิ์ตามหน้า | **user เห็นแค่ Dashboard** / **admin เห็น Dashboard + Map** |
| สถานะการลงทะเบียน | 2 ค่า: `UNREGISTERED` (ป้าย "ยังไม่ลงทะเบียน") และ `REGISTERED` (ป้าย "ลงทะเบียน") เก็บเป็น String |
| ที่มาของสถานะ | ข้อมูลที่ส่งจากหน้าสแกน/สมัคร **เป็น `UNREGISTERED` เสมอ** เปลี่ยนเป็น `REGISTERED` ได้ทางเดียวคือ **admin ปัก pin + ยืนยัน** (endpoint confirm) และ **ไม่มีทางย้อนกลับ** |
| กฎความสอดคล้อง | `REGISTERED` ⇔ มี `latitude`, `longitude`, `confirmedAt`, `confirmedById` ครบ / `UNREGISTERED` ⇔ ฟิลด์เหล่านี้เป็น null เสมอ |
| ห้าม mass assignment | endpoint สาธารณะ `POST /api/registrations` **ต้องไม่รับ** `status`, `latitude`, `longitude` (zod `.strict()` → 400) |
| **pin ต้องอยู่ในจังหวัด** | ตรวจที่ **server เสมอ** ด้วยขอบเขตจังหวัดของ `registration.province` (ทั้งตอน confirm และตอนแก้) ฝั่ง client ตรวจเพื่อ UX เท่านั้น; พิกัดอยู่นอกจังหวัด → 400 `PIN_OUTSIDE_PROVINCE` |
| **แก้ pin + log** | แก้ได้เฉพาะ `REGISTERED` โดย admin; **ทุกครั้งที่ confirm/แก้** ต้องเขียน log **ใน transaction เดียวกับการเปลี่ยนพิกัด** (log หรือพิกัดสำเร็จทั้งคู่หรือล้มทั้งคู่); log เป็น **append-only** ไม่มี endpoint/ฟังก์ชันแก้หรือลบ; เก็บ `actorUsername` เป็น snapshot ด้วย |
| Hash รหัสผ่าน | **`bcryptjs`** cost 10 (ค่าคงที่เดียว, test ลดเป็น 4 ผ่าน env) ห้ามเก็บ/ log รหัสผ่านดิบ |
| Session | **JWT ใน httpOnly cookie** ด้วย `jose` ลงนามด้วย `AUTH_SECRET` เก็บ `sub`, `username`, `role` **อายุ 24 ชั่วโมงเสมอ** (บังคับที่ `exp` ใน JWT) |
| Cookie | `httpOnly`, `secure`, `sameSite=lax`, `path=/`, `Max-Age=86400` (24 ชั่วโมงเสมอ ไม่มีตัวเลือกจดจำฉัน) |
| ตรวจสิทธิ์ที่ edge | `proxy.ts`/`middleware.ts` ตรวจเฉพาะ **JWT (ไม่แตะ DB)** |
| ตรวจสิทธิ์ซ้ำที่ server | หน้า `/dashboard`, `/admin/*` และ API ที่ป้องกัน **ต้องตรวจ session ซ้ำเอง** (defense in depth) |
| Error login | ข้อความเดียวสำหรับ "ไม่มี user" และ "รหัสผิด" |
| แผนที่ | `react-simple-maps` + ไฟล์ข้อมูล 77 จังหวัด **เก็บในโปรเจกต์** (ไม่โหลดจาก CDN ตอนรัน) ไฟล์เดียวใช้ทั้งวาดแผนที่ (client) และตรวจ pin (server) |
| Google Maps | `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` เท่านั้น |
| Pin | เก็บเป็นพิกัด `latitude`/`longitude` (Float) ใน `Registration`; ประวัติอยู่ในตาราง log แยก |
| การเรียงลำดับ | รายการข้อมูลเรียง `createdAt` ใหม่สุดก่อน (ถ้าเท่ากันเรียง `id` มากสุดก่อน) ทั้ง API และ UI |

---

## 4. ข้อควรรู้ทางเทคนิค (อ่านก่อนเขียนโค้ด)

1. **เช็คเวอร์ชัน Next.js ใน `package.json` ก่อน** Next.js 16 เปลี่ยนชื่อ `middleware.ts` เป็น `proxy.ts` ใช้ชื่อไฟล์ตามเวอร์ชันที่ติดตั้งจริง จดใน `DECISIONS.md`
2. **`react-simple-maps` v3 ประกาศ peer dependency แค่ React ≤ 18** ถ้าโปรเจกต์ใช้ React 19 ให้ตรวจก่อนว่าติดตั้งได้ไหม ถ้าไม่ได้ **ให้ถามผู้ใช้** ว่าจะใช้ `--legacy-peer-deps` หรือ fork ที่รองรับ React 19 ห้ามเลือกเอง
3. **ข้อมูลแผนที่ต้องมี 77 จังหวัด** แผนที่ฟรีบางชุดมีแค่ 76 (ขาด บึงกาฬ) และชื่ออาจสะกดต่างจาก `data/thai-regions.ts` ต้องทำ mapping + test และจดแหล่งที่มา/**license** ใน `DECISIONS.md`
4. **`react-simple-maps` ต้องเป็น Client Component** และใช้ข้อมูลแผนที่แบบ import คงที่
5. **แปลงตำแหน่งคลิก → lat/lng:** แปลงพิกัดเมาส์เป็นพิกัด SVG ก่อน (`svg.getScreenCTM().inverse()` เพราะแผนที่ scale ตามจอ) แล้วใช้ `projection.invert` ของ projection เดียวกับที่วาดแผนที่ แยกเป็นฟังก์ชันบริสุทธิ์เพื่อเขียน unit test
6. **Open redirect:** `next` ของหน้า login ต้องเป็น path ภายในเท่านั้น (ขึ้นต้น `/` ไม่ใช่ `//` หรือ `/\`)
7. **API สาธารณะเดิม** (`/api/uids/[uid]/exists`, `/api/device-types/[code]/next`, `POST /api/registrations`) เปิดโดยไม่ login แต่ **ต้องคง rate limit/ขนาด body ของ Phase 8**
8. **API ที่ป้องกัน** ตอบ JSON (401/403) ห้าม redirect
9. **Confirm ต้อง atomic:** `updateMany({ where: { id, status: "UNREGISTERED" }, data })` แล้วดู `count` กัน admin 2 คนยืนยันพร้อมกัน (ห้าม read-then-write)
10. **แก้ pin ต้องบันทึกค่าเก่าถูกต้องแม้แก้พร้อมกัน:** ใน transaction ให้ใช้ compare-and-swap — `updateMany({ where: { id, status: "REGISTERED", latitude: old.lat, longitude: old.lng }, data })` ถ้า `count = 0` ให้อ่านใหม่แล้วลองซ้ำ (≤ 3 ครั้ง) จากนั้นจึงสร้าง log ด้วยค่าเก่า/ใหม่ที่ถูกต้อง (กัน log ผิดบน PostgreSQL ที่ isolation ต่างจาก SQLite)
11. **ลิงก์ภายนอก** ต้องมี `target="_blank"` และ `rel="noopener noreferrer"`
12. **วันเวลา:** แสดงด้วย locale ไทย timezone `Asia/Bangkok`; ใน DB เก็บ UTC ตามเดิม
13. ตรวจ `Content-Security-Policy` / `Permissions-Policy` เดิม (Phase 9) ว่าไม่บล็อกหน้าใหม่
14. **การตรวจจุดอยู่ในจังหวัด (point-in-polygon):**
    - GeoJSON เรียงพิกัดเป็น **`[lng, lat]`** (กลับกับที่คนคุ้น `lat,lng`) ต้องมี test กันสลับ
    - รองรับ `MultiPolygon` (จังหวัดที่มีเกาะ เช่น ภูเก็ต ตราด สุราษฎร์ธานี)
    - ถ้าใช้ `d3-geo` `geoContains` ระวัง **winding order** (ลำดับจุดของขอบ) ถ้าผิดจะตีความเป็น "พื้นที่นอกขอบ" ให้ทดสอบกับจุดจริงก่อนใช้ หรือใช้ไลบรารี point-in-polygon แบบ planar (เช่น turf) ซึ่งไม่มีปัญหานี้ — เลือกอย่างใดอย่างหนึ่งแล้วจดเหตุผลใน `DECISIONS.md`
    - ถ้าเก็บเป็น TopoJSON ให้แปลงเป็น GeoJSON ด้วย `topojson-client` **ครั้งเดียวตอนโหลดโมดูล** (cache) ไม่แปลงทุก request
    - ความแม่นยำขึ้นกับความละเอียดของไฟล์ขอบเขต (ตาม Q14)

---

## 5. Schema ที่เพิ่ม/แก้

```prisma
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  passwordHash String
  role         String   // admin | user (validate ด้วย zod)
  createdAt    DateTime @default(now())
  confirmed    Registration[]
  pinLogs      RegistrationPinLog[]
}

model Registration {
  // ...ฟิลด์เดิมทั้งหมดคงไว้...
  status        String    @default("UNREGISTERED") // UNREGISTERED | REGISTERED
  latitude      Float?
  longitude     Float?
  confirmedAt   DateTime?
  confirmedById Int?
  confirmedBy   User?     @relation(fields: [confirmedById], references: [id])
  pinLogs       RegistrationPinLog[]

  @@index([status])
  @@index([createdAt])
}

model RegistrationPinLog {
  id             Int      @id @default(autoincrement())
  registrationId Int
  action         String   // CONFIRM | UPDATE
  oldLatitude    Float?   // null เมื่อ action = CONFIRM
  oldLongitude   Float?
  newLatitude    Float
  newLongitude   Float
  actorId        Int
  actorUsername  String   // snapshot ตอนทำรายการ
  createdAt      DateTime @default(now())

  registration Registration @relation(fields: [registrationId], references: [id])
  actor        User         @relation(fields: [actorId], references: [id])

  @@index([registrationId, createdAt])
}
```

- สร้าง migration ใหม่ ไม่แก้ migration เดิม; แถวเดิมใน DB ได้ `UNREGISTERED` ตาม default
- เก็บ username เป็น lowercase (normalize ก่อนบันทึกและค้นหา)
- ต้องย้ายไป PostgreSQL ได้เหมือนเดิม (ไม่ใช้ enum / raw SQL)

## 6. Route และสิทธิ์

**หน้าเว็บ**

| Path | ไม่ได้ login | role `user` | role `admin` |
|---|---|---|---|
| `/` , `/register` | เข้าได้ (**นอกระบบ authen**) | เข้าได้ | เข้าได้ |
| `/login` | แสดงหน้า login | redirect → `/dashboard` | redirect → `/dashboard` |
| `/dashboard` | redirect → `/login?next=...` | เข้าได้ | เข้าได้ |
| `/admin` | redirect → `/login` | redirect → `/dashboard` | redirect → `/dashboard` |
| `/admin/map` | redirect → `/login?next=...` | redirect → `/dashboard` | เข้าได้ |

**API**

| Endpoint | ไม่ได้ login | user | admin |
|---|---|---|---|
| `GET /api/uids/[uid]/exists` | เปิด (rate limit) | เปิด | เปิด |
| `GET /api/device-types/[code]/next` | เปิด | เปิด | เปิด |
| `POST /api/registrations` | เปิด (rate limit, บังคับ `UNREGISTERED`) | เปิด | เปิด |
| `GET /api/registrations?status=&page=&pageSize=` | 401 | 200 | 200 |
| `POST /api/registrations/[id]/confirm` | 401 | **403** | 200 |
| `PATCH /api/registrations/[id]/pin` | 401 | **403** | 200 |
| `GET /api/registrations/[id]/logs` | 401 | **403** | 200 |
| `POST /api/auth/login` | เปิด (rate limit) | — | — |
| `POST /api/auth/logout` | 204 | 204 | 204 |
| `GET /api/auth/me` | 401 | 200 | 200 |

**Contract ที่เพิ่ม**

- `GET /api/registrations` → `200 { counts: { REGISTERED: n, UNREGISTERED: m }, items: [...], total, page, pageSize }` — `status` ไม่ส่ง = **ทั้ง 2 สถานะ**; `counts` เป็นยอดรวมทุกสถานะเสมอ; `total` คือยอดของ `status` ที่กรอง; `pageSize` สูงสุด 100; `status` ผิดค่า → 400; เรียง `createdAt desc, id desc`
- `POST /api/registrations/[id]/confirm` body `{ "latitude": 18.79, "longitude": 98.98 }` → `200` record หลังยืนยัน / `400` พิกัดผิดรูปแบบ หรือ `code: "PIN_OUTSIDE_PROVINCE"` / `404` ไม่พบ id / `409` ยืนยันไปแล้ว (ผู้ยืนยันดึงจาก session ห้ามรับจาก body)
- `PATCH /api/registrations/[id]/pin` body เหมือน confirm → `200` record หลังแก้ / `400` (เหมือนกัน) / `404` / `409` `code: "NOT_REGISTERED"` ถ้ายังเป็น `UNREGISTERED` (ต้องใช้ confirm) ; ถ้าพิกัดใหม่ **เท่าเดิม** → `200` ไม่เปลี่ยนอะไรและ **ไม่เขียน log**
- `GET /api/registrations/[id]/logs` → `200 { items: [{ id, action, oldLatitude, oldLongitude, newLatitude, newLongitude, actorUsername, createdAt }] }` เรียงใหม่สุดก่อน / `404` ไม่พบ id
- `items[]` ของ list มี `id, uid, region, province, deviceType, deviceId, status, latitude, longitude, createdAt, confirmedAt`

## 7. โครงสร้างไฟล์ที่เพิ่ม

```
prisma/
├─ seed.ts                              # admin1 / user1 (hash แล้ว)
src/
├─ proxy.ts (หรือ middleware.ts)         # ตรวจ JWT + redirect (matcher ไม่รวม "/" และ "/register")
├─ app/
│  ├─ login/page.tsx
│  ├─ (portal)/                         # route group: layout เดียว มี sidebar
│  │  ├─ layout.tsx                     # ตรวจ session (login แล้ว) + sidebar ตาม role
│  │  ├─ dashboard/page.tsx
│  │  └─ admin/
│  │     ├─ page.tsx                    # redirect → /dashboard
│  │     └─ map/page.tsx                # ตรวจ role admin ซ้ำ
│  └─ api/
│     ├─ auth/{login,logout,me}/route.ts
│     └─ registrations/
│        ├─ route.ts                    # (เดิม) POST + เพิ่ม GET
│        └─ [id]/
│           ├─ confirm/route.ts
│           ├─ pin/route.ts             # PATCH
│           └─ logs/route.ts            # GET
├─ components/
│  ├─ LoginForm.tsx
│  ├─ PortalSidebar.tsx                 # เมนูตาม role
│  ├─ StatusFilterButtons.tsx
│  ├─ RegistrationCard.tsx
│  ├─ PinHistory.tsx                    # รายการ log (admin)
│  └─ ThailandMap.tsx                   # "use client"
├─ lib/auth/{password,session,guards,user-repo}.ts
├─ lib/province-geo.ts                  # isPointInProvince(province, lat, lng) (ใช้ทั้ง server/client)
├─ lib/google-maps.ts                   # buildGoogleMapsUrl(lat, lng)
├─ lib/map-coords.ts                    # แปลงตำแหน่งคลิก → lat/lng (ฟังก์ชันบริสุทธิ์)
├─ lib/registration-repo.ts             # (เดิม) เพิ่ม listRegistrations, countByStatus, listPins, confirmRegistration, updatePin, listPinLogs
└─ data/
   ├─ roles.ts
   ├─ registration-status.ts            # STATUSES + label ไทย
   └─ thailand-provinces.json           # 77 จังหวัด (ใช้ร่วม)
e2e/helpers/auth.ts                     # login helper + storageState ต่อ role
```

---

## 8. Phase การพัฒนา

> รูปแบบเดิม: **งาน → เกณฑ์เสร็จ (Tests)** ทุกข้อต้องผ่าน

### Phase 10: ฐานข้อมูลผู้ใช้ + Hash รหัสผ่าน + Seed

**งาน**
- เพิ่มโมเดล `User` + migration (ยังไม่แตะ `Registration` ใน Phase นี้)
- ติดตั้ง `bcryptjs` (+ types ถ้าจำเป็น)
- `lib/auth/password.ts`: `hashPassword`, `verifyPassword` ใช้ค่าคงที่ cost เดียว
- `lib/auth/user-repo.ts`: `findUserByUsername` (normalize lowercase)
- `data/roles.ts`: `ROLES = ["admin","user"] as const` + zod enum
- `prisma/seed.ts`: upsert `admin1` (admin) และ `user1` (user) รหัส `1234` **ผ่าน `hashPassword` เสมอ**; **refuse เมื่อ `NODE_ENV === "production"`**; รันซ้ำได้ (idempotent)
- สคริปต์ `db:seed` และต่อเข้า `db:reset`
- README: วิธี seed + บัญชีตัวอย่าง + คำเตือนห้ามใช้ production

**Tests**
- [x] `hashPassword("1234")` ≠ `"1234"` และขึ้นต้น `$2`
- [x] hash รหัสเดียวกัน 2 ครั้งได้ค่าไม่เท่ากัน แต่ `verifyPassword` ผ่านทั้งคู่
- [x] `verifyPassword` รหัสผิด → `false`, hash เสียรูปแบบ → `false` ไม่ throw
- [x] seed แล้วตาราง `User` มี 2 แถว และ `passwordHash` ไม่ใช่ `"1234"`
- [x] seed ซ้ำ → ยังมี 2 แถว
- [x] seed ใน `NODE_ENV=production` → ปฏิเสธ ไม่เขียน DB
- [x] zod role schema ปฏิเสธ `"root"`, `"superadmin"`, `""`, `"ADMIN"`
- [x] seed ไม่สร้าง user ชื่อ `root`/`superadmin`
- [x] `findUserByUsername("ADMIN1")` เจอ `admin1`
- [x] username ที่มีอักขระพิเศษ/SQL injection → ไม่เจอ ตารางยังอยู่
- [x] test Phase 4A เดิมยังผ่านครบ

---

### Phase 11: Session + API Auth

**งาน**
- env `AUTH_SECRET` (ใส่ `.env.example`, `.env.test` ใช้ค่าทดสอบ) ถ้าไม่มี/สั้นกว่า 32 ตัวอักษร → throw ตอนเริ่ม ไม่ fallback
- `lib/auth/session.ts`: `signSession`, `verifySession`, `getSession()`, ตั้ง/ลบ cookie; ค่าคงที่อายุ session = 24 ชั่วโมง (ที่เดียว, `Max-Age=86400`)
- `POST /api/auth/login` body `{ username, password }`:
  - zod validate, หา user, `verifyPassword` — ไม่พบ user ให้ยัง compare กับ dummy hash
  - สำเร็จ → ตั้ง cookie 24 ชั่วโมง (`Max-Age=86400`) JWT `exp` = 24 ชม. → `200 { role, redirectTo }` (`redirectTo` จาก `safeNextPath`, default `/dashboard`)
  - ผิด → `401` ข้อความเดียว; rate limit ตัวเดิม (≤ 10 req/min ต่อ IP) → `429` + `Retry-After`; จำกัดขนาด body
- `POST /api/auth/logout` (204, ลบ cookie), `GET /api/auth/me`
- `lib/auth/guards.ts`: `safeNextPath`, `requireSession`, `requireRole` (allow-list)

**Tests**
- [x] login `admin1/1234` → 200, `Set-Cookie` มี `HttpOnly`, `Secure`, `SameSite=Lax`, `Max-Age=86400`, ไม่มีรหัสผ่านใน response/cookie
- [x] login `user1/1234` → 200 role `user`
- [x] JWT `exp` ≈ ออกให้ + 24 ชม. (ยอมคลาดเคลื่อนไม่เกิน 5 วินาที)
- [x] JWT อายุเกิน 24 ชม. (ใช้ fake timer) → `verifySession` คืน `null` แม้ cookie ยังอยู่ (พิสูจน์ว่าฝั่ง server บังคับอายุ ไม่พึ่ง cookie)
- [x] รหัสผิด / username ไม่มี → 401 **ข้อความเหมือนกันเป๊ะ**
- [x] body ไม่ครบ/ยาวเกิน → 400, เกิน 64KB → 413
- [x] เกิน rate limit → 429 + `Retry-After`
- [x] JWT ที่แก้ payload (เปลี่ยน role เป็น admin) → `verifySession` คืน `null`
- [x] JWT ลายเซ็นถูกแต่ `role` เป็น `"root"`/`"superadmin"`/ค่าไม่รู้จัก → `null`
- [x] `requireRole("admin")` ผ่านเฉพาะ `admin` (user/ไม่มี role/role แปลก → ไม่ผ่าน)
- [x] JWT ลงนามด้วย secret อื่น → `null`
- [x] `AUTH_SECRET` ไม่ตั้ง → throw ชัดเจน
- [x] `me` ไม่มี cookie → 401, มี cookie → ข้อมูลถูกต้อง
- [x] logout แล้ว cookie ถูกลบ
- [x] `safeNextPath`: `/dashboard` ✅, `//evil.com` ❌, `https://evil.com` ❌, `/\evil.com` ❌, `javascript:alert(1)` ❌, ค่าว่าง → default

---

### Phase 12: หน้า Login + ป้องกัน Route (เฉพาะ `/dashboard`, `/admin/*`)

**งาน**
- `LoginForm` (React Hook Form + zod): username, password (`type="password"`, `autoComplete` ถูกต้อง), ปุ่ม disable ตอนส่ง, error ด้วย `role="alert"`, ข้อความใน `messages.ts` (ไม่มี checkbox จดจำฉัน)
- `/login/page.tsx`: มี session อยู่แล้ว → redirect `/dashboard`
- `proxy.ts`/`middleware.ts`: ตรวจ JWT ตามตารางหัวข้อ 6; `matcher` ครอบคลุมเฉพาะ `/dashboard`, `/admin/:path*`, `/login` — **ต้องไม่ครอบคลุม** `/`, `/register`, API สาธารณะ, static assets
- **ห้ามแก้หน้า `/` และ `/register` ใดๆ ใน Phase นี้** (ไม่เพิ่มลิงก์ ไม่อ่าน session ตาม Q15)
- สร้างหน้า **placeholder** `/dashboard` และ `/admin/map` (ข้อความสั้นๆ เป็นปลายทางทดสอบ ถูกแทนใน Phase 15–16)
- `/admin` → redirect `/dashboard`
- ตรวจ session ซ้ำฝั่ง server ในหน้า `/dashboard` และ `/admin/*`
- E2E helper `e2e/helpers/auth.ts`: login ผ่าน API เก็บ `storageState` ต่อ role

**Tests**
- [x] E2E: เข้า `/` และ `/register?uid=ABC` **โดยไม่ login → ใช้งานได้ ไม่ถูก redirect**
- [x] E2E: เข้า `/` ขณะมี cookie `session` เสีย/หมดอายุ/ปลอม → ยังใช้งานได้ปกติ ไม่ถูกลบ cookie ไม่ redirect
- [x] Unit: `matcher` ของ proxy **ไม่ match** `/`, `/register`, `/api/uids/x/exists`, `/api/device-types/KSK/next`, `/api/registrations` (POST สาธารณะ) และ **match** `/dashboard`, `/admin`, `/admin/map`, `/login`
- [x] E2E: เข้า `/dashboard` โดยไม่ login → `/login?next=%2Fdashboard`
- [x] E2E: เข้า `/admin/map` โดยไม่ login → `/login`
- [x] E2E: login `admin1/1234` → `/dashboard`; login `user1/1234` → `/dashboard`
- [x] E2E: login รหัสผิด → เห็นข้อความ error ยังอยู่หน้า login
- [x] E2E: user ที่ login แล้วพิมพ์ `/admin/map` → ถูกส่งไป `/dashboard`
- [x] E2E: admin เข้า `/admin/map` ได้
- [x] E2E: login อยู่แล้วเข้า `/login` → ไป `/dashboard`
- [x] E2E: logout แล้วเข้า `/dashboard` → `/login`
- [x] E2E: `/login?next=//evil.com` login สำเร็จ → ไม่ออกนอกโดเมน
- [x] Unit: `LoginForm` ปุ่ม disabled ตอนส่ง, ส่งซ้ำไม่ได้, error ใช้ `role="alert"`
- [x] **Regression: test ชุดเดิม (106 unit + 35 E2E) ผ่านครบ โดยไม่ต้อง login และไม่แก้หน้า `/`**

---

### Phase 13: ข้อมูลขอบเขต 77 จังหวัด + ตัวตรวจ "จุดอยู่ในจังหวัด" (ยังไม่มี UI ไม่แตะ DB)

> แยกออกมาเพื่อให้ server ตรวจ pin ได้ใน Phase 14 และให้ Phase 16 (แผนที่) ใช้ไฟล์เดียวกัน

**งาน**
- เพิ่ม `src/data/thailand-provinces.json` (TopoJSON หรือ GeoJSON) **ครบ 77 จังหวัด** พร้อม mapping ชื่อให้ตรง `data/thai-regions.ts` — จดแหล่งที่มา/license ใน `DECISIONS.md` (ข้อควรรู้ 4.3) เลือกชุดที่ละเอียดพอสำหรับตรวจพิกัด (ข้อควรรู้ 4.14, Q14) แต่ไม่ใหญ่เกินจนทำให้ bundle หน้าแผนที่ช้า (ถ้าต้องแยกไฟล์ละเอียดกับไฟล์วาดแผนที่ ให้ถามผู้ใช้ก่อน)
- `lib/province-geo.ts`: `isPointInProvince(provinceName, latitude, longitude): boolean` (โหลด/แปลงข้อมูลครั้งเดียว); ชื่อจังหวัดที่ไม่มีในข้อมูล → throw error ชัดเจน (ไม่ return true)
- ใช้ได้ทั้งฝั่ง server และ client

**Tests**
- [x] ข้อมูลมี **77 จังหวัด** และชื่อทุกจังหวัดใน `thai-regions.ts` หา geometry ตรงกันครบ (ไม่ขาด ไม่เกิน ไม่ซ้ำ)
- [x] จุดอ้างอิงจริง อยู่ในจังหวัดของตัวเอง: เชียงใหม่ (18.7883, 98.9853), กรุงเทพมหานคร (13.7563, 100.5018), ภูเก็ต (7.8804, 98.3923 — จังหวัดเกาะ), อุบลราชธานี (15.2448, 104.8473), สงขลา/หาดใหญ่ (7.0086, 100.4747)
- [x] จุดเดียวกัน **ไม่อยู่ใน** จังหวัดอื่น (เช่น จุดเชียงใหม่ ไม่อยู่ในเชียงราย)
- [x] จุดกลางทะเล (เช่น 10.0, 101.5) → ไม่อยู่ในจังหวัดใดเลย
- [x] สลับค่า lat/lng โดยตั้งใจ (เช่น 98.9853, 18.7883) → `false` (กันสลับลำดับพิกัด)
- [x] ทุก 77 จังหวัด: จุดตัวแทนที่อยู่ภายในพื้นที่จริงของจังหวัดนั้น (point-on-surface ไม่ใช่ centroid เพราะจังหวัดรูปยาวหรือเว้า centroid อาจหลุดนอกขอบ) ผ่านการตรวจของ **จังหวัดตัวเอง**
- [x] ชื่อจังหวัดที่ไม่มีในระบบ → throw; `NaN`/`Infinity` → `false`
- [x] เรียกซ้ำ 1,000 ครั้งเสร็จในเวลาที่เหมาะสม (กำหนดเกณฑ์ใน test และจดไว้) พิสูจน์ว่าไม่ parse ข้อมูลใหม่ทุกครั้ง

---

### Phase 14: สถานะลงทะเบียน + API (list / confirm / แก้ pin / log)

**งาน**
- เพิ่มฟิลด์ใน `Registration` + โมเดล `RegistrationPinLog` ตามหัวข้อ 5 + migration; `data/registration-status.ts` (ป้ายไทย: "ลงทะเบียน" / "ยังไม่ลงทะเบียน")
- `createRegistration` ตั้ง `status = UNREGISTERED` เสมอ (ห้ามรับจาก input); zod ของ `POST /api/registrations` เป็น `.strict()`
- repo เพิ่ม: `listRegistrations({ status?, page, pageSize })` (เรียง `createdAt desc, id desc`), `countByStatus()`, `listPins()` (เฉพาะ `REGISTERED`), `confirmRegistration`, `updatePin`, `listPinLogs(registrationId)`
  - `confirmRegistration(id, coords, admin)`: atomic (ข้อควรรู้ 4.9) + เขียน log `CONFIRM` (`old*` = null) ใน transaction เดียวกัน
  - `updatePin(id, coords, admin)`: ตาม 4.10 + เขียน log `UPDATE` พร้อมค่าเก่า/ใหม่ใน transaction เดียวกัน; พิกัดเท่าเดิม → ไม่เขียน log
- Route handlers ตามหัวข้อ 6; **ก่อนเรียก repo ให้ตรวจ `isPointInProvince(record.province, lat, lng)`** → ไม่ผ่านตอบ 400 `PIN_OUTSIDE_PROVINCE` (ตรวจที่ server เสมอ)
- zod พิกัด: ตัวเลข finite, lat 5–21, lng 97–106, ปัดทศนิยม 6 ตำแหน่ง; **ผู้ทำรายการ (`actorId`, `actorUsername`) มาจาก session เท่านั้น**
- ไม่มี endpoint/ฟังก์ชันแก้หรือลบ log
- ปรับถ้อยคำฝั่งสมัครตาม Q9

**Tests: Repository**
- [x] สมัครใหม่ → `status = UNREGISTERED`, ฟิลด์ pin/confirm เป็น null และยังไม่มี log
- [x] `confirmRegistration` → `REGISTERED` + พิกัด + `confirmedAt` + `confirmedById` ครบ และมี log 1 แถว (`CONFIRM`, old = null, new = พิกัด, `actorUsername` ถูก)
- [x] confirm ซ้ำ id เดิม → ปฏิเสธ (409) พิกัดเดิมไม่ถูกเขียนทับ และไม่มี log เพิ่ม
- [x] **Concurrency:** confirm id เดียวกันพร้อมกัน 10 ครั้ง → สำเร็จ 1 อีก 9 เป็น 409; log มี 1 แถว
- [x] `updatePin` บน `REGISTERED` → พิกัดเปลี่ยน, log `UPDATE` มี old/new ถูกต้อง, `status` ยังเป็น `REGISTERED`
- [x] `updatePin` บน `UNREGISTERED` → ปฏิเสธ (`NOT_REGISTERED`) ไม่เปลี่ยนอะไร ไม่มี log
- [x] `updatePin` พิกัดเท่าเดิม → ไม่เปลี่ยน ไม่เขียน log
- [x] **Concurrency:** แก้ pin พร้อมกัน 2 admin → log เรียงต่อกันได้ (ค่า old ของรายการหลัง = ค่า new ของรายการก่อน) ไม่มี log ที่ old ผิด
- [x] **Atomicity:** บังคับให้การเขียน log ล้ม → พิกัดไม่เปลี่ยน/สถานะไม่เปลี่ยน (rollback ทั้งก้อน)
- [x] `listPinLogs` เรียงใหม่สุดก่อน; id ไม่มี → ผลว่าง/404 ตามที่ route กำหนด
- [x] `countByStatus` ถูกต้อง; `listRegistrations` กรองสถานะ + แบ่งหน้า; **เรียง `createdAt` ใหม่สุดก่อน** (ทดสอบด้วยข้อมูลที่ `createdAt` ต่างกัน และกรณีเท่ากันเรียงด้วย `id`); ไม่ส่ง `status` → ได้ทั้ง 2 สถานะ
- [x] `listPins` คืนเฉพาะ `REGISTERED`
- [x] แถวเดิมก่อน migration มีสถานะ `UNREGISTERED`
- [x] test Phase 4A เดิม (concurrency ของ Device ID ฯลฯ) ผ่านครบ ไม่กระทบเลขรัน

**Tests: API**
- [x] `POST /api/registrations` ไม่ login → 201 และ `status = UNREGISTERED`
- [x] POST ที่แนบ `status: "REGISTERED"` / `latitude` / `longitude` → **400** และไม่มีอะไรถูกบันทึก
- [x] `GET /api/registrations` ไม่ login → 401; user/admin → 200 พร้อม `counts`; ไม่ส่ง `status` → มีทั้ง 2 สถานะเรียงล่าสุดก่อน
- [x] `status=ผิดค่า` → 400; `pageSize` > 100 → 400 หรือถูกจำกัดตามที่จดใน `DECISIONS.md`
- [x] confirm / pin / logs: ไม่ login → 401, user → **403**, admin → ทำงานได้
- [x] confirm พิกัดที่ **อยู่ในจังหวัดของข้อมูล** → 200; **นอกจังหวัด** (แต่ยังอยู่ในประเทศไทย) → 400 `PIN_OUTSIDE_PROVINCE` และไม่มีอะไรถูกบันทึก/ไม่มี log
- [x] PATCH pin พิกัดนอกจังหวัด → 400 `PIN_OUTSIDE_PROVINCE`; พิกัดเดิมไม่ถูกแตะ
- [x] confirm/PATCH พิกัดนอกประเทศ/ไม่ใช่ตัวเลข/NaN/ขาดฟิลด์ → 400
- [x] PATCH บน `UNREGISTERED` → 409 `NOT_REGISTERED`; confirm บน `REGISTERED` → 409
- [x] body ที่แนบ `confirmedById`, `status`, `actorId`, `actorUsername` → ถูกเมิน/400 (ผู้ทำรายการมาจาก session เท่านั้น); log ที่ได้ใช้ชื่อผู้ใช้จาก session
- [x] ไม่มี route `DELETE`/`PUT`/`PATCH`/`POST` ที่ทำงานกับ log (ยิงแล้วได้ 404/405)
- [x] rate limit/ขนาด body ของ `POST /api/registrations` ยังทำงานเหมือน Phase 8

---

### Phase 15: Portal Layout + Sidebar + Dashboard

**งาน**
- `(portal)/layout.tsx`: ตรวจ session ฝั่ง server (ไม่ login → redirect login) ครอบ sidebar + เนื้อหา
- `PortalSidebar` เมนูตาม role (allow-list):
  - `user`: **แดชบอร์ด** เท่านั้น
  - `admin`: **แดชบอร์ด** + **แผนที่** (`/admin/map`)
  - ทุก role: ชื่อผู้ใช้, ปุ่มออกจากระบบ, ลิงก์ "ไปหน้าสแกน QR" (`/`)
  - active state ด้วย `aria-current="page"`
  - **Responsive:** ≥ 768px แสดงซ้ายตลอด, จอแคบซ่อนเปิดด้วยปุ่มเมนู (`aria-expanded`, `Esc` ปิด)
- `dashboard/page.tsx`:
  - **ปุ่มกรองสถานะ 2 ปุ่ม** (`StatusFilterButtons`): "ยังไม่ลงทะเบียน (N)" และ "ลงทะเบียน (N)" ใช้ `aria-pressed`; **เปิดมาโดยไม่เลือกปุ่มใด = แสดงทั้ง 2 สถานะ**; กดปุ่ม = กรองสถานะนั้น, กดปุ่มเดิมซ้ำ = กลับไปแสดงทั้งหมด; ตัวเลขมาจาก `counts` ของ API; เก็บค่าที่เลือกใน `?status=` (ไม่มีพารามิเตอร์ = ทั้งหมด)
  - รายการเรียง **วันที่ลงล่าสุดอยู่บน** (ตามที่ API ส่งมา ห้ามเรียงซ้ำฝั่ง client ให้ต่างจาก API)
  - **กล่องข้อมูล** (`RegistrationCard`): Device ID, UID, ประเภท, ภาค/จังหวัด, วันเวลาที่ลง, **ป้ายสถานะ (ข้อความ ไม่ใช้สีอย่างเดียว)** (สำคัญเพราะแสดงปนกัน), และส่วน **pin map**:
    - มี pin → แสดงพิกัด + ลิงก์ "เปิดใน Google Maps" (ทุก role เห็น); **admin** เห็นปุ่ม "แก้ไข pin" → `/admin/map?registrationId=<id>`
    - ไม่มี pin → ข้อความ "ยังไม่มี pin"; **admin** เห็นปุ่ม "เพิ่ม pin" → `/admin/map?registrationId=<id>`; **user ไม่เห็นปุ่ม** (เห็น "รอผู้ดูแลเพิ่ม pin")
  - แบ่งหน้า 12 ต่อหน้า (Q13), สถานะ loading / error (มีปุ่มลองใหม่) / empty ("ไม่มีข้อมูล")
  - Dashboard **ไม่แก้ไขข้อมูลใดๆ** (read-only; การเพิ่ม/แก้ pin ทำที่หน้า Map)
- ข้อความใหม่ทั้งหมดใส่ `messages.ts`

**Tests**
- [x] Unit `PortalSidebar`: user เห็นเฉพาะ "แดชบอร์ด" (ไม่มี "แผนที่" ใน DOM) / admin เห็นทั้งสอง
- [x] Unit: จอแคบ → ปุ่มเมนูเปิด/ปิด, `Esc` ปิด, `aria-expanded` ถูกต้อง
- [x] Unit `StatusFilterButtons`: แสดงชื่อ+จำนวนถูกต้อง, เริ่มต้นไม่มีปุ่มใด `aria-pressed="true"`, กดแล้วกรอง, กดซ้ำแล้วกลับเป็นทั้งหมด
- [x] Unit `RegistrationCard`: UNREGISTERED ไม่มี pin → "ยังไม่มี pin" + admin เห็น "เพิ่ม pin" (user ไม่เห็น); REGISTERED → พิกัด + ลิงก์ Google Maps ที่ `href` ถูก (`target="_blank"`, `rel` มี `noopener noreferrer`) + admin เห็น "แก้ไข pin" (user ไม่เห็น); ป้ายสถานะเป็นข้อความเสมอ
- [x] Unit: loading/error/empty states, แบ่งหน้าถูกต้อง
- [x] E2E (user): `/dashboard` เห็นแค่เมนูแดชบอร์ด; เปิดมาเห็น **ทั้ง 2 สถานะปนกัน** และการ์ดใหม่สุดอยู่บนสุด
- [x] E2E (user): สมัครข้อมูลใหม่ทางหน้า `/` (ไม่ login) แล้วกลับมา Dashboard → การ์ดใหม่อยู่บนสุดสถานะ "ยังไม่ลงทะเบียน" และตัวเลขบนปุ่มเพิ่มขึ้น 1
- [x] E2E (user): กดปุ่ม "ลงทะเบียน" → เห็นเฉพาะสถานะนั้น จำนวนบนปุ่มตรงกับจำนวนการ์ดทั้งหมดของสถานะ; กดซ้ำ → กลับเป็นทั้งหมด
- [x] E2E (user): ไม่เห็นปุ่ม "เพิ่ม/แก้ไข pin" และเข้า `/admin/map` ไม่ได้
- [x] E2E (admin): เห็นเมนูแดชบอร์ด + แผนที่, การ์ด UNREGISTERED มี "เพิ่ม pin", การ์ด REGISTERED มี "แก้ไข pin"
- [x] E2E: viewport 390×844 → sidebar ซ่อนตอนเริ่ม เปิดได้ด้วยปุ่ม, หน้าไม่เลื่อนแนวนอน
- [x] axe: `/dashboard` และ `/login` ไม่พบ violation ระดับ serious/critical (WCAG 2.1 AA)
- [x] ใช้คีย์บอร์ดอย่างเดียวเข้าถึงเมนู/ปุ่มกรอง/การ์ดได้ครบ

---

### Phase 16: หน้า Map (react-simple-maps + ปัก/แก้ pin + ยืนยัน + ประวัติ)

**งาน**
- ติดตั้ง `react-simple-maps` (ดูข้อควรรู้ 4.2; ติดตั้งไม่ผ่านให้ถามผู้ใช้) ใช้ข้อมูลจาก `thailand-provinces.json` (Phase 13)
- `lib/google-maps.ts`: `buildGoogleMapsUrl(lat, lng)` → `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`
- `lib/map-coords.ts`: ฟังก์ชันแปลงตำแหน่งคลิก → lat/lng (ข้อควรรู้ 4.5)
- `/admin/map` (admin เท่านั้น, ตรวจซ้ำฝั่ง server) + `ThailandMap` (`"use client"`):
  - **โหมดดู (ค่าเริ่มต้น):** วาดแผนที่ 77 จังหวัด + **pin ของข้อมูล `REGISTERED` ทุกตัว** (`listPins`); ถ้าไม่มี → ไม่มี pin เลย; คลิก/โฟกัส pin → การ์ดข้อมูล (Device ID, UID, จังหวัด, ประเภท) + ลิงก์ "เปิดใน Google Maps" + ปุ่ม "แก้ไข pin" + **ประวัติการแก้ไข pin** (`PinHistory` จาก `GET .../logs`: ใคร/เมื่อไหร่/พิกัดเดิม→ใหม่ เรียงใหม่สุดก่อน)
  - **โหมดปัก pin (ข้อมูล `UNREGISTERED`)** และ **โหมดแก้ pin (ข้อมูล `REGISTERED`)** ใช้ UI เดียวกัน: เลือกข้อมูลจาก dropdown หรือมาจาก `?registrationId=` (id ไม่พบ → แจ้งข้อความแล้วกลับโหมดดู) → ไฮไลต์ขอบเขต **จังหวัดของข้อมูลนั้น** บนแผนที่ → คลิกวาง pin ตัวอย่าง (สัญลักษณ์ต่างจาก pin จริง มีป้ายกำกับ ไม่ใช้สีอย่างเดียว; โหมดแก้จะแสดงตำแหน่งเดิมแบบจางพร้อมป้าย "ตำแหน่งเดิม") + ช่อง lat/lng แก้ได้
  - **ตรวจจังหวัดฝั่ง client ด้วย `isPointInProvince`:** นอกจังหวัด → แสดงข้อความชัดเจนและ **ปุ่มบันทึกถูก disable** (server ยังตรวจซ้ำเสมอ)
  - ปุ่มหลัก: โหมดปัก = **"ยืนยันการลงทะเบียน"** (เรียก confirm) / โหมดแก้ = **"บันทึกการแก้ไข pin"** (เรียก PATCH) ; disable ตอนกำลังส่ง กันกดซ้ำ
  - สำเร็จ → pin จริงอัปเดต, แสดงข้อความสำเร็จ + ลิงก์กลับแดชบอร์ด, ประวัติมีรายการใหม่; `409` (confirm ซ้ำ/ไม่ใช่ `REGISTERED`) → แจ้งแล้วรีเฟรชข้อมูล; `400 PIN_OUTSIDE_PROVINCE` → แสดงข้อความเดียวกับ client; อื่นๆ → ลองใหม่ได้ ฟอร์มคงค่า
  - ปุ่ม "ยกเลิก" ล้าง pin ตัวอย่างโดยไม่บันทึกอะไร
  - **คีย์บอร์ด/มือถือ:** ใช้การกรอก lat/lng แทนการคลิกได้ครบ; pin จริงโฟกัสได้ (`role="button"`, `aria-label` = Device ID)
  - แผนที่ responsive (กว้าง 100%), ไม่โหลดข้อมูลแผนที่จากภายนอก
- ข้อความทั้งหมดใส่ `messages.ts`

**Tests**
- [x] `buildGoogleMapsUrl`: รูปแบบถูก, ทศนิยม/ค่าลบ/ศูนย์ ไม่เพี้ยน
- [x] `map-coords`: จุดอ้างอิง (เช่น กรุงเทพฯ ≈ 13.75, 100.50 / เชียงใหม่ ≈ 18.79, 98.98) แปลงกลับได้ตรงภายในเกณฑ์ที่กำหนด, ทดสอบหลายขนาด container (responsive)
- [x] Unit: ไม่มีข้อมูล `REGISTERED` → ไม่มี pin ใน DOM
- [x] Unit: มี `REGISTERED` 3 รายการ → pin 3 อัน ตรงพิกัด, **ไม่แสดง pin ของ `UNREGISTERED`**
- [x] Unit: คลิก pin → การ์ด + ลิงก์ Google Maps ถูก (`target="_blank"`, `rel` ถูก) + ประวัติ log แสดงตามลำดับใหม่สุดก่อน
- [x] Unit: โหมดปัก — คลิกแผนที่ในจังหวัดที่ถูก → pin ตัวอย่าง 1 อัน (คลิกใหม่ → ย้าย), ช่อง lat/lng อัปเดตตาม, ปุ่มยืนยันเปิดใช้ได้
- [x] Unit: คลิกนอกจังหวัดของข้อมูลนั้น (แต่ยังในประเทศไทย) → ข้อความเตือน + ปุ่มยืนยัน disabled; กรอก lat/lng นอกจังหวัด → เหมือนกัน
- [x] Unit: โหมดแก้ — แสดงตำแหน่งเดิมจาง + pin ใหม่, ปุ่ม "บันทึกการแก้ไข pin" เรียก PATCH (ไม่ใช่ confirm); พิกัดเท่าเดิม → ปุ่ม disabled
- [x] Unit: กดบันทึกรัว → เรียก API ครั้งเดียว; กด "ยกเลิก" → ไม่เรียก API
- [x] Unit: 409 / 400 `PIN_OUTSIDE_PROVINCE` / 500 แสดงข้อความถูกต้อง
- [x] E2E (admin): สมัครข้อมูลใหม่ทางหน้า `/` → `/dashboard` ("ยังไม่ลงทะเบียน") → "เพิ่ม pin" → คลิกแผนที่ **ภายในจังหวัดที่ระบุ** → ยืนยัน → การ์ดเปลี่ยนเป็น "ลงทะเบียน" มี pin/ลิงก์ Google Maps; ตัวเลขบนปุ่ม (ยังไม่ลงทะเบียน −1, ลงทะเบียน +1)
- [x] E2E (admin): ปักนอกจังหวัด → ยืนยันไม่ได้ (ปุ่ม disabled) และถ้ายิง API ตรงด้วยพิกัดนอกจังหวัด → 400
- [x] E2E (admin): "แก้ไข pin" จาก Dashboard → ย้าย pin ภายในจังหวัด → บันทึก → พิกัดใหม่ปรากฏ + ประวัติมีรายการ `UPDATE` พร้อมชื่อ `admin1` และพิกัดเดิม→ใหม่
- [x] E2E (admin): หน้า Map เปิดตอนยังไม่มี REGISTERED → ไม่มี pin; หลังยืนยัน → มี pin 1 อัน
- [x] E2E: ปัก/แก้ด้วยการกรอก lat/lng ด้วยคีย์บอร์ดอย่างเดียวได้
- [x] E2E: admin 2 context ยืนยันรายการเดียวกันพร้อมกัน → สำเร็จ 1 อีกอันได้ข้อความ "ถูกยืนยันไปแล้ว"
- [x] E2E (user): เรียก `PATCH .../pin` และ `GET .../logs` ตรง → 403
- [x] E2E: ไม่มี network request ไปโดเมนภายนอกตอนโหลดหน้า map; viewport 390×844 ไม่เลื่อนแนวนอน
- [x] axe: `/admin/map` ไม่พบ violation ระดับ serious/critical; ไม่มี hydration warning

---

### Phase 17: Regression, Security Review, อัปเดตเอกสาร

**งาน**
- รัน `npm run lint`, `npm run build`, `npm test`, `npm run test:e2e` ทั้ง 2 viewport
- ตรวจ `next build && next start -p 3000` (production): หน้า public ใช้ได้, login/redirect/dashboard/map ทำงาน, seed ไม่รันใน production
- Security checklist (ติ๊กและรายงานผู้ใช้):
  - รหัสผ่านดิบไม่อยู่ใน DB, log, response, error
  - **หน้า `/`, `/register` และ API สาธารณะไม่ผูกกับ auth เลย** (ไม่อ่าน cookie, ไม่ผ่าน proxy)
  - ทุกหน้า/API ที่ระบุว่าป้องกัน ตอบ 401/403/redirect ถูกต้อง (ทดสอบครบทุกตัวตามตารางหัวข้อ 6)
  - **ไม่มีทางตั้ง `status`/พิกัดผ่าน endpoint สาธารณะ**
  - **ไม่มีทางบันทึก pin นอกจังหวัด** (ทดสอบที่ API ไม่ใช่แค่ UI)
  - **log ของ pin: append-only, ผู้ทำรายการมาจาก session, เขียนใน transaction เดียวกับพิกัด, user ธรรมดาอ่านไม่ได้**
  - ไม่มีความสามารถระดับ root ใน admin ตามหัวข้อ 3
  - cookie flags ถูกต้อง, session 24 ชม. บังคับที่ `exp`, `AUTH_SECRET` ไม่ถูก commit (`.env` อยู่ใน `.gitignore`)
  - ลิงก์ภายนอกทุกอันมี `noopener noreferrer`
  - API สาธารณะยังมี rate limit และจำกัดขนาด body
- อัปเดตเอกสาร: `README.md` (บัญชีตัวอย่าง, env, flow สถานะ, การแก้ pin/log), `DECISIONS.md` (คำตอบ Q1–Q15 + สิ่งที่ตัดสินเอง + แหล่งที่มา/license ข้อมูลแผนที่), `MANUAL_TESTS.md`, `DEPLOY_CHECKLIST.md` (เปลี่ยนรหัส/ลบบัญชี seed, ตั้ง `AUTH_SECRET` จริง, migration ใหม่ + ตาราง log ต้องผ่านบน PostgreSQL, ทดสอบ concurrency ของการแก้ pin บน PostgreSQL)
- แก้หัวข้อ 10 ของ `PROJECT_PLAN.md` ตามกฎข้อ 5 และเพิ่มสถานะ Phase 10–17

**Tests (Regression)**

| Flow | PC | Mobile |
|---|---|---|
| ไม่ login → สแกน/กรอก → บันทึกข้อมูล → ได้ Device ID (สถานะ ยังไม่ลงทะเบียน) | ✅ | ✅ |
| user login → `/dashboard` เห็นทั้ง 2 สถานะ เรียงล่าสุดบน + ปุ่มสถานะ/จำนวนถูกต้อง | ✅ | ✅ |
| user พิมพ์ `/admin/map` ถูกส่งกลับ `/dashboard` | ✅ | ✅ |
| admin → Dashboard → เพิ่ม pin (ในจังหวัด) → ยืนยัน → "ลงทะเบียน" → pin ปรากฏบน Map + ลิงก์ Google Maps | ✅ | ✅ |
| admin แก้ pin → พิกัดเปลี่ยน + log ถูกบันทึก | ✅ | ✅ |
| admin ปัก/แก้ pin นอกจังหวัด → ถูกปฏิเสธ | ✅ | ✅ |
| ไม่ login พิมพ์ `/dashboard` → `/login` | ✅ | ✅ |
| `/` ใช้งานได้ปกติทั้งตอนไม่มี/มี/มี cookie เสีย | ✅ | ✅ |
| Session หมดอายุ (24 ชม.) ระหว่างใช้งาน → ได้ 401/redirect ที่จัดการได้ ไม่ crash | ✅ | ✅ |

- [x] CI ผ่านทั้งหมด; production build ไม่มี warning สำคัญ
- [x] test ชุดเดิม Phase 0–9 ผ่าน 100% (ไม่ถูกลบหรือ skip)
- [ ] (Manual) ทดสอบ login/dashboard/ปัก-แก้ pin บนมือถือจริง 1 เครื่อง บันทึกใน `MANUAL_TESTS.md` (เตรียมพร้อมสำหรับผู้ใช้ตรวจสอบบนเครื่องจริง)

---

## 9. ลำดับการทำงาน

```
Phase 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17
```

เหตุผล: ผู้ใช้และ hash → session/API → login + ป้องกันเฉพาะหน้าใหม่ (ไม่แตะหน้า public) → ข้อมูลขอบเขตจังหวัด (ฐานของการตรวจ pin) → สถานะ + API + log (แกนของ Dashboard/Map) → UI Dashboard → UI Map → ปิดงาน

**ขอบเขตส่งมอบรอบแรกที่แนะนำ:** Phase 10 + 11 (ยังไม่แตะหน้าเดิม ความเสี่ยงต่ำ)
**จุดที่ควรให้ผู้ใช้ตรวจก่อนไปต่อ:**
- หลัง Phase 13 — ความแม่นยำของขอบเขตจังหวัด (Q14) กระทบว่า pin จริงถูกปฏิเสธหรือไม่
- หลัง Phase 14 — เปลี่ยน schema ของ `Registration` และพฤติกรรมของ API สาธารณะ

---

## 10. Out of Scope (ของส่วนนี้)

- สมัครสมาชิก / ลืมรหัสผ่าน / เปลี่ยนรหัสผ่าน / จัดการ user ผ่านหน้าเว็บ
- OAuth / Social login / 2FA
- ย้อนสถานะจาก "ลงทะเบียน" กลับเป็น "ยังไม่ลงทะเบียน", ลบข้อมูล, และการแก้/ลบ log (แก้ได้เฉพาะ pin ตาม Q6)
- ค้นหา/ส่งออกข้อมูลใน Dashboard (มีแค่กรองตามสถานะ + แบ่งหน้า) และหน้าแสดง log รวมทุกรายการ (ดูได้เฉพาะประวัติของแต่ละข้อมูลบนหน้า Map)
- ฝัง Google Maps / ใช้ Google Maps API key
- Realtime (Dashboard ไม่ต้องอัปเดตเองอัตโนมัติ ผู้ใช้รีเฟรชเอง)
- Deploy