import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../components/LoginForm';
import { evaluateAuthMiddleware } from '../lib/auth/middleware-logic';
import { config as middlewareConfig } from '../proxy';
import { signSession } from '../lib/auth/session';
import messages from '../lib/messages';

describe('Phase 12: Route Protection & Middleware Logic Tests', () => {
  const origin = 'http://localhost:3000';

  beforeAll(() => {
    process.env.AUTH_SECRET =
      process.env.AUTH_SECRET ||
      'development-super-secret-key-at-least-32-chars-long-for-tests';
  });

  it('matcher ต้องไม่ครอบคลุม "/" หรือ "/register" แต่ครอบคลุม "/dashboard", "/admin", "/login"', () => {
    const matcherList = middlewareConfig.matcher;

    // Must protect these routes
    expect(matcherList).toContain('/dashboard');
    expect(matcherList).toContain('/dashboard/:path*');
    expect(matcherList).toContain('/admin');
    expect(matcherList).toContain('/admin/:path*');
    expect(matcherList).toContain('/login');

    // Must NOT contain public routes
    expect(matcherList).not.toContain('/');
    expect(matcherList).not.toContain('/register');
    expect(matcherList).not.toContain('/register/:path*');
    expect(matcherList).not.toContain('/api/:path*');
  });

  describe('evaluateAuthMiddleware', () => {
    it('ยังไม่ login: เข้า /dashboard → redirect /login?next=%2Fdashboard', async () => {
      const result = await evaluateAuthMiddleware(
        '/dashboard',
        '',
        null,
        origin
      );
      expect(result.action).toBe('redirect');
      expect(result.redirectUrl).toBe(
        'http://localhost:3000/login?next=%2Fdashboard'
      );
    });

    it('ยังไม่ login: เข้า /admin/map → redirect /login?next=%2Fadmin%2Fmap', async () => {
      const result = await evaluateAuthMiddleware(
        '/admin/map',
        '',
        null,
        origin
      );
      expect(result.action).toBe('redirect');
      expect(result.redirectUrl).toBe(
        'http://localhost:3000/login?next=%2Fadmin%2Fmap'
      );
    });

    it('ยังไม่ login: เข้า /admin → redirect /login?next=%2Fadmin', async () => {
      const result = await evaluateAuthMiddleware('/admin', '', null, origin);
      expect(result.action).toBe('redirect');
      expect(result.redirectUrl).toBe(
        'http://localhost:3000/login?next=%2Fadmin'
      );
    });

    it('role user: เข้า /admin/map → redirect /dashboard (ห้ามเข้าหน้า admin)', async () => {
      const token = await signSession({
        sub: '2',
        username: 'user1',
        role: 'user',
      });
      const cookieHeader = `session=${token}`;

      const result = await evaluateAuthMiddleware(
        '/admin/map',
        '',
        cookieHeader,
        origin
      );
      expect(result.action).toBe('redirect');
      expect(result.redirectUrl).toBe('http://localhost:3000/dashboard');
    });

    it('role admin: เข้า /admin/map → ผ่านได้ (action: next)', async () => {
      const token = await signSession({
        sub: '1',
        username: 'admin1',
        role: 'admin',
      });
      const cookieHeader = `session=${token}`;

      const result = await evaluateAuthMiddleware(
        '/admin/map',
        '',
        cookieHeader,
        origin
      );
      expect(result.action).toBe('next');
    });

    it('login แล้ว: เข้า /login → redirect ไป /dashboard', async () => {
      const token = await signSession({
        sub: '1',
        username: 'admin1',
        role: 'admin',
      });
      const cookieHeader = `session=${token}`;

      const result = await evaluateAuthMiddleware(
        '/login',
        '',
        cookieHeader,
        origin
      );
      expect(result.action).toBe('redirect');
      expect(result.redirectUrl).toBe('http://localhost:3000/dashboard');
    });

    it('login แล้ว: เข้า /login?next=//evil.com → ป้องกัน Open Redirect และพาไป /dashboard', async () => {
      const token = await signSession({
        sub: '1',
        username: 'admin1',
        role: 'admin',
      });
      const cookieHeader = `session=${token}`;

      const result = await evaluateAuthMiddleware(
        '/login',
        '?next=//evil.com',
        cookieHeader,
        origin
      );
      expect(result.action).toBe('redirect');
      expect(result.redirectUrl).toBe('http://localhost:3000/dashboard');
    });

    it('ยังไม่ login: เข้าหน้าสาธารณะ (เช่น /) → ผ่านได้ (action: next)', async () => {
      const result = await evaluateAuthMiddleware('/', '', null, origin);
      expect(result.action).toBe('next');
    });

    it('cookie session เสียหรือหมดอายุ: เข้า /login → ไม่ redirect (action: next ให้กรอกฟอร์มใหม่)', async () => {
      const result = await evaluateAuthMiddleware(
        '/login',
        '',
        'session=invalid.garbage.token',
        origin
      );
      expect(result.action).toBe('next');
    });
  });
});

describe('Phase 12: LoginForm Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('render ฟิลด์ username, password ถูกต้อง และต้องไม่มี Checkbox จดจำฉัน', () => {
    render(<LoginForm />);

    expect(screen.getByTestId('input-username')).toBeInTheDocument();
    expect(screen.getByTestId('input-password')).toBeInTheDocument();
    expect(screen.getByTestId('btn-login-submit')).toBeInTheDocument();

    // Must NOT have remember me checkbox (User strict constraint)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/จดจำฉัน/i)).not.toBeInTheDocument();
  });

  it('กด submit โดยไม่กรอกข้อมูล → แสดงข้อความ error พร้อม role="alert"', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const submitBtn = screen.getByTestId('btn-login-submit');
    await user.click(submitBtn);

    await waitFor(() => {
      const usernameErr = screen.getByTestId('username-error-msg');
      expect(usernameErr).toBeInTheDocument();
      expect(usernameErr).toHaveAttribute('role', 'alert');
      expect(usernameErr).toHaveTextContent(messages.auth.usernameRequired);
    });
  });

  it('กรอกข้อมูลและส่งสำเร็จ → เรียก onSuccessRedirect ด้วย path ที่ได้', async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, redirectTo: '/dashboard' }),
    } as unknown as Response);

    render(<LoginForm onSuccessRedirect={handleSuccess} />);

    await user.type(screen.getByTestId('input-username'), 'admin1');
    await user.type(screen.getByTestId('input-password'), '1234');
    await user.click(screen.getByTestId('btn-login-submit'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'admin1',
            password: '1234',
            next: undefined,
          }),
        })
      );
      expect(handleSuccess).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('API ตอบ 401 รหัสผ่านผิด → แสดง error banner พร้อม role="alert" และปุ่มกลับมา enable', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: messages.auth.invalidCredentials }),
    } as unknown as Response);

    render(<LoginForm />);

    await user.type(screen.getByTestId('input-username'), 'admin1');
    await user.type(screen.getByTestId('input-password'), 'wrongpassword');
    await user.click(screen.getByTestId('btn-login-submit'));

    await waitFor(() => {
      const banner = screen.getByTestId('login-error-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute('role', 'alert');
      expect(banner).toHaveTextContent(messages.auth.invalidCredentials);
    });

    // Button should be re-enabled
    const submitBtn = screen.getByTestId('btn-login-submit');
    expect(submitBtn).not.toBeDisabled();
  });
});
