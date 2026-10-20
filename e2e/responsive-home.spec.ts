import { test, expect, devices } from '@playwright/test';

test.describe('Phase 2 E2E: Responsive Detection on Home Page', () => {
  test('viewport 1280x800 (Desktop) shows Snip button and no hydration warnings', async ({ page }) => {
    const consoleWarnings: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'warning' || text.toLowerCase().includes('hydration')) {
        consoleWarnings.push(text);
      }
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const scanBtn = page.locator('#btn-scan-qr');
    await expect(scanBtn).toBeVisible();
    await expect(scanBtn).toHaveText(/ลากเมาส์เลือกพื้นที่หน้าจอ/);

    const manualBtn = page.locator('#btn-manual-input');
    await expect(manualBtn).toBeVisible();
    await expect(manualBtn).toHaveText(/กรอกข้อความเอง/);

    // Verify no hydration warnings
    const hydrationWarnings = consoleWarnings.filter(w =>
      w.toLowerCase().includes('hydration') || w.toLowerCase().includes('did not match')
    );
    expect(hydrationWarnings).toHaveLength(0);
  });

  test('viewport 390x844 (Mobile) shows Camera button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const scanBtn = page.locator('#btn-scan-qr');
    await expect(scanBtn).toBeVisible();
    await expect(scanBtn).toHaveText(/เปิดกล้องสแกน QR/);
  });

  test('mobile device (iPhone 12 / narrow screen < 768px) shows Camera button', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();
    await page.goto('/');

    const scanBtn = page.locator('#btn-scan-qr');
    await expect(scanBtn).toBeVisible();
    await expect(scanBtn).toHaveText(/เปิดกล้องสแกน QR/);

    await context.close();
  });

  test('manual toggle button switches mode on Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const scanBtn = page.locator('#btn-scan-qr');
    await expect(scanBtn).toHaveText(/ลากเมาส์เลือกพื้นที่หน้าจอ/);

    const toggleBtn = page.locator('#btn-toggle-scan-mode');
    await toggleBtn.click();

    await expect(scanBtn).toHaveText(/เปิดกล้องสแกน QR/);

    await toggleBtn.click();
    await expect(scanBtn).toHaveText(/ลากเมาส์เลือกพื้นที่หน้าจอ/);
  });
});
