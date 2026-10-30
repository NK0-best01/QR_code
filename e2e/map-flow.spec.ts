import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import AxeBuilder from '@axe-core/playwright';
import { setAuthCookie } from './helpers/auth';

const prisma = new PrismaClient();

test.describe('Phase 16 E2E: Thailand Map, Pinning & Audit History', () => {
  let testUnregisteredId: number;
  let testRegisteredId: number;

  test.beforeAll(async () => {
    // Clean up test data
    await prisma.registrationPinLog.deleteMany();
    await prisma.registration.deleteMany({
      where: {
        uid: {
          in: ['E2E-MAP-UNREG-01', 'E2E-MAP-REG-02'],
        },
      },
    });

    // 1. Create an UNREGISTERED item (Bangkok)
    const unreg = await prisma.registration.create({
      data: {
        deviceId: 'ROBOQ-MAP-001',
        deviceType: 'ROBOQ',
        region: 'กลาง',
        province: 'กรุงเทพมหานคร',
        seq: 991,
        uid: 'E2E-MAP-UNREG-01',
        status: 'UNREGISTERED',
      },
    });
    testUnregisteredId = unreg.id;

    // 2. Create a REGISTERED item with initial pin (Chiang Mai)
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin1' },
    });

    const reg = await prisma.registration.create({
      data: {
        deviceId: 'ROBOQ-MAP-002',
        deviceType: 'ROBOQ',
        region: 'เหนือ',
        province: 'เชียงใหม่',
        seq: 992,
        uid: 'E2E-MAP-REG-02',
        status: 'REGISTERED',
        latitude: 18.7883,
        longitude: 98.9853,
        confirmedAt: new Date(),
        confirmedById: adminUser?.id,
      },
    });
    testRegisteredId = reg.id;

    // Create initial confirm log
    if (adminUser) {
      await prisma.registrationPinLog.create({
        data: {
          registrationId: reg.id,
          action: 'CONFIRM',
          oldLatitude: null,
          oldLongitude: null,
          newLatitude: 18.7883,
          newLongitude: 98.9853,
          actorId: adminUser.id,
        },
      });
    }
  });

  test.afterAll(async () => {
    await prisma.registrationPinLog.deleteMany();
    await prisma.registration.deleteMany({
      where: {
        uid: {
          in: ['E2E-MAP-UNREG-01', 'E2E-MAP-REG-02'],
        },
      },
    });
    await prisma.$disconnect();
  });

  test('Security & Role: admin เข้าได้ แต่ user และ guest เข้าไม่ได้', async ({
    page,
    context,
  }) => {
    // Guest → redirect to login
    await page.goto('/admin/map');
    await page.waitForURL('**/login?next=%2Fadmin%2Fmap');

    // User → redirect to dashboard
    await setAuthCookie(context, 'user', 'user1');
    await page.goto('/admin/map');
    await page.waitForURL('**/dashboard');

    // Admin → access granted
    await setAuthCookie(context, 'admin', 'admin1');
    await page.goto('/admin/map');
    await expect(page.locator('[data-testid="admin-map-heading"]')).toBeVisible();
    await expect(page.locator('[data-testid="thailand-map-container"]')).toBeVisible();
  });

  test('View Mode: แสดงหมุดของอุปกรณ์ที่ REGISTERED แล้ว และเปิดดูข้อมูลประวัติได้', async ({
    page,
    context,
  }) => {
    await setAuthCookie(context, 'admin', 'admin1');
    await page.goto('/admin/map');

    // Registered pin should be rendered
    const pin = page.locator(`[data-testid="pin-registered-${testRegisteredId}"]`);
    await expect(pin).toBeVisible();

    // Click pin to open detail panel
    await pin.click();

    const detailPanel = page.locator('[data-testid="pin-detail-panel"]');
    await expect(detailPanel).toBeVisible();
    await expect(detailPanel).toContainText('ROBOQ-MAP-002');
    await expect(detailPanel).toContainText('เชียงใหม่');

    // Google Maps link should be valid
    const gmapLink = page.locator('[data-testid="link-google-maps"]');
    await expect(gmapLink).toBeVisible();
    await expect(gmapLink).toHaveAttribute('target', '_blank');
    await expect(gmapLink).toHaveAttribute('href', /google\.com\/maps/);

    // Audit logs list should contain initial CONFIRM action
    const historyList = page.locator('[data-testid="pin-history-list"]');
    await expect(historyList).toBeVisible();
    await expect(historyList).toContainText('ยืนยันการลงทะเบียนครั้งแรก');
    await expect(historyList).toContainText('admin1');
  });

  test('Pin Placement Flow: ปักหมุดอุปกรณ์ UNREGISTERED พร้อมตรวจสอบขอบเขตจังหวัด', async ({
    page,
    context,
  }) => {
    await setAuthCookie(context, 'admin', 'admin1');
    // Navigate via direct link or query param
    await page.goto(`/admin/map?registrationId=${testUnregisteredId}`);

    const formPanel = page.locator('[data-testid="pin-form-panel"]');
    await expect(formPanel).toBeVisible();
    await expect(formPanel).toContainText('ROBOQ-MAP-001');
    await expect(formPanel).toContainText('กรุงเทพมหานคร');

    // Submit button should be initially disabled because no coordinates are set
    const submitBtn = page.locator('#btn-submit-pin');
    await expect(submitBtn).toBeDisabled();

    // 1. Enter Google Maps URL OUTSIDE Bangkok (e.g. Chiang Mai 18.7883, 98.9853)
    await page.fill('#input-google-maps-url', 'https://www.google.com/maps?q=18.7883,98.9853');

    // Should show validation error and keep button disabled
    const errorMsg = page.locator('[data-testid="validation-error-outside-province"]');
    await expect(errorMsg).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // 2. Enter Google Maps URL INSIDE Bangkok (e.g. 13.7563, 100.5018)
    await page.fill('#input-google-maps-url', 'https://www.google.com/maps?q=13.7563,100.5018');

    // Validation warning should disappear, success badge should appear and submit button becomes enabled
    await expect(errorMsg).not.toBeVisible();
    await expect(page.locator('[data-testid="badge-inside-province"]')).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    // Click submit
    await submitBtn.click();

    // Success banner should appear
    await expect(page.locator('[data-testid="map-success-banner"]')).toBeVisible();

    // Pin should now exist on the map
    await expect(page.locator(`[data-testid="pin-registered-${testUnregisteredId}"]`)).toBeVisible();
  });

  test('Edit Pin Flow: แก้ไขตำแหน่งหมุด และบันทึกประวัติ UPDATE ใน audit log', async ({
    page,
    context,
  }) => {
    await setAuthCookie(context, 'admin', 'admin1');
    await page.goto('/admin/map');

    // Select Chiang Mai device from dropdown
    await page.selectOption('#select-registration', String(testRegisteredId));

    const formPanel = page.locator('[data-testid="pin-form-panel"]');
    await expect(formPanel).toBeVisible();
    await expect(formPanel).toContainText('โหมดแก้ไขพิกัดหมุด');

    // Current coordinates should match original (18.7883, 98.9853)
    const submitBtn = page.locator('#btn-submit-pin');
    // Button is disabled because coordinates have not changed yet
    await expect(submitBtn).toBeDisabled();

    // Original position marker should be visible on map
    await expect(page.locator('[data-testid="marker-original-position"]')).toBeVisible();

    // Update to slightly shifted valid coordinates still in Chiang Mai (18.7900, 98.9900)
    await page.fill('#input-google-maps-url', 'https://www.google.com/maps?q=18.7900,98.9900');

    // Button should now be enabled
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Success banner
    await expect(page.locator('[data-testid="map-success-banner"]')).toBeVisible();

    // Verify detail panel shows the updated position in Chiang Mai
    const detailPanel = page.locator('[data-testid="pin-detail-panel"]');
    await expect(detailPanel).toBeVisible();
    await expect(detailPanel).toContainText('ปักหมุดใน เชียงใหม่ แล้ว');

    // Audit logs list should be visible and contain the UPDATE action
    const historyList = page.locator('[data-testid="pin-history-list"]');
    await expect(historyList).toBeVisible();
    await expect(historyList).toContainText('แก้ไขตำแหน่งพิกัดหมุด');
  });

  test('A11y: หน้า /admin/map ผ่านเกณฑ์การเข้าถึง WCAG 2.1 AA (axe-core)', async ({
    page,
    context,
  }) => {
    await setAuthCookie(context, 'admin', 'admin1');
    await page.goto('/admin/map');

    // Wait for map SVG to render
    await expect(page.locator('[data-testid="thailand-map-container"]')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousViolations).toEqual([]);
  });

  test('Zoom Controls: ขยาย ลดสเกล และรีเซ็ตมุมมองบนแผนที่ได้จริง', async ({
    page,
    context,
  }) => {
    await setAuthCookie(context, 'admin', 'admin1');
    await page.goto('/admin/map');

    const zoomControls = page.locator('[data-testid="map-zoom-controls"]');
    await expect(zoomControls).toBeVisible();

    const btnZoomIn = page.locator('#btn-map-zoom-in');
    const btnZoomOut = page.locator('#btn-map-zoom-out');
    const btnReset = page.locator('#btn-map-zoom-reset');
    const zoomLevel = page.locator('[data-testid="map-zoom-level"]');

    // ระดับเริ่มต้นคือ 100%
    await expect(zoomLevel).toHaveText('100%');
    await expect(btnZoomOut).toBeDisabled();
    await expect(btnReset).toBeDisabled();

    // กดซูมเข้า (+)
    await btnZoomIn.click();
    await expect(zoomLevel).toHaveText('140%');
    await expect(btnZoomOut).toBeEnabled();
    await expect(btnReset).toBeEnabled();
    await expect(page.locator('[data-testid="map-drag-hint"]')).toBeVisible();

    // กดซูมเข้าอีกครั้ง (+)
    await btnZoomIn.click();
    await expect(zoomLevel).toHaveText('200%');

    // กดซูมออก (-)
    await btnZoomOut.click();
    await expect(zoomLevel).toHaveText('140%');

    // กดรีเซ็ตมุมมอง (↺)
    await btnReset.click();
    await expect(zoomLevel).toHaveText('100%');
    await expect(btnZoomOut).toBeDisabled();
    await expect(btnReset).toBeDisabled();
    await expect(page.locator('[data-testid="map-drag-hint"]')).not.toBeVisible();
  });
});
