import { test, expect } from '@playwright/test';

test.describe('Phase 3 E2E: Manual Input and Navigation to Register Page', () => {
  test('กรอก "ABC123" → ไปหน้า register และแสดง UID = "ABC123"', async ({ page }) => {
    await page.goto('/');

    // 1. Click "กรอกข้อความเอง" button
    const manualBtn = page.locator('#btn-manual-input');
    await expect(manualBtn).toBeVisible();
    await manualBtn.click();

    // 2. Form should appear
    const input = page.locator('#input-manual-uid');
    await expect(input).toBeVisible();
    await input.fill('ABC123');

    // 3. Submit
    const submitBtn = page.locator('#btn-submit-manual-uid');
    await submitBtn.click();

    // 4. URL should become /register?uid=ABC123
    await page.waitForURL('**/register?uid=ABC123');

    // 5. Readonly display field shows "ABC123"
    const displayUid = page.locator('#display-uid');
    await expect(displayUid).toBeVisible();
    await expect(displayUid).toHaveValue('ABC123');
    await expect(displayUid).toHaveAttribute('readonly', '');
  });

  test('เข้า /register ตรงๆ โดยไม่มี uid → redirect กลับหน้าแรก', async ({ page }) => {
    await page.goto('/register');
    await page.waitForURL('**/');
    await expect(page.locator('#btn-manual-input')).toBeVisible();
  });

  test('ปุ่ม "ย้อนกลับเพื่อแก้ UID" ทำงานและนำกลับสู่หน้าแรก', async ({ page }) => {
    await page.goto('/register?uid=EDIT-TEST-001');

    const displayUid = page.locator('#display-uid');
    await expect(displayUid).toHaveValue('EDIT-TEST-001');

    const backBtn = page.locator('#btn-back-home');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    await page.waitForURL('**/');
    await expect(page.locator('#btn-manual-input')).toBeVisible();
  });

  test('UID ซ้ำ → แสดงข้อความแจ้งเตือน "UID นี้ลงทะเบียนแล้ว" และคงอยู่หน้าแรก', async ({ request, page }) => {
    const existingUid = `ALREADY-EXISTS-${Date.now()}`;

    // 1. Seed registration into database via API
    const res = await request.post('/api/registrations', {
      data: {
        uid: existingUid,
        region: 'กลาง',
        province: 'กรุงเทพมหานคร',
        deviceType: 'KSK',
      },
    });
    expect(res.status()).toBe(201);

    // 2. Go to home page and enter same UID
    await page.goto('/');
    await page.locator('#btn-manual-input').click();

    const input = page.locator('#input-manual-uid');
    await input.fill(existingUid);

    const submitBtn = page.locator('#btn-submit-manual-uid');
    await submitBtn.click();

    // 3. Should show alert and remain on home page
    const errorAlert = page.locator('#manual-uid-error');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toHaveText(/UID นี้ลงทะเบียนแล้ว/);

    // Ensure we are still on home page (not redirected to /register)
    expect(page.url()).not.toContain('/register');
  });
});
