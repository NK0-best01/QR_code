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

## Phase 4A: ฐานข้อมูล SQLite และ API
1. **SQLite Concurrency & Socket Timeout:** บน SQLite การเรียก transaction แบบ concurrent สูง (เช่น 50 concurrent requests) ต้องตั้งค่า `connection_limit=1` และ `socket_timeout=60` ใน Connection URL เพื่อให้ Prisma queue คำขอในระดับ process แทนการแย่ง file lock ของ OS และเพิ่ม retry backoff สำหรับกรณี transient lock/contention
2. **Atomic Counter Reservation:** จอง `lastSeq` และ insert `registration` ภายใน `$transaction` เดียวกัน เมื่อเกิด UID ชน (P2002 บน `uid`) จะ rollback ทันทีทำให้ counter ไม่ขยับและไม่สูญเสียเลขรัน
3. **Zod 4 Schema Validation:** ใช้ Zod กำหนดความยาว UID ไม่เกิน 128 ตัวอักษร, ป้องกันอักขระควบคุม (`CONTROL_CHARS_REGEX`), และตรวจสอบว่าจังหวัดตรงกับภาคจริงผ่าน `isProvinceInRegion`

## Phase 2: Responsive Detection + Layout หน้าแรก
1. **useSyncExternalStore:** ใช้ `useSyncExternalStore` เพื่อตรวจจับและติดตามการเปลี่ยนแปลงของ Media Query (`max-width: 767px`) ตามขนาดหน้าจอจริง โดยตรง ทำให้ได้ client/server snapshot ที่ปลอดภัยจาก hydration mismatch และไม่เกิดปัญหา cascading renders (ไม่มี setState synchronously ใน effect) ตามมาตรฐาน React 19
2. **Skeleton Fallback:** ระหว่างรอ client hydrate จะแสดง Skeleton Placeholder ขนาดเท่าของจริง เพื่อไม่ให้เกิด Content Layout Shift (CLS)
3. **Pure Screen-Width Separation:** แยก PC (>= 768px -> Snip) และ Mobile (< 768px -> Camera) แบบอัตโนมัติตามขนาดหน้าจอ 100%

## Phase 3: กรอก Text และส่ง UID ไปหน้าสมัคร
1. **Centralized UID Navigation Helper:** แยกฟังก์ชันการตรวจเช็ค UID (`validateUidLocally`, `checkUidExists`, `buildRegisterUrl`) ไว้ที่ `src/lib/uid-navigation.ts` เพื่อให้จุดสแกนกล้อง (Phase 6) และจับภาพหน้าจอ (Phase 7) สามารถเรียกใช้งานซ้ำได้ โดยไม่ต้องเขียน logic ซ้ำซ้อน
2. **Pre-navigation Existence Check:** ก่อนส่งผู้ใช้ไปหน้าสมัคร จะยิง `GET /api/uids/[uid]/exists` ทันที หากพบว่า UID นี้เคยลงทะเบียนแล้ว จะแสดง alert แจ้งเตือนสีแดงทันทีและคงผู้ใช้ไว้ที่หน้าแรก
3. **Safe Parameter Encoding & Suspense:** ส่ง UID ผ่าน `encodeURIComponent` ใน URL query param (`/register?uid=...`) รองรับอักขระพิเศษภาษาไทยและสัญลักษณ์ (`& = # %`) พร้อมใช้ `<Suspense>` ครอบ `useSearchParams` เพื่อรองรับ Next.js App Router Client Component
4. **Fallback Redirection & Back Button:** หากผู้ใช้เข้า `/register` โดยตรงโดยไม่มี param `uid` ระบบจะ redirect กลับหน้าแรกทันที และมีปุ่ม "ย้อนกลับเพื่อแก้ UID" เพื่อให้ผู้ใช้สามารถกลับไปแก้ไข UID ได้อย่างสะดวก

## Phase 4B: หน้าและฟอร์มลงทะเบียน
1. **Zod 4 Resolver สำหรับ React Hook Form:** เนื่องจาก Zod 4 เปลี่ยนโครงสร้างข้อผิดพลาดจาก `.errors` เป็น `.issues` ทำให้ `@hookform/resolvers/zod` v3 เกิด unhandled rejection ได้ จึงออกแบบ `zod4Resolver` แบบ lightweight ขึ้นมาเอง ซึ่งแปลง `result.error.issues` เป็นโครงสร้างที่ React Hook Form ใช้งานได้สมบูรณ์และไม่มี overhead
2. **Double Submit Protection:** ใช้ `useRef` ตรวจสอบใน `handleFormSubmit` event handler เพื่อตัดคำขอส่งข้อมูลที่ซ้ำซ้อนในระดับ synchronous ทันทีที่ผู้ใช้กดปุ่มซ้ำ โดยไม่ขัดกับกฎ `react-hooks/refs` ของ React 19
3. **Cascading Dropdowns (ภาค → จังหวัด):** แสดง 6 ภาคมาตรฐาน เมื่อเลือกภาคจะกรองเฉพาะจังหวัดในภาคนั้น ๆ จากชุดข้อมูล `THAI_REGIONS` และหากผู้ใช้เปลี่ยนภาค จังหวัดที่เลือกไว้จะถูกรีเซ็ตเป็นค่าว่างทันทีเพื่อป้องกันข้อมูลขัดแย้ง
4. **Device ID Preview & Post-Submit Allocation:** เมื่อเลือกประเภทอุปกรณ์ จะดึงรหัสตัวอย่างจาก `/api/device-types/[code]/next` มาแสดงในช่องตัวอย่างแบบ readOnly และเมื่อกดบันทึกสำเร็จ การ์ดแสดงผลจะยืนยันรหัสจริง (`display-actual-device-id`)
5. **แยกการจัดการ 409 Conflict และ 500 Error:**
   - สถานะ 409 (UID ซ้ำ): แสดงข้อความเตือนสีแดง และมีเฉพาะปุ่ม "กลับหน้าแรก" (ไม่แสดงปุ่มลองใหม่)
   - สถานะ 500 หรือเน็ตเวิร์กล่ม: คงข้อมูลที่กรอกไว้ในฟอร์ม และมีปุ่ม "ลองส่งข้อมูลอีกครั้ง"

## Phase 5: ดาวน์โหลด JSON (Skipped)
- ผู้ใช้สั่งข้าม Phase 5 เนื่องจากมีฐานข้อมูล SQLite และ API จัดเก็บข้อมูลครบถ้วนสมบูรณ์แล้ว ไม่จำเป็นต้องส่งออกเป็นไฟล์ JSON อีก

## Phase 6: สแกน QR ด้วยกล้อง (Mobile)
1. **jsQR Decoding Helper (`src/lib/qr.ts`):** ถอดรหัส QR จาก `ImageData` หรือ raw buffer โดยใช้ `inversionAttempts: 'attemptBoth'` ทำให้อ่านได้ทั้ง QR โค้ดพื้นขาว-จุดดำ และพื้นดำ-จุดขาว พร้อม trim ข้อความและป้องกันข้อผิดพลาดกรณี buffer ไม่สมบูรณ์
2. **Throttled Video Loop (`CameraScanner.tsx`):** ใช้ `requestAnimationFrame` ร่วมกับการคำนวณ delta time หน่วงรอบประมวลผลที่ ~150ms เพื่อประหยัดพลังงานแบตเตอรี่และไม่ให้เครื่องมือถือร้อนจากการประมวลผลกราฟิกต่อเนื่อง
3. **Immediate Track Release & Single-trigger Guard:** ทันทีที่ตรวจพบ QR สำเร็จ สั่ง `track.stop()` ทุก track ของกล้องทันทีและตัดการเชื่อมต่อกล้อง เพื่อดับไฟสถานะกล้องบนอุปกรณ์ พร้อมตั้ง `hasScannedRef.current = true` ป้องกันการยิงคำขอซ้ำจากเฟรมถัดไป
4. **Context-aware Camera Error Handling:** ตรวจสอบและแสดงข้อความภาษาไทยที่ตรงกับสาเหตุจริง (`NotAllowedError`, `NotFoundError`, `NotReadableError`, Insecure Context) โดยมีปุ่ม "กรอกข้อความเอง" เป็นทางเลือกสำรองเสมอ
5. **Unified Navigation Pipeline:** ใช้ `processScannedUid` ที่แชร์ร่วมกับ Phase 3 ในการตรวจเช็คความถูกต้องและตรวจ UID ซ้ำผ่าน API ก่อนส่งผู้ใช้ไปหน้า `/register?uid=...` อย่างราบรื่น

## Phase 7: จับภาพหน้าจอและ crop QR บน PC (`RegionSnipper.tsx` & `crop.ts`)
1. **Immediate Stream Stop in `finally`:** หลังเรียก `getDisplayMedia` จะวาดภาพเฟรมเดียวลงบน off-screen snapshot canvas และสั่ง `track.stop()` ทุก track ในบล็อก `finally` ทันที เพื่อไม่ให้ค้างแถบ screen-sharing indicator บน OS
2. **Robust Multi-directional Normalization (`src/lib/crop.ts`):** ฟังก์ชัน `normalizeSelection` คำนวณ `min(x1, x2)`, `min(y1, y2)` ทำให้รองรับการลากเมาส์ทุกทิศทาง (รวมถึงลากย้อนกลับจากขวาล่างไปซ้ายบน) ได้กรอบพิกัดที่ถูกต้อง 100%
3. **Minimum Size Guard & Boundary Clamping:** ตรวจสอบขนาดกรอบ หากเล็กกว่า 10px ในด้านใดด้านหนึ่ง จะข้ามการประมวลผลทันทีเพื่อป้องกัน accidental clicks และ clamp พิกัดให้อยู่ในขอบเขตภาพธรรมชาติ (`naturalWidth`, `naturalHeight`) เสมอ
4. **HiDPI / Scaling Precision:** แปลงพิกัดการแสดงผลหน้าจอไปยังพิกัดภาพธรรมชาติด้วยอัตราส่วน `naturalWidth / displayWidth` และ `naturalHeight / displayHeight` รองรับทั้งจอมาตรฐานและจอ Retina/HiDPI
5. **Interactive Fullscreen Overlay:** มีหน้าต่างมาร์กเกอร์สีมืดครอบหน้าจอ พร้อมแสดงภาพจริงที่ถูกครอบอย่างคมชัด มีมุมไกด์สีขาวและเส้นขอบสีฟ้า พร้อมรองรับปุ่ม `Esc` เพื่อยกเลิก และหากเลือกพื้นที่ที่ไม่พบ QR จะมีแจ้งเตือนสีเหลืองและอนุญาตให้ลากครอบใหม่ได้ทันทีโดยไม่ต้องเปิด screen capture ใหม่

## Phase 7: อัปโหลดภาพ QR จากโฟลเดอร์บน PC (`ImageUploader.tsx`) — ปรับปรุงจาก Region Screenshot
1. **Pivot from Browser Screen Snip (`getDisplayMedia`) to Local Image Upload:**
   - จากผลการทดสอบการใช้งานจริงบนเบราว์เซอร์ พบว่า `getDisplayMedia` ติดข้อจำกัดด้านความปลอดภัยของ Web Sandbox โดยเบราว์เซอร์จะบังคับแสดงหน้าต่างขอแชร์หน้าจอ ("Choose what to share") เสมอ ซึ่งส่งผลต่อความคุ้นชินของผู้ใช้ที่ต้องการประสบการณ์แบบ Snipping Tool แท้ ๆ
   - จึงปรับปรุงการสแกน QR บน PC เป็นการเปิดให้ผู้ใช้เลือกไฟล์ภาพ QR Code ที่บันทึกไว้ในเครื่อง/โฟลเดอร์ หรือลากไฟล์ภาพมาวาง (Drag & Drop) หรือกดวางภาพจากคลิปบอร์ด (`Ctrl + V`) ซึ่งทำงานได้รวดเร็ว ปลอดภัย และไม่ติด security prompt ใด ๆ ของเบราว์เซอร์
2. **Nothing is Deleted Rule:**
   - โค้ด `RegionSnipper.tsx` และ `lib/crop.ts` รวมถึงชุดทดสอบเดิมยังคงถูกเก็บรักษาไว้ใน codebase และคงความพร้อมใช้งานได้ 100%
3. **Triple Input Method Support (File Picker + Drag & Drop + Clipboard Paste):**
   - ออกแบบ `ImageUploader.tsx` ให้มี:
     1. ปุ่มเลือกไฟล์ภาพจากโฟลเดอร์ในเครื่อง (`<input type="file" accept="image/*">`)
     2. Drag & Drop Zone ที่ตอบสนองต่อการลากไฟล์ภาพมาปล่อย
     3. Global Clipboard Paste Listener (`window.addEventListener('paste', ...)`) ดึงภาพที่แคปไว้ใน Clipboard ทันทีที่กด `Ctrl + V`
4. **Immediate Decode & Shared Validation Pipeline:**
   - อ่านภาพและถอดรหัส QR ทันทีด้วย `decodeQrFromImageData` จาก `lib/qr.ts`
   - ตรวจสอบความถูกต้องและ UID ซ้ำผ่าน `processScannedUid` ก่อนส่งต่อไปยังหน้า `/register?uid=...` อย่างเป็นระบบเดียวกันทั้งกล้องและการอัปโหลดภาพ
