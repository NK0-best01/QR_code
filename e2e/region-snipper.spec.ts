import { test, expect } from '@playwright/test';

test.describe('Phase 7 E2E: PC Region Snipper Flow', () => {
  // Desktop viewport (>= 768px)
  test.use({
    viewport: { width: 1280, height: 800 },
  });

  test('บนหน้าจอ PC: ปุ่มแรกเป็น "ลากเมาส์เลือกพื้นที่หน้าจอ"', async ({ page }) => {
    await page.goto('/?mode=snip');

    const scanBtn = page.locator('#btn-scan-qr');
    await expect(scanBtn).toBeVisible();
    await expect(scanBtn).toHaveText(/ลากเมาส์เลือกพื้นที่หน้าจอ/);
  });

  test('กด Esc บนคีย์บอร์ด → ปิด RegionSnipper overlay และกลับสู่หน้าแรก', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        Object.defineProperty(Navigator.prototype, 'mediaDevices', {
          get: () => ({
            getDisplayMedia: async () => {
              const canvas = document.createElement('canvas');
              canvas.width = 800;
              canvas.height = 600;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(0, 0, 800, 600);
              }
              return canvas.captureStream(30);
            },
          }),
          configurable: true,
        });
      } catch {
        // ignore
      }
    });

    await page.goto('/?mode=snip');
    const scanBtn = page.locator('#btn-scan-qr');
    await scanBtn.click();

    const snipper = page.locator('[data-testid="region-snipper"]');
    await expect(snipper).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Overlay is closed, returned to home
    await expect(snipper).not.toBeVisible();
    await expect(scanBtn).toBeVisible();
  });

  test('กดปุ่ม ยกเลิก (Esc) บน Top toolbar → ปิด overlay', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        Object.defineProperty(Navigator.prototype, 'mediaDevices', {
          get: () => ({
            getDisplayMedia: async () => {
              const canvas = document.createElement('canvas');
              canvas.width = 800;
              canvas.height = 600;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(0, 0, 800, 600);
              }
              return canvas.captureStream(30);
            },
          }),
          configurable: true,
        });
      } catch {
        // ignore
      }
    });

    await page.goto('/?mode=snip');
    await page.locator('#btn-scan-qr').click();

    const snipper = page.locator('[data-testid="region-snipper"]');
    await expect(snipper).toBeVisible();

    const cancelBtn = page.locator('#btn-snipper-cancel');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    await expect(snipper).not.toBeVisible();
  });

  test('กดปุ่ม "กรอกข้อความเอง" บน Top toolbar → สลับไปหน้าต่างกรอกข้อความทันที', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        Object.defineProperty(Navigator.prototype, 'mediaDevices', {
          get: () => ({
            getDisplayMedia: async () => {
              const canvas = document.createElement('canvas');
              canvas.width = 800;
              canvas.height = 600;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(0, 0, 800, 600);
              }
              return canvas.captureStream(30);
            },
          }),
          configurable: true,
        });
      } catch {
        // ignore
      }
    });

    await page.goto('/?mode=snip');
    await page.locator('#btn-scan-qr').click();

    const snipper = page.locator('[data-testid="region-snipper"]');
    await expect(snipper).toBeVisible();

    const manualBtn = page.locator('#btn-snipper-top-manual');
    await expect(manualBtn).toBeVisible();
    await manualBtn.click();

    await expect(snipper).not.toBeVisible();
    await expect(page.locator('#input-manual-uid')).toBeVisible();
  });

  test('เมื่อผู้ใช้ยกเลิกการเลือกหน้าจอ (NotAllowedError) → แสดงข้อความยกเลิกการเลือกหน้าจอ', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        Object.defineProperty(Navigator.prototype, 'mediaDevices', {
          get: () => ({
            getDisplayMedia: () => {
              const err = new Error('Permission denied');
              err.name = 'NotAllowedError';
              return Promise.reject(err);
            },
          }),
          configurable: true,
        });
      } catch {
        // ignore
      }
    });

    await page.goto('/?mode=snip');
    await page.locator('#btn-scan-qr').click();

    const errorCard = page.locator('[data-testid="region-snipper-error"]');
    await expect(errorCard).toBeVisible();
    await expect(page.locator('#screen-error-text')).toContainText('ยกเลิกการเลือกหน้าจอ');

    // Switch to manual input from error card
    const manualBtn = page.locator('#btn-snipper-manual');
    await expect(manualBtn).toBeVisible();
    await manualBtn.click();

    await expect(page.locator('#input-manual-uid')).toBeVisible();
  });

  test('ลากกรอบเลือกพื้นที่หน้าจอ → ถ้าไม่พบ QR แสดงแจ้งเตือนให้ลองใหม่ได้', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        Object.defineProperty(Navigator.prototype, 'mediaDevices', {
          get: () => ({
            getDisplayMedia: async () => {
              const canvas = document.createElement('canvas');
              canvas.width = 800;
              canvas.height = 600;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(0, 0, 800, 600);
              }
              return canvas.captureStream(30);
            },
          }),
          configurable: true,
        });
      } catch {
        // ignore
      }
    });

    await page.goto('/?mode=snip');
    await page.locator('#btn-scan-qr').click();

    const snipperCanvas = page.locator('[data-testid="snipper-canvas"]');
    await expect(snipperCanvas).toBeVisible();

    // Wait for initial screenshot capture loading overlay to disappear
    await expect(page.locator('[data-testid="snipper-loading"]')).not.toBeVisible();

    // Drag on canvas (from 100, 100 to 300, 300)
    const box = await snipperCanvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();
      await page.mouse.move(box.x + 300, box.y + 300);
      await page.mouse.up();
    }

    // Warning toast shows that no QR code was found in selected region
    const warningToast = page.locator('[data-testid="snipper-warning-toast"]');
    await expect(warningToast).toBeVisible();
    await expect(warningToast).toContainText('ไม่พบ QR Code ในพื้นที่ที่เลือก');
  });
});
