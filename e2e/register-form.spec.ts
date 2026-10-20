import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe('Phase 4B E2E: Registration Form Flow', () => {
  test.beforeAll(async () => {
    const prisma = new PrismaClient();
    await prisma.registration.deleteMany();
    await prisma.deviceCounter.deleteMany();
    await prisma.$disconnect();
  });

  test('สมัครตามลำดับ 3 ประเภท (KSK, KPD, MNU) → ได้ KSK-0001, KPD-0001, MNU-0001', async ({
    page,
  }) => {
    // 1. KSK-0001
    await page.goto('/register?uid=E2E-KSK-001');
    await expect(page.locator('[data-testid="reg-uid"]')).toHaveValue('E2E-KSK-001');

    await page.locator('#reg-region').selectOption('กลาง');
    await page.locator('#reg-province').selectOption('กรุงเทพมหานคร');
    await page.locator('#reg-device-type').selectOption('KSK');

    // Preview shows KSK-0001
    await expect(page.locator('#reg-sample-device-id')).toHaveValue('KSK-0001');

    await page.locator('#btn-submit-registration').click();

    // Success card shows actual deviceId
    await expect(page.locator('[data-testid="registration-success-card"]')).toBeVisible();
    await expect(page.locator('#display-actual-device-id')).toHaveText('KSK-0001');

    // 2. KPD-0001
    await page.goto('/register?uid=E2E-KPD-001');
    await expect(page.locator('[data-testid="reg-uid"]')).toHaveValue('E2E-KPD-001');
    await page.locator('#reg-region').selectOption('เหนือ');
    await page.locator('#reg-province').selectOption('เชียงใหม่');
    await page.locator('#reg-device-type').selectOption('KPD');
    await expect(page.locator('#reg-sample-device-id')).toHaveValue('KPD-0001');

    await page.locator('#btn-submit-registration').click();
    await expect(page.locator('[data-testid="registration-success-card"]')).toBeVisible();
    await expect(page.locator('#display-actual-device-id')).toHaveText('KPD-0001');

    // 3. MNU-0001
    await page.goto('/register?uid=E2E-MNU-001');
    await expect(page.locator('[data-testid="reg-uid"]')).toHaveValue('E2E-MNU-001');
    await page.locator('#reg-region').selectOption('ใต้');
    await page.locator('#reg-province').selectOption('ภูเก็ต');
    await page.locator('#reg-device-type').selectOption('MNU');
    await expect(page.locator('#reg-sample-device-id')).toHaveValue('MNU-0001');

    await page.locator('#btn-submit-registration').click();
    await expect(page.locator('[data-testid="registration-success-card"]')).toBeVisible();
    await expect(page.locator('#display-actual-device-id')).toHaveText('MNU-0001');
  });

  test('สมัครประเภทเดิมซ้ำ → รหัสเพิ่มขึ้นตามลำดับ (KSK-0002)', async ({ page }) => {
    await page.goto('/register?uid=E2E-KSK-002');
    await expect(page.locator('[data-testid="reg-uid"]')).toHaveValue('E2E-KSK-002');
    await page.locator('#reg-region').selectOption('กลาง');
    await page.locator('#reg-province').selectOption('นนทบุรี');
    await page.locator('#reg-device-type').selectOption('KSK');

    // Sample should now preview KSK-0002
    await expect(page.locator('#reg-sample-device-id')).toHaveValue('KSK-0002');

    await page.locator('#btn-submit-registration').click();
    await expect(page.locator('[data-testid="registration-success-card"]')).toBeVisible();
    await expect(page.locator('#display-actual-device-id')).toHaveText('KSK-0002');
  });

  test('Submit UID ซ้ำ → ถูกปฏิเสธด้วย 409 และขึ้นข้อความเตือน UID นี้ลงทะเบียนแล้ว', async ({
    page,
  }) => {
    // Attempt to register with E2E-KSK-001 which was already registered in test 1
    await page.goto('/register?uid=E2E-KSK-001');
    await page.locator('#reg-region').selectOption('กลาง');
    await page.locator('#reg-province').selectOption('กรุงเทพมหานคร');
    await page.locator('#reg-device-type').selectOption('KSK');

    await page.locator('#btn-submit-registration').click();

    // Banner error appears
    const banner = page.locator('[data-testid="register-error-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('UID นี้ลงทะเบียนแล้ว');

    // Button to go home exists, no retry button for 409
    const homeBtn = page.locator('#btn-error-home');
    await expect(homeBtn).toBeVisible();
    await homeBtn.click();

    await page.waitForURL('**/');
  });

  test('Concurrent submission จาก 2 context ได้รหัสไม่ซ้ำกัน', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();

    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    const uid1 = `CONC-E2E-${Date.now()}-1`;
    const uid2 = `CONC-E2E-${Date.now()}-2`;

    await page1.goto(`/register?uid=${uid1}`);
    await page2.goto(`/register?uid=${uid2}`);

    await page1.locator('#reg-region').selectOption('ตะวันออก');
    await page1.locator('#reg-province').selectOption('ชลบุรี');
    await page1.locator('#reg-device-type').selectOption('KSK');

    await page2.locator('#reg-region').selectOption('ตะวันตก');
    await page2.locator('#reg-province').selectOption('กาญจนบุรี');
    await page2.locator('#reg-device-type').selectOption('KSK');

    // Click submit simultaneously
    await Promise.all([
      page1.locator('#btn-submit-registration').click(),
      page2.locator('#btn-submit-registration').click(),
    ]);

    await expect(page1.locator('[data-testid="registration-success-card"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page2.locator('[data-testid="registration-success-card"]')).toBeVisible({
      timeout: 10000,
    });

    const devId1 = await page1.locator('#display-actual-device-id').textContent();
    const devId2 = await page2.locator('#display-actual-device-id').textContent();

    expect(devId1).toBeTruthy();
    expect(devId2).toBeTruthy();
    expect(devId1).not.toBe(devId2);

    await ctx1.close();
    await ctx2.close();
  });
});
