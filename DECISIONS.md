# DECISIONS.md — บันทึกการตัดสินใจทางสถาปัตยกรรมและเทคนิค

เอกสารนี้บันทึกข้อตกลงและการตัดสินใจทางเทคนิคที่เลือกตามกฎ Ponytail Mindset (ความเรียบง่ายและใช้งานได้จริง)

## Phase 0: วางโครงโปรเจค
1. **Prisma Version:** เลือกใช้ `Prisma 6.x` (`^6.4.1`) เนื่องจากเสถียร รองรับการตั้งค่า `provider = "sqlite"`, `url = env("DATABASE_URL")` แบบมาตรฐาน และการทำงานร่วมกับ SQLite WAL mode / busy_timeout โดยตรง
2. **Package Name:** กำหนดชื่อโปรเจกต์ใน `package.json` เป็น `qr-code` เพื่อให้ถูกต้องตามข้อกำหนดตัวพิมพ์เล็กของ npm
3. **Vitest & React Testing Library:** ใช้ Vitest คู่กับ `@testing-library/react`, `jsdom`, `@testing-library/jest-dom` สำหรับ unit/integration tests
4. **Playwright:** กำหนด baseURL `http://localhost:3000` และตั้งค่าโปรเจกต์ทดสอบสำหรับ Chromium และ Mobile Chrome
5. **Git Branching Strategy:** ใช้ branch แยกตามหมวดหมู่ของงานตามความต้องการของผู้ใช้:
   - `setup`: Phase 0 วางโครงโปรเจค
   - `data`: Phase 1 ข้อมูลภาคและจังหวัด 6 ภาค
   - `db`: Phase 4A ฐานข้อมูล SQLite, Repository, API Routes และ Concurrency Handling
   - `ui-responsive`: Phase 2 ตรวจจับ Responsive และปุ่มหน้าแรก
   - `feature-manual-input`: Phase 3 ฟังก์ชันกรอก Text และตรวจ UID ซ้ำ
   - `ui-register`: Phase 4B หน้าและฟอร์มลงทะเบียน
   - `feature-export-json`: Phase 5 ดาวน์โหลดผลลัพธ์เป็นไฟล์ JSON
   - `feature-camera-scanner`: Phase 6 สแกน QR ด้วยกล้อง (Mobile)
   - `feature-region-snipper`: Phase 7 จับภาพหน้าจอและ crop QR (PC)
   - `polish-a11y-security`: Phase 8 ตรวจสอบ A11y, Rate limiting, Security
   - `integration-test`: Phase 9 Regression and final testing
