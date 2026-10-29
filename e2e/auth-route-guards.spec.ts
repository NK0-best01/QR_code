import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { setAuthCookie } from './helpers/auth';
import { hashPassword } from '../src/lib/auth/password';

test.describe('Phase 12 E2E: Auth, Route Guards & Public Route Isolation', () => {
  test.beforeAll(async () => {
    const prisma = new PrismaClient();
    await prisma.user.deleteMany();

    const adminHash = await hashPassword('1234');
    const userHash = await hashPassword('1234');

    await prisma.user.create({
      data: {
        username: 'admin1',
        passwordHash: adminHash,
        role: 'admin',
      },
    });

    await prisma.user.create({
      data: {
        username: 'user1',
        passwordHash: userHash,
        role: 'user',
      },
    });

    await prisma.$disconnect();
  });

  // Rule 1: Public isolation - / and /register must never be intercepted
  test('Public Isolation: เข้า "/" และ "/register?uid=TEST" โดยไม่ login → เข้าได้ ไม่ถูก redirect', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1')).toBeVisible();

    await page.goto('/register?uid=E2E-TEST-UID-01');
    await expect(page).toHaveURL(/\/register\?uid=E2E-TEST-UID-01/);
    await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
  });

  test('Public Isolation: เข้า "/" ขณะมี cookie session เสีย/ปลอม → ใช้งานได้ปกติ ไม่ redirect', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: 'session',
        value: 'corrupted-tampered-token-12345',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
  });

  // Rule 2: Protected routes redirect to /login
  test('Protected: เข้า /dashboard โดยไม่ login → redirect ไป /login?next=%2Fdashboard', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login?next=%2Fdashboard');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('Protected: เข้า /admin/map โดยไม่ login → redirect ไป /login?next=%2Fadmin%2Fmap', async ({
    page,
  }) => {
    await page.goto('/admin/map');
    await page.waitForURL('**/login?next=%2Fadmin%2Fmap');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  // Rule 3: Login form validation & wrong password
  test('Login UI: กรอกรหัสผิด → แสดง error banner และอยู่หน้า login', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('#username', 'admin1');
    await page.fill('#password', 'wrong-pass');
    await page.click('#btn-login-submit');

    const errorBanner = page.locator('[data-testid="login-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  // Rule 4: Successful login as admin & user
  test('Login UI: admin1/1234 → /dashboard สำเร็จ และเข้า /admin/map ได้', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('#username', 'admin1');
    await page.fill('#password', '1234');
    await page.click('#btn-login-submit');

    await page.waitForURL('**/dashboard');
    await expect(page.locator('[data-testid="dashboard-heading"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-role"]')).toHaveText('admin');

    // Admin can access /admin/map
    await page.goto('/admin/map');
    await page.waitForURL('**/admin/map');
    await expect(page.locator('[data-testid="admin-map-heading"]')).toBeVisible();
  });

  test('Role Enforcement: user1/1234 → /dashboard สำเร็จ แต่เข้า /admin/map → redirect /dashboard', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('#username', 'user1');
    await page.fill('#password', '1234');
    await page.click('#btn-login-submit');

    await page.waitForURL('**/dashboard');
    await expect(page.locator('[data-testid="user-role"]')).toHaveText('user');

    // User navigating to /admin/map must be sent back to /dashboard
    await page.goto('/admin/map');
    await page.waitForURL('**/dashboard');
    await expect(page.locator('[data-testid="dashboard-heading"]')).toBeVisible();
  });

  // Rule 5: Logged-in user visiting /login -> /dashboard
  test('Already Logged In: เข้า /login ขณะมี session → redirect /dashboard', async ({
    page,
    context,
  }) => {
    await setAuthCookie(context, 'admin', 'admin1');
    await page.goto('/login');
    await page.waitForURL('**/dashboard');
  });

  // Rule 6: Open Redirect Protection on Login
  test('Open Redirect: /login?next=//evil.com → เข้าสู่ระบบแล้วไม่หลุดไปโดเมนอื่น', async ({
    page,
  }) => {
    await page.goto('/login?next=//evil.com');
    await page.fill('#username', 'admin1');
    await page.fill('#password', '1234');
    await page.click('#btn-login-submit');

    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');
    expect(page.url()).not.toContain('evil.com');
  });

  // Rule 7: Logout flow
  test('Logout: กดออกจากระบบ → redirect /login และเข้า /dashboard ไม่ได้อีก', async ({
    page,
    context,
  }) => {
    await setAuthCookie(context, 'admin', 'admin1');
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="dashboard-heading"]')).toBeVisible();

    await page.click('#btn-logout');
    await page.waitForURL('**/login');

    // Try going to dashboard again
    await page.goto('/dashboard');
    await page.waitForURL('**/login?next=%2Fdashboard');
  });
});
