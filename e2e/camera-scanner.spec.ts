import { test, expect } from '@playwright/test';

test.describe('Phase 6 E2E: Mobile Camera Scanner Flow', () => {
  // Mobile viewport (< 768px)
  test.use({
    viewport: { width: 390, height: 844 },
    permissions: ['camera'],
  });

  test('บนหน้าจอ Mobile: กดปุ่ม "เปิดกล้องสแกน QR" → แสดงหน้าต่าง CameraScanner พร้อมปุ่มปิด', async ({
    page,
  }) => {
    await page.goto('/');

    const scanBtn = page.locator('#btn-scan-qr');
    await expect(scanBtn).toBeVisible();
    await expect(scanBtn).toHaveText(/เปิดกล้องสแกน QR/);

    // Click to open camera scanner
    await scanBtn.click();

    // CameraScanner container appears
    const scanner = page.locator('[data-testid="camera-scanner"]');
    await expect(scanner).toBeVisible();

    // Close button works
    const closeBtn = page.locator('#btn-close-camera');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Returned to ScanPanel
    await expect(scanner).not.toBeVisible();
    await expect(scanBtn).toBeVisible();
  });

  test('กดปุ่ม "กรอกข้อความเอง" ในหน้าต่างสแกนเนอร์ → สลับไปหน้าต่างกรอกข้อความทันที', async ({
    page,
  }) => {
    await page.goto('/');

    await page.locator('#btn-scan-qr').click();
    await expect(page.locator('[data-testid="camera-scanner"]')).toBeVisible();

    // Click switch to manual
    const switchToManualBtn = page.locator('#btn-switch-to-manual');
    await expect(switchToManualBtn).toBeVisible();
    await switchToManualBtn.click();

    // Manual input form is now visible
    await expect(page.locator('#input-manual-uid')).toBeVisible();
    await expect(page.locator('#btn-submit-manual-uid')).toBeVisible();
  });

  test('หากเกิดข้อผิดพลาดจากกล้อง → แสดงแบนเนอร์ข้อผิดพลาดภาษาไทย พร้อมปุ่มลองใหม่และปุ่มกรอกเอง', async ({
    page,
  }) => {
    // Override getUserMedia to reject with NotAllowedError
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
    await page.locator('#btn-scan-qr').click();

    const errorBanner = page.locator('[data-testid="camera-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('ไม่ได้รับสิทธิ์เข้าถึงกล้อง');

    // Button to switch to manual from error banner works
    const manualBtnInError = page.locator('#btn-switch-to-manual-error');
    await expect(manualBtnInError).toBeVisible();
    await manualBtnInError.click();

    await expect(page.locator('#input-manual-uid')).toBeVisible();
  });
});
