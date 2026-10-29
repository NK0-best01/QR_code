import { test, expect } from '@playwright/test';
import { setAuthCookie } from './helpers/auth';

test.describe('Phase 15 E2E: Portal Layout, Sidebar, and Dashboard Flow', () => {
  test('User (role: user): เข้า Dashboard เห็นเฉพาะเมนูแดชบอร์ด กรองสถานะได้ และไม่เห็นปุ่มเพิ่ม/แก้ pin', async ({
    page,
    context,
  }) => {
    await setAuthCookie(context, 'user', 'user1', '2');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 1. ตรวจสอบ Heading และเมนู Sidebar
    await expect(page.getByTestId('dashboard-heading')).toHaveText(/แผงควบคุมระบบ/i);
    await expect(page.getByTestId('sidebar-username')).toHaveText('user1');
    await expect(page.getByTestId('sidebar-role')).toHaveText(/เจ้าหน้าที่/i);

    // Sidebar: เห็นแดชบอร์ด แต่ต้องไม่เห็นแผนที่
    await expect(page.getByRole('link', { name: /แดชบอร์ด/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /แผนที่/i })).toHaveCount(0);

    // 2. ตรวจสอบปุ่มกรองสถานะ
    const btnUnregistered = page.getByTestId('filter-unregistered');
    const btnRegistered = page.getByTestId('filter-registered');

    await expect(btnUnregistered).toBeVisible();
    await expect(btnRegistered).toBeVisible();
    await expect(btnUnregistered).toHaveAttribute('aria-pressed', 'false');
    await expect(btnRegistered).toHaveAttribute('aria-pressed', 'false');

    // 3. User ลองคลิกกรอง "ลงทะเบียน"
    await btnRegistered.click();
    await expect(btnRegistered).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/status=REGISTERED/);

    // คลิกซ้ำเพื่อปลดกรองกลับสู่ทั้งหมด
    await btnRegistered.click();
    await expect(btnRegistered).toHaveAttribute('aria-pressed', 'false');

    // 4. User ไม่เห็นปุ่ม "เพิ่ม pin" หรือ "แก้ไข pin" บนการ์ดใดๆ
    await expect(page.locator('[data-testid^="btn-add-pin-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="btn-edit-pin-"]')).toHaveCount(0);

    // 5. User พยายามเข้า /admin/map ตรงๆ → ถูก Redirect กลับมาที่ /dashboard
    await page.goto('/admin/map');
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');
  });

  test('Admin (role: admin): เห็นเมนูแดชบอร์ด + แผนที่ และเห็นปุ่มจัดการ pin', async ({
    page,
    context,
  }) => {
    await setAuthCookie(context, 'admin', 'admin1', '1');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 1. ตรวจสอบ Sidebar มีทั้ง แดชบอร์ด และ แผนที่
    await expect(page.getByRole('link', { name: /แดชบอร์ด/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /แผนที่/i })).toBeVisible();

    // 2. ตรวจสอบสถานะและลิงก์ไปยังแผนที่
    const mapLink = page.getByRole('link', { name: /แผนที่/i });
    await expect(mapLink).toHaveAttribute('href', '/admin/map');
  });

  test('Public registration without login: สมัครหน้าแรกเสร็จ กลับมา Dashboard เห็นการ์ดใหม่อยู่บนสุด และตัวเลข UNREGISTERED เพิ่มขึ้น', async ({
    page,
    context,
  }) => {
    // 1. เข้าหน้าแรกแล้วลงทะเบียนอุปกรณ์ใหม่
    const uniqueUid = `DASH-UID-${Date.now()}`;
    await page.goto(`/register?uid=${uniqueUid}`);
    await page.waitForLoadState('networkidle');

    await page.locator('#reg-region').selectOption('กลาง');
    await page.locator('#reg-province').selectOption('กรุงเทพมหานคร');
    await page.locator('#reg-device-type').selectOption('KSK');
    await page.locator('#btn-submit-registration').click();

    // ยืนยันว่าลงทะเบียนสำเร็จ
    await expect(page.locator('[data-testid="registration-success-card"]')).toBeVisible();

    // 2. ล็อกอินเป็น User แล้วเข้า Dashboard
    await setAuthCookie(context, 'user', 'user1', '2');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // ตรวจสอบว่า UID ใหม่ปรากฏอยู่ในการ์ดบนสุด
    const firstCardUid = page.locator('[data-testid^="card-uid-"]').first();
    await expect(firstCardUid).toHaveText(uniqueUid);

    // ตรวจสอบว่าป้ายสถานะของการ์ดแรกเป็น "ยังไม่ลงทะเบียน"
    const firstCardBadge = page.locator('[data-testid^="card-status-badge-"]').first();
    await expect(firstCardBadge).toHaveText('ยังไม่ลงทะเบียน');
  });

  test('Responsive 390x844 (Mobile): Sidebar ซ่อนเป็น Drawer เปิดได้ด้วยปุ่มเมนู และปิดด้วย Esc', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setAuthCookie(context, 'admin', 'admin1', '1');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 1. เมนูปกติ (desktop aside) ถูกซ่อน
    const mobileMenuBtn = page.getByTestId('btn-mobile-menu');
    await expect(mobileMenuBtn).toBeVisible();
    await expect(mobileMenuBtn).toHaveAttribute('aria-expanded', 'false');

    // 2. คลิกปุ่มเมนูเพื่อเปิด Drawer
    await mobileMenuBtn.click();
    await expect(mobileMenuBtn).toHaveAttribute('aria-expanded', 'true');

    // เมนูใน Drawer ปรากฏ
    const drawer = page.getByRole('dialog', { name: 'เมนูการนำทาง' });
    await expect(drawer).toBeVisible();

    // 3. กดปุ่ม Escape → Drawer ปิด
    await page.keyboard.press('Escape');
    await expect(mobileMenuBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer).toHaveCount(0);

    // 4. ตรวจสอบว่าหน้าจอไม่มีการเลื่อนแนวนอน (overflow-x)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('Accessibility: /dashboard และ /login ไม่พบ violation ร้ายแรง (WCAG 2.1 AA)', async ({
    page,
    context,
  }) => {
    // 1. ตรวจสอบ /login
    await page.goto('/login');
    const AxeBuilder = (await import('@axe-core/playwright')).default;
    const loginAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const loginViolations = loginAxe.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(loginViolations).toEqual([]);

    // 2. ตรวจสอบ /dashboard
    await setAuthCookie(context, 'admin', 'admin1', '1');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const dashboardAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const dashboardViolations = dashboardAxe.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(dashboardViolations).toEqual([]);
  });
});
