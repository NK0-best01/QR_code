import { test, expect } from '@playwright/test';

test.describe('Phase 7 E2E: PC Image Uploader QR Flow', () => {
  test.use({
    viewport: { width: 1280, height: 800 },
  });

  test('บนหน้าจอ PC: ปุ่มแรกเป็น "อัปโหลดภาพ QR จากโฟลเดอร์" และคลิกแล้วเปิด ImageUploader', async ({ page }) => {
    await page.goto('/');

    const scanBtn = page.locator('#btn-scan-qr');
    await expect(scanBtn).toBeVisible();
    await expect(scanBtn).toHaveText(/อัปโหลดภาพ QR จากโฟลเดอร์/);

    await scanBtn.click();

    // Image uploader card appears
    const uploaderCard = page.locator('[data-testid="image-uploader-card"]');
    await expect(uploaderCard).toBeVisible();
    await expect(page.locator('[data-testid="drop-zone"]')).toBeVisible();
    await expect(page.locator('#btn-choose-file')).toBeVisible();
  });

  test('กดปุ่ม ยกเลิก หรือกด Esc → ปิด ImageUploader และกลับสู่หน้าแรก', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-scan-qr').click();

    const uploaderCard = page.locator('[data-testid="image-uploader-card"]');
    await expect(uploaderCard).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await expect(uploaderCard).not.toBeVisible();
    await expect(page.locator('#btn-scan-qr')).toBeVisible();

    // Open again and click close button
    await page.locator('#btn-scan-qr').click();
    await expect(uploaderCard).toBeVisible();
    await page.locator('#btn-close-uploader').click();
    await expect(uploaderCard).not.toBeVisible();
  });

  test('กดปุ่ม "กรอกข้อความเอง" ใน ImageUploader → สลับไปหน้าต่างกรอกข้อความ', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-scan-qr').click();

    await expect(page.locator('[data-testid="image-uploader-card"]')).toBeVisible();
    await page.locator('#btn-uploader-manual').click();

    await expect(page.locator('[data-testid="image-uploader-card"]')).not.toBeVisible();
    await expect(page.locator('#input-manual-uid')).toBeVisible();
  });
});
