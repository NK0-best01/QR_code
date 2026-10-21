import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe('Phase 9 E2E: Full Regression Across PC & Mobile Viewports', () => {
  test.beforeAll(async () => {
    const prisma = new PrismaClient();
    await prisma.registration.deleteMany();
    await prisma.deviceCounter.deleteMany();
    await prisma.$disconnect();
  });

  // Flow 1: PC - Manual text → สมัคร → ได้ Device ID
  test('PC: กรอก text → สมัคร → แสดงบัตรสำเร็จพร้อมรหัสอุปกรณ์จริงและปุ่มกลับหน้าแรก', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await page.locator('#btn-manual-input').click();
    await expect(page.locator('#input-manual-uid')).toBeVisible();

    await page.locator('#input-manual-uid').fill('P9-PC-MANUAL-001');
    await page.locator('#btn-submit-manual-uid').click();

    await page.waitForURL('**/register?uid=P9-PC-MANUAL-001');
    await expect(page.locator('[data-testid="reg-uid"]')).toHaveValue('P9-PC-MANUAL-001');

    await page.locator('#reg-region').selectOption('กลาง');
    await page.locator('#reg-province').selectOption('กรุงเทพมหานคร');
    await page.locator('#reg-device-type').selectOption('KSK');

    await page.locator('#btn-submit-registration').click();

    // Verify success card
    const successCard = page.locator('[data-testid="registration-success-card"]');
    await expect(successCard).toBeVisible();
    await expect(page.locator('#display-actual-device-id')).toContainText('KSK-');

    // Verify back to home button
    const backBtn = page.locator('#btn-success-home');
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await page.waitForURL('**/');
  });

  // Flow 2: Mobile - กรอก text → สมัคร → ได้ Device ID
  test('Mobile: กรอก text บนหน้าจอมือถือ → สมัคร → ได้ Device ID', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.locator('#btn-manual-input').click();
    await page.locator('#input-manual-uid').fill('P9-MOB-MANUAL-001');
    await page.locator('#btn-submit-manual-uid').click();

    await page.waitForURL('**/register?uid=P9-MOB-MANUAL-001');
    await expect(page.locator('[data-testid="reg-uid"]')).toHaveValue('P9-MOB-MANUAL-001');

    await page.locator('#reg-region').selectOption('ใต้');
    await page.locator('#reg-province').selectOption('ภูเก็ต');
    await page.locator('#reg-device-type').selectOption('KPD');

    await page.locator('#btn-submit-registration').click();

    await expect(page.locator('[data-testid="registration-success-card"]')).toBeVisible();
    await expect(page.locator('#display-actual-device-id')).toContainText('KPD-');
  });

  // Flow 2.5: บันทึกข้อมูลเสร็จกลับหน้าแรก แล้วกรอก/สแกน UID ตัวใหม่ → ต้องได้ฟอร์มใหม่ที่สะอาด ไม่มีแคชหรือข้อมูลเดิมค้าง
  test('บันทึกข้อมูลเสร็จกลับหน้าแรก แล้วสแกน UID ใหม่ → ฟอร์มสะอาด ไม่ค้างข้อมูลเดิมหรือแคชเก่า', async ({
    page,
  }) => {
    // 1. Submit first UID
    await page.goto('/register?uid=P9-FRESH-001');
    await expect(page.locator('[data-testid="reg-uid"]')).toHaveValue('P9-FRESH-001');
    await page.locator('#reg-region').selectOption('กลาง');
    await page.locator('#reg-province').selectOption('กรุงเทพมหานคร');
    await page.locator('#reg-device-type').selectOption('KSK');
    await page.locator('#btn-submit-registration').click();

    // Success card appears
    await expect(page.locator('[data-testid="registration-success-card"]')).toBeVisible();
    await expect(page.locator('#display-actual-device-id')).toContainText('KSK-');

    // Return to home
    await page.locator('#btn-success-home').click();
    await page.waitForURL('**/');

    // 2. Now open a brand new UID: P9-FRESH-002
    await page.locator('#btn-manual-input').click();
    await page.locator('#input-manual-uid').fill('P9-FRESH-002');
    await page.locator('#btn-submit-manual-uid').click();
    await page.waitForURL('**/register?uid=P9-FRESH-002');

    // Verify fresh form
    await expect(page.locator('[data-testid="reg-uid"]')).toHaveValue('P9-FRESH-002');
    // Success card from previous run MUST NOT BE VISIBLE
    await expect(page.locator('[data-testid="registration-success-card"]')).not.toBeVisible();
    // Dropdowns must be reset to unselected
    await expect(page.locator('#reg-region')).toHaveValue('');
    await expect(page.locator('#reg-province')).toBeDisabled();
    await expect(page.locator('#btn-submit-registration')).toBeDisabled();
  });

  // Flow 3: PC - Image Uploader UI & Cancel / Fallback
  test('PC: อัปโหลดภาพ QR Code แสดงปุ่มยกเลิกและสลับไปกรอกข้อความเองได้', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const scanBtn = page.locator('#btn-scan-qr');
    await expect(scanBtn).toHaveText(/อัปโหลดภาพ QR จากโฟลเดอร์/);
    await scanBtn.click();

    const uploaderCard = page.locator('[data-testid="image-uploader-card"]');
    await expect(uploaderCard).toBeVisible();

    // Switch to manual input
    await page.locator('#btn-uploader-manual').click();
    await expect(uploaderCard).not.toBeVisible();
    await expect(page.locator('#input-manual-uid')).toBeVisible();
  });

  // Flow 4: Mobile - กล้อง & ปฏิเสธสิทธิ์ → ใช้กรอก text แทนได้
  test('Mobile: ปฏิเสธสิทธิ์กล้อง → แสดงแบนเนอร์แจ้งเตือนภาษาไทย และกดสลับไปกรอกข้อความเองได้', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Mock rejection of camera permission
    await page.addInitScript(() => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = () => {
          const err = new Error('Permission Denied');
          err.name = 'NotAllowedError';
          return Promise.reject(err);
        };
      }
    });

    await page.goto('/');
    const scanBtn = page.locator('#btn-scan-qr');
    await expect(scanBtn).toHaveText(/เปิดกล้องสแกน QR/);
    await scanBtn.click();

    const errorBanner = page.locator('[data-testid="camera-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('ไม่ได้รับสิทธิ์เข้าถึงกล้อง');

    // Switch to manual input from error banner
    await page.locator('#btn-switch-to-manual-error').click();
    await expect(page.locator('#input-manual-uid')).toBeVisible();
  });

  // Flow 5: UID ซ้ำถูกปฏิเสธ (ทั้งหน้าแรก และหน้า Register)
  test('UID ซ้ำถูกปฏิเสธ: ตรวจสอบความถูกต้องและไม่ยอมให้ลงทะเบียนซ้ำ', async ({ page }) => {
    await page.goto('/');

    // Try registering P9-PC-MANUAL-001 which was already registered in Flow 1
    await page.locator('#btn-manual-input').click();
    await page.locator('#input-manual-uid').fill('P9-PC-MANUAL-001');
    await page.locator('#btn-submit-manual-uid').click();

    // Alert for existing UID appears on home page
    const errorAlert = page.locator('[data-testid="manual-uid-error"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('UID นี้ลงทะเบียนแล้ว');

    // Direct access to /register with duplicate UID rejected upon submission
    await page.goto('/register?uid=P9-PC-MANUAL-001');
    await page.locator('#reg-region').selectOption('กลาง');
    await page.locator('#reg-province').selectOption('กรุงเทพมหานคร');
    await page.locator('#reg-device-type').selectOption('KSK');

    await page.locator('#btn-submit-registration').click();

    const banner = page.locator('[data-testid="register-error-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('UID นี้ลงทะเบียนแล้ว');
  });

  // Flow 6: Resize ข้าม breakpoint ระหว่างใช้งาน
  test('Resize ข้าม breakpoint ระหว่างใช้งาน: สลับโหมด UI ได้อย่างลื่นไหล', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const scanBtn = page.locator('#btn-scan-qr');
    await expect(scanBtn).toHaveText(/อัปโหลดภาพ QR จากโฟลเดอร์/);

    // Resize down to Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(scanBtn).toHaveText(/เปิดกล้องสแกน QR/);

    // Resize back to Desktop
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(scanBtn).toHaveText(/อัปโหลดภาพ QR จากโฟลเดอร์/);
  });

  // Flow 7: Refresh หน้า register แล้ว UID ไม่หาย
  test('Refresh หน้า register แล้ว UID ยังคงเดิม', async ({ page }) => {
    await page.goto('/register?uid=P9-PERSIST-999');

    const uidInput = page.locator('[data-testid="reg-uid"]');
    await expect(uidInput).toHaveValue('P9-PERSIST-999');
    await expect(uidInput).toHaveAttribute('readonly');

    await page.reload();

    await expect(uidInput).toHaveValue('P9-PERSIST-999');
    await expect(uidInput).toHaveAttribute('readonly');
  });

  // Flow 8: ข้อมูลจากมือถือและ PC เข้า DB เดียวกัน เลขไม่ซ้ำ
  test('ข้อมูลจากมือถือและ PC เข้า DB เดียวกัน เลขลำดับอุปกรณ์ไม่ซ้ำกัน', async ({ browser }) => {
    const pcContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });

    const pcPage = await pcContext.newPage();
    const mobilePage = await mobileContext.newPage();

    const pcUid = `P9-DUAL-PC-${Date.now()}`;
    const mobUid = `P9-DUAL-MOB-${Date.now()}`;

    await pcPage.goto(`/register?uid=${pcUid}`);
    await mobilePage.goto(`/register?uid=${mobUid}`);

    await pcPage.locator('#reg-region').selectOption('เหนือ');
    await pcPage.locator('#reg-province').selectOption('เชียงใหม่');
    await pcPage.locator('#reg-device-type').selectOption('MNU');

    await mobilePage.locator('#reg-region').selectOption('ใต้');
    await mobilePage.locator('#reg-province').selectOption('ภูเก็ต');
    await mobilePage.locator('#reg-device-type').selectOption('MNU');

    // Submit both registrations concurrently
    await Promise.all([
      pcPage.locator('#btn-submit-registration').click(),
      mobilePage.locator('#btn-submit-registration').click(),
    ]);

    await expect(pcPage.locator('[data-testid="registration-success-card"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(mobilePage.locator('[data-testid="registration-success-card"]')).toBeVisible({
      timeout: 10000,
    });

    const pcDeviceId = await pcPage.locator('#display-actual-device-id').textContent();
    const mobDeviceId = await mobilePage.locator('#display-actual-device-id').textContent();

    expect(pcDeviceId).toMatch(/^MNU-\d{4}$/);
    expect(mobDeviceId).toMatch(/^MNU-\d{4}$/);
    expect(pcDeviceId).not.toBe(mobDeviceId);

    await pcContext.close();
    await mobileContext.close();
  });

  // Flow 9: HTTP Security Headers & Permissions-Policy
  test('HTTP Security Headers: Permissions-Policy ไม่บล็อก camera และ display-capture', async ({
    request,
  }) => {
    const response = await request.get('/');
    expect(response.ok()).toBeTruthy();

    const headers = response.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

    // Permissions-Policy allows camera and display-capture for self
    const permissionsPolicy = headers['permissions-policy'];
    expect(permissionsPolicy).toBeTruthy();
    expect(permissionsPolicy).toContain('camera=(self)');
    expect(permissionsPolicy).toContain('display-capture=(self)');
  });
});
