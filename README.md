# QR Code User Registration System (ระบบลงทะเบียนอุปกรณ์ด้วย QR Code)

เว็บแอปพลิเคชันสำหรับลงทะเบียนอุปกรณ์ด้วยการสแกน QR Code (ผ่านกล้องมือถือ หรือลากเลือกพื้นที่หน้าจอบน PC) หรือการกรอกรหัส UID พร้อมเลือกข้อมูลภาค จังหวัด ประเภทอุปกรณ์ และส่งออกข้อมูลเป็นไฟล์ JSON

---

## 🛠️ เทคโนโลยีที่ใช้
- **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Database:** Prisma ORM + SQLite (`dev.db`) (รองรับการ Migrate ไป PostgreSQL)
- **Authentication & Security:** Argon2 Password Hashing, Signed JWT Session Cookies (24 ชม. expiration), Role-based Access Control (`admin` / `user`), In-memory Rate Limiting, HTTP Security Headers
- **Validation:** Zod (ใช้ร่วมกันทั้ง Client และ Server)
- **Form:** React Hook Form + Custom Zod 4 Resolver
- **QR Decoding:** `jsQR` (รองรับทั้งกล้องมือถือและการอัปโหลดภาพบน PC)
- **Map & Geo-fencing:** `react-simple-maps`, `d3-geo`, GeoJSON 77 จังหวัดของประเทศไทย (100% Offline / Zero external network calls), Ray-casting Point-in-Polygon
- **Testing:** Vitest, React Testing Library, Playwright E2E, Axe Core Accessibility Testing

---

## 🚀 การติดตั้งและเริ่มใช้งาน

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่าฐานข้อมูล SQLite และ Seed บัญชีผู้ใช้ตัวอย่าง
```bash
npm run db:migrate
npm run db:seed
```

> ⚠️ **ข้อควรระวังเรื่องความปลอดภัย:** คำสั่ง Seed จะสร้างบัญชีตัวอย่างสำหรับสภาพแวดล้อม Development เท่านั้น และจะปฏิเสธการรันบน `NODE_ENV=production` เด็ดขาด:
> - **Admin:** `admin1` / รหัสผ่าน: `1234` (Role: `admin` — เข้าถึง Dashboard, ปัก/แก้ Pin แผนที่, ยืนยันสถานะ และดู Audit Log)
> - **User:** `user1` / รหัสผ่าน: `1234` (Role: `user` — เข้าถึง Dashboard ดูข้อมูลและสถานะอุปกรณ์)
> *รหัสผ่าน `1234` มีไว้เพื่อทดสอบตอน dev เท่านั้น ห้ามใช้บนระบบจริง*

### 3. รัน Development Server ด้วย HTTPS
```bash
npm run dev
```
เซิร์ฟเวอร์จะเปิดที่ `https://localhost:3000` (และ `https://0.0.0.0:3000` สำหรับการเข้าถึงผ่าน LAN)

---

## 🗺️ แผนผังเส้นทางและสิทธิ์การเข้าถึง (Route & Role Matrix)

| เส้นทาง (Path) | สิทธิ์ที่ต้องการ | คำอธิบาย |
|---|---|---|
| `/` | ทุกคน (Public) | สแกน QR Code (มือถือ: กล้อง, PC: อัปโหลดภาพ/วางภาพ/กรอกข้อความ) |
| `/register` | ทุกคน (Public) | ฟอร์มลงทะเบียนอุปกรณ์ (เลือกภาค จังหวัด ประเภท) |
| `/login` | ทุกคน (Public) | หน้าเข้าสู่ระบบ (หากมี Session อยู่แล้วจะ Redirect ไป `/dashboard`) |
| `/dashboard` | `user`, `admin` | แดชบอร์ดแสดงรายการอุปกรณ์, กรองตามสถานะ (`ALL`, `UNREGISTERED`, `REGISTERED`), และสรุปยอด |
| `/admin/map` | `admin` เท่านั้น | แผนที่ประเทศไทย 77 จังหวัด, ปักหมุดจำกัดขอบเขตจังหวัด, แก้ไขพิกัด, และประวัติ Audit Log |
| `/api/registrations` | ทุกคน (Public POST) | บันทึกข้อมูลลงทะเบียน (สถานะเริ่มต้นเป็น `UNREGISTERED` เสมอ) |
| `/api/registrations/[id]/confirm` | `admin` เท่านั้น | ยืนยันการลงทะเบียนพร้อมพิกัด Lat/Lng (เปลี่ยนสถานะเป็น `REGISTERED`) |
| `/api/registrations/[id]/pin` | `admin` เท่านั้น | แก้ไขพิกัดหมุดของอุปกรณ์ที่ลงทะเบียนแล้ว (บันทึก Audit Log) |
| `/api/registrations/[id]/logs` | `admin` เท่านั้น | ดึงประวัติการแก้ไขพิกัดของอุปกรณ์ |

---

## 📱 วิธีเปิดทดสอบจากมือถือผ่านวง Wi-Fi เดียวกัน
1. ตรวจสอบ IP เครื่องคอมพิวเตอร์ของคุณ (เช่น ผ่านคำสั่ง `ipconfig` บน Windows เช่น `192.168.1.50`)
2. ตรวจสอบว่า Firewall บนเครื่องเปิดรับการเชื่อมต่อพอร์ต `3000`
3. เชื่อมต่อโทรศัพท์มือถือเข้า Wi-Fi วงเดียวกันกับคอมพิวเตอร์
4. เปิดเบราว์เซอร์ในมือถือแล้วพิมพ์: `https://<IP-เครื่อง-dev>:3000` (เช่น `https://192.168.1.50:3000`)
5. เนื่องจากเซิร์ฟเวอร์ใช้ Self-signed SSL Certificate ให้กด **"Advanced"** แล้วเลือก **"Proceed" / "ดำเนินการต่อ"**
6. เมื่อเข้าสู่หน้าเว็บ จะสามารถขอสิทธิ์ใช้งานกล้องและใช้งานฟังก์ชันสแกนได้ตามปกติ

---

## 🧪 การทดสอบ (Testing)

### รัน Unit & Integration Tests (Vitest)
```bash
npm test
```
*(ครอบคลุม 23 test files / 214 tests ผ่าน 100%)*

### รัน E2E Tests (Playwright)
```bash
npx playwright test
```
*(ครอบคลุม 58 E2E tests ทั้งบน Desktop และ Mobile ผ่าน 100%)*

### ตรวจสอบ Lint & Production Build
```bash
npm run lint
npm run build
```
*(0 errors, 0 warnings)*

