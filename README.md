# QR Code User Registration System (ระบบลงทะเบียนอุปกรณ์ด้วย QR Code)

เว็บแอปพลิเคชันสำหรับลงทะเบียนอุปกรณ์ด้วยการสแกน QR Code (ผ่านกล้องมือถือ หรือลากเลือกพื้นที่หน้าจอบน PC) หรือการกรอกรหัส UID พร้อมเลือกข้อมูลภาค จังหวัด ประเภทอุปกรณ์ และส่งออกข้อมูลเป็นไฟล์ JSON

---

## 🛠️ เทคโนโลยีที่ใช้
- **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Database:** Prisma ORM + SQLite (`dev.db`)
- **Validation:** Zod (ใช้ร่วมกันทั้ง Client และ Server)
- **Form:** React Hook Form + `@hookform/resolvers`
- **QR Decoding:** `jsQR`
- **Testing:** Vitest, React Testing Library, Playwright

---

## 🚀 การติดตั้งและเริ่มใช้งาน

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่าฐานข้อมูล SQLite
```bash
npm run db:migrate
```

### 3. รัน Development Server ด้วย HTTPS
```bash
npm run dev
```
เซิร์ฟเวอร์จะเปิดที่ `https://localhost:3000` (และ `https://0.0.0.0:3000` สำหรับการเข้าถึงผ่าน LAN)

---

## 📱 วิธีเปิดทดสอบจากมือถือผ่านวง Wi-Fi เดียวกัน
1. ตรวจสอบ IP เครื่องคอมพิวเตอร์ของคุณ (เช่น ผ่านคำสั่ง `ipconfig` บน Windows เช่น `192.168.1.50`)
2. ตรวจสอบว่า Firewall บนเครื่องเปิดรับการเชื่อมต่อพอร์ต `3000`
3. เชื่อมต่อโทรศัพท์มือถือเข้า Wi-Fi วงเดียวกันกับคอมพิวเตอร์
4. เปิดเบราว์เซอร์ในมือถือแล้วพิมพ์: `https://<IP-เครื่อง-dev>:3000` (เช่น `https://192.168.1.50:3000`)
5. เนื่องจากเซิร์ฟเวอร์ใช้ Self-signed SSL Certificate ให้กด **"Advanced"** แล้วเลือก **"Proceed" / "ดำเนินการต่อ"**
6. เมื่อเข้าสู่หน้าเว็บ จะสามารถขอสิทธิ์ใช้งานกล้องและใช้งานฟังก์ชันสแกนได้ตามปกติ

*(ทางเลือกเสริม: สามารถใช้เครื่องมือเช่น `ngrok http 3000` เพื่อเปิดเป็น HTTPS สาธารณะได้)*

---

## 🧪 การทดสอบ (Testing)

### รัน Unit & Integration Tests (Vitest)
```bash
npm test
```

### รัน E2E Tests (Playwright)
```bash
npm run test:e2e
```

### ตรวจสอบ Lint & Typecheck
```bash
npm run lint
npm run build
```
